---
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

# Step 6 - Development Cycle (MCP Orchestrated - Batched by Role)
**CRITICAL: The MCP server orchestrates the entire development cycle. Process ALL tasks through each role before moving to the next role for maximum efficiency.**

- Execute the development cycle in batches by role (Developer → Code Reviewer → QA):

  ## 6.1 - Developer Implementation (Batch)
  - Get all tasks ready for development using `get_tasks_by_status` with status "ReadyForDevelopment"
  - For each task in dependency order (sort by `orderOfExecution`):
    - Call `get_next_step` to get systemPrompt and previousRoleNotes
    - Transition: ReadyForDevelopment -> ToDo -> InProgress using `transition_task_status`
    - Review ALL stakeholder feedback from `previousRoleNotes`:
      - Product Director notes (UX/feature requirements)
      - Architect notes (technical approach and design patterns)
      - UI/UX Expert notes (usability and accessibility)
      - Security Officer notes (security requirements and compliance)
    - Implement the feature following stakeholder guidance
    - Write comprehensive unit and integration tests
    - Transition: InProgress -> InReview using `transition_task_status` with metadata:
      - `developerNotes`: Implementation approach and decisions
      - `filesChanged`: Array of modified file paths
      - `testFiles`: Array of test file paths
  - All implemented tasks move to "InReview" status

  ## 6.2 - Code Review (Batch)
  - Get all tasks pending code review using `get_tasks_by_status` with status "InReview"
  - For each task:
    - Call `get_next_step` to get systemPrompt and previousRoleNotes
    - Review all code changes listed in `filesChanged` from developer transition
    - Review test files listed in `testFiles`
    - Run tests and verify coverage
    - Check adherence to:
      - Architect recommendations (design patterns, technology choices)
      - Security requirements (Security Officer notes)
      - Code quality standards (clean code, documentation)
    - Decision:
      - **If approved**: Transition InReview -> InQA with metadata:
        - `codeReviewerNotes`: Review summary and approval rationale
        - `testResultsSummary`: Test execution results
      - **If rejected**: Transition InReview -> NeedsChanges with metadata:
        - `codeReviewerNotes`: Issues found and required changes
        - `codeQualityConcerns`: Array of quality issues
  - Approved tasks move to "InQA" status
  - Rejected tasks move to "NeedsChanges" (developer will address in next iteration)

  ## 6.3 - QA Testing (Batch)
  - Get all tasks pending QA using `get_tasks_by_status` with status "InQA"
  - For each task:
    - Call `get_next_step` to get systemPrompt, previousRoleNotes, and test scenarios
    - Execute all test scenarios from the task definition
    - Verify all acceptance criteria are met
    - Test against stakeholder requirements:
      - Product Director requirements (feature behavior)
      - UI/UX Expert requirements (usability, accessibility)
      - Security Officer requirements (security controls)
    - Use `update_acceptance_criteria` to mark each criterion as verified (or not)
    - Decision:
      - **If all tests pass**: Transition InQA -> Done with metadata:
        - `qaNotes`: Testing summary and validation details
        - `testExecutionSummary`: Results of all test scenarios
        - `acceptanceCriteriaMet`: true
      - **If any tests fail**: Transition InQA -> NeedsChanges with metadata:
        - `qaNotes`: Failed tests and issues found
        - `bugsFound`: Array of bugs discovered
        - `acceptanceCriteriaMet`: false
  - Passed tasks move to "Done" status
  - Failed tasks move to "NeedsChanges"

  ## 6.4 - Handle Changes Required (If Any)
  - Get all tasks needing changes using `get_tasks_by_status` with status "NeedsChanges"
  - For each task:
    - Review feedback from code reviewer or QA in previous transition notes
    - Address all identified issues
    - Transition: NeedsChanges -> InProgress
    - Make required fixes
    - Transition: InProgress -> InReview
  - Revised tasks re-enter the code review queue
  - Repeat the cycle (Code Review → QA) until all tasks are "Done"

  ## 6.5 - Iteration
  - After each role completes their batch:
    - Check if any tasks are still in "NeedsChanges" status
    - Process those tasks through Developer fixes
    - Continue batched review/QA until all tasks reach "Done"
  - This batched approach minimizes context switching and improves efficiency

  ## 6.6 - Pull Request and Merge
  - **VERIFICATION**: Call `verify_all_tasks_complete` to confirm ALL tasks have status "Done"
  - Review task completion: confirm all tasks show proper transition history
  - Create a Pull Request with comprehensive description linking to Jira ticket
  - Ensure all CI/CD checks pass and code coverage meets minimum thresholds
  - Merge feature branch to development branch upon approval
  - add Step 6.6 completed into output file with PR details and merge confirmation

  ## 6.7 - Git Commit
  - Commit only the code changes done in the repo with a single line comment as summary in this pattern `feature/<feature_slug>: summary of changes`, exclude all the files .md and task.json file
  - add Step 6.7 completed into output file with commit message and summary of changes

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
