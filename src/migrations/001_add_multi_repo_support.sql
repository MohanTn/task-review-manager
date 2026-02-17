-- ============================================================================
-- Migration 001: Add Multi-Repo Support
-- ============================================================================
-- This migration adds support for multiple repositories in a single database
-- ============================================================================

BEGIN TRANSACTION;

-- ----------------------------------------------------------------------------
-- 1. Create repos table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repos (
  repo_name TEXT PRIMARY KEY,
  repo_path TEXT NOT NULL,
  repo_url TEXT,
  default_branch TEXT DEFAULT 'main',
  created_at TEXT NOT NULL,
  last_accessed_at TEXT NOT NULL,
  metadata TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_repos_last_accessed ON repos(last_accessed_at DESC);

-- ----------------------------------------------------------------------------
-- 2. Add repo_name column to existing tables
-- ----------------------------------------------------------------------------

-- Add repo_name to features table
ALTER TABLE features ADD COLUMN repo_name TEXT;

-- Add repo_name to tasks table
ALTER TABLE tasks ADD COLUMN repo_name TEXT;

-- Add repo_name to transitions table
ALTER TABLE transitions ADD COLUMN repo_name TEXT;

-- Add repo_name to acceptance_criteria table
ALTER TABLE acceptance_criteria ADD COLUMN repo_name TEXT;

-- Add repo_name to test_scenarios table
ALTER TABLE test_scenarios ADD COLUMN repo_name TEXT;

-- Add repo_name to stakeholder_reviews table
ALTER TABLE stakeholder_reviews ADD COLUMN repo_name TEXT;

-- ----------------------------------------------------------------------------
-- 3. Migrate existing data to default repo
-- ----------------------------------------------------------------------------

-- Insert default repo (uses current working directory)
INSERT OR IGNORE INTO repos (repo_name, repo_path, created_at, last_accessed_at)
VALUES ('default', '', datetime('now'), datetime('now'));

-- Update all existing records to use 'default' repo
UPDATE features SET repo_name = 'default' WHERE repo_name IS NULL;
UPDATE tasks SET repo_name = 'default' WHERE repo_name IS NULL;
UPDATE transitions SET repo_name = 'default' WHERE repo_name IS NULL;
UPDATE acceptance_criteria SET repo_name = 'default' WHERE repo_name IS NULL;
UPDATE test_scenarios SET repo_name = 'default' WHERE repo_name IS NULL;
UPDATE stakeholder_reviews SET repo_name = 'default' WHERE repo_name IS NULL;

-- ----------------------------------------------------------------------------
-- 4. Create new refinement data tables
-- ----------------------------------------------------------------------------

-- Feature refinement steps
CREATE TABLE IF NOT EXISTS feature_refinement_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  summary TEXT,
  data TEXT, -- JSON
  UNIQUE(repo_name, feature_slug, step_number),
  FOREIGN KEY (repo_name) REFERENCES repos(repo_name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_steps_feature ON feature_refinement_steps(repo_name, feature_slug);

-- Feature-level acceptance criteria (separate from task-level)
CREATE TABLE IF NOT EXISTS feature_acceptance_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  criterion TEXT NOT NULL,
  priority TEXT NOT NULL,
  source TEXT DEFAULT 'generated',
  created_at TEXT NOT NULL,
  UNIQUE(repo_name, feature_slug, criterion_id),
  FOREIGN KEY (repo_name) REFERENCES repos(repo_name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_criteria ON feature_acceptance_criteria(repo_name, feature_slug);

-- Feature-level test scenarios (separate from task-level)
CREATE TABLE IF NOT EXISTS feature_test_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,
  type TEXT DEFAULT 'automated',
  preconditions TEXT,
  expected_result TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(repo_name, feature_slug, scenario_id),
  FOREIGN KEY (repo_name) REFERENCES repos(repo_name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_scenarios ON feature_test_scenarios(repo_name, feature_slug);

-- Feature clarifications (Q&A from Step 3)
CREATE TABLE IF NOT EXISTS feature_clarifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  asked_at TEXT NOT NULL,
  answered_at TEXT,
  asked_by TEXT DEFAULT 'llm',
  FOREIGN KEY (repo_name) REFERENCES repos(repo_name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clarifications_feature ON feature_clarifications(repo_name, feature_slug);

-- Feature attachments (analyzed in Step 2)
CREATE TABLE IF NOT EXISTS feature_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_name TEXT NOT NULL,
  feature_slug TEXT NOT NULL,
  attachment_name TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  analysis_summary TEXT,
  extracted_data TEXT, -- JSON
  analyzed_at TEXT NOT NULL,
  FOREIGN KEY (repo_name) REFERENCES repos(repo_name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_feature ON feature_attachments(repo_name, feature_slug);

-- ----------------------------------------------------------------------------
-- 5. Create views for easier querying
-- ----------------------------------------------------------------------------

-- Feature refinement progress view
CREATE VIEW IF NOT EXISTS v_feature_refinement_progress AS
SELECT
  f.repo_name,
  f.feature_slug,
  f.feature_name,
  COUNT(frs.id) as total_steps,
  SUM(CASE WHEN frs.completed = 1 THEN 1 ELSE 0 END) as completed_steps,
  ROUND(100.0 * SUM(CASE WHEN frs.completed = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(frs.id), 0), 2) as progress_percentage
FROM features f
LEFT JOIN feature_refinement_steps frs ON f.repo_name = frs.repo_name AND f.feature_slug = frs.feature_slug
GROUP BY f.repo_name, f.feature_slug, f.feature_name;

-- Task status summary by feature
CREATE VIEW IF NOT EXISTS v_task_status_summary AS
SELECT
  t.repo_name,
  t.feature_slug,
  t.status,
  COUNT(*) as task_count
FROM tasks t
GROUP BY t.repo_name, t.feature_slug, t.status;

-- Repository summary
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
GROUP BY r.repo_name, r.repo_path, r.last_accessed_at;

-- ----------------------------------------------------------------------------
-- 6. Update indexes for multi-repo queries
-- ----------------------------------------------------------------------------

-- Drop old indexes
DROP INDEX IF EXISTS idx_tasks_feature;
DROP INDEX IF EXISTS idx_transitions_task;
DROP INDEX IF EXISTS idx_acceptance_criteria_task;
DROP INDEX IF EXISTS idx_test_scenarios_task;
DROP INDEX IF EXISTS idx_stakeholder_reviews_task;

-- Create new composite indexes with repo_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_features_repo_slug ON features(repo_name, feature_slug);
CREATE INDEX IF NOT EXISTS idx_tasks_repo_feature ON tasks(repo_name, feature_slug);
CREATE INDEX IF NOT EXISTS idx_transitions_repo_task ON transitions(repo_name, feature_slug, task_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_repo_task ON acceptance_criteria(repo_name, feature_slug, task_id);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_repo_task ON test_scenarios(repo_name, feature_slug, task_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_reviews_repo_task ON stakeholder_reviews(repo_name, feature_slug, task_id);

-- Keep status index
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

COMMIT;
