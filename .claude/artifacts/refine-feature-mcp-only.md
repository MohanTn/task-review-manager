---
name: refine-feature
description: This workflow refines a feature ticket by gathering context, analyzing attachments, clarifying ambiguities, generating SMART acceptance criteria and test scenarios. ALL data is stored in MCP database - NO .md file manipulation required.
---

# CRITICAL: This workflow uses MCP tools EXCLUSIVELY
**DO NOT create or update .md files during Steps 1-7. All data goes into the database via MCP tools.**

# Input
- Jira Ticket Key or feature description

# Output
- All refinement data stored in MCP database (tasks.db)
- Optional: Generate final report in Step 8 using `generate_refinement_report`

---

# Step 0 - Repository Context Initialization
**REQUIRED BEFORE ALL OTHER STEPS**

## 0.1 - Detect Current Repository
**REQUIRED TOOL CALL**: `get_current_repo()`

This auto-detects the repository from your current working directory.

**Expected response**:
```json
{
  "success": true,
  "repoName": "task-review-manager",
  "repoPath": "C:\\Users\\mohan\\REPO\\task-review-manager",
  "registered": true
}
```

## 0.2 - Register Repository (if needed)
**CONDITIONAL**: Only if `registered: false` in Step 0.1

**REQUIRED TOOL CALL**: `register_repo(repoName, repoPath, repoUrl)`

**Example**:
```javascript
register_repo(
  repoName: "task-review-manager",
  repoPath: "C:\\Users\\mohan\\REPO\\task-review-manager",
  repoUrl: "https://github.com/user/task-review-manager"
)
```

## 0.3 - Store Repository Context
After detecting/registering, store the `repoName` for use in ALL subsequent steps.

**YOU WILL USE THIS `repoName` IN EVERY MCP TOOL CALL BELOW.**

---

# Step 1 - Determine Scope
**GOAL**: Identify whether this is a feature enhancement, bug fix, or refinement

## 1.1 - Gather Context
- If Jira ticket provided: Fetch ticket details
- Ask user: What is the primary goal of this feature?
- Determine scope: feature enhancement | bug fix | refinement

## 1.2 - Record Scope in Database
**REQUIRED TOOL CALL**: `update_refinement_step`

```javascript
update_refinement_step(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  stepNumber: 1,
  completed: true,
  summary: "Determined scope: [feature enhancement/bug fix/refinement]",
  data: {
    scope: "feature enhancement",
    context: "Brief description of what this feature does",
    jiraTicketKey: "PROJ-123",
    keyRequirements: ["Requirement 1", "Requirement 2"]
  }
)
```

**❌ DO NOT**: Write to any .md file
**✅ DO**: Use `update_refinement_step` tool

---

# Step 2 - Analyze Attachments
**GOAL**: Extract information from Excel files, images, designs, documents

## 2.1 - For Each Attachment
Analyze each attachment type:
- **Excel files**: Extract columns, list items, data patterns
- **Images/designs**: Extract design elements, component structure using Figma tools if applicable
- **Documents**: Extract objectives, business rules, requirements

## 2.2 - Record Each Attachment Analysis
**REQUIRED TOOL CALL** (for each attachment): `add_attachment_analysis`

```javascript
add_attachment_analysis(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  attachmentName: "user-flow-diagram.png",
  attachmentType: "image",
  analysisSummary: "User flow showing login -> dashboard -> settings navigation",
  extractedData: {
    components: ["LoginPage", "Dashboard", "SettingsPanel"],
    interactions: ["onClick", "onSubmit"],
    states: ["loading", "authenticated", "error"]
  }
)
```

## 2.3 - Mark Step Complete
**REQUIRED TOOL CALL**: `update_refinement_step`

```javascript
update_refinement_step(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  stepNumber: 2,
  completed: true,
  summary: "Analyzed [N] attachments: [list types]",
  data: {
    attachmentsAnalyzed: 3,
    types: ["excel", "image", "document"],
    keyInsights: ["Insight 1", "Insight 2"]
  }
)
```

**❌ DO NOT**: Write to any .md file
**✅ DO**: Use `add_attachment_analysis` + `update_refinement_step`

---

# Step 3 - Clarify Ambiguities
**GOAL**: Identify unclear requirements and get user answers

## 3.1 - Identify Ambiguities
- Review Steps 1-2 data
- Do NOT ask about information already visible in attachments
- Identify specific unclear requirements

