---
name: dev-workflow
description: Here you will execute a carefully orchestrated workflow by following the steps exactly as outlined below. This workflow is designed to ensure a comprehensive and structured approach to feature development, from gathering requirements to implementing code changes. Each stage builds upon the previous one, so it is critical to follow the sequence and complete each step thoroughly before moving on to the next.
---
# Input
- Refined feature_slug path (e.g. `smart-strangle-engine`) with pre-approved tasks from the refinem---
name: dev-workflow
description: Here you will execute a carefully orchestrated workflow by following the steps exactly as outlined below. This workflow is designed to ensure a comprehensive and structured approach to feature development, from gathering requirements to implementing code changes. Each stage builds upon the previous one, so it is critical to follow the sequence and complete each step thoroughly before moving on to the next.
---
# Input
- Refined feature_slug path (e.g. `smart-strangle-engine`) with pre-approved tasks from the refinement phase stored in the MCP database

# Output file
No file must be created for this workflow. All outputs should be returned in the response and any code changes should be committed to the appropriate feature branch in the repository.

# Step 1
- **PREREQUISITE**: This workflow requires a completed feature refinement with stakeholder-approved tasks
- Call `get_feature` with the feature_slug to load the complete feature data
- Confirm all tasks have status "ReadyForDevelopment" with complete stakeholder review
- Review the summary:
  - objective (from refinement phase)
  - acceptance criteria (pre-approved)
  - dependencies (identified in refinement)
  - blockers (from stakeholder reviews)
  - priority
  - stakeholder feedback from all 4 reviewers (Product Director, Architect, UI/UX Expert, Security Officer)
- add Step 1 completed into output file with validation confirmation and summary of pre-approved tasks

# Step 2
- Review stakeholder analysis from task transitions (already validated in refinement phase)
- Confirm architecture decisions from Architect review are clear and actionable
- Verify technical specifications and design patterns to follow
- Review security requirements from Security Officer approval
- Review UX requirements from UI/UX Expert approval
- add Step 2 completed into output file with confirmation of stakeholder decisions

# Step 3
- Search the codebase for related services, components, and existing patterns (following Architect recommendations)
- Identify relevant repositories, services, controllers, and middleware
- Query DB schemas if applicable: tables, foreign keys, constraints using postgres-mcp-server and its tools
- Validate that the recommended architecture is compatible with existing codebase
- add Step 3 completed into output file with codebase investigation findings

# Step 4
- **SKIP**: Task breakdown already completed in refinement phase with stakeholder approval
- Call `get_feature` to verify all required tasks exist with status "ReadyForDevelopment"
- Review task execution order (orderOfExecution field)
- add Step 4 completed into output file confirming pre-approved task structure is ready for implementation

# Step 5
- Create a feature branch: `git checkout -b feature/<feature_slug>/description`
- add Step 5 completed into output file with branch name and initial commit message

# Step 6 - Development Cycle (MCP Orchestrated)
**CRITICAL: The MCP server orchestrates the entire development cycle. Use `get_next_step` and `transition_task_status` to drive each task through Developer > Code Reviewer > QA > Done.**

- For each task, use `get_next_task` with statusFilter `["ReadyForDevelopment", "ToDo", "NeedsChanges"]` to get the next task to work on. Loop until no more tasks are returned.

  ## 6.1 - Get Next Step
  - Call `get_next_step` with the featureSlug and taskId
  - The MCP server returns:
    - `nextRole`: The role you must adopt (developer, codeReviewer, qa)
    - `systemPrompt`: Complete instructions for what to do
    - `allowedDecisions`: What actions you can take
    - `transitionOnSuccess` / `transitionOnFailure`: Target statuses
    - `focusAreas`: Specific areas to focus on
    - `previousRoleNotes`: Context from prior stakeholder and execution reviews
    - `requiredOutputFields`: Fields to populate in the transition

  ## 6.2 - Execute Role
  - Adopt the `nextRole` identity
  - Follow the `systemPrompt` instructions exactly

  ### If Developer:
  - Transition task: ReadyForDevelopment -> ToDo -> InProgress using `transition_task_status`
  - Review ALL stakeholder feedback from `previousRoleNotes`:
    - Product Director notes (UX/feature requirements)
    - Architect notes (technical approach and design patterns)
    - UI/UX Expert notes (usability and accessibility)
    - Security Officer notes (security requirements and compliance)
  - Implement the feature following stakeholder guidance
  - Write comprehensive unit and integration tests
  - Transition task: InProgress -> InReview using `transition_task_status` with metadata:
    - `developerNotes`, `filesChanged`, `testFiles`

  ### If Code Reviewer:
  - Review all code changes and test files
  - If approved: Transition InReview -> InQA with `codeReviewerNotes`, `testResultsSummary`
  - If rejected: Transition InReview -> NeedsChanges with `codeReviewerNotes`, `codeQualityConcerns`

  ### If QA:
  - Execute all test scenarios and verify acceptance criteria
  - Use `update_acceptance_criteria` to mark each criterion as verified
  - If all pass: Transition InQA -> Done with `qaNotes`, `testExecutionSummary`, `acceptanceCriteriaMet: true`
  - If any fail: Transition InQA -> NeedsChanges with `qaNotes`, `bugsFound`

  ## 6.3 - Loop
  - After each transition, call `get_next_step` again for this task
  - If task is not yet Done, repeat from 6.2 with the new role
  - If task is Done, move to the next task via `get_next_task`
  - If task was rejected (NeedsChanges), the developer picks it back up

  ## 6.4 - Pull Request and Merge
  - **VERIFICATION**: Call `verify_all_tasks_complete` to confirm ALL tasks have status "Done"
  - Review task completion: confirm all tasks show proper transition history
  - Create a Pull Request with comprehensive description linking to Jira ticket
  - Ensure all CI/CD checks pass and code coverage meets minimum thresholds
  - Merge feature branch to development branch upon approval
  - add Step 6.4 completed into output file with PR details and merge confirmation

  ## 6.5 - Git Commit
  - Commit only the code changes done in the repo with a single line comment as summary in this pattern `feature/<feature_slug>: summary of changes`, exclude all the files .md and task.json file
  - add Step 6.5 completed into output file with commit message and summary of changes

