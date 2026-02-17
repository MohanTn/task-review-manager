---
name: refine-feature
description: This workflow refines a feature ticket by gathering context, analyzing attachments, clarifying ambiguities, generating SMART acceptance criteria and test scenarios, and updating the Jira ticket. This is a refinement-only workflow - no code changes will be made.
---
# Input
- Jira Ticket Key or fe---
name: refine-feature
description: This workflow refines a feature ticket by gathering context, analyzing attachments, clarifying ambiguities, generating SMART acceptance criteria and test scenarios, and updating the Jira ticket. This is a refinement-only workflow - no code changes will be made.
---
# Input
- feature description

# Output file
No file must be created for this workflow. All outputs should be returned in the response and any code changes should be committed to the appropriate feature branch in the repository.

# Step 1
- Determine scope: feature enhancement, bug fix, or refinement
- add Step 1 completed into output file with the gathered context and scope

# Step 2
- For each attachment analyze:
  - Excel files: Extract columns, list items, data patterns
  - Images/designs: Extract design elements, component structure using Figma tools if applicable
  - Documents: Extract objectives, business rules, requirements
- Summarize key information from all attachments
- add Step 2 completed into output file with attachment analysis summary

# Step 3
- Identify ambiguous or incomplete requirements from Steps 1-2
- Do NOT ask about information already visible in attachments
- Present specific clarifying questions to the user
- Wait for user answers before proceeding
- add Step 3 completed into output file with the clarifications and user responses

# Step 4
- Create 3-5 SMART acceptance criteria:
  - Specific: No vague language
  - Measurable: Quantifiable outcomes
  - Achievable: Technically feasible
  - Relevant: Tied to the feature objective
  - Testable: Can be verified with a test
- Cover: happy path, edge cases, exceptions, and database changes if applicable
- Write each criterion as a clear, complete sentence in plain English
- add Step 4 completed into output file with the generated acceptance criteria

# Step 5
- Create test scenarios with 1:1+ mapping to acceptance criteria
- For each scenario: clear preconditions and expected results as complete sentences
- Include happy path, edge cases, error conditions
- Ensure all scenarios are specific and repeatable
- add Step 5 completed into output file with the generated test scenarios

# Step 6 - Task Breakdown and Generation
- Break the feature into 5-8 discrete, actionable tasks
- For each task:
  - Assign unique task identifier (T01, T02, etc.)
  - Set initial status to "PendingProductDirector"
  - Define clear task title and description
  - Map relevant acceptance criteria to the task
  - Map relevant test scenarios to the task
  - Define what is out of scope for this task
  - Set orderOfExecution (sequential numbering)
- Use the MCP tool `create_feature` to create the feature entry
- Use the MCP tool `add_task` for each task
- Ensure each task is:
  - Independently testable
  - Has clear boundaries
  - Includes all necessary acceptance criteria
  - Maps to specific test scenarios
- add Step 6 completed into output file with task breakdown summary (number of tasks, titles)

# Step 7 - Stakeholder Review Cycle (MCP Orchestrated)
**CRITICAL: The MCP server orchestrates this entire review cycle. Use `get_next_step` to determine what role to adopt and what to do at each step.**

- For each task in the feature, execute the following loop until the task reaches "ReadyForDevelopment":

  ## 7.1 - Get Next Step
  - Call `get_next_step` with the featureSlug and taskId
  - The MCP server returns:
    - `nextRole`: The stakeholder role you must adopt (productDirector, architect, uiUxExpert, securityOfficer)
    - `systemPrompt`: Complete instructions for what to focus on, research, and decide
    - `allowedDecisions`: What actions you can take (approve/reject)
    - `focusAreas`: Specific areas to evaluate
    - `researchInstructions`: What to research on the internet
    - `requiredOutputFields`: Fields you must populate in your review
    - `previousRoleNotes`: Context from prior stakeholder reviews

  ## 7.2 - Execute Role
  - Adopt the `nextRole` identity
  - Follow the `systemPrompt` instructions exactly
  - Research the `focusAreas` using `researchInstructions`
  - Evaluate the task against the role's criteria

  ## 7.3 - Submit Review
  - Call `add_stakeholder_review` with:
    - `featureSlug`, `taskId`, `stakeholder` (the nextRole)
    - `decision`: "approve" or "reject" based on your evaluation
    - `notes`: Detailed review notes
    - `additionalFields`: Populate all `requiredOutputFields` from Step 7.1
  - The MCP server automatically transitions the task status

  ## 7.4 - Loop
  - Call `get_next_step` again for this task
  - If task is still in a review phase (Pending*), repeat from Step 7.2
  - If task reached "ReadyForDevelopment", move to the next task
  - If task was rejected to "NeedsRefinement", the loop restarts from Product Director

