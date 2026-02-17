-- ============================================================================
-- Multi-Repo Task Review Manager Database Schema
-- Single tasks.db file supporting multiple git repositories
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REPOS TABLE - Track all repositories using this MCP server
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repos (
  repo_name TEXT PRIMARY KEY,              -- Git repo name (e.g., "task-review-manager")
  repo_path TEXT NOT NULL,                 -- Absolute path to repo on disk
  repo_url TEXT,                           -- Git remote URL (optional)
  default_branch TEXT DEFAULT 'main',      -- Default branch name
  created_at TEXT NOT NULL,                -- ISO timestamp
  last_accessed_at TEXT NOT NULL,          -- ISO timestamp (updated on each query)
  metadata JSON                            -- Additional repo config (e.g., jira project key)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_repos_last_accessed ON repos(last_accessed_at DESC);

-- ----------------------------------------------------------------------------
-- 2. FEATURES TABLE - Track features across repos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,                 -- Links to repos table
  feature_slug TEXT NOT NULL,              -- URL-friendly slug (unique per repo)
  feature_name TEXT NOT NULL,              -- Human-readable name
  jira_ticket_key TEXT,                    -- Optional Jira reference
  refinement_status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed
  current_step TEXT DEFAULT 'step1',       -- Current refinement step (step1-step8)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  -- Refinement metadata (replaces .md file)
  refinement_metadata JSON,                -- Step progress and data

  UNIQUE(repo_name, feature_slug),
  FOREIGN KEY (repo_name) REFERENCES repos(repo_name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_features_repo ON features(repo_name);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(refinement_status);

-- ----------------------------------------------------------------------------
-- 3. FEATURE_REFINEMENT_STEPS - Track step-by-step progress
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_refinement_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  step_number INTEGER NOT NULL,            -- 1-8
  step_name TEXT NOT NULL,                 -- 'step1', 'step2', etc.
  completed BOOLEAN DEFAULT 0,
  completed_at TEXT,
  summary TEXT,                            -- Brief summary of step completion
  data JSON,                               -- Step-specific data

  UNIQUE(repo_name, feature_slug, step_number),
  FOREIGN KEY (repo_name, feature_slug) REFERENCES features(repo_name, feature_slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_steps_feature ON feature_refinement_steps(repo_name, feature_slug);

-- ----------------------------------------------------------------------------
-- 4. FEATURE_ACCEPTANCE_CRITERIA - Store SMART acceptance criteria
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_acceptance_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  criterion_id TEXT NOT NULL,              -- AC-1, AC-2, etc.
  criterion TEXT NOT NULL,                 -- The actual criterion text
  priority TEXT NOT NULL,                  -- 'Must Have', 'Should Have', 'Could Have'
  source TEXT DEFAULT 'generated',         -- 'user', 'generated', 'attachment'
  created_at TEXT NOT NULL,

  UNIQUE(repo_name, feature_slug, criterion_id),
  FOREIGN KEY (repo_name, feature_slug) REFERENCES features(repo_name, feature_slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_criteria_feature ON feature_acceptance_criteria(repo_name, feature_slug);

-- ----------------------------------------------------------------------------
-- 5. FEATURE_TEST_SCENARIOS - Store test scenarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_test_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  scenario_id TEXT NOT NULL,               -- TS-1, TS-2, etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,                  -- 'P0', 'P1', 'P2', 'P3'
  type TEXT DEFAULT 'automated',           -- 'automated', 'manual', 'both'
  preconditions TEXT,                      -- Setup required
  expected_result TEXT,                    -- Expected outcome
  created_at TEXT NOT NULL,

  UNIQUE(repo_name, feature_slug, scenario_id),
  FOREIGN KEY (repo_name, feature_slug) REFERENCES features(repo_name, feature_slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scenarios_feature ON feature_test_scenarios(repo_name, feature_slug);

-- ----------------------------------------------------------------------------
-- 6. FEATURE_CLARIFICATIONS - Store Q&A from Step 3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_clarifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,                             -- NULL if not yet answered
  asked_at TEXT NOT NULL,
  answered_at TEXT,
  asked_by TEXT DEFAULT 'llm',             -- 'llm' or 'user'

  FOREIGN KEY (repo_name, feature_slug) REFERENCES features(repo_name, feature_slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clarifications_feature ON feature_clarifications(repo_name, feature_slug);

-- ----------------------------------------------------------------------------
-- 7. FEATURE_ATTACHMENTS - Track analyzed attachments (Step 2)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  attachment_name TEXT NOT NULL,
  attachment_type TEXT NOT NULL,           -- 'excel', 'image', 'document', 'design'
  file_path TEXT,                          -- Path to file (if local)
  file_url TEXT,                           -- URL (if remote, e.g., Jira)
  analysis_summary TEXT,                   -- Extracted insights
  extracted_data JSON,                     -- Structured data (columns, designs, etc.)
  analyzed_at TEXT NOT NULL,

  FOREIGN KEY (repo_name, feature_slug) REFERENCES features(repo_name, feature_slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_feature ON feature_attachments(repo_name, feature_slug);

-- ----------------------------------------------------------------------------
-- 8. TASKS TABLE - Updated with repo_name
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,                 -- NEW: Links to repos table
  feature_slug TEXT NOT NULL,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  order_of_execution INTEGER NOT NULL,
  estimated_hours REAL,
  dependencies TEXT,                       -- JSON array of task IDs
  tags TEXT,                               -- JSON array of tags
  out_of_scope TEXT,                       -- JSON array of out-of-scope items
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  UNIQUE(repo_name, feature_slug, task_id),
  FOREIGN KEY (repo_name, feature_slug) REFERENCES features(repo_name, feature_slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_repo ON tasks(repo_name);
CREATE INDEX IF NOT EXISTS idx_tasks_feature ON tasks(repo_name, feature_slug);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ----------------------------------------------------------------------------
-- 9. TASK_ACCEPTANCE_CRITERIA - Task-level acceptance criteria
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_acceptance_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  task_id TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  criterion TEXT NOT NULL,
  priority TEXT NOT NULL,
  verified BOOLEAN DEFAULT 0,

  UNIQUE(repo_name, feature_slug, task_id, criterion_id),
  FOREIGN KEY (repo_name, feature_slug, task_id) REFERENCES tasks(repo_name, feature_slug, task_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_criteria ON task_acceptance_criteria(repo_name, feature_slug, task_id);

-- ----------------------------------------------------------------------------
-- 10. TASK_TEST_SCENARIOS - Task-level test scenarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_test_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  task_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,
  manual_only BOOLEAN DEFAULT 0,

  UNIQUE(repo_name, feature_slug, task_id, scenario_id),
  FOREIGN KEY (repo_name, feature_slug, task_id) REFERENCES tasks(repo_name, feature_slug, task_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_scenarios ON task_test_scenarios(repo_name, feature_slug, task_id);

-- ----------------------------------------------------------------------------
-- 11. TASK_TRANSITIONS - Task status changes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,                 -- NEW
  feature_slug TEXT NOT NULL,
  task_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor TEXT,                              -- Who/what triggered transition
  approver TEXT,                           -- For stakeholder approvals
  timestamp TEXT NOT NULL,
  notes TEXT,
  metadata JSON,                           -- Additional transition data

  FOREIGN KEY (repo_name, feature_slug, task_id) REFERENCES tasks(repo_name, feature_slug, task_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transitions_task ON task_transitions(repo_name, feature_slug, task_id);

-- ----------------------------------------------------------------------------
-- 12. STAKEHOLDER_REVIEWS - Stakeholder review data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stakeholder_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,                 -- NEW
  feature_slug TEXT NOT NULL,
  task_id TEXT NOT NULL,
  stakeholder TEXT NOT NULL,
  approved BOOLEAN NOT NULL,
  notes TEXT,
  reviewed_at TEXT NOT NULL,

  -- Role-specific fields (stored as JSON for flexibility)
  additional_fields JSON,

  UNIQUE(repo_name, feature_slug, task_id, stakeholder),
  FOREIGN KEY (repo_name, feature_slug, task_id) REFERENCES tasks(repo_name, feature_slug, task_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_task ON stakeholder_reviews(repo_name, feature_slug, task_id);

-- ============================================================================
-- VIEWS for easier querying
-- ============================================================================

-- View: Feature refinement progress
CREATE VIEW IF NOT EXISTS v_feature_refinement_progress AS
SELECT
  f.repo_name,
  f.feature_slug,
  f.feature_name,
  f.refinement_status,
  f.current_step,
  COUNT(frs.id) as total_steps,
  SUM(CASE WHEN frs.completed = 1 THEN 1 ELSE 0 END) as completed_steps,
  ROUND(100.0 * SUM(CASE WHEN frs.completed = 1 THEN 1 ELSE 0 END) / COUNT(frs.id), 2) as progress_percentage
FROM features f
LEFT JOIN feature_refinement_steps frs ON f.repo_name = frs.repo_name AND f.feature_slug = frs.feature_slug
GROUP BY f.repo_name, f.feature_slug;

-- View: Task status summary by feature
CREATE VIEW IF NOT EXISTS v_task_status_summary AS
SELECT
  t.repo_name,
  t.feature_slug,
  t.status,
  COUNT(*) as task_count
FROM tasks t
GROUP BY t.repo_name, t.feature_slug, t.status;

-- View: Repository summary
CREATE VIEW IF NOT EXISTS v_repo_summary AS
SELECT
  r.repo_name,
  r.repo_path,
  r.last_accessed_at,
  COUNT(DISTINCT f.feature_slug) as feature_count,
  COUNT(DISTINCT t.task_id) as total_tasks,
  SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as completed_tasks
FROM repos r
LEFT JOIN features f ON r.repo_name = f.repo_name
LEFT JOIN tasks t ON f.repo_name = t.repo_name AND f.feature_slug = t.feature_slug
GROUP BY r.repo_name;

-- ============================================================================
-- TRIGGERS for automatic timestamp updates
-- ============================================================================

-- Update repos.last_accessed_at on any feature query
CREATE TRIGGER IF NOT EXISTS update_repo_last_accessed
AFTER INSERT ON features
BEGIN
  UPDATE repos SET last_accessed_at = datetime('now') WHERE repo_name = NEW.repo_name;
END;

-- Update features.updated_at on any change
CREATE TRIGGER IF NOT EXISTS update_feature_timestamp
AFTER UPDATE ON features
BEGIN
  UPDATE features SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update tasks.updated_at on any change
CREATE TRIGGER IF NOT EXISTS update_task_timestamp
AFTER UPDATE ON tasks
BEGIN
  UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample repo
INSERT OR IGNORE INTO repos (repo_name, repo_path, repo_url, created_at, last_accessed_at)
VALUES ('task-review-manager', 'C:\Users\mohan\REPO\task-review-manager', 'https://github.com/user/task-review-manager', datetime('now'), datetime('now'));

-- Initialize refinement steps template (will be copied for each new feature)
-- This is a template - actual step records are created when a feature is created
