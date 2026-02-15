---
name: refine-feature
description: This workflow refines a feature ticket by gathering context, analyzing attachments, clarifying ambiguities, generating SMART acceptance criteria and test scenarios, and updating the Jira ticket. This is a refinement-only workflow - no code changes will be made.
---
# Input
- Jira Ticket Key or feature description

# Output file
- Create a new file in `.github/artifacts/<feature-slug>/refine-ticket.md` (relative to current workspace)

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
- Generate task.json file in `.github/artifacts/<feature-slug>/task.json` using the `.github/prompts/templates/task-breakdown.json` template
- Ensure each task is:
  - Independently testable
  - Has clear boundaries
  - Includes all necessary acceptance criteria
  - Maps to specific test scenarios
- add Step 6 completed into output file with task breakdown summary (number of tasks, titles)

# Step 7 - Stakeholder Review Cycle
**CRITICAL: You MUST update `.github/artifacts/<feature-slug>/task.json` after EVERY stakeholder review. Read the file before each review to verify current state, update status and add transition record, then SAVE the file before proceeding to next stakeholder.**

- For each task '$TASK' in `.github/artifacts/<feature-slug>/task.json`, execute the following sequential stakeholder review:

  ## Step 7.1 - Product Director Review
  - READ `.github/artifacts/<feature-slug>/task.json` to get current task state
  - Switch to Role `productDirector`
  - Review task focusing on:
    - User experience and usability
    - Feature value and market positioning
    - Competitor analysis and differentiation
    - Mobile and accessibility considerations
    - Overall user journey and workflow
  - **Decision Point:**
    - If concerns found: **REQUIRED** update transition and set status to "NeedsRefinement":
      - '$TASK'.transitions.add({
        "from": "PendingProductDirector",
        "to": "NeedsRefinement",
        "actor": "productDirector",
        "timestamp": "<current_timestamp_ISO8601>",
        "productDirectorNotes": "<UX_concerns_and_required_changes>",
        "requiredChanges": "<specific_improvements_needed>",
        "marketAnalysis": "<competitor_insights_if_applicable>"
      })
      - '$TASK'.stakeholderReview.productDirectorNotes = "<detailed_feedback>"
      - **REQUIRED**: SAVE the updated task.json file
      - **Restart review cycle**: Task must be refined and re-reviewed from Product Director (go back to Step 7.1 after refinement)
      - Exit Step 7.1
    - If approved: **REQUIRED** update transition and set status to "PendingArchitect":
      - '$TASK'.transitions.add({
        "from": "PendingProductDirector",
        "to": "PendingArchitect",
        "actor": "productDirector",
        "timestamp": "<current_timestamp_ISO8601>",
        "productDirectorNotes": "<approval_summary_and_UX_validation>",
        "marketAnalysis": "<competitive_positioning_insights>"
      })
      - '$TASK'.stakeholderReview.productDirectorNotes = "<approval_details>"
      - **REQUIRED**: SAVE the updated task.json file
      - **VERIFICATION**: Read task.json to confirm status is "PendingArchitect"
      - Proceed to Step 7.2

  ## Step 7.2 - Architect Review
  - READ `.github/artifacts/<feature-slug>/task.json` to verify task is in "PendingArchitect" status
  - Switch to Role `architect`
  - Review task focusing on:
    - Technical solution soundness and scalability
    - Technology stack recommendations (best practices)
    - Design patterns and architectural principles
    - System integration and dependencies
    - Industry research and technical trends
    - Technical dos and don'ts
    - API design and database schema recommendations
  - **Decision Point:**
    - If concerns found: **REQUIRED** update transition and set status to "NeedsRefinement":
      - '$TASK'.transitions.add({
        "from": "PendingArchitect",
        "to": "NeedsRefinement",
        "actor": "architect",
        "timestamp": "<current_timestamp_ISO8601>",
        "architectNotes": "<technical_concerns_and_required_changes>",
        "technicalConcerns": "<scalability_or_design_issues>",
        "technologyRecommendations": "<alternative_approaches>"
      })
      - '$TASK'.stakeholderReview.architectNotes = "<detailed_technical_feedback>"
      - **REQUIRED**: SAVE the updated task.json file
      - **Restart review cycle**: Return to Step 7.1 (Product Director)
      - Exit Step 7.2
    - If approved: **REQUIRED** update transition and set status to "PendingLeadEngineer":
      - '$TASK'.transitions.add({
        "from": "PendingArchitect",
        "to": "PendingLeadEngineer",
        "actor": "architect",
        "timestamp": "<current_timestamp_ISO8601>",
        "architectNotes": "<technical_approval_and_recommendations>",
        "technologyRecommendations": "<approved_tech_stack>",
        "designPatterns": "<recommended_patterns_and_practices>"
      })
      - '$TASK'.stakeholderReview.architectNotes = "<technical_approval_details>"
      - **REQUIRED**: SAVE the updated task.json file
      - **VERIFICATION**: Read task.json to confirm status is "PendingLeadEngineer"
      - Proceed to Step 7.3

  ## Step 7.3 - CSO (Chief Security Officer) Review
  - READ `.github/artifacts/<feature-slug>/task.json` to verify task is in "PendingCSO" status
  - Switch to Role `cso`
  - Review task focusing on:
    - Security vulnerabilities and threat assessment
    - Compliance with security standards (OWASP, GDPR, SOC2, etc.)
    - Data protection and encryption requirements
    - Authentication and authorization mechanisms
    - Security best practices and mandatory controls
    - Risk mitigation strategies
  - **Decision Point:**
    - If concerns found: **REQUIRED** update transition and set status to "NeedsRefinement":
      - '$TASK'.transitions.add({
        "from": "PendingCSO",
        "to": "NeedsRefinement",
        "actor": "cso",
        "timestamp": "<current_timestamp_ISO8601>",
        "csoNotes": "<CRITICAL_security_vulnerabilities_and_mandatory_fixes>",
        "securityConcerns": "<identified_risks_and_threats>",
        "mandatoryControls": "<required_security_measures>"
      })
      - '$TASK'.stakeholderReview.csoNotes = "<detailed_security_feedback>"
      - **REQUIRED**: SAVE the updated task.json file
      - **Restart review cycle**: Return to Step 7.1 (Product Director)
      - Exit Step 7.3
    - If approved: **REQUIRED** update transition and set status to "ReadyForDevelopment":
      - '$TASK'.transitions.add({
        "from": "PendingCSO",
        "to": "ReadyForDevelopment",
        "actor": "cso",
        "timestamp": "<current_timestamp_ISO8601>",
        "csoNotes": "<security_approval_and_compliance_confirmation>",
        "securityRequirements": "<mandatory_security_controls_to_implement>",
        "complianceGuidelines": "<regulatory_requirements_and_audit_checklist>"
      })
      - '$TASK'.stakeholderReview.csoNotes = "<security_approval_details>"
      - **REQUIRED**: SAVE the updated task.json file
      - **VERIFICATION**: Read task.json to confirm status is "ReadyForDevelopment"
      - Task review complete, proceed to next task

- **VERIFICATION**: After all tasks reviewed, READ `.github/artifacts/<feature-slug>/task.json` and confirm ALL tasks have status "ReadyForDevelopment"
- add Step 7 completed into output file with stakeholder review summary (all approvals obtained, any major concerns raised and resolved)

# Step 8
- Combine all acceptance criteria into a single text block
- Combine all test scenarios into a single text block
- Update the Jira ticket using mcp_jira-mcp-serv_update_issue
- Verify the update succeeded by re-fetching the issue
- Present the final AC and test scenarios to the user
- add Step 8 completed into output file with the Jira update status and complete the workflow