## 3.2 - For Each Question
**REQUIRED TOOL CALL**: `add_clarification`

```javascript
// Add question
add_clarification(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  question: "Should the feature support offline mode?",
  askedBy: "llm"
)
```

## 3.3 - Wait for User Answers

**CRITICAL**: STOP here and wait for user to provide answers.

## 3.4 - Record Answers
**REQUIRED TOOL CALL** (for each answered question): `add_clarification`

```javascript
add_clarification(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  question: "Should the feature support offline mode?",
  answer: "No, online-only for MVP. Offline can be added in v2.",
  askedBy: "llm"
)
```

## 3.5 - Mark Step Complete
**REQUIRED TOOL CALL**: `update_refinement_step`

```javascript
update_refinement_step(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  stepNumber: 3,
  completed: true,
  summary: "Clarified [N] ambiguities with user",
  data: {
    questionsAsked: 5,
    questionsAnswered: 5,
    keyDecisions: ["Decision 1", "Decision 2"]
  }
)
```

**❌ DO NOT**: Write to any .md file
**✅ DO**: Use `add_clarification` + `update_refinement_step`

---

# Step 4 - Generate SMART Acceptance Criteria
**GOAL**: Create 3-5 SMART acceptance criteria

## 4.1 - Create Acceptance Criteria
Generate 3-5 criteria following SMART principles:
- **Specific**: No vague language
- **Measurable**: Quantifiable outcomes
- **Achievable**: Technically feasible
- **Relevant**: Tied to the feature objective
- **Testable**: Can be verified with a test

Cover: happy path, edge cases, exceptions, database changes if applicable
Write each criterion as a clear, complete sentence in plain English

## 4.2 - Store Acceptance Criteria
**REQUIRED TOOL CALL**: `add_acceptance_criteria`

```javascript
add_acceptance_criteria(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  criteria: [
    {
      criterionId: "AC-1",
      criterion: "User must be able to login with email and password and see dashboard within 2 seconds",
      priority: "Must Have",
      source: "generated"
    },
    {
      criterionId: "AC-2",
      criterion: "System must display validation error if email format is invalid",
      priority: "Must Have",
      source: "generated"
    },
    {
      criterionId: "AC-3",
      criterion: "Failed login attempts must be logged with timestamp and IP address",
      priority: "Should Have",
      source: "generated"
    }
  ]
)
```

## 4.3 - Mark Step Complete
**REQUIRED TOOL CALL**: `update_refinement_step`

```javascript
update_refinement_step(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  stepNumber: 4,
  completed: true,
  summary: "Generated [N] SMART acceptance criteria",
  data: {
    criteriaCount: 5,
    mustHave: 3,
    shouldHave: 2,
    couldHave: 0
  }
)
```

**❌ DO NOT**: Write to any .md file
**✅ DO**: Use `add_acceptance_criteria` + `update_refinement_step`

---

# Step 5 - Generate Test Scenarios
**GOAL**: Create test scenarios with 1:1+ mapping to acceptance criteria

## 5.1 - Create Test Scenarios
For each acceptance criterion, create at least one test scenario:
- Clear preconditions
- Expected results as complete sentences
- Include: happy path, edge cases, error conditions
- Ensure all scenarios are specific and repeatable

## 5.2 - Store Test Scenarios
**REQUIRED TOOL CALL**: `add_test_scenarios`

```javascript
add_test_scenarios(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  scenarios: [
    {
      scenarioId: "TS-1",
      title: "Successful login with valid credentials",
      description: "User enters valid email and password, clicks login, and is redirected to dashboard",
      priority: "P0",
      type: "automated",
      preconditions: "User account exists in database, user is logged out",
      expectedResult: "User sees dashboard with welcome message within 2 seconds"
    },
    {
      scenarioId: "TS-2",
      title: "Login fails with invalid email format",
      description: "User enters malformed email (e.g., 'notanemail'), clicks login",
      priority: "P0",
      type: "automated",
      preconditions: "User is on login page",
      expectedResult: "Validation error message 'Invalid email format' displayed, user remains on login page"
    }
  ]
)
```

## 5.3 - Mark Step Complete
**REQUIRED TOOL CALL**: `update_refinement_step`

