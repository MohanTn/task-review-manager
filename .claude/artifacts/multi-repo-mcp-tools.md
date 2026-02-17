# Multi-Repo MCP Tools Specification

## Overview
New and updated MCP tools to support multi-repo refinement workflow without .md files.

---

## 🔧 **Repo Management Tools**

### 1. `register_repo`
**Purpose**: Register a git repository with the MCP server

```typescript
{
  name: 'register_repo',
  description: 'Register a git repository to use with the task review manager. Call this once per repo.',
  inputSchema: {
    repoName: string,        // Git repo name (e.g., "task-review-manager")
    repoPath: string,        // Absolute path on disk
    repoUrl?: string,        // Git remote URL (optional)
    defaultBranch?: string,  // Default branch (default: "main")
    metadata?: {             // Optional repo config
      jiraProjectKey?: string,
      teamName?: string,
      slackChannel?: string
    }
  },
  returns: {
    success: boolean,
    repoName: string,
    message: string
  }
}
```

**Example**:
```javascript
register_repo(
  repoName: "task-review-manager",
  repoPath: "C:\\Users\\mohan\\REPO\\task-review-manager",
  repoUrl: "https://github.com/user/task-review-manager",
  metadata: {
    jiraProjectKey: "TRM"
  }
)
```

---

### 2. `list_repos`
**Purpose**: List all registered repositories

```typescript
{
  name: 'list_repos',
  description: 'List all registered repositories with their feature counts',
  inputSchema: {},
  returns: {
    success: boolean,
    repos: Array<{
      repoName: string,
      repoPath: string,
      featureCount: number,
      totalTasks: number,
      completedTasks: number,
      lastAccessed: string
    }>,
    message: string
  }
}
```

---

### 3. `get_current_repo`
**Purpose**: Auto-detect current repository from working directory

```typescript
{
  name: 'get_current_repo',
  description: 'Detect the current repository based on the working directory. Use this at the start of refine-feature workflow.',
  inputSchema: {},
  returns: {
    success: boolean,
    repoName: string,
    repoPath: string,
    registered: boolean,  // Whether repo is already registered
    message: string
  }
}
```

---

## 📝 **Feature Refinement Tools (Updated for Multi-Repo)**

### 4. `create_feature` (UPDATED)
**Purpose**: Create a new feature in a specific repo

```typescript
{
  name: 'create_feature',
  description: 'Create a new feature in a repository. This initializes the refinement workflow.',
  inputSchema: {
    repoName: string,        // REQUIRED: Which repo this feature belongs to
    featureSlug: string,
    featureName: string,
    jiraTicketKey?: string   // Optional Jira reference
  },
  returns: {
    success: boolean,
    repoName: string,
    featureSlug: string,
    message: string,
    stepInitialized: Array<{  // Auto-creates 8 refinement step records
      stepNumber: number,
      stepName: string,
      completed: false
    }>
  }
}
```

**Auto-creates step records**:
```sql
INSERT INTO feature_refinement_steps VALUES
  (repo, feature, 1, 'step1', false, null, null, null),
  (repo, feature, 2, 'step2', false, null, null, null),
  ...
  (repo, feature, 8, 'step8', false, null, null, null);
```

---

### 5. `update_refinement_step` (NEW)
**Purpose**: Mark a refinement step as complete with data

```typescript
{
  name: 'update_refinement_step',
  description: 'Update a refinement step status and store step data. USE THIS INSTEAD OF writing to .md files.',
  inputSchema: {
    repoName: string,
    featureSlug: string,
    stepNumber: number,      // 1-8
    completed: boolean,
    summary: string,         // Brief summary for progress tracking
    data?: object           // Step-specific data (varies by step)
  },
  returns: {
    success: boolean,
    stepNumber: number,
    completed: boolean,
    message: string
  }
}
```

**Example for Step 1**:
```javascript
update_refinement_step(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  stepNumber: 1,
  completed: true,
  summary: "Determined scope: Feature enhancement for multi-repo support",
  data: {
    scope: "feature enhancement",
    context: "Adding multi-repo support to task review manager",
    keyRequirements: [
      "Single tasks.db file",
      "Repo namespace isolation",
      "Dashboard repo selector"
    ]
  }
)
```

**Example for Step 2**:
```javascript
update_refinement_step(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  stepNumber: 2,
  completed: true,
  summary: "Analyzed 3 attachments: schema diagram, workflow doc, example data",
  data: {
    attachmentsAnalyzed: 3,
    insights: [
      "Schema needs repo_name in all tables",
      "Dashboard requires dropdown UI component",
      "Migration required for existing data"
    ]
  }
)
```

---

### 6. `add_acceptance_criteria` (NEW)
**Purpose**: Add acceptance criteria to feature (Step 4)

