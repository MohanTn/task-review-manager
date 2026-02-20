# AIConductor

> An open-source [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that orchestrates multi-stakeholder feature refinement and development execution workflows for AI-assisted software teams.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?logo=typescript&logoColor=white)](tsconfig.json)

---

## Overview

AIConductor gives your AI coding agent a structured, auditable pipeline — from raw feature idea to merged code. It exposes **39 MCP tools** that any MCP-compatible agent (Claude, Copilot, Cursor, Cline, etc.) can call to drive tasks through two workflows:

1. **Feature Refinement** — Break a feature into discrete tasks, then route each task through a sequential stakeholder approval chain before any code is written.
2. **Development Execution** — Drive approved tasks through a Developer → Code Reviewer → QA lifecycle with full audit history.

## Features

| | |
|---|---|
| **Multi-Stakeholder Reviews** | Product Director → Architect → UI/UX Expert → Security Officer approval chain |
| **Development Pipeline** | Developer → Code Reviewer → QA → Done with `NeedsChanges` feedback loops |
| **Real-time Dashboard** | Kanban board at `localhost:5111` with live WebSocket updates |
| **Multi-Repository** | Manage tasks across multiple codebases from a single server |
| **Refinement Reports** | Generate markdown/HTML/JSON reports of the full refinement process |
| **Workflow Checkpoints** | Save and restore workflow state; rollback the last stakeholder decision |
| **Task Execution Planning** | Dependency analysis with parallelisation suggestions |
| **Zero External Dependencies** | Everything persisted in a local SQLite database |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An MCP-compatible AI agent (Claude Desktop, VS Code Copilot, Cursor, Cline, etc.)

---

## Quick Start

```bash
git clone https://github.com/your-org/aiconductor.git
cd aiconductor
docker compose up -d
```

The MCP server and dashboard are now running. Connect your AI agent by adding the following to your MCP config:

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aiconductor": {
      "command": "docker",
      "args": ["exec", "-i", "aiconductor-mcp", "node", "dist/bundle.js"]
    }
  }
}
```

**VS Code** — `.vscode/mcp.json` or user settings

```json
{
  "mcp.servers": {
    "aiconductor": {
      "command": "docker",
      "args": ["exec", "-i", "aiconductor-mcp", "node", "dist/bundle.js"]
    }
  }
}
```

Restart your agent. Open the dashboard at **http://localhost:5111**.

---

## Workflows

Two slash-command workflows are included in `.github/prompts/` and can be invoked directly from your agent.

### `/refine-feature` — Feature Refinement

Turns a plain-text feature description into stakeholder-approved, implementation-ready tasks.

```
Feature Description
  │
  ├─ Scope determination & context gathering
  ├─ Attachment analysis (images, docs, spreadsheets)
  ├─ Clarification questions
  ├─ SMART acceptance criteria generation
  ├─ Test scenario generation
  ├─ Task breakdown (5–8 tasks)
  │
  └─ Batched stakeholder review cycle
       │
       ├─ Product Director  →  Architect  →  UI/UX Expert  →  Security Officer
       │        │                  │               │                  │
       │     reject             reject          reject             reject
       │        └──────────────────┴───────────────┴──────────────────┘
       │                                  ▼
       │                         NeedsRefinement → restart
       │
       └─ All tasks reach ReadyForDevelopment ✓
```

Tasks are processed in **batches per role** — a single role adoption covers all tasks in one pass, dramatically reducing context overhead.

### `/dev-workflow` — Development Execution

Drives `ReadyForDevelopment` tasks through implementation to `Done`.

```
ReadyForDevelopment
  └─→ InProgress ─→ InReview ─→ InQA ─→ Done ✓
           │             │          │
           └─────────────┴──────────┘
                    NeedsChanges → back to InProgress