# Step 7 - Final Verification and Workflow Completion
- **VERIFICATION**: Call `verify_all_tasks_complete` and `get_feature` to confirm all tasks have status "Done" with complete transition history
- Review complete workflow history for each task:
  - Stakeholder review cycle: PendingProductDirector -> PendingArchitect -> PendingUiUxExpert -> PendingSecurityOfficer -> ReadyForDevelopment
  - Development cycle: ReadyForDevelopment -> ToDo -> InProgress -> InReview -> InQA -> Done
  - Any refinement loops: NeedsRefinement or NeedsChanges cycles (if applicable)
- Generate a detailed MR description linking to the Jira ticket and summarizing:
  - All changes made
  - Stakeholder approvals summary:
    - Product Director: UX and market validation
    - Architect: Technical solution approval
    - UI/UX Expert: Usability and accessibility validation
    - Security Officer: Security compliance and requirements met
  - Implementation details:
    - Test coverage details (from transition records)
    - Security controls implemented (per Security Officer requirements)
    - Architecture patterns followed (per Architect recommendations)
    - UX patterns implemented (per UI/UX Expert guidance)
  - Deployment readiness status
  - Files modified (consolidated from all task transitions)
- Review the feature data to ensure all acceptance criteria are marked as met
- Complete the workflow and report summary
ent phase stored in the MCP database

# Output file
- Create a new file in `.claude/artifacts/<feature_slug>/dev-workflow.md` (relative to current workspace)

# Step 1
- **PREREQUISITE**: This workflow requires a completed feature refinement with stakeholder-approved tasks
- Call `get_feature` with the feature_slug to load the complete feature data
- Confirm all tasks have status "ReadyForDevelopment" with complete stakeholder review
- Review the summary:
  - objective (from refinement phase)
  - acceptance criteria (pre-approved)
  - dependencies (identified in refinement)
  - blockers (from stakeholder reviews)
  - priority
  - stakeholder feedback from all 4 reviewers (Product Director, Architect, UI/UX Expert, Security Officer)
- add Step 1 completed into output file with validation confirmation and summary of pre-approved tasks

# Step 2
- Review stakeholder analysis from task transitions (already validated in refinement phase)
- Confirm architecture decisions from Architect review are clear and actionable
- Verify technical specifications and design patterns to follow
- Review security requirements from Security Officer approval
- Review UX requirements from UI/UX Expert approval
- add Step 2 completed into output file with confirmation of stakeholder decisions

# Step 3
- Search the codebase for related services, components, and existing patterns (following Architect recommendations)
- Identify relevant repositories, services, controllers, and middleware
- Query DB schemas if applicable: tables, foreign keys, constraints using postgres-mcp-server and its tools
- Validate that the recommended architecture is compatible with existing codebase
- add Step 3 completed into output file with codebase investigation findings

# Step 4
- **SKIP**: Task breakdown already completed in refinement phase with stakeholder approval
- Call `get_feature` to verify all required tasks exist with status "ReadyForDevelopment"
- Review task execution order (orderOfExecution field)
- add Step 4 completed into output file confirming pre-approved task structure is ready for implementation

# Step 5
- Create a feature branch: `git checkout -b feature/<feature_slug>/description`
- add Step 5 completed into output file with branch name and initial commit message