```typescript
{
  name: 'add_acceptance_criteria',
  description: 'Add SMART acceptance criteria to a feature. Call this in Step 4 instead of writing to .md file.',
  inputSchema: {
    repoName: string,
    featureSlug: string,
    criteria: Array<{
      criterionId: string,   // AC-1, AC-2, etc.
      criterion: string,     // The actual criterion text
      priority: 'Must Have' | 'Should Have' | 'Could Have',
      source?: string        // 'user', 'generated', 'attachment'
    }>
  },
  returns: {
    success: boolean,
    criteriaAdded: number,
    message: string
  }
}
```

**Example**:
```javascript
add_acceptance_criteria(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  criteria: [
    {
      criterionId: "AC-1",
      criterion: "System must store data from multiple repositories in a single tasks.db file",
      priority: "Must Have",
      source: "generated"
    },
    {
      criterionId: "AC-2",
      criterion: "Dashboard must display a repository selector dropdown before the feature dropdown",
      priority: "Must Have",
      source: "generated"
    },
    {
      criterionId: "AC-3",
      criterion: "All database queries must be scoped by repo_name to prevent cross-repo data leakage",
      priority: "Must Have",
      source: "generated"
    }
  ]
)
```

---

### 7. `add_test_scenarios` (NEW)
**Purpose**: Add test scenarios to feature (Step 5)

```typescript
{
  name: 'add_test_scenarios',
  description: 'Add test scenarios to a feature. Call this in Step 5 instead of writing to .md file.',
  inputSchema: {
    repoName: string,
    featureSlug: string,
    scenarios: Array<{
      scenarioId: string,      // TS-1, TS-2, etc.
      title: string,
      description: string,
      priority: 'P0' | 'P1' | 'P2' | 'P3',
      type?: 'automated' | 'manual' | 'both',
      preconditions?: string,
      expectedResult?: string
    }>
  },
  returns: {
    success: boolean,
    scenariosAdded: number,
    message: string
  }
}
```

---

### 8. `add_clarification` (NEW)
**Purpose**: Record Q&A from Step 3

```typescript
{
  name: 'add_clarification',
  description: 'Record a clarification question and answer. Call this in Step 3 for each Q&A pair.',
  inputSchema: {
    repoName: string,
    featureSlug: string,
    question: string,
    answer?: string,         // Optional - can add question first, then update with answer
    askedBy?: string        // 'llm' or 'user' (default: 'llm')
  },
  returns: {
    success: boolean,
    clarificationId: number,
    message: string
  }
}
```

---

### 9. `add_attachment_analysis` (NEW)
**Purpose**: Store attachment analysis from Step 2

```typescript
{
  name: 'add_attachment_analysis',
  description: 'Store analysis of an attachment (Excel, image, document). Call this in Step 2 for each attachment.',
  inputSchema: {
    repoName: string,
    featureSlug: string,
    attachmentName: string,
    attachmentType: 'excel' | 'image' | 'document' | 'design',
    filePath?: string,        // Local file path
    fileUrl?: string,         // Remote URL (e.g., Jira)
    analysisSummary: string,  // Human-readable summary
    extractedData?: object    // Structured data (columns, designs, etc.)
  },
  returns: {
    success: boolean,
    attachmentId: number,
    message: string
  }
}
```

---

### 10. `get_refinement_status` (NEW)
**Purpose**: Get current refinement progress

```typescript
{
  name: 'get_refinement_status',
  description: 'Get the current refinement status for a feature. Use this to check progress or resume work.',
  inputSchema: {
    repoName: string,
    featureSlug: string
  },
  returns: {
    success: boolean,
    repoName: string,
    featureSlug: string,
    featureName: string,
    refinementStatus: 'not_started' | 'in_progress' | 'completed',
    currentStep: 'step1' | 'step2' | ... | 'step8',
    progressPercentage: number,
    completedSteps: number,
    totalSteps: number,
    steps: Array<{
      stepNumber: number,
      stepName: string,
      completed: boolean,
      completedAt: string | null,
      summary: string | null
    }>,
    acceptanceCriteriaCount: number,
    testScenariosCount: number,
    clarificationsCount: number,
    tasksCount: number
  }
}
```

---

### 11. `generate_refinement_report` (NEW)
**Purpose**: Generate markdown/HTML report from database

```typescript
{
  name: 'generate_refinement_report',
  description: 'Generate a report from refinement data stored in database. Only use this when user requests documentation.',
  inputSchema: {
    repoName: string,
    featureSlug: string,
    format: 'markdown' | 'html' | 'json',
    outputPath?: string,      // Optional: write to file
    includeSections?: Array<  // Optional: filter sections
      'summary' | 'scope' | 'attachments' | 'clarifications' |
      'acceptance_criteria' | 'test_scenarios' | 'tasks' | 'stakeholder_reviews'
    >
  },
  returns: {
    success: boolean,
    format: string,
    content: string,          // Generated report content
    sectionsIncluded: string[],
    filePath?: string,        // If outputPath was provided
    message: string
  }
}
```

