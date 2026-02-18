---
name: dev-workflow
description: Feature development workflow with batched role processing. Developer implements all tasks, Code Reviewer reviews all, QA tests all - maximizing efficiency and minimizing context switching.
---

# Input
- Refined feature_slug with pre-approved tasks from refinement phase stored in MCP database

# Output
No file must be created for this workflow. All outputs should be returned in the response and any code changes should be committed to the appropriate feature branch in the repository.

# Step 1 - Prerequisites and Validation
- Call `mcp__task-review-manager__get_feature` to load complete feature data
- Confirm all tasks have status "ReadyForDevelopment"
- Review the summary:
  - Feature objective and acceptance criteria (pre-approved)
  - Dependencies identified in refinement
  - Stakeholder feedback summary from all 4 reviewers
  - Priority and scope
- Confirm this is ready for development

# Step 2 - Stakeholder Decisions Review
- Review stakeholder analysis from task transitions (already validated)
- Confirm architecture decisions from Architect review
- Verify technical specifications and design patterns
- Review security requirements from Security Officer approval
- Review UX requirements from UI/UX Expert approval

# Step 3 - Codebase Investigation
- Search codebase for related services, components, and existing patterns
- Identify relevant repositories, services, controllers, and middleware
- Query DB schemas if applicable: tables, foreign keys, constraints
- Validate that recommended architecture is compatible with existing codebase

# Step 4 - Task Verification
- Call `mcp__task-review-manager__get_feature` to verify all required tasks exist
- Confirm all tasks have status "ReadyForDevelopment"
- Review task execution order (orderOfExecution field)

# Step 5 - Feature Branch Creation
- Create feature branch: `git checkout -b feature/<feature_slug>/description`
- Initial commit to establish branch

# Step 6 - Development Cycle (BATCHED BY ROLE)
**CRITICAL: Process ALL tasks through each role in a single batch before moving to next role. Adopt each role ONCE per batch to minimize context switching.**

## 6.0 - Initialize Task List
- Call `mcp__task-review-manager__get_tasks_by_status` with status "ReadyForDevelopment"
- Store all task IDs for processing

## 6.1 - DEVELOPER BATCH (IMPLEMENT ALL TASKS)
**Single developer identity for entire batch:**
- Adopt Developer role ONCE for entire batch
- Sort tasks by orderOfExecution
- For each task (implement ALL in sequence):
  - Call `mcp__task-review-manager__get_next_step` to get systemPrompt and previousRoleNotes
  - Review ALL stakeholder feedback:
    - Product Director notes (UX/feature requirements)
    - Architect notes (technical approach, design patterns)
    - UI/UX Expert notes (usability, accessibility)
    - Security Officer notes (security requirements, compliance)
  - Implement the feature following stakeholder guidance
  - Write comprehensive unit and integration tests
  - Document implementation approach
- Once ALL tasks implemented:
  - For each task: Call `mcp__task-review-manager__transition_task_status` to move from InProgress → InReview with metadata:
    - `developerNotes`: Implementation approach and decisions
    - `filesChanged`: Array of modified file paths
    - `testFiles`: Array of test file paths
- **Progress output**: "Developer batch complete: [N] tasks implemented and moved to InReview"
- Commit all changes with message: `feature/<feature_slug>: implement all tasks`

## 6.2 - CODE REVIEWER BATCH (REVIEW ALL IMPLEMENTATIONS)
**Single code reviewer identity for entire batch:**
- Adopt Code Reviewer role ONCE for entire batch
- Get all tasks with status "InReview"
- For each task (review ALL):
  - Call `mcp__task-review-manager__get_next_step` to get systemPrompt and previousRoleNotes
  - Review all code changes listed in filesChanged
  - Review test files and coverage
  - Verify adherence to:
    - Architect recommendations (design patterns, technology choices)
    - Security requirements (Security Officer notes)
    - Code quality standards (clean code, documentation)
  - Prepare review notes
