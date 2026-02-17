# Dashboard Multi-Repo Specification

## Overview
Update the existing dashboard to support multiple repositories with a cascading selector interface.

---

## 🎨 **UI Layout (Updated)**

```
┌─────────────────────────────────────────────────────────────────┐
│  Task Review Manager Dashboard                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📁 Repository: [▼ task-review-manager           ] (Dropdown 1)│
│                                                                  │
│  📦 Feature:    [▼ multi-repo-support           ] (Dropdown 2) │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Feature: multi-repo-support                                    │
│  Status: In Progress (Step 5/8 - 62.5% complete)               │
│                                                                  │
│  Refinement Progress:                                           │
│  ✅ Step 1: Determine Scope             [Completed]            │
│  ✅ Step 2: Analyze Attachments         [Completed]            │
│  ✅ Step 3: Clarify Ambiguities         [Completed]            │
│  ✅ Step 4: Acceptance Criteria         [Completed]            │
│  🔄 Step 5: Test Scenarios              [In Progress]          │
│  ⏸️ Step 6: Task Breakdown              [Pending]              │
│  ⏸️ Step 7: Stakeholder Reviews         [Pending]              │
│  ⏸️ Step 8: Finalize                    [Pending]              │
│                                                                  │
│  Tasks: 6 total                                                 │
│  ├─ Ready for Development: 0                                    │
│  ├─ In Progress: 0                                              │
│  ├─ In Review: 0                                                │
│  ├─ In QA: 0                                                    │
│  └─ Done: 0                                                     │
│                                                                  │
│  [View Tasks →]  [View Acceptance Criteria →]  [View Report →] │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Cascading Dropdown Behavior**

### **Dropdown 1: Repository Selector**
**Purpose**: Select which repository to view

**Data Source**: Query `repos` table
```sql
SELECT repo_name,
       (SELECT COUNT(*) FROM features WHERE repo_name = repos.repo_name) as feature_count,
       last_accessed_at
FROM repos
ORDER BY last_accessed_at DESC;
```

**Options Display Format**:
```
task-review-manager (5 features)
my-frontend-app (2 features)
api-backend (8 features)
```

**Default Selection**: Most recently accessed repo

**On Change**:
1. Clear Feature dropdown (Dropdown 2)
2. Load features for selected repo
3. Update dashboard to show "Select a feature" message

---

### **Dropdown 2: Feature Selector**
**Purpose**: Select which feature to view within the selected repo

**Data Source**: Query `features` table filtered by selected repo
```sql
SELECT feature_slug,
       feature_name,
       refinement_status,
       current_step,
       (SELECT COUNT(*) FROM tasks WHERE repo_name = features.repo_name AND feature_slug = features.feature_slug) as task_count
FROM features
WHERE repo_name = ?
ORDER BY updated_at DESC;
```

**Options Display Format**:
```
multi-repo-support - Multi-Repo Support (In Progress - Step 5/8, 6 tasks)
user-authentication - User Authentication (Completed - 12 tasks)
dark-mode - Dark Mode Theme (Not Started, 0 tasks)
```

**Default Selection**: Most recently updated feature

**On Change**:
1. Load feature refinement status
2. Load task summary
3. Update dashboard content

---

## 📊 **Dashboard Sections (Updated)**

### **Section 1: Repository Summary** (NEW)
Shows high-level stats for the selected repository:

```
Repository: task-review-manager
Path: C:\Users\mohan\REPO\task-review-manager
Features: 5 (2 completed, 2 in progress, 1 not started)
Total Tasks: 43 (25 done, 8 in progress, 10 pending)
Last Active: 2 hours ago
```

### **Section 2: Feature Overview**
Shows feature-level information:

```
Feature: multi-repo-support
Name: Multi-Repo Support for Task Review Manager
Jira: TRM-456
Status: In Progress
Current Step: Step 5 (Test Scenarios)
Progress: 62.5% (5/8 steps complete)
```

### **Section 3: Refinement Progress**
Shows step-by-step progress (same as current dashboard)

```
✅ Step 1: Determine Scope
   Summary: Determined scope: Feature enhancement
   Completed: 2024-02-17 10:30:00

✅ Step 2: Analyze Attachments
   Summary: Analyzed 3 attachments: schema, workflow, examples
   Completed: 2024-02-17 11:15:00

...
```

### **Section 4: Task Summary**
Shows task status breakdown (same as current dashboard)

```
Tasks: 6 total
Status Breakdown:
  - Pending Product Director: 6
  - Ready for Development: 0
  - In Progress: 0
  - Done: 0