```javascript
update_refinement_step(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  stepNumber: 5,
  completed: true,
  summary: "Generated [N] test scenarios",
  data: {
    scenariosCount: 8,
    automated: 6,
    manual: 2,
    p0: 4,
    p1: 3,
    p2: 1
  }
)
```

**❌ DO NOT**: Write to any .md file
**✅ DO**: Use `add_test_scenarios` + `update_refinement_step`

---

# Step 6 - Task Breakdown and Generation
**GOAL**: Break feature into 5-8 discrete, actionable tasks

## 6.1 - Create Feature Entry
**REQUIRED TOOL CALL**: `create_feature`

```javascript
create_feature(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  featureName: "User Authentication System",
  jiraTicketKey: "PROJ-123"
)
```

This auto-creates 8 refinement step records in the database.

## 6.2 - Break Down into Tasks
For each task:
- Assign unique task identifier (T01, T02, etc.)
- Set initial status to "PendingProductDirector"
- Define clear task title and description
- Map relevant acceptance criteria to the task
- Map relevant test scenarios to the task
- Define what is out of scope for this task
- Set orderOfExecution (sequential numbering)

Ensure each task is:
- Independently testable
- Has clear boundaries
- Includes all necessary acceptance criteria
- Maps to specific test scenarios

## 6.3 - Add Each Task
**REQUIRED TOOL CALL** (for each task): `add_task`

```javascript
add_task(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  taskId: "T01",
  title: "Implement login API endpoint",
  description: "Create POST /api/auth/login endpoint with email/password validation",
  orderOfExecution: 1,
  acceptanceCriteria: [
    { id: "AC-1", criterion: "...", priority: "Must Have" },
    { id: "AC-2", criterion: "...", priority: "Must Have" }
  ],
  testScenarios: [
    { id: "TS-1", title: "...", description: "...", priority: "P0" },
    { id: "TS-2", title: "...", description: "...", priority: "P0" }
  ],
  outOfScope: [
    "OAuth integration (separate task)",
    "Password reset flow (separate feature)"
  ],
  estimatedHours: 4,
  tags: ["backend", "api", "authentication"]
)
```

## 6.4 - Mark Step Complete
**REQUIRED TOOL CALL**: `update_refinement_step`

```javascript
update_refinement_step(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  stepNumber: 6,
  completed: true,
  summary: "Created [N] tasks: [T01: title, T02: title, ...]",
  data: {
    tasksCreated: 6,
    taskIds: ["T01", "T02", "T03", "T04", "T05", "T06"]
  }
)
```

**❌ DO NOT**: Write to any .md file
**✅ DO**: Use `create_feature` + `add_task` + `update_refinement_step`

---

# Step 7 - Stakeholder Review Cycle (MCP Orchestrated)
**⚠️ CRITICAL INSTRUCTIONS - READ COMPLETELY BEFORE STARTING ⚠️**

This step is FULLY orchestrated by the MCP server. You MUST follow this EXACT sequence for EVERY task. DO NOT skip steps. DO NOT improvise.

**NOTE**: All Step 7 instructions remain IDENTICAL to the current refine-feature.md file.
**The only change**: All `get_next_step`, `add_stakeholder_review`, etc. calls now include `repoName` as first parameter.

## 7.0 - Initialize Task List
**REQUIRED TOOL CALL**: `get_tasks_by_status(repoName, featureSlug, "PendingProductDirector")`

## 7.1 - FOR EACH TASK: Get Next Step
**REQUIRED TOOL CALL**: `get_next_step(repoName, featureSlug, taskId)`

## 7.2 - Execute Role
[Follow existing 5-step pattern from current refine-feature.md]

## 7.3 - Submit Review
**REQUIRED TOOL CALL**: `add_stakeholder_review(repoName, featureSlug, taskId, stakeholder, decision, notes, additionalFields)`

## 7.4 - Loop Control
[Follow existing CASE A/B/C/D logic from current refine-feature.md]

## 7.5 - Verification
**REQUIRED TOOL CALL**: `get_tasks_by_status(repoName, featureSlug, "ReadyForDevelopment")`

## 7.6 - Mark Step Complete
**REQUIRED TOOL CALL**: `update_refinement_step`

```javascript
update_refinement_step(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  stepNumber: 7,
  completed: true,
  summary: "All [N] tasks reviewed by all stakeholders and are ReadyForDevelopment",
  data: {
    totalTasks: 6,
    productDirectorReviews: 6,
    architectReviews: 6,
    uiUxReviews: 6,
    securityReviews: 6,
    allApproved: true
  }
)
```

