---
name: refine-feature
description: This workflow refines a feature ticket by gathering context, analyzing attachments, clarifying ambiguities, generating SMART acceptance criteria and test scenarios. Uses batched role processing for efficiency.
---

# Input
- feature description

# Output
No file must be created for this workflow. All outputs should be returned in the response and any code changes should be committed to the appropriate feature branch in the repository.

# Step 1 - Scope Determination & Initial Snapshot
- Determine scope: feature enhancement, bug fix, or refinement
- Gather context about the requirement
- Compose a concise 2-5 sentence plain-text summary of the feature scope from the user's input — this will be saved as the feature description in the database
- **[NEW - Rec 1]** Call `mcp__aiconductor__get_workflow_snapshot` to view any prior work on this feature (for context efficiency)

# Step 2 - Attachment Analysis
- For each attachment analyze:
  - Excel files: Extract columns, list items, data patterns
  - Images/designs: Extract design elements, component structure using Figma tools if applicable
  - Documents: Extract objectives, business rules, requirements
- Summarize key information from all attachments

# Step 3 - Clarifications
- Identify ambiguous or incomplete requirements from Steps 1-2
- Do NOT ask about information already visible in attachments
- Present specific clarifying questions to the user
- Wait for user answers before proceeding

# Step 4 - Acceptance Criteria Generation
- Create 3-5 SMART acceptance criteria:
  - Specific: No vague language
  - Measurable: Quantifiable outcomes
  - Achievable: Technically feasible
  - Relevant: Tied to the feature objective
  - Testable: Can be verified with a test
- Cover: happy path, edge cases, exceptions, and database changes if applicable
- Write each criterion as a clear, complete sentence in plain English

# Step 5 - Test Scenarios Generation
- Create test scenarios with 1:1+ mapping to acceptance criteria
- For each scenario: clear preconditions and expected results as complete sentences
- Include happy path, edge cases, error conditions
- Ensure all scenarios are specific and repeatable

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
- Use the MCP tool `mcp__aiconductor__create_feature` to create the feature entry
  - **Pass the `description` parameter** with the 2-5 sentence plain-text summary composed in Step 1
  - The description must be the original user requirement text (condensed) — NOT a hallucinated value
  - Example: `{ featureSlug: "...", featureName: "...", description: "...", repoName: "..." }`
- Use the MCP tool `mcp__aiconductor__add_task` for each task
- Ensure each task is:
  - Independently testable
  - Has clear boundaries
  - Includes all necessary acceptance criteria
  - Maps to specific test scenarios

# Step 6.5 - Validate Task Dependencies & Execution Order [NEW - Rec 4]
- Call `mcp__aiconductor__get_task_execution_plan` to analyze dependencies
- Review optimal order, parallelizable phases, and any circular dependencies or warnings
- If dependencies need adjustment, update tasks using `mcp__aiconductor__update_task`

# Step 6.6 - Validate Mandatory Refinement Data [NEW]
**CRITICAL: These fields are mandatory before proceeding to stakeholder reviews**
- Verify that clarifications are not empty:
  - Call `mcp__aiconductor__get_refinement_status` to check clarifications count
  - If clarifications.length === 0: **BLOCK** workflow and inform user that at least one clarification must be present (even if just to document assumptions)
- Verify that feature-level acceptance criteria are not empty:
  - Call `mcp__aiconductor__get_refinement_status` to check acceptanceCriteria count
  - If acceptanceCriteria.length === 0: **BLOCK** workflow and inform user that acceptance criteria are required
- Verify that feature-level test scenarios are not empty:
  - Call `mcp__aiconductor__get_refinement_status` to check testScenarios count
  - If testScenarios.length === 0: **BLOCK** workflow and inform user that test scenarios are required
- If any field is missing:
  - Report which fields are empty
  - Return to the relevant step (Step 3 for clarifications, Step 4 for AC, Step 5 for test scenarios)
  - Do NOT proceed to stakeholder reviews until all three are non-empty

# Step 7 - Stakeholder Review Cycle (Batched by Role)
**CRITICAL: Process ALL tasks through each role in a single batch before moving to the next role. This is far more efficient than switching roles per task.**

## 7.0 - Initialize Task List
- **[UPDATED - Rec 1]** Call `mcp__aiconductor__get_workflow_snapshot` for context-efficient overview (instead of `get_tasks_by_status`)
- Store the task IDs for reference

## 7.1 - PRODUCT DIRECTOR REVIEW (BATCH ALL TASKS)
**Single role adoption for entire batch:**
- Call `mcp__aiconductor__get_next_step` to get the systemPrompt for Product Director role
- Adopt Product Director identity ONCE for this entire batch
- Get all tasks with status "PendingProductDirector"
- For each task (process ALL together):
  - Review task with Product Director perspective
  - Evaluate market demand and user value
  - Identify any product concerns
  - Prepare detailed review notes
- Conduct required research once for the batch (market analysis, competitor analysis)
- For each task:
  - **[NEW - Rec 7]** Call `mcp__aiconductor__validate_review_completeness` before submitting to check all required fields are present
  - Call `mcp__aiconductor__add_stakeholder_review` with:
    - decision: "approve" or "reject"
    - notes: Detailed review for this specific task
    - additionalFields: `marketAnalysis`, `competitorAnalysis`, **`quickSummary`** (1-2 sentence TL;DR - Rec 6)