```

### **Section 5: Acceptance Criteria** (NEW - Collapsible)
Shows feature-level acceptance criteria:

```
▼ Acceptance Criteria (5)

  Must Have (3):
  ✓ AC-1: System must store data from multiple repositories in single tasks.db file
  ⏸ AC-2: Dashboard must display repository selector before feature dropdown
  ⏸ AC-3: All queries must be scoped by repo_name

  Should Have (2):
  ⏸ AC-4: Support repo-level configuration (Jira project key, team name)
  ⏸ AC-5: Show repo-level statistics in dashboard
```

### **Section 6: Test Scenarios** (NEW - Collapsible)
Shows feature-level test scenarios:

```
▼ Test Scenarios (8)

  P0 - Critical (4):
  TS-1: Create feature in repo A, verify isolated from repo B
  TS-2: Dashboard shows correct repo in dropdown after selection
  TS-3: Task queries return only tasks for selected repo
  TS-4: Stakeholder reviews scoped to correct repo

  P1 - High (3):
  TS-5: Multiple repos can be registered simultaneously
  ...
```

### **Section 7: Quick Actions**
Buttons for common actions:

```
[Generate Report] [View All Tasks] [Export to JSON] [Refresh Data]
```

---

## 🛠️ **API Endpoints (Dashboard Backend)**

### **GET /api/repos**
List all registered repositories

**Response**:
```json
{
  "repos": [
    {
      "repoName": "task-review-manager",
      "repoPath": "C:\\Users\\mohan\\REPO\\task-review-manager",
      "featureCount": 5,
      "totalTasks": 43,
      "completedTasks": 25,
      "lastAccessedAt": "2024-02-17T14:30:00Z"
    },
    {
      "repoName": "my-frontend-app",
      "repoPath": "C:\\Users\\mohan\\REPO\\my-frontend-app",
      "featureCount": 2,
      "totalTasks": 8,
      "completedTasks": 3,
      "lastAccessedAt": "2024-02-16T09:15:00Z"
    }
  ]
}
```

### **GET /api/repos/:repoName/features**
List features for a specific repository

**Response**:
```json
{
  "repoName": "task-review-manager",
  "features": [
    {
      "featureSlug": "multi-repo-support",
      "featureName": "Multi-Repo Support",
      "refinementStatus": "in_progress",
      "currentStep": "step5",
      "progressPercentage": 62.5,
      "taskCount": 6,
      "updatedAt": "2024-02-17T14:30:00Z"
    },
    {
      "featureSlug": "user-authentication",
      "featureName": "User Authentication System",
      "refinementStatus": "completed",
      "currentStep": "step8",
      "progressPercentage": 100,
      "taskCount": 12,
      "updatedAt": "2024-02-15T10:00:00Z"
    }
  ]
}
```

### **GET /api/repos/:repoName/features/:featureSlug**
Get full feature details including refinement progress

**Response**:
```json
{
  "repoName": "task-review-manager",
  "featureSlug": "multi-repo-support",
  "featureName": "Multi-Repo Support",
  "jiraTicketKey": "TRM-456",
  "refinementStatus": "in_progress",
  "currentStep": "step5",
  "progressPercentage": 62.5,
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "step1",
      "completed": true,
      "completedAt": "2024-02-17T10:30:00Z",
      "summary": "Determined scope: Feature enhancement"
    },
    ...
  ],
  "acceptanceCriteria": [
    {
      "criterionId": "AC-1",
      "criterion": "System must store data from multiple repositories in single tasks.db file",
      "priority": "Must Have",
      "source": "generated"
    },
    ...
  ],
  "testScenarios": [
    {
      "scenarioId": "TS-1",
      "title": "Create feature in repo A, verify isolated from repo B",
      "description": "...",
      "priority": "P0",
      "type": "automated"
    },
    ...
  ],
  "tasks": {
    "total": 6,
    "byStatus": {
      "PendingProductDirector": 6,
      "ReadyForDevelopment": 0,
      "InProgress": 0,
      "Done": 0
    }
  }
}
```

---

## 💾 **Local Storage (Browser)**

Store user's last selection to persist across page refreshes:

```javascript
{
  "lastSelectedRepo": "task-review-manager",
  "lastSelectedFeature": "multi-repo-support"
}
```

**Behavior**:
- On dashboard load, read from localStorage
- If repo still exists, auto-select it
- If feature still exists in that repo, auto-select it
- Otherwise, select most recent repo/feature

---

## 🎯 **User Flow**

### **Scenario 1: First Time User**
1. User opens dashboard
2. System shows: "No repositories registered. Register a repo using MCP tool `register_repo`"
3. User registers repo via CLI/MCP
4. Dashboard auto-refreshes, shows repo in dropdown
5. User selects repo → features dropdown populates
6. User selects feature → dashboard shows details

### **Scenario 2: Returning User**
1. User opens dashboard
2. System auto-selects last used repo + feature from localStorage
3. Dashboard immediately shows that feature's data
4. User can switch repo/feature using dropdowns

### **Scenario 3: Multi-Repo Workflow**
1. User working on `task-review-manager` repo
2. Selects `task-review-manager` from Dropdown 1
3. Selects `multi-repo-support` from Dropdown 2
4. Views feature details, makes updates via MCP tools
5. Switches to `my-frontend-app` repo from Dropdown 1
6. Dropdown 2 updates to show features from `my-frontend-app`
7. Selects `dark-mode` feature
8. Views different feature's data
9. **Data is completely isolated - no cross-contamination**

---

## 🔒 **Data Isolation Guarantees**

All dashboard queries **MUST** be scoped by `repoName`:

```sql
-- BAD: Returns data from all repos
SELECT * FROM features WHERE feature_slug = 'user-auth';

