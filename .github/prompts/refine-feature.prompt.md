---
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

# Step 7 - Stakeholder Review Cycle (MCP Orchestrated - Batched by Role)
**CRITICAL: The MCP server orchestrates this entire review cycle. Process ALL tasks through each role before moving to the next role for maximum efficiency.**

- Execute the review cycle in batches by role (Product Director → Architect → UI/UX Expert → Security Officer):

  ## 7.1 - Product Director Review (Batch)
  - Get all tasks pending Product Director review using `get_tasks_by_status` with status "PendingProductDirector"
  - For each task:
    - Call `get_next_step` to get the systemPrompt and requiredOutputFields
    - Adopt Product Director identity and evaluate from product/market perspective
    - Research competitor analysis and market demand as instructed
    - Call `add_stakeholder_review` with decision (approve/reject), notes, and additionalFields:
      - `marketAnalysis`: Market demand and user value assessment
      - `competitorAnalysis`: Competitor feature comparison
  - All approved tasks transition to "PendingArchitect"
  - Rejected tasks transition to "NeedsRefinement" (address issues before continuing)

  ## 7.2 - Architect Review (Batch)
  - Get all tasks pending Architect review using `get_tasks_by_status` with status "PendingArchitect"
  - For each task:
    - Call `get_next_step` to get systemPrompt, previousRoleNotes, and requiredOutputFields
    - Adopt Architect identity and evaluate technical approach
    - Research best practices, design patterns, and technology recommendations
    - Review Product Director notes from `previousRoleNotes` for context
    - Call `add_stakeholder_review` with decision, notes, and additionalFields:
      - `technologyRecommendations`: Array of recommended technologies and frameworks
      - `designPatterns`: Array of applicable design patterns
  - All approved tasks transition to "PendingUiUxExpert"
  - Rejected tasks transition to "NeedsRefinement"

  ## 7.3 - UI/UX Expert Review (Batch)
  - Get all tasks pending UI/UX review using `get_tasks_by_status` with status "PendingUiUxExpert"
  - For each task:
    - Call `get_next_step` to get systemPrompt, previousRoleNotes, and requiredOutputFields
    - Adopt UI/UX Expert identity and evaluate usability and accessibility
    - Research user behavior patterns and UX best practices
    - Review Product Director and Architect notes from `previousRoleNotes`
    - Call `add_stakeholder_review` with decision, notes, and additionalFields:
      - `usabilityFindings`: String describing usability assessment
      - `accessibilityRequirements`: Array of WCAG compliance requirements
      - `userBehaviorInsights`: String with user behavior research findings
  - All approved tasks transition to "PendingSecurityOfficer"
  - Rejected tasks transition to "NeedsRefinement"

  ## 7.4 - Security Officer Review (Batch)
  - Get all tasks pending Security review using `get_tasks_by_status` with status "PendingSecurityOfficer"
  - For each task:
    - Call `get_next_step` to get systemPrompt, previousRoleNotes, and requiredOutputFields
    - Adopt Security Officer identity and conduct security review
    - Research security best practices, OWASP guidelines, and compliance requirements
    - Review all previous stakeholder notes from `previousRoleNotes`
    - Call `add_stakeholder_review` with decision, notes, and additionalFields:
      - `securityRequirements`: Array of security controls and requirements
      - `complianceNotes`: String describing compliance considerations
  - All approved tasks transition to "ReadyForDevelopment"
  - Rejected tasks transition to "NeedsRefinement"

  ## 7.5 - Handle Rejected Tasks (If Any)
  - If any tasks were rejected to "NeedsRefinement", address the issues identified in stakeholder notes
  - Update task details as needed using `update_task`
  - Restart the review cycle from Product Director for these tasks
  - Repeat until all tasks reach "ReadyForDevelopment"

- **VERIFICATION**: Call `verify_all_tasks_complete` or `get_tasks_by_status` with status "ReadyForDevelopment" to confirm all tasks are approved
- add Step 7 completed into output file with stakeholder review summary showing tasks processed per role

# Step 8
- Combine all acceptance criteria into a single text block
- Combine all test scenarios into a single text block
- Update the Jira ticket using mcp_jira-mcp-serv_update_issue
- Verify the update succeeded by re-fetching the issue
- Present the final AC and test scenarios to the user
- add Step 8 completed into output file with the Jira update status and complete the workflow