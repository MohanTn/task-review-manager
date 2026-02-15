---
name: dev-workflow
description: Here you will execute a carefully orchestrated workflow by following the steps exactly as outlined below. This workflow is designed to ensure a comprehensive and structured approach to feature development, from gathering requirements to implementing code changes. Each stage builds upon the previous one, so it is critical to follow the sequence and complete each step thoroughly before moving on to the next.
---
# Input
- Refined feature_slug path (e.g. `smart-strangle-engine`) with pre-approved task.json from refinement phase, located at `.github/artifacts/<feature_slug>/task.json`

# Output file
- Create a new file in `.github/artifacts/<feature_slug>/dev-workflow.md` (relative to current workspace)

# Step 1
- **PREREQUISITE**: This workflow requires a completed feature refinement with stakeholder-approved task.json
- Verify that `.github/artifacts/<feature_slug>/task.json` exists and was generated from the refine-feature workflow
- Load and validate the pre-approved task.json file
- Confirm all tasks have status "ReadyForDevelopment" with complete stakeholder review
- Review the summary:
  - objective (from refinement phase)
  - acceptance criteria (pre-approved)
  - dependencies (identified in refinement)
  - blockers (from stakeholder reviews)
  - priority
  - stakeholder feedback (productDirectorNotes, architectNotes, leadEngineerNotes, cfoNotes, csoNotes)
- add Step 1 completed into output file with validation confirmation and summary of pre-approved tasks

# Step 2
- Review stakeholder analysis from task.json transitions (already validated in refinement phase)
- Confirm architecture decisions from Architect review are clear and actionable
- Verify technical specifications and design patterns to follow
- Review security requirements from CSO approval
- Confirm resource plan from Lead Engineer is sufficient
- add Step 2 completed into output file with confirmation of stakeholder decisions

# Step 3
- search the codebase for related services, components, and existing patterns (following Architect recommendations from task.json)
- identify relevant repositories, services, controllers, and middleware
- query DB schemas if applicable: tables, foreign keys, constraints using postgres-mcp-server and its tools
- validate that the recommended architecture from Architect review is compatible with existing codebase
- add Step 3 completed into output file with codebase investigation findings

# Step 4
- **SKIP**: Task breakdown already completed in refinement phase with stakeholder approval
- Verify `.github/artifacts/<feature_slug>/task.json` contains all required tasks with status "ReadyForDevelopment"
- Review task execution order (orderOfExecution field) from Lead Engineer's resource plan
- add Step 4 completed into output file confirming pre-approved task structure is ready for implementation

# Step 5
- Create a feature branch: `git checkout -b feature/<feature_slug>/description`
- add Step 5 completed into output file with branch name and initial commit message

# Step 6
**CRITICAL: You MUST update `.github/artifacts/<feature_slug>/task.json` after every status change in substeps 6.1, 6.2, and 6.3. Read the file before each substep to verify current state, update status and transitions as specified, then SAVE the file before proceeding.**