-- GOOD: Returns data only from selected repo
SELECT * FROM features WHERE repo_name = 'task-review-manager' AND feature_slug = 'user-auth';
```

**Critical**: Every SQL query in dashboard backend must include `WHERE repo_name = ?`

---

## 🚀 **Implementation Checklist**

### **Backend (src/dashboard.ts)**
- [ ] Add `/api/repos` endpoint
- [ ] Add `/api/repos/:repoName/features` endpoint
- [ ] Update `/api/features/:featureSlug` to require `repoName` param
- [ ] Update all queries to include `repo_name` filter
- [ ] Add `v_repo_summary` view query

### **Frontend (dashboard HTML/JS)**
- [ ] Add Repository dropdown (Dropdown 1)
- [ ] Update Feature dropdown to be conditional on repo selection
- [ ] Add cascading behavior (repo change → clear feature → load new features)
- [ ] Add Repository Summary section
- [ ] Add localStorage for persistence
- [ ] Update all API calls to include `repoName`

### **Database**
- [ ] Create multi-repo schema (see multi-repo-schema.sql)
- [ ] Add `v_repo_summary` view
- [ ] Add `v_feature_refinement_progress` view
- [ ] Migrate existing data to include `repo_name`

### **MCP Tools**
- [ ] Implement new tools (see multi-repo-mcp-tools.md)
- [ ] Update existing tools to accept `repoName` parameter
- [ ] Add validation: reject if repo not registered

---

## 📱 **Responsive Design Notes**

On mobile/small screens:
- Stack dropdowns vertically
- Make dropdowns full-width
- Collapse sections by default
- Add "hamburger" menu for quick actions

---

## 🎨 **Color Coding (Suggested)**

```
Repositories: Blue theme   (🔵 task-review-manager)
Features:     Green theme  (🟢 multi-repo-support)
Tasks:        Orange theme (🟠 T01, T02, ...)
Steps:        Purple theme (🟣 Step 1, Step 2, ...)
```

Each entity type gets a consistent color for visual hierarchy.

---

## 🧪 **Testing Checklist**

- [ ] Register 3 different repos
- [ ] Create 2+ features in each repo
- [ ] Select repo A, verify only repo A features shown
- [ ] Select repo B, verify only repo B features shown
- [ ] Verify no data leakage (repo A tasks don't show in repo B view)
- [ ] Test localStorage persistence (refresh page, verify selections restored)
- [ ] Test with 0 repos (should show "Register a repo" message)
- [ ] Test with 1 repo, 0 features (should show "Create a feature" message)
- [ ] Test dropdown loading states
- [ ] Test error handling (repo deleted while viewing)

---

## 📊 **Performance Considerations**

**Query Optimization**:
- Add indexes on `(repo_name, feature_slug)`
- Add indexes on `(repo_name, updated_at DESC)`
- Use views for complex aggregations
- Cache repo list in memory (refresh every 5 minutes)

**Dashboard Loading**:
1. Load repo list (fast - cached)
2. On repo select, load feature list (fast - indexed)
3. On feature select, load full details (progressive - show steps first, then ACs/scenarios)

---

This specification ensures the dashboard provides a seamless multi-repo experience while maintaining complete data isolation! 🎯