```

Each stage is handled by a distinct role: **Developer** (implements & tests), **Code Reviewer** (approves or requests changes), **QA** (verifies acceptance criteria).

---

## Dashboard

Open **http://localhost:5111** in your browser.

- **Kanban board** — Task cards arranged by workflow status; empty columns collapse to a slim strip so all columns fit on screen without horizontal scrolling
- **Real-time updates** — WebSocket connection pushes task state changes instantly to all open browser tabs
- **Detail panel** — Per-feature acceptance criteria, test scenarios, clarifications, and refinement step progress
- **Multi-repo switcher** — Switch between registered repositories from the sidebar
- **Reviewer presence** — See which reviewers are currently active on a feature

---

## MCP Tools Reference

### Orchestration

| Tool | Description |
|---|---|
| `get_next_step` | Returns the next role, system prompt, and required output fields for a task — the primary orchestration driver |
| `get_workflow_snapshot` | Compressed overview of all task statuses and roles for a feature (~5 KB vs ~50 KB for full fetch) |
| `get_task_execution_plan` | Dependency analysis with optimal execution order and parallelisable phases |
| `get_similar_tasks` | Find comparable tasks from past features to aid estimation |
| `get_workflow_metrics` | Cycle time, throughput, and bottleneck statistics |

### Stakeholder Reviews

| Tool | Description |
|---|---|
| `add_stakeholder_review` | Submit an approve/reject review with role-specific structured fields |
| `validate_review_completeness` | Pre-flight check that all required fields are present before submitting |
| `get_task_status` | Current status, completed/pending reviews, and allowed transitions |
| `get_review_summary` | Completion percentage and stakeholder progress across all tasks |
| `validate_workflow` | Dry-run validation — check if a transition can proceed |
| `rollback_last_decision` | Undo the most recent stakeholder decision on a task |

### Development Pipeline

| Tool | Description |
|---|---|
| `transition_task_status` | Move a task through development stages (InProgress → InReview → InQA → Done) |
| `batch_transition_tasks` | Transition multiple tasks atomically in a single call |
| `get_next_task` | Get the next task to work on, optionally filtered by status |
| `get_tasks_by_status` | List all tasks matching a specific status |
| `verify_all_tasks_complete` | Assert every task in a feature has reached Done |
| `update_acceptance_criteria` | Mark individual acceptance criteria as verified |
| `batch_update_acceptance_criteria` | Verify multiple criteria in one call |

### Feature & Task Management

| Tool | Description |
|---|---|
| `create_feature` | Create a new feature with slug, name, and description |
| `update_feature` | Update feature metadata (name, description) |
| `get_feature` | Load full feature data including all tasks, criteria, and scenarios |
| `list_features` | List all features in a repository with task counts |
| `delete_feature` | Remove a feature and all associated tasks, reviews, and transitions |
| `add_task` | Add a task to a feature with acceptance criteria and test scenarios |
| `update_task` | Modify task properties (title, description, criteria, scenarios, dependencies) |
| `delete_task` | Remove a task and all its data |

### Refinement Tracking

| Tool | Description |
|---|---|
| `update_refinement_step` | Record progress through the 8-step refinement workflow |
| `get_refinement_status` | Full refinement progress including step completion and criteria |
| `add_feature_acceptance_criteria` | Add feature-level acceptance criteria (before tasks are created) |
| `add_feature_test_scenarios` | Add feature-level test scenarios |
| `add_clarification` | Record a clarification question and answer |
| `add_attachment_analysis` | Store analysis results for an attached file or design |
| `generate_refinement_report` | Export the full refinement process as markdown, HTML, or JSON |

### Checkpoint Management

| Tool | Description |
|---|---|
| `save_workflow_checkpoint` | Save current workflow state with a description |
| `list_workflow_checkpoints` | List all saved checkpoints for a feature |
| `restore_workflow_checkpoint` | Resume from a previously saved checkpoint |

### Repository Management

| Tool | Description |
|---|---|
| `register_repo` | Register a new repository namespace |
| `list_repos` | List all registered repositories with task counts |
| `get_current_repo` | Auto-detect the repository from the current working directory |

---

## Stakeholder Roles

| Role | Focus Areas | Key Output Fields |
|---|---|---|
| **Product Director** | Market fit, user value, acceptance criteria quality | `marketAnalysis`, `competitorAnalysis`, `quickSummary` |
| **Architect** | Technical feasibility, design patterns, technology choices | `technologyRecommendations`, `designPatterns` |
| **UI/UX Expert** | Usability, accessibility, user behaviour | `usabilityFindings`, `accessibilityRequirements`, `userBehaviorInsights` |
| **Security Officer** | Security requirements, compliance, risk assessment | `securityRequirements`, `complianceNotes` |

---

## Project Structure

```
src/
├── index.ts                 # MCP server — tool definitions and request handling
├── AIConductor.ts     # Business logic for all workflow operations
├── WorkflowValidator.ts     # State machine — validates transitions and returns role prompts
├── DatabaseHandler.ts       # SQLite CRUD operations
├── rolePrompts.ts           # System prompts for each stakeholder role
├── websocket.ts             # WebSocket server — real-time event broadcasting
├── dashboard.ts             # Express web server (port 5111)
├── types.ts                 # TypeScript interfaces
└── client/                  # React SPA (Vite)

.github/prompts/
├── refine-feature.prompt.md # Feature refinement workflow
└── dev-workflow.prompt.md   # Development execution workflow
```

**Database:**
- Docker: `/data/tasks.db` (persistent volume `task-review-data`)
- Local: `./tasks.db` in project root

---

## Local Development

```bash
npm install
npm run dev          # Watch mode — recompiles on change
npm run build        # Production build (server + client)
npm test             # Run all tests
npm run lint         # TypeScript lint
npm run dashboard    # Start dashboard standalone (port 5111)
```

To rebuild the Docker image after code changes:

```bash
docker compose up -d --build
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `./tasks.db` | SQLite file location (`/data/tasks.db` in Docker) |

To reset all data:

```bash
docker compose down -v && docker compose up -d
```

---

## License

MIT
