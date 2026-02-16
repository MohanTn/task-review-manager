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
- add Step 8 completed into output file with the Jira update status and complete the workflow