- All approved tasks auto-transition to "PendingArchitect"
- Rejected tasks auto-transition to "NeedsRefinement"
- **Progress output**: "Product Director batch complete: [N] approved, [M] rejected"

## 7.2 - ARCHITECT REVIEW (BATCH ALL TASKS)
**Single role adoption for entire batch:**
- Call `mcp__aiconductor__get_next_step` to get the systemPrompt for Architect role
- Adopt Architect identity ONCE for this entire batch
- Get all tasks with status "PendingArchitect"
- For each task (process ALL together):
  - Review task with Architect perspective
  - Evaluate technical approach and design patterns
  - Review Product Director notes from previousRoleNotes
  - Identify any technical concerns or improvements
  - Prepare detailed review notes
- Conduct required research once for the batch (design patterns, best practices, technologies)
- For each task: Call `mcp__aiconductor__add_stakeholder_review` with:
  - decision: "approve" or "reject"
  - notes: Detailed review for this specific task
  - additionalFields: `technologyRecommendations`, `designPatterns`
- All approved tasks auto-transition to "PendingUiUxExpert"
- Rejected tasks auto-transition to "NeedsRefinement"
- **Progress output**: "Architect batch complete: [N] approved, [M] rejected"

## 7.3 - UI/UX EXPERT REVIEW (BATCH ALL TASKS)
**Single role adoption for entire batch:**
- Call `mcp__aiconductor__get_next_step` to get the systemPrompt for UI/UX Expert role
- Adopt UI/UX Expert identity ONCE for this entire batch
- Get all tasks with status "PendingUiUxExpert"
- For each task (process ALL together):
  - Review task with UI/UX Expert perspective
  - Evaluate usability, accessibility, and user experience
  - Review Product Director and Architect notes from previousRoleNotes
  - Identify any UX concerns or improvements
  - Prepare detailed review notes
- Conduct required research once for the batch (UX best practices, accessibility, user behavior)
- For each task: Call `mcp__aiconductor__add_stakeholder_review` with:
  - decision: "approve" or "reject"
  - notes: Detailed review for this specific task
  - additionalFields: `usabilityFindings`, `accessibilityRequirements`, `userBehaviorInsights`
- All approved tasks auto-transition to "PendingSecurityOfficer"
- Rejected tasks auto-transition to "NeedsRefinement"
- **Progress output**: "UI/UX Expert batch complete: [N] approved, [M] rejected"

## 7.4 - SECURITY OFFICER REVIEW (BATCH ALL TASKS)
**Single role adoption for entire batch:**
- Call `mcp__aiconductor__get_next_step` to get the systemPrompt for Security Officer role
- Adopt Security Officer identity ONCE for this entire batch
- Get all tasks with status "PendingSecurityOfficer"
- For each task (process ALL together):
  - Review task with Security Officer perspective
  - Evaluate security requirements and compliance
  - Review all previous stakeholder notes from previousRoleNotes
  - Identify any security concerns or improvements
  - Prepare detailed review notes
- Conduct required research once for the batch (OWASP guidelines, security best practices, compliance)
- For each task: Call `mcp__aiconductor__add_stakeholder_review` with:
  - decision: "approve" or "reject"
  - notes: Detailed review for this specific task
  - additionalFields: `securityRequirements`, `complianceNotes`
- All approved tasks auto-transition to "ReadyForDevelopment"
- Rejected tasks auto-transition to "NeedsRefinement"
- **Progress output**: "Security Officer batch complete: [N] approved, [M] rejected"

## 7.5 - Handle Rejected Tasks (If Any)
- Call `mcp__aiconductor__get_tasks_by_status` with status "NeedsRefinement" to find rejected tasks
- If any tasks were rejected:
  - Review the issues identified by each stakeholder
  - Update task details using `mcp__aiconductor__update_task` to address concerns
  - **[NEW - Rec 3]** Optionally: Use `mcp__aiconductor__rollback_last_decision` to undo incorrect review (if needed)
  - Call `mcp__aiconductor__transition_task_status` to move back to "PendingProductDirector"
  - Restart the review cycle from Step 7.1 for these tasks
  - Repeat until all tasks reach "ReadyForDevelopment"

## 7.6 - Verification
- Call `mcp__aiconductor__get_tasks_by_status` with status "ReadyForDevelopment"
- Confirm all tasks created in Step 6 are now in "ReadyForDevelopment" status
- If verification fails, report which tasks are stuck and why

# Step 8 - Finalization & Checkpoint
- Combine all acceptance criteria into a single text block
- Combine all test scenarios into a single text block
- If using Jira integration: Update the Jira ticket with final AC and test scenarios
- **[NEW - Rec 3]** Call `mcp__aiconductor__save_workflow_checkpoint` with description "All tasks ReadyForDevelopment - ready for dev workflow"
- **[NEW]** If the feature description has been refined or improved during the workflow (Steps 3-5 may have clarified the scope), call `mcp__aiconductor__update_feature` with the final polished description so the dashboard Detail view shows accurate context
- Present the final AC and test scenarios to the user
- Confirm workflow completion

