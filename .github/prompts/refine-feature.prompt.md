---
name: refine-feature
description: This workflow refines a feature ticket by gathering context, analyzing attachments, clarifying ambiguities, generating SMART acceptance criteria and test scenarios. ALL data is stored in MCP database - NO .md file manipulation required.
---

# ⚠️ CRITICAL: This workflow uses MCP tools EXCLUSIVELY
**DO NOT create or update .md files during Steps 1-7. All data goes into the database via MCP tools.**

# Input
- Jira Ticket Key or feature description

# Output
- All refinement data stored in MCP database (tasks.db)
- Optional: Generate final report in Step 8 using `generate_refinement_report`

---

[Same content as .claude/commands/refine-feature.md - abbreviated for brevity]

This file is synchronized with `.claude/commands/refine-feature.md`