---

## 📋 **Task Management Tools (Updated for Multi-Repo)**

### 12. `add_task` (UPDATED)
Add `repoName` parameter:

```typescript
{
  name: 'add_task',
  inputSchema: {
    repoName: string,        // NEW: Required
    featureSlug: string,
    taskId: string,
    // ... rest of parameters unchanged
  }
}
```

### 13. `get_tasks_by_status` (UPDATED)
Add `repoName` parameter:

```typescript
{
  name: 'get_tasks_by_status',
  inputSchema: {
    repoName: string,        // NEW: Required
    featureSlug: string,
    status: string
  }
}
```

### 14. `get_next_step` (UPDATED)
Add `repoName` parameter:

```typescript
{
  name: 'get_next_step',
  inputSchema: {
    repoName: string,        // NEW: Required
    featureSlug: string,
    taskId: string
  }
}
```

### 15. ALL other existing task tools updated similarly
- `add_stakeholder_review`
- `get_task_status`
- `transition_task_status`
- `get_next_task`
- `update_acceptance_criteria`
- `verify_all_tasks_complete`
- `update_task`
- `delete_task`

All get `repoName` as first parameter.

---

## 🎯 **Tool Usage in Updated refine-feature Workflow**

### **Step 0: Initialize Repository Context**
```javascript
// Auto-detect current repo
const repo = await get_current_repo();

// If not registered, register it
if (!repo.registered) {
  await register_repo(
    repoName: repo.repoName,
    repoPath: repo.repoPath
  );
}
```

### **Step 1: Determine Scope**
```javascript
// Instead of: "add Step 1 completed into output file"
await update_refinement_step(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  stepNumber: 1,
  completed: true,
  summary: "Scope determined: Feature enhancement",
  data: {
    scope: "feature enhancement",
    context: "Adding multi-repo support"
  }
);
```

### **Step 2: Analyze Attachments**
```javascript
// For each attachment
await add_attachment_analysis(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  attachmentName: "schema-diagram.png",
  attachmentType: "design",
  analysisSummary: "Database schema showing multi-tenant structure",
  extractedData: {
    tables: ["repos", "features", "tasks"],
    relationships: ["repos->features", "features->tasks"]
  }
);

// Mark step complete
await update_refinement_step(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  stepNumber: 2,
  completed: true,
  summary: "Analyzed 3 attachments"
);
```

### **Step 3: Clarifications**
```javascript
// Add question
const q1 = await add_clarification(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  question: "Should we support cross-repo task dependencies?"
);

// ... user answers ...

// Update with answer
await add_clarification(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  question: "Should we support cross-repo task dependencies?",
  answer: "No, keep each repo isolated for simplicity"
);

// Mark step complete
await update_refinement_step(...stepNumber: 3, completed: true...);
```

### **Step 4: Acceptance Criteria**
```javascript
await add_acceptance_criteria(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  criteria: [...]
);

await update_refinement_step(...stepNumber: 4, completed: true...);
```

### **Step 5: Test Scenarios**
```javascript
await add_test_scenarios(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  scenarios: [...]
);

await update_refinement_step(...stepNumber: 5, completed: true...);
```

### **Step 6: Create Tasks**
```javascript
// Already using MCP tools
await create_feature(...);
await add_task(repoName: "...", ...);

await update_refinement_step(...stepNumber: 6, completed: true...);
```

### **Step 7: Stakeholder Reviews**
```javascript
// Already using MCP tools (updated with repoName)

await update_refinement_step(...stepNumber: 7, completed: true...);
```

### **Step 8: Finalize**
```javascript
// Optional: Generate report for archival
await generate_refinement_report(
  repoName: "task-review-manager",
  featureSlug: "multi-repo-support",
  format: "markdown",
  outputPath: ".claude/artifacts/multi-repo-support/final-report.md"
);

await update_refinement_step(...stepNumber: 8, completed: true...);
```

---

## 📊 **Benefits Summary**

### **For LLM**:
1. ✅ **No string manipulation** - Just call structured tools
2. ✅ **Clear success/failure** - Each tool returns explicit status
3. ✅ **Auto-validation** - Database enforces constraints
4. ✅ **Resumable** - Query current state anytime with `get_refinement_status`
5. ✅ **Multi-repo aware** - Explicit `repoName` parameter prevents errors

### **For Users**:
1. ✅ **Single database** - All repos in one `tasks.db` file
2. ✅ **Isolated data** - Repo namespacing prevents cross-contamination
3. ✅ **Dashboard support** - Repo selector dropdown for easy navigation
4. ✅ **Optional reports** - Generate `.md` files only when needed
5. ✅ **Query flexibility** - Rich views and queries across all repos
