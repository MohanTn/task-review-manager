/**
 * DatabaseHandler - SQLite database operations for task management
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { TaskFile, Task, Transition, AcceptanceCriterion, TestScenario, StakeholderReview } from './types.js';

export class DatabaseHandler {
  private db: Database.Database;
  private workspaceRoot: string;

  constructor(workspaceRoot?: string, dbPath?: string) {
    this.workspaceRoot = workspaceRoot || process.cwd();
    
    // Default database location: tasks.db in workspace root
    const defaultDbPath = path.join(this.workspaceRoot, 'tasks.db');
    const finalDbPath = dbPath || defaultDbPath;
    
    // Ensure directory exists before opening database
    const dbDir = path.dirname(finalDbPath);
    fs.ensureDirSync(dbDir);
    
    this.db = new Database(finalDbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
    
    this.initializeTables();
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    this.db.exec(`
      -- Features table
      CREATE TABLE IF NOT EXISTS features (
        feature_slug TEXT PRIMARY KEY,
        feature_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_modified TEXT NOT NULL
      );

      -- Tasks table
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_slug TEXT NOT NULL,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_to TEXT,
        estimated_hours REAL,
        order_of_execution INTEGER NOT NULL DEFAULT 0,
        tags TEXT, -- JSON array
        dependencies TEXT, -- JSON array
        out_of_scope TEXT, -- JSON array
        UNIQUE(feature_slug, task_id),
        FOREIGN KEY(feature_slug) REFERENCES features(feature_slug) ON DELETE CASCADE
      );

      -- Transitions table
      CREATE TABLE IF NOT EXISTS transitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_slug TEXT NOT NULL,
        task_id TEXT NOT NULL,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        approver TEXT,
        actor TEXT,
        timestamp TEXT NOT NULL,
        notes TEXT,
        additional_data TEXT, -- JSON for all additional fields
        FOREIGN KEY(feature_slug, task_id) REFERENCES tasks(feature_slug, task_id) ON DELETE CASCADE
      );

      -- Acceptance Criteria table
      CREATE TABLE IF NOT EXISTS acceptance_criteria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_slug TEXT NOT NULL,
        task_id TEXT NOT NULL,
        criterion_id TEXT NOT NULL,
        criterion TEXT NOT NULL,
        priority TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        UNIQUE(feature_slug, task_id, criterion_id),
        FOREIGN KEY(feature_slug, task_id) REFERENCES tasks(feature_slug, task_id) ON DELETE CASCADE
      );

      -- Test Scenarios table
      CREATE TABLE IF NOT EXISTS test_scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_slug TEXT NOT NULL,
        task_id TEXT NOT NULL,
        scenario_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        manual_only INTEGER NOT NULL DEFAULT 0,
        priority TEXT NOT NULL,
        UNIQUE(feature_slug, task_id, scenario_id),
        FOREIGN KEY(feature_slug, task_id) REFERENCES tasks(feature_slug, task_id) ON DELETE CASCADE
      );

      -- Stakeholder Reviews table
      CREATE TABLE IF NOT EXISTS stakeholder_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_slug TEXT NOT NULL,
        task_id TEXT NOT NULL,
        stakeholder TEXT NOT NULL,
        approved INTEGER NOT NULL,
        notes TEXT NOT NULL,
        additional_data TEXT, -- JSON for role-specific fields
        UNIQUE(feature_slug, task_id, stakeholder),
        FOREIGN KEY(feature_slug, task_id) REFERENCES tasks(feature_slug, task_id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_tasks_feature ON tasks(feature_slug);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_transitions_task ON transitions(feature_slug, task_id);
      CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_task ON acceptance_criteria(feature_slug, task_id);
      CREATE INDEX IF NOT EXISTS idx_test_scenarios_task ON test_scenarios(feature_slug, task_id);
      CREATE INDEX IF NOT EXISTS idx_stakeholder_reviews_task ON stakeholder_reviews(feature_slug, task_id);
    `);
  }

  /**
   * Load task file by feature_slug
   */
  async loadByFeatureSlug(featureSlug: string): Promise<TaskFile> {
    try {
      // Get feature
      const feature = this.db.prepare(`
        SELECT feature_slug, feature_name, created_at, last_modified
        FROM features
        WHERE feature_slug = ?
      `).get(featureSlug) as any;

      if (!feature) {
        throw new Error(`Feature not found: ${featureSlug}`);
      }

      // Get all tasks for this feature
      const tasks = this.loadTasksForFeature(featureSlug);

      return {
        featureSlug: feature.feature_slug,
        featureName: feature.feature_name,
        createdAt: feature.created_at,
        lastModified: feature.last_modified,
        tasks
      };
    } catch (error) {
      throw new Error(
        `Failed to load feature: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load all tasks for a feature
   */
  private loadTasksForFeature(featureSlug: string): Task[] {
    const taskRows = this.db.prepare(`
      SELECT * FROM tasks WHERE feature_slug = ? ORDER BY order_of_execution
    `).all(featureSlug) as any[];

    return taskRows.map(row => this.mapRowToTask(featureSlug, row));
  }

  /**
   * Map database row to Task object
   */
  private mapRowToTask(featureSlug: string, row: any): Task {
    // Load related data
    const transitions = this.loadTransitions(featureSlug, row.task_id);
    const acceptanceCriteria = this.loadAcceptanceCriteria(featureSlug, row.task_id);
    const testScenarios = this.loadTestScenarios(featureSlug, row.task_id);
    const stakeholderReview = this.loadStakeholderReview(featureSlug, row.task_id);

    return {
      taskId: row.task_id,
      title: row.title,
      description: row.description,
      acceptanceCriteria,
      testScenarios,
      outOfScope: row.out_of_scope ? JSON.parse(row.out_of_scope) : [],
      estimatedHours: row.estimated_hours,
      status: row.status,
      assignedTo: row.assigned_to,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      transitions,
      stakeholderReview,
      orderOfExecution: row.order_of_execution,
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }

  /**
   * Load transitions for a task
   */
  private loadTransitions(featureSlug: string, taskId: string): Transition[] {
    const rows = this.db.prepare(`
      SELECT * FROM transitions 
      WHERE feature_slug = ? AND task_id = ? 
      ORDER BY timestamp
    `).all(featureSlug, taskId) as any[];

    return rows.map(row => {
      const additional = row.additional_data ? JSON.parse(row.additional_data) : {};
      return {
        from: row.from_status,
        to: row.to_status,
        approver: row.approver,
        actor: row.actor,
        timestamp: row.timestamp,
        notes: row.notes,
        ...additional
      };
    });
  }

  /**
   * Load acceptance criteria for a task
   */
  private loadAcceptanceCriteria(featureSlug: string, taskId: string): AcceptanceCriterion[] {
    const rows = this.db.prepare(`
      SELECT * FROM acceptance_criteria 
      WHERE feature_slug = ? AND task_id = ?
    `).all(featureSlug, taskId) as any[];

    return rows.map(row => ({
      id: row.criterion_id,
      criterion: row.criterion,
      priority: row.priority,
      verified: Boolean(row.verified)
    }));
  }

  /**
   * Load test scenarios for a task
   */
  private loadTestScenarios(featureSlug: string, taskId: string): TestScenario[] {
    const rows = this.db.prepare(`
      SELECT * FROM test_scenarios 
      WHERE feature_slug = ? AND task_id = ?
    `).all(featureSlug, taskId) as any[];

    return rows.map(row => ({
      id: row.scenario_id,
      title: row.title,
      description: row.description,
      manualOnly: Boolean(row.manual_only),
      priority: row.priority
    }));
  }

  /**
   * Load stakeholder review for a task
   */
  private loadStakeholderReview(featureSlug: string, taskId: string): StakeholderReview {
    const rows = this.db.prepare(`
      SELECT * FROM stakeholder_reviews 
      WHERE feature_slug = ? AND task_id = ?
    `).all(featureSlug, taskId) as any[];

    const review: StakeholderReview = {};

    for (const row of rows) {
      const additional = row.additional_data ? JSON.parse(row.additional_data) : {};
      review[row.stakeholder as keyof StakeholderReview] = {
        approved: Boolean(row.approved),
        notes: row.notes,
        ...additional
      } as any;
    }

    return review;
  }

  /**
   * Save task file by feature_slug
   */
  async saveByFeatureSlug(featureSlug: string, taskFile: TaskFile): Promise<void> {
    // Ensure featureSlug matches taskFile.featureSlug
    if (featureSlug !== taskFile.featureSlug) {
      throw new Error(`Feature slug mismatch: ${featureSlug} !== ${taskFile.featureSlug}`);
    }

    const saveTransaction = this.db.transaction((data: TaskFile) => {
      const now = new Date().toISOString();

      // Upsert feature
      this.db.prepare(`
        INSERT INTO features (feature_slug, feature_name, created_at, last_modified)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(feature_slug) DO UPDATE SET
          feature_name = excluded.feature_name,
          last_modified = excluded.last_modified
      `).run(data.featureSlug, data.featureName, data.createdAt || now, now);

      // Delete existing tasks and related data (CASCADE will handle related tables)
      this.db.prepare(`DELETE FROM tasks WHERE feature_slug = ?`).run(data.featureSlug);

      // Insert all tasks
      for (const task of data.tasks) {
        this.saveTask(data.featureSlug, task);
      }
    });

    try {
      saveTransaction(taskFile);
    } catch (error) {
      throw new Error(
        `Failed to save feature: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Save a single task with all related data
   */
  private saveTask(featureSlug: string, task: Task): void {
    // Insert task
    this.db.prepare(`
      INSERT INTO tasks (
        feature_slug, task_id, title, description, status, 
        assigned_to, estimated_hours, order_of_execution, 
        tags, dependencies, out_of_scope
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      featureSlug,
      task.taskId,
      task.title,
      task.description,
      task.status,
      task.assignedTo || null,
      task.estimatedHours || null,
      task.orderOfExecution,
      task.tags ? JSON.stringify(task.tags) : null,
      task.dependencies ? JSON.stringify(task.dependencies) : null,
      task.outOfScope ? JSON.stringify(task.outOfScope) : null
    );

    // Insert transitions
    for (const transition of task.transitions) {
      const { from, to, approver, actor, timestamp, notes, ...additional } = transition;
      this.db.prepare(`
        INSERT INTO transitions (
          feature_slug, task_id, from_status, to_status, 
          approver, actor, timestamp, notes, additional_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        featureSlug,
        task.taskId,
        from,
        to,
        approver || null,
        actor || null,
        timestamp,
        notes || null,
        JSON.stringify(additional)
      );
    }

    // Insert acceptance criteria
    for (const criterion of task.acceptanceCriteria) {
      this.db.prepare(`
        INSERT INTO acceptance_criteria (
          feature_slug, task_id, criterion_id, criterion, priority, verified
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        featureSlug,
        task.taskId,
        criterion.id,
        criterion.criterion,
        criterion.priority,
        criterion.verified ? 1 : 0
      );
    }

    // Insert test scenarios
    if (task.testScenarios) {
      for (const scenario of task.testScenarios) {
        this.db.prepare(`
          INSERT INTO test_scenarios (
            feature_slug, task_id, scenario_id, title, description, manual_only, priority
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          featureSlug,
          task.taskId,
          scenario.id,
          scenario.title,
          scenario.description,
          scenario.manualOnly ? 1 : 0,
          scenario.priority
        );
      }
    }

    // Insert stakeholder reviews
    for (const [stakeholder, review] of Object.entries(task.stakeholderReview)) {
      if (review) {
        const { approved, notes, ...additional } = review;
        this.db.prepare(`
          INSERT INTO stakeholder_reviews (
            feature_slug, task_id, stakeholder, approved, notes, additional_data
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          featureSlug,
          task.taskId,
          stakeholder,
          approved ? 1 : 0,
          notes,
          JSON.stringify(additional)
        );
      }
    }
  }

  /**
   * Validate feature exists
   */
  async validateFeatureSlug(featureSlug: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const feature = this.db.prepare(`
        SELECT feature_slug FROM features WHERE feature_slug = ?
      `).get(featureSlug);

      if (!feature) {
        return { valid: false, error: 'Feature does not exist' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Load task file with lock (same as loadByFeatureSlug for now, SQLite handles locking)
   */
  async loadByFeatureSlugWithLock(featureSlug: string): Promise<TaskFile> {
    return this.loadByFeatureSlug(featureSlug);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get all feature slugs
   */
  getAllFeatures(): Array<{ featureSlug: string; featureName: string; lastModified: string; totalTasks: number }> {
    const rows = this.db.prepare(`
      SELECT 
        f.feature_slug, 
        f.feature_name, 
        f.last_modified,
        COUNT(t.id) as total_tasks
      FROM features f
      LEFT JOIN tasks t ON f.feature_slug = t.feature_slug
      GROUP BY f.feature_slug, f.feature_name, f.last_modified
      ORDER BY f.last_modified DESC
    `).all() as any[];

    return rows.map(row => ({
      featureSlug: row.feature_slug,
      featureName: row.feature_name,
      lastModified: row.last_modified,
      totalTasks: row.total_tasks
    }));
  }

  /**
   * Create a new feature
   */
  createFeature(featureSlug: string, featureName: string): void {
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO features (feature_slug, feature_name, created_at, last_modified)
      VALUES (?, ?, ?, ?)
    `).run(featureSlug, featureName, now, now);
  }

  /**
   * Delete a feature and all its tasks
   */
  deleteFeature(featureSlug: string): void {
    this.db.prepare(`DELETE FROM features WHERE feature_slug = ?`).run(featureSlug);
  }

  /**
   * Add a task to a feature
   */
  addTask(featureSlug: string, task: Partial<Task>): void {
    const now = new Date().toISOString();
    
    // Ensure feature exists
    const feature = this.db.prepare(`SELECT feature_slug FROM features WHERE feature_slug = ?`).get(featureSlug);
    if (!feature) {
      throw new Error(`Feature not found: ${featureSlug}`);
    }

    // Insert task
    this.db.prepare(`
      INSERT INTO tasks (
        feature_slug, task_id, title, description, status, 
        assigned_to, estimated_hours, order_of_execution, 
        tags, dependencies, out_of_scope
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      featureSlug,
      task.taskId || `T${Date.now()}`,
      task.title || 'New Task',
      task.description || '',
      task.status || 'PendingProductDirector',
      task.assignedTo || null,
      task.estimatedHours || null,
      task.orderOfExecution || 0,
      task.tags ? JSON.stringify(task.tags) : null,
      task.dependencies ? JSON.stringify(task.dependencies) : '[]',
      task.outOfScope ? JSON.stringify(task.outOfScope) : '[]'
    );

    // Update feature last_modified
    this.db.prepare(`
      UPDATE features SET last_modified = ? WHERE feature_slug = ?
    `).run(now, featureSlug);
  }
}
