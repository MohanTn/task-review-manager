/**
 * TaskReviewManager - Core business logic for task review operations
 */
import {
  ReviewInput,
  ReviewResult,
  TaskStatusResult,
  ReviewSummary,
  ValidationResult,
  Transition,
  TaskStatus,
  StakeholderRole,
  TransitionTaskInput,
  TransitionTaskResult,
  GetNextTaskInput,
  GetNextTaskResult,
  UpdateAcceptanceCriteriaInput,
  UpdateAcceptanceCriteriaResult,
  GetTasksByStatusInput,
  GetTasksByStatusResult,
  VerifyAllTasksCompleteInput,
  VerifyAllTasksCompleteResult,
} from './types.js';
import { DatabaseHandler } from './DatabaseHandler.js';
import { WorkflowValidator } from './WorkflowValidator.js';

export class TaskReviewManager {
  private dbHandler: DatabaseHandler;
  private validator: WorkflowValidator;

  constructor(workspaceRoot?: string, dbPath?: string) {
    this.dbHandler = new DatabaseHandler(workspaceRoot, dbPath);
    this.validator = new WorkflowValidator();
  }

  /**
   * Add a stakeholder review to a task
   */
  async addReview(input: ReviewInput): Promise<ReviewResult> {
    try {
      // 1. Validate file exists
      const fileValidation = await this.dbHandler.validateFeatureSlug(input.featureSlug);
      if (!fileValidation.valid) {
        throw new Error(`Invalid task file: ${fileValidation.error}`);
      }

      // 2. Load task file with lock
      const taskFile = await this.dbHandler.loadByFeatureSlugWithLock(input.featureSlug);

      // 3. Find specific task
      const task = taskFile.tasks.find((t) => t.taskId === input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      // 4. Validate task structure
      const structureValidation = this.validator.validateTaskStructure(task);
      if (!structureValidation.valid) {
        throw new Error(
          `Invalid task structure: ${structureValidation.errors.join(', ')}`
        );
      }

      // 5. Validate workflow state
      const validation = this.validator.validate(
        task.status,
        input.stakeholder,
        input.decision
      );

      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // 6. Calculate new status
      const previousStatus = task.status;
      const newStatus =
        input.decision === 'approve'
          ? this.getApprovalStatus(task.status)
          : 'NeedsRefinement';

      // 7. Build transition record
      const transition: Transition = {
        from: previousStatus,
        to: newStatus as TaskStatus,
        approver: input.stakeholder,
        timestamp: new Date().toISOString(),
        notes: input.notes,
      };

      // 8. Update stakeholder review section
      const reviewData = {
        approved: input.decision === 'approve',
        notes: input.notes,
      };

      // Add role-specific fields
      if (input.stakeholder === 'productDirector' && input.additionalFields?.marketAnalysis) {
        task.stakeholderReview.productDirector = {
          ...reviewData,
          marketAnalysis: input.additionalFields.marketAnalysis,
        };
      } else if (input.stakeholder === 'architect') {
        task.stakeholderReview.architect = {
          ...reviewData,
          technologyRecommendations: input.additionalFields?.technologyRecommendations,
          designPatterns: input.additionalFields?.designPatterns,
        };
      } else if (input.stakeholder === 'leadEngineer') {
        task.stakeholderReview.leadEngineer = {
          ...reviewData,
          resourcePlan: input.additionalFields?.resourcePlan,
          implementationPhases: input.additionalFields?.implementationPhases,
        };
      } else if (input.stakeholder === 'cfo') {
        task.stakeholderReview.cfo = {
          ...reviewData,
          costAnalysis: input.additionalFields?.costAnalysis,
          revenueOptimization: input.additionalFields?.revenueOptimization,
        };
      } else if (input.stakeholder === 'cso') {
        task.stakeholderReview.cso = {
          ...reviewData,
          securityRequirements: input.additionalFields?.securityRequirements,
          complianceNotes: input.additionalFields?.complianceNotes,
        };
      } else {
        // Fallback for productDirector without marketAnalysis
        (task.stakeholderReview as any)[input.stakeholder] = reviewData;
      }

      // 9. Update task object
      task.status = newStatus as TaskStatus;
      task.transitions.push(transition);

      // 10. Save atomically
      await this.dbHandler.saveByFeatureSlug(input.featureSlug, taskFile);

      return {
        success: true,
        taskId: input.taskId,
        previousStatus,
        newStatus: newStatus as TaskStatus,
        transition,
        message: validation.warnings.length > 0 
          ? `Review recorded with warnings: ${validation.warnings.join(', ')}` 
          : 'Review recorded successfully',
      };
    } catch (error) {
      return {
        success: false,
        taskId: input.taskId,
        previousStatus: 'PendingProductDirector' as TaskStatus, // Default fallback
        newStatus: 'PendingProductDirector' as TaskStatus,
        transition: {
          from: 'PendingProductDirector' as TaskStatus,
          to: 'PendingProductDirector' as TaskStatus,
          approver: input.stakeholder,
          timestamp: new Date().toISOString(),
          notes: '',
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get status of a specific task
   */
  async getTaskStatus(featureSlug: string, taskId: string): Promise<TaskStatusResult> {
    try {
      // Load task file (read-only)
      const taskFile = await this.dbHandler.loadByFeatureSlug(featureSlug);

      // Find task
      const task = taskFile.tasks.find((t) => t.taskId === taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Get review progress
      const progress = this.validator.getReviewProgress(task);

      // Get allowed transitions
      const allowedTransitions = this.validator.getAllowedTransitions(task.status);

      return {
        taskId: task.taskId,
        status: task.status,
        currentStakeholder: progress.currentStakeholder,
        completedReviews: progress.completed,
        pendingReviews: progress.pending,
        canTransitionTo: allowedTransitions,
        orderOfExecution: task.orderOfExecution,
      };
    } catch (error) {
      throw new Error(
        `Failed to get task status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate review summary for all tasks
   */
  async getReviewSummary(featureSlug: string): Promise<ReviewSummary> {
    try {
      // Load task file (read-only)
      const taskFile = await this.dbHandler.loadByFeatureSlug(featureSlug);

      // Count tasks by status
      const tasksByStatus: Record<TaskStatus, number> = {
        PendingProductDirector: 0,
        PendingArchitect: 0,
        PendingLeadEngineer: 0,
        PendingCFO: 0,
        PendingCSO: 0,
        ReadyForDevelopment: 0,
        NeedsRefinement: 0,
        ToDo: 0,
        InProgress: 0,
        InReview: 0,
        InQA: 0,
        NeedsChanges: 0,
        Done: 0,
      };

      // Track stakeholder progress
      const stakeholderProgress = {
        productDirector: { completed: 0, pending: 0 },
        architect: { completed: 0, pending: 0 },
        leadEngineer: { completed: 0, pending: 0 },
        cfo: { completed: 0, pending: 0 },
        cso: { completed: 0, pending: 0 },
      };

      // Analyze each task
      const taskSummaries = taskFile.tasks.map((task) => {
        tasksByStatus[task.status]++;

        const progress = this.validator.getReviewProgress(task);

        // Update stakeholder progress
        for (const stakeholder of progress.completed) {
          stakeholderProgress[stakeholder].completed++;
        }
        for (const stakeholder of progress.pending) {
          stakeholderProgress[stakeholder].pending++;
        }

        return {
          taskId: task.taskId,
          title: task.title,
          status: task.status,
          estimatedHours: task.estimatedHours,
          orderOfExecution: task.orderOfExecution,
        };
      });

      // Calculate completion percentage
      const completedTasks = tasksByStatus.ReadyForDevelopment;
      const totalTasks = taskFile.tasks.length;
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        featureSlug: taskFile.featureSlug,
        featureName: taskFile.featureName,
        totalTasks,
        tasksByStatus,
        completionPercentage: Math.round(completionPercentage * 100) / 100,
        stakeholderProgress,
        tasks: taskSummaries,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate review summary: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate workflow before performing a review
   */
  async validateWorkflow(
    featureSlug: string,
    taskId: string,
    stakeholder: StakeholderRole
  ): Promise<ValidationResult> {
    try {
      // Load task file (read-only)
      const taskFile = await this.dbHandler.loadByFeatureSlug(featureSlug);

      // Find task
      const task = taskFile.tasks.find((t) => t.taskId === taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Validate workflow for approve decision (most common case)
      return this.validator.validate(task.status, stakeholder, 'approve');
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        currentStatus: 'PendingProductDirector',
        expectedStakeholder: null,
        allowedTransitions: [],
      };
    }
  }

  /**
   * Helper to get approval status for each stage
   */
  private getApprovalStatus(currentStatus: TaskStatus): TaskStatus {
    const statusMap: Record<TaskStatus, TaskStatus> = {
      PendingProductDirector: 'PendingArchitect',
      PendingArchitect: 'PendingLeadEngineer',
      PendingLeadEngineer: 'PendingCFO',
      PendingCFO: 'PendingCSO',
      PendingCSO: 'ReadyForDevelopment',
      ReadyForDevelopment: 'ReadyForDevelopment',
      NeedsRefinement: 'NeedsRefinement',
      ToDo: 'ToDo',
      InProgress: 'InProgress',
      InReview: 'InReview',
      InQA: 'InQA',
      NeedsChanges: 'NeedsChanges',
      Done: 'Done',
    };
    return statusMap[currentStatus];
  }

  /**
   * Transition task to a new status (for development workflow)
   */
  async transitionTaskStatus(input: TransitionTaskInput): Promise<TransitionTaskResult> {
    try {
      // 1. Validate file exists
      const fileValidation = await this.dbHandler.validateFeatureSlug(input.featureSlug);
      if (!fileValidation.valid) {
        throw new Error(`Invalid task file: ${fileValidation.error}`);
      }

      // 2. Load task file with lock
      const taskFile = await this.dbHandler.loadByFeatureSlugWithLock(input.featureSlug);

      // 3. Find specific task
      const task = taskFile.tasks.find((t) => t.taskId === input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      // 4. Validate current status matches expected
      if (task.status !== input.fromStatus) {
        throw new Error(
          `Task status mismatch. Expected '${input.fromStatus}', but task is in '${task.status}'`
        );
      }

      // 5. Validate development workflow transition
      const validation = this.validator.validateDevTransition(
        input.fromStatus,
        input.toStatus,
        input.actor
      );

      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // 6. Build transition record
      const transition: Transition = {
        from: input.fromStatus,
        to: input.toStatus,
        actor: input.actor,
        timestamp: new Date().toISOString(),
        notes: input.notes,
        ...input.metadata,
      };

      // 7. Update task
      task.status = input.toStatus;
      task.transitions.push(transition);

      // 8. Save atomically
      await this.dbHandler.saveByFeatureSlug(input.featureSlug, taskFile);

      return {
        success: true,
        taskId: input.taskId,
        previousStatus: input.fromStatus,
        newStatus: input.toStatus,
        transition,
        message:
          validation.warnings.length > 0
            ? `Transition recorded with warnings: ${validation.warnings.join(', ')}`
            : 'Transition recorded successfully',
      };
    } catch (error) {
      return {
        success: false,
        taskId: input.taskId,
        previousStatus: input.fromStatus,
        newStatus: input.fromStatus,
        transition: {
          from: input.fromStatus,
          to: input.fromStatus,
          actor: input.actor,
          timestamp: new Date().toISOString(),
          notes: '',
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get next task to work on based on status filter and orderOfExecution
   */
  async getNextTask(input: GetNextTaskInput): Promise<GetNextTaskResult> {
    try {
      // Load task file (read-only)
      const taskFile = await this.dbHandler.loadByFeatureSlug(input.featureSlug);

      // Filter tasks by status
      const filteredTasks = taskFile.tasks.filter((t) =>
        input.statusFilter.includes(t.status)
      );

      if (filteredTasks.length === 0) {
        return {
          success: true,
          task: undefined,
          message: `No tasks found with status: ${input.statusFilter.join(', ')}`,
        };
      }

      // Sort by orderOfExecution and get the first one
      const sortedTasks = filteredTasks.sort((a, b) => a.orderOfExecution - b.orderOfExecution);
      const nextTask = sortedTasks[0];

      return {
        success: true,
        task: nextTask,
        message: `Found task ${nextTask.taskId} with orderOfExecution ${nextTask.orderOfExecution}`,
      };
    } catch (error) {
      return {
        success: false,
        task: undefined,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update acceptance criteria verification status
   */
  async updateAcceptanceCriteria(
    input: UpdateAcceptanceCriteriaInput
  ): Promise<UpdateAcceptanceCriteriaResult> {
    try {
      // 1. Validate file exists
      const fileValidation = await this.dbHandler.validateFeatureSlug(input.featureSlug);
      if (!fileValidation.valid) {
        throw new Error(`Invalid task file: ${fileValidation.error}`);
      }

      // 2. Load task file with lock
      const taskFile = await this.dbHandler.loadByFeatureSlugWithLock(input.featureSlug);

      // 3. Find specific task
      const task = taskFile.tasks.find((t) => t.taskId === input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      // 4. Find acceptance criterion
      const criterion = task.acceptanceCriteria.find((ac) => ac.id === input.criterionId);
      if (!criterion) {
        throw new Error(
          `Acceptance criterion not found: ${input.criterionId} in task ${input.taskId}`
        );
      }

      // 5. Update verification status
      criterion.verified = input.verified;

      // 6. Save atomically
      await this.dbHandler.saveByFeatureSlug(input.featureSlug, taskFile);

      return {
        success: true,
        taskId: input.taskId,
        criterionId: input.criterionId,
        verified: input.verified,
        message: `Acceptance criterion ${input.criterionId} marked as ${input.verified ? 'verified' : 'unverified'}`,
      };
    } catch (error) {
      return {
        success: false,
        taskId: input.taskId,
        criterionId: input.criterionId,
        verified: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all tasks with a specific status
   */
  async getTasksByStatus(input: GetTasksByStatusInput): Promise<GetTasksByStatusResult> {
    try {
      // Load task file (read-only)
      const taskFile = await this.dbHandler.loadByFeatureSlug(input.featureSlug);

      // Filter tasks by status
      const tasks = taskFile.tasks.filter((t) => t.status === input.status);

      return {
        success: true,
        tasks,
        count: tasks.length,
        message: `Found ${tasks.length} task(s) with status '${input.status}'`,
      };
    } catch (error) {
      return {
        success: false,
        tasks: [],
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify all tasks are complete
   */
  async verifyAllTasksComplete(
    input: VerifyAllTasksCompleteInput
  ): Promise<VerifyAllTasksCompleteResult> {
    try {
      // Load task file (read-only)
      const taskFile = await this.dbHandler.loadByFeatureSlug(input.featureSlug);

      const totalTasks = taskFile.tasks.length;
      const completedTasks = taskFile.tasks.filter((t) => t.status === 'Done').length;
      const incompleteTasks = taskFile.tasks
        .filter((t) => t.status !== 'Done')
        .map((t) => ({
          taskId: t.taskId,
          title: t.title,
          status: t.status,
        }));

      const allComplete = completedTasks === totalTasks;

      return {
        success: true,
        allComplete,
        totalTasks,
        completedTasks,
        incompleteTasks,
        message: allComplete
          ? 'All tasks are complete!'
          : `${completedTasks}/${totalTasks} tasks complete. ${incompleteTasks.length} task(s) remaining.`,
      };
    } catch (error) {
      return {
        success: false,
        allComplete: false,
        totalTasks: 0,
        completedTasks: 0,
        incompleteTasks: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