- **VERIFICATION**: After all tasks reviewed, call `verify_all_tasks_complete` or `get_tasks_by_status` to confirm all tasks have status "ReadyForDevelopment"
- add Step 7 completed into output file with stakeholder review summary

# Step 8
- Combine all acceptance criteria into a single text block
- Combine all test scenarios into a single text block
- Update the Jira ticket using mcp_jira-mcp-serv_update_issue
- Verify the update succeeded by re-fetching the issue
- Present the final AC and test scenarios to the user
- add Step 8 completed into output file with the Jira update status and complete the workflowature description

# Output file
- Create a new file in `.claude/artifacts/<feature-slug>/refine-ticket.md` (relative to current workspace)

# Step 1
- Determine scope: feature enhancement, bug fix, or refinement
- add Step 1 completed into output file with the gathered context and scope

# Step 2
- For each attachment analyze:
  - Excel files: Extract columns, list items, data patterns
  - Images/designs: Extract design elements, component structure using Figma tools if applicable
  - Documents: Extract objectives, business rules, requirements
- Summarize key information from all attachments
- add Step 2 completed into output file with attachment analysis summary

# Step 3
- Identify ambiguous or incomplete requirements from Steps 1-2
- Do NOT ask about information already visible in attachments
- Present specific clarifying questions to the user
- Wait for user answers before proceeding
- add Step 3 completed into output file with the clarifications and user responses

# Step 4
- Create 3-5 SMART acceptance criteria:
  - Specific: No vague language
  - Measurable: Quantifiable outcomes
  - Achievable: Technically feasible
  - Relevant: Tied to the feature objective
  - Testable: Can be verified with a test
- Cover: happy path, edge cases, exceptions, and database changes if applicable
- Write each criterion as a clear, complete sentence in plain English
- add Step 4 completed into output file with the generated acceptance criteria

# Step 5
- Create test scenarios with 1:1+ mapping to acceptance criteria
- For each scenario: clear preconditions and expected results as complete sentences
- Include happy path, edge cases, error conditions
- Ensure all scenarios are specific and repeatable
- add Step 5 completed into output file with the generated test scenarios

# Step 6 - Task Breakdown and Generation
- Break the feature into 5-8 discrete, actionable tasks
- For each task:
  - Assign unique task identifier (T01, T02, etc.)
  - Set initial status to "PendingProductDirector"
  - Define clear task title and description
  - Map relevant acceptance criteria to the task
  - Map relevant test scenarios to the task
  - Define what is out of scope for this task
  - Set orderOfExecution (sequential numbering)
- Use the MCP tool `create_feature` to create the feature entry
- Use the MCP tool `add_task` for each task
- Ensure each task is:
  - Independently testable
  - Has clear boundaries
  - Includes all necessary acceptance criteria
  - Maps to specific test scenarios
- add Step 6 completed into output file with task breakdown summary (number of tasks, titles)

# Step 7 - Stakeholder Review Cycle (MCP Orchestrated)
**⚠️ CRITICAL INSTRUCTIONS - READ COMPLETELY BEFORE STARTING ⚠️**

This step is FULLY orchestrated by the MCP server. You MUST follow this EXACT sequence for EVERY task. DO NOT skip steps. DO NOT improvise.

## 7.0 - Initialize Task List
**REQUIRED ACTION**: Before starting the review cycle:
1. Call `get_tasks_by_status(featureSlug, "PendingProductDirector")` to get all tasks needing review
2. Store the task IDs - you will process EACH task through the complete review cycle
3. Create a tracking list: "Tasks to review: [T01, T02, T03, ...]"

## 7.1 - FOR EACH TASK: Get Next Step

**BLOCKING REQUIREMENT**: You MUST call this tool before every review action.

**REQUIRED TOOL CALL**: `get_next_step(featureSlug, taskId)`

**What you will receive**:
- ✅ `nextRole`: The stakeholder role you MUST adopt (productDirector, architect, uiUxExpert, or securityOfficer)
- ✅ `systemPrompt`: COMPLETE step-by-step instructions - you MUST follow these EXACTLY as written
- ✅ `requiredOutputFields`: Fields you MUST populate in `additionalFields` - submission will FAIL if these are missing
- ✅ `researchInstructions`: Research you MUST conduct using WebSearch tool
- ✅ `focusAreas`: Specific evaluation criteria for this role
- ✅ `previousRoleNotes`: Context from previous stakeholder reviews (read these for continuity)

**CRITICAL**: The `systemPrompt` contains numbered steps (STEP 1, STEP 2, etc.). You MUST execute these steps IN SEQUENCE. Do NOT skip any step.