- Once ALL reviews completed:
  - For APPROVED tasks: Call `mcp__task-review-manager__transition_task_status` from InReview → InQA with metadata:
    - `codeReviewerNotes`: Review summary and approval rationale
    - `testResultsSummary`: Test execution results
  - For REJECTED tasks: Call `mcp__task-review-manager__transition_task_status` from InReview → NeedsChanges with metadata:
    - `codeReviewerNotes`: Issues found and required changes
    - `codeQualityConcerns`: Array of quality issues
- **Progress output**: "Code Reviewer batch complete: [N] approved → InQA, [M] rejected → NeedsChanges"

## 6.3 - QA BATCH (TEST ALL IMPLEMENTATIONS)
**Single QA identity for entire batch:**
- Adopt QA role ONCE for entire batch
- Get all tasks with status "InQA"
- For each task (test ALL):
  - Call `mcp__task-review-manager__get_next_step` to get systemPrompt, previousRoleNotes, and test scenarios
  - Execute all test scenarios from task definition
  - Verify all acceptance criteria are met
  - Test against stakeholder requirements:
    - Product Director requirements (feature behavior)
    - UI/UX Expert requirements (usability, accessibility)
    - Security Officer requirements (security controls)
  - Use `mcp__task-review-manager__update_acceptance_criteria` to mark each criterion as verified (or not)
  - Prepare testing notes
- Once ALL tests completed:
  - For PASSED tasks: Call `mcp__task-review-manager__transition_task_status` from InQA → Done with metadata:
    - `qaNotes`: Testing summary and validation details
    - `testExecutionSummary`: Results of all test scenarios
    - `acceptanceCriteriaMet`: true
  - For FAILED tasks: Call `mcp__task-review-manager__transition_task_status` from InQA → NeedsChanges with metadata:
    - `qaNotes`: Failed tests and issues found
    - `bugsFound`: Array of bugs discovered
    - `acceptanceCriteriaMet`: false
- **Progress output**: "QA batch complete: [N] passed → Done, [M] failed → NeedsChanges"

## 6.4 - Handle Tasks Needing Changes (If Any)
- Get all tasks with status "NeedsChanges"
- If any tasks need changes:
  - Review feedback from code reviewer or QA
  - Address all identified issues
  - Re-enter developer phase for fixes:
    - Call `mcp__task-review-manager__transition_task_status` from NeedsChanges → InProgress
    - Make required fixes
    - Call `mcp__task-review-manager__transition_task_status` from InProgress → InReview
  - Tasks re-enter code review queue (Step 6.2)
  - Repeat cycles until all tasks reach "Done"
- Commit fixes with message: `feature/<feature_slug>: address review feedback`

## 6.5 - Iteration Management
- After each batch completes:
  - Check for any tasks in "NeedsChanges" status
  - If found, process developer fixes in batch
  - Continue batched review/QA until all tasks reach "Done"
  - This batched approach minimizes context switching and improves efficiency

## 6.6 - Pull Request and Merge
- Call `mcp__task-review-manager__verify_all_tasks_complete` to confirm ALL tasks have status "Done"
- Review task completion: confirm all tasks show proper transition history
- Create a Pull Request with comprehensive description linking to feature
- Ensure all CI/CD checks pass and code coverage meets minimum thresholds
- Merge feature branch to main branch upon approval

# Step 7 - Final Verification and Workflow Completion
- Call `mcp__task-review-manager__verify_all_tasks_complete` to confirm all tasks are "Done"
- Call `mcp__task-review-manager__get_feature` to verify complete transition history
- Review workflow history for each task:
  - Stakeholder review cycle: PendingProductDirector → PendingArchitect → PendingUiUxExpert → PendingSecurityOfficer → ReadyForDevelopment
  - Development cycle: ReadyForDevelopment → InProgress → InReview → InQA → Done
  - Any refinement loops: NeedsChanges cycles (if applicable)
- Generate detailed summary:
  - All changes made (from file transitions)
  - Stakeholder approvals summary
  - Implementation details and test coverage
  - Deployment readiness status
  - Files modified (consolidated from all task transitions)
- Confirm all acceptance criteria are marked as met
- Complete the workflow and report summary