# Step 6 - Development Cycle (MCP Orchestrated)
**CRITICAL: The MCP server orchestrates the entire development cycle. Use `get_next_step` and `transition_task_status` to drive each task through Developer > Code Reviewer > QA > Done.**

- For each task, use `get_next_task` with statusFilter `["ReadyForDevelopment", "ToDo", "NeedsChanges"]` to get the next task to work on. Loop until no more tasks are returned.

  ## 6.1 - Get Next Step
  - Call `get_next_step` with the featureSlug and taskId
  - The MCP server returns:
    - `nextRole`: The role you must adopt (developer, codeReviewer, qa)
    - `systemPrompt`: Complete instructions for what to do
    - `allowedDecisions`: What actions you can take
    - `transitionOnSuccess` / `transitionOnFailure`: Target statuses
    - `focusAreas`: Specific areas to focus on
    - `previousRoleNotes`: Context from prior stakeholder and execution reviews
    - `requiredOutputFields`: Fields to populate in the transition

  ## 6.2 - Execute Role
  - Adopt the `nextRole` identity
  - Follow the `systemPrompt` instructions exactly

  ### If Developer:
  - Transition task: ReadyForDevelopment -> ToDo -> InProgress using `transition_task_status`
  - Review ALL stakeholder feedback from `previousRoleNotes`:
    - Product Director notes (UX/feature requirements)
    - Architect notes (technical approach and design patterns)
    - UI/UX Expert notes (usability and accessibility)
    - Security Officer notes (security requirements and compliance)
  - Implement the feature following stakeholder guidance
  - Write comprehensive unit and integration tests
  - Transition task: InProgress -> InReview using `transition_task_status` with metadata:
    - `developerNotes`, `filesChanged`, `testFiles`

  ### If Code Reviewer:
  - Review all code changes and test files
  - If approved: Transition InReview -> InQA with `codeReviewerNotes`, `testResultsSummary`
  - If rejected: Transition InReview -> NeedsChanges with `codeReviewerNotes`, `codeQualityConcerns`

  ### If QA:
  - Execute all test scenarios and verify acceptance criteria
  - Use `update_acceptance_criteria` to mark each criterion as verified
  - If all pass: Transition InQA -> Done with `qaNotes`, `testExecutionSummary`, `acceptanceCriteriaMet: true`
  - If any fail: Transition InQA -> NeedsChanges with `qaNotes`, `bugsFound`

  ## 6.3 - Loop
  - After each transition, call `get_next_step` again for this task
  - If task is not yet Done, repeat from 6.2 with the new role
  - If task is Done, move to the next task via `get_next_task`
  - If task was rejected (NeedsChanges), the developer picks it back up

  ## 6.4 - Pull Request and Merge
  - **VERIFICATION**: Call `verify_all_tasks_complete` to confirm ALL tasks have status "Done"
  - Review task completion: confirm all tasks show proper transition history
  - Create a Pull Request with comprehensive description linking to Jira ticket
  - Ensure all CI/CD checks pass and code coverage meets minimum thresholds
  - Merge feature branch to development branch upon approval
  - add Step 6.4 completed into output file with PR details and merge confirmation

  ## 6.5 - Git Commit
  - Commit only the code changes done in the repo with a single line comment as summary in this pattern `feature/<feature_slug>: summary of changes`, exclude all the files .md and task.json file
  - add Step 6.5 completed into output file with commit message and summary of changes

# Step 7 - Final Verification and Workflow Completion
- **VERIFICATION**: Call `verify_all_tasks_complete` and `get_feature` to confirm all tasks have status "Done" with complete transition history
- Review complete workflow history for each task:
  - Stakeholder review cycle: PendingProductDirector -> PendingArchitect -> PendingUiUxExpert -> PendingSecurityOfficer -> ReadyForDevelopment
  - Development cycle: ReadyForDevelopment -> ToDo -> InProgress -> InReview -> InQA -> Done
  - Any refinement loops: NeedsRefinement or NeedsChanges cycles (if applicable)
- Generate a detailed MR description linking to the Jira ticket and summarizing:
  - All changes made
  - Stakeholder approvals summary:
    - Product Director: UX and market validation
    - Architect: Technical solution approval
    - UI/UX Expert: Usability and accessibility validation
    - Security Officer: Security compliance and requirements met
  - Implementation details:
    - Test coverage details (from transition records)
    - Security controls implemented (per Security Officer requirements)
    - Architecture patterns followed (per Architect recommendations)
    - UX patterns implemented (per UI/UX Expert guidance)
  - Deployment readiness status
  - Files modified (consolidated from all task transitions)
- Review the feature data to ensure all acceptance criteria are marked as met
- Complete the workflow and report summary