## 7.2 - Execute Role (FOLLOW SYSTEM PROMPT EXACTLY)

**MANDATORY SEQUENCE**: The systemPrompt contains 5 numbered steps. Execute them IN ORDER:

### Step-by-Step Execution Pattern:

**STEP 1: Conduct Research**
- ✅ USE the WebSearch tool as specified in `researchInstructions`
- ✅ MINIMUM 2-3 web searches required
- ✅ Document findings in your notes
- ❌ DO NOT skip research and rely on training data
- ❌ DO NOT proceed to next step without completing research

**STEP 2: Analyze Task**
- ✅ READ the task description, acceptance criteria, and test scenarios from Task Context
- ✅ READ all `previousRoleNotes` to understand prior stakeholder feedback
- ✅ Apply analysis per `focusAreas` specific to your current role
- ✅ Document your analysis findings

**STEP 3: Evaluate Against Role Criteria**
- ✅ APPLY the decision criteria specified in systemPrompt
- ✅ IDENTIFY any issues, gaps, or concerns
- ✅ DETERMINE if issues are blockers (reject) or acceptable (approve)

**STEP 4: Make Decision**
- ✅ CHOOSE "approve" or "reject" based on evaluation criteria in systemPrompt
- ✅ If APPROVING: confirm all requirements are met
- ✅ If REJECTING: specify EXACTLY what needs refinement and why
- ✅ Write detailed notes (100-300 words) explaining your decision

**STEP 5: Prepare Required Fields**
- ✅ POPULATE ALL fields listed in `requiredOutputFields`
- ✅ Example for productDirector: MUST include `marketAnalysis` AND `competitorAnalysis`
- ✅ Example for architect: MUST include `technologyRecommendations` AND `designPatterns`
- ✅ Example for uiUxExpert: MUST include `usabilityFindings`, `accessibilityRequirements`, AND `userBehaviorInsights`
- ✅ Example for securityOfficer: MUST include `securityRequirements` AND `complianceNotes`
- ❌ DO NOT proceed to Step 7.3 until ALL required fields are ready

## 7.3 - Submit Review

**⚠️ CRITICAL VALIDATION CHECKPOINT ⚠️**

Before calling `add_stakeholder_review`, verify you have:
- ✅ Completed ALL 5 steps in section 7.2
- ✅ Conducted web research using WebSearch tool
- ✅ Written detailed notes (100-300 words minimum)
- ✅ Populated ALL `requiredOutputFields` from Step 7.1
- ✅ Made a clear approve/reject decision with justification

**REQUIRED TOOL CALL**: `add_stakeholder_review(featureSlug, taskId, stakeholder, decision, notes, additionalFields)`

**Parameter Requirements**:
- `featureSlug`: The feature slug (from Step 7.1)
- `taskId`: The current task ID (from Step 7.1)
- `stakeholder`: The `nextRole` from Step 7.1 (productDirector, architect, uiUxExpert, or securityOfficer)
- `decision`: "approve" or "reject" (from Step 7.2 - STEP 4)
- `notes`: Your detailed review notes (from Step 7.2 - STEP 4)
- `additionalFields`: Object containing ALL `requiredOutputFields` (from Step 7.2 - STEP 5)

**Example for Product Director**:
```
add_stakeholder_review(
  featureSlug: "feature-name",
  taskId: "T01",
  stakeholder: "productDirector",
  decision: "approve",
  notes: "This feature has strong market validation...",
  additionalFields: {
    marketAnalysis: "Research shows 65% of users need this feature...",
    competitorAnalysis: "Competitor A charges $50/mo for similar feature..."
  }
)
```

**ERROR HANDLING**:
- ❌ If you receive error "Missing required fields": You did NOT populate all `requiredOutputFields`
  - ACTION: Review `requiredOutputFields` from Step 7.1
  - ACTION: Add the missing fields to `additionalFields`
  - ACTION: Re-call `add_stakeholder_review` with complete data
- ❌ If you receive error "Workflow validation failed": Wrong stakeholder for current task status
  - ACTION: Call `get_next_step` again to get correct role
  - ACTION: Execute that role instead

**SUCCESS CONFIRMATION**:
- ✅ Tool returns `success: true`
- ✅ Task status automatically transitions to next phase or "NeedsRefinement"

## 7.4 - Loop Control (CRITICAL - READ CAREFULLY)

**After successful submission in Step 7.3, you MUST determine next action:**

### 7.4.1 - Check Current Task Status
**REQUIRED TOOL CALL**: `get_next_step(featureSlug, taskId)` for the SAME taskId