- foreach task '$TASK' in `.github/artifacts/<feature_slug>/task.json` which is in status "ReadyForDevelopment", "ToDo", or "NeedsChanges" and has the lowest orderOfExecution, execute the following sub-steps:
 
  # Step 6.1 - Developer Implementation
  - READ `.github/artifacts/<feature_slug>/task.json` to get current task state
  - Pick the '$TASK' from task.json which is in status 'ReadyForDevelopment' and has the lowest orderOfExecution
  - **REQUIRED**: Transition task from stakeholder approval to development:
    - '$TASK'.transitions.add({
      "from": "ReadyForDevelopment",
      "to": "ToDo",
      "actor": "system",
      "timestamp": "<current_timestamp_ISO8601>",
      "notes": "All stakeholder approvals obtained. Moving to development queue."
    })
    - '$TASK'.status = "ToDo"
    - **REQUIRED**: SAVE the updated task.json file
  - Switch to Role `developer` and implement the feature according to the task specifications
  - Review all stakeholder feedback before implementation:
    - Product Director notes (UX/feature requirements)
    - Architect notes (technical approach and design patterns)
    - Lead Engineer notes (execution plan and resources)
    - CFO notes (cost optimization requirements)
    - CSO notes (security requirements and compliance)
  - **REQUIRED**: Update '$TASK'.status = "InProgress" and SAVE task.json file
  - Ensure code adheres to:
    - Architecture design patterns from Architect review
    - Security requirements from CSO review
    - Cost optimization from CFO review
  - Add comprehensive unit and integration tests to validate functionality against acceptance criteria
  - **REQUIRED**: Update '$TASK'.status = "InReview" and add transition record:
    - '$TASK'.transitions.add({
      "from": "InProgress",
      "to": "InReview",
      "actor": "developer",
      "timestamp": "<current_timestamp_ISO8601>",
      "developerNotes": "<implementation_summary>",
      "filesChanged": ["<list_of_modified_files>"],
      "testFiles": ["<list_of_test_files_created_or_modified>"]
    })
  - **REQUIRED**: SAVE the updated task.json file
  - **VERIFICATION**: Read task.json to confirm status is "InReview" before proceeding to Step 6.2
  - add Step 6.1 completed into output file with implementation summary and test coverage details

  # Step 6.2 - Code Review
  - READ `.github/artifacts/<feature_slug>/task.json` to verify task is in "InReview" status
  - Switch to Role `reviewer`
  - Pick the task from task.json which is in status "InReview"
  - Perform comprehensive code review against acceptance criteria and design patterns
  - If feedback required: **REQUIRED** update transition and set status to "NeedsChanges":
    - '$TASK'.transitions.add({
      "from": "InReview",
      "to": "NeedsChanges",
      "actor": "reviewer",
      "timestamp": "<current_timestamp_ISO8601>",
      "reviewerNotes": "<feedback_and_required_changes>"
    })
    - **REQUIRED**: SAVE the updated task.json file
    - Return task to developer (go back to Step 6.1) and exit Step 6.2
  - If all tests pass and code meets standards: **REQUIRED** update transition and set status to "InQA":
    - '$TASK'.transitions.add({
      "from": "InReview",
      "to": "InQA",
      "actor": "reviewer",
      "timestamp": "<current_timestamp_ISO8601>",
      "reviewerNotes": "<approval_summary>",
      "qaSignOff": "approved_for_qa",
      "testResultsSummary": "<test_results_and_coverage_metrics>"
    })
  - **REQUIRED**: SAVE the updated task.json file
  - **VERIFICATION**: Read task.json to confirm status is "InQA" before proceeding to Step 6.3
  - add Step 6.2 completed into output file with code review summary

  # Step 6.3 - Quality Assurance Testing
  - READ `.github/artifacts/<feature_slug>/task.json` to verify task is in "InQA" status
  - Switch to Role `qa`
  - Pick the task from task.json which is in status "InQA"
  - Perform thorough testing against all acceptance criteria and test scenarios
  - For each acceptance criterion: verify and set verified = true
  - If acceptance criteria not met: **REQUIRED** update transition and set status to "NeedsChanges":
    - '$TASK'.transitions.add({
      "from": "InQA",
      "to": "NeedsChanges",
      "actor": "qa",
      "timestamp": "<current_timestamp_ISO8601>",
      "qaNotes": "<issues_found_and_required_fixes>"
    })
    - **REQUIRED**: SAVE the updated task.json file
    - Return task to developer (go back to Step 6.1) and exit Step 6.3
  - If all acceptance criteria met: **REQUIRED** update transition and set status to "Done":
    - '$TASK'.transitions.add({
      "from": "InQA",
      "to": "Done",
      "actor": "qa",
      "timestamp": "<current_timestamp_ISO8601>",
      "qaNotes": "<qa_sign_off_and_findings>",
      "deploymentReadiness": "ready_for_production",
      "acceptanceCriteriaMet": true
    })
  - **REQUIRED**: SAVE the updated task.json file
  - **VERIFICATION**: Read task.json to confirm status is "Done" before proceeding to next task or Step 6.4
  - add Step 6.3 completed into output file with QA testing summary

  # Step 6.4 - Pull Request and Merge
  - **VERIFICATION**: READ `.github/artifacts/<feature_slug>/task.json` and verify ALL tasks have status "Done"
  - Review task completion: confirm all tasks show proper transition history (ToDo/NeedsChanges → InProgress → InReview → InQA → Done)
  - Create a Pull Request with comprehensive description linking to Jira ticket
  - Ensure all CI/CD checks pass and code coverage meets minimum thresholds
  - Merge feature branch to development branch upon approval
  - add Step 6.4 completed into output file with PR details and merge confirmation

  # Step 6.5 - Git Commit
  - Commit only the code changes done in the repo with a single line comment as summary in this pattern `feature/<feature_slug>: summary of changes`, exclude all the files .md and task.json file
  - add Step 6.5 completed into output file with commit message and summary of changes

# Step 7 - Final Verification and Workflow Completion
- **VERIFICATION**: READ `.github/artifacts/<feature_slug>/task.json` and confirm all tasks have status "Done" with complete transition history
- Review complete workflow history for each task:
  - Stakeholder review cycle: PendingProductDirector → PendingArchitect → PendingLeadEngineer → PendingCFO → PendingCSO → ReadyForDevelopment
  - Development cycle: ReadyForDevelopment → ToDo → InProgress → InReview → InQA → Done
  - Any refinement loops: NeedsRefinement cycles (if applicable)
- Generate a detailed MR description linking to the Jira ticket and summarizing:
  - All changes made (reference task.json for complete list)
  - Stakeholder approvals summary:
    - Product Director: UX and market validation
    - Architect: Technical solution approval
    - Lead Engineer: Resource plan and execution strategy
    - CFO: Financial approval and ROI
    - CSO: Security compliance and requirements met
  - Implementation details:
    - Test coverage details (from transition records)
    - Security controls implemented (per CSO requirements)
    - Architecture patterns followed (per Architect recommendations)
  - Deployment readiness status
  - Files modified (consolidated from all task transitions)
- Review the task.json file to ensure all acceptance criteria are marked as met
- Complete the workflow and report summary