**❌ DO NOT**: Write to any .md file
**✅ DO**: Use stakeholder review tools + `update_refinement_step`

---

# Step 8 - Finalize Refinement
**GOAL**: Complete refinement and optionally generate documentation

## 8.1 - Get Refinement Data
**REQUIRED TOOL CALL**: `get_refinement_status`

```javascript
get_refinement_status(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>"
)
```

This returns:
- All acceptance criteria
- All test scenarios
- All tasks
- All stakeholder reviews
- Complete refinement progress

## 8.2 - OPTIONAL: Generate Documentation
**CONDITIONAL TOOL CALL**: Only if user wants a .md file for archival/sharing

```javascript
generate_refinement_report(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  format: "markdown",
  outputPath: ".claude/artifacts/<feature-slug>/refinement-report.md",
  includeSections: [
    "summary",
    "scope",
    "attachments",
    "clarifications",
    "acceptance_criteria",
    "test_scenarios",
    "tasks",
    "stakeholder_reviews"
  ]
)
```

**This generates the .md file from database data - no string manipulation needed!**

## 8.3 - Update Jira (if applicable)
If Jira ticket was provided:
- Combine all acceptance criteria into text block
- Combine all test scenarios into text block
- Call `mcp_jira-mcp-serv_update_issue` to update ticket
- Verify update succeeded

## 8.4 - Mark Step Complete
**REQUIRED TOOL CALL**: `update_refinement_step`

```javascript
update_refinement_step(
  repoName: "<from Step 0>",
  featureSlug: "<feature-slug>",
  stepNumber: 8,
  completed: true,
  summary: "Refinement completed, Jira updated, report generated",
  data: {
    jiraUpdated: true,
    reportGenerated: true,
    reportPath: ".claude/artifacts/<feature-slug>/refinement-report.md"
  }
)
```

## 8.5 - Present Summary to User
```
✅ Refinement Complete!

Repository: task-review-manager
Feature: <feature-name>
Jira Ticket: PROJ-123

Summary:
- Scope: Feature enhancement
- Attachments analyzed: 3
- Clarifications: 5 Q&A pairs
- Acceptance Criteria: 5 (3 Must Have, 2 Should Have)
- Test Scenarios: 8 (6 automated, 2 manual)
- Tasks created: 6
- Stakeholder reviews: All approved
- Report generated: .claude/artifacts/<feature-slug>/refinement-report.md

All data stored in MCP database (tasks.db)
Use `get_refinement_status` to query anytime.
```

---

# Summary: Tools Used per Step

| Step | Primary Tools | Purpose |
|------|---------------|---------|
| 0 | `get_current_repo`, `register_repo` | Initialize repo context |
| 1 | `update_refinement_step` | Record scope |
| 2 | `add_attachment_analysis`, `update_refinement_step` | Store attachment data |
| 3 | `add_clarification`, `update_refinement_step` | Record Q&A |
| 4 | `add_acceptance_criteria`, `update_refinement_step` | Store ACs |
| 5 | `add_test_scenarios`, `update_refinement_step` | Store test scenarios |
| 6 | `create_feature`, `add_task`, `update_refinement_step` | Create tasks |
| 7 | `get_next_step`, `add_stakeholder_review`, etc. | Stakeholder reviews |
| 8 | `get_refinement_status`, `generate_refinement_report`, `update_refinement_step` | Finalize |

---

# Critical Reminders

## ✅ DO:
- Use MCP tools for ALL data storage
- Include `repoName` in EVERY tool call
- Call `update_refinement_step` after completing each step
- Use `get_refinement_status` to check progress
- Generate reports only when user requests them

## ❌ DO NOT:
- Create or update .md files during Steps 1-7
- Use string manipulation for data storage
- Skip `repoName` parameter in tool calls
- Forget to call `update_refinement_step` after each step
- Assume .md files exist - all data is in database

---

# Resuming Work

If refinement is interrupted, resume by:

1. Call `get_current_repo()` to get `repoName`
2. Call `get_refinement_status(repoName, featureSlug)` to see progress
3. Check `currentStep` and `completedSteps`
4. Resume from the first incomplete step
5. All previous data is preserved in database!

**No need to read .md files - everything is in the MCP database.**