**Examine the response**:
- Check `currentStatus` field
- Check `nextRole` field

**Decision Logic**:

**CASE A: Task still in review phase** (`currentStatus` is "PendingArchitect", "PendingUiUxExpert", or "PendingSecurityOfficer")
- ➡️ ACTION: The task needs another stakeholder review
- ➡️ GO BACK to Step 7.2 with the NEW `nextRole` from the response
- ➡️ Execute the new role's review process
- ➡️ REPEAT until task reaches "ReadyForDevelopment"

**CASE B: Task reached "ReadyForDevelopment"**
- ✅ ACTION: This task is COMPLETE
- ➡️ MOVE to the next task in your tracking list from Step 7.0
- ➡️ GO BACK to Step 7.1 with the NEXT taskId

**CASE C: Task sent to "NeedsRefinement"** (because you rejected it)
- ⚠️ ACTION: Task must be refined and will restart from Product Director
- ⚠️ For this workflow, consider the task as requiring manual intervention
- ➡️ MOVE to the next task in your tracking list from Step 7.0
- ➡️ GO BACK to Step 7.1 with the NEXT taskId

**CASE D: No more tasks in tracking list**
- ✅ ACTION: All tasks have been processed through at least one review
- ➡️ PROCEED to Step 7.5 (Verification)

### 7.4.2 - Progress Tracking
After each review submission, output progress:
```
Progress: Task [taskId] reviewed by [stakeholder]: [decision]
Status: [X/N] tasks processed, [Y] tasks ready for development
```

## 7.5 - Verification (MANDATORY BEFORE COMPLETING STEP 7)

**BLOCKING REQUIREMENT**: You MUST verify all tasks reached "ReadyForDevelopment" before proceeding to Step 8.

**REQUIRED TOOL CALL**: `get_tasks_by_status(featureSlug, "ReadyForDevelopment")`

**Verification Logic**:
1. Count tasks with status "ReadyForDevelopment"
2. Compare with total tasks created in Step 6
3. If counts match: ALL tasks successfully reviewed ✅
4. If counts don't match: Some tasks are stuck ❌

**If verification FAILS**:
- Call `get_tasks_by_status(featureSlug, "NeedsRefinement")` to find stuck tasks
- For each stuck task, check why it was rejected
- Report to user: "Tasks [IDs] need refinement before proceeding"
- DO NOT proceed to Step 8 until resolved

**If verification SUCCEEDS**:
- Write to output file: "✅ Step 7 completed - All [N] tasks reviewed by all stakeholders and are ReadyForDevelopment"
- List completion summary:
  ```
  Step 7 Summary:
  - Total tasks: [N]
  - Product Director reviews: [N] (all approved)
  - Architect reviews: [N] (all approved)
  - UI/UX Expert reviews: [N] (all approved)
  - Security Officer reviews: [N] (all approved)
  - Final status: All tasks ReadyForDevelopment ✅
  ```
- PROCEED to Step 8

## 7.6 - Common Mistakes to AVOID

❌ **DO NOT** skip web research - always use WebSearch tool per `researchInstructions`
❌ **DO NOT** submit reviews without all `requiredOutputFields` populated
❌ **DO NOT** forget to loop back for the next stakeholder review on the same task
❌ **DO NOT** move to next task before current task reaches "ReadyForDevelopment"
❌ **DO NOT** proceed to Step 8 without verification in Step 7.5
❌ **DO NOT** improvise or deviate from the `systemPrompt` instructions
❌ **DO NOT** make assumptions - if unsure, ask user for clarification

## 7.7 - Step 7 Checklist (Use this to verify completion)

Before proceeding to Step 8, confirm ALL items are checked:
- [ ] Called `get_tasks_by_status` to get initial task list (Step 7.0)
- [ ] Processed EVERY task through ALL stakeholder reviews (Steps 7.1-7.4)
- [ ] Used WebSearch tool for research in EVERY review
- [ ] Populated ALL `requiredOutputFields` for EVERY review
- [ ] Each task reached "ReadyForDevelopment" status
- [ ] Called `get_tasks_by_status(featureSlug, "ReadyForDevelopment")` for verification (Step 7.5)
- [ ] Verification confirmed all tasks ready
- [ ] Written Step 7 completion summary to output file

**Only proceed to Step 8 when ALL checkboxes are checked.**

# Step 8
- Combine all acceptance criteria into a single text block
- Combine all test scenarios into a single text block
- Update the Jira ticket using mcp_jira-mcp-serv_update_issue
- Verify the update succeeded by re-fetching the issue
- Present the final AC and test scenarios to the user
- add Step 8 completed into output file with the Jira update status and complete the workflow
