# Task Review Manager — MCP Server

An open-source [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that orchestrates **feature refinement** and **development execution** through multi-stakeholder review workflows. Built for AI-assisted software teams that want structured, auditable task pipelines — from idea to merged code.

## What It Does

Task Review Manager gives your AI coding agent (Claude Code, Copilot, Cursor, etc.) a set of tools to:

1. **Refine features** — Break down a feature into discrete tasks, then run each task through a sequential stakeholder review (Product Director → Architect → Lead Engineer → CFO → CSO) before any code is written.
2. **Execute development** — Drive each approved task through a Developer → Code Reviewer → QA pipeline with automatic state transitions, acceptance criteria tracking, and full audit history.
3. **Track progress** — Query task status, filter by workflow stage, and view a real-time web dashboard.

Everything is stored in a local SQLite database. No external services required.

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/your-org/task-review-manager.git
cd task-review-manager
npm install
npm run build
```

Requires **Node.js 20+**.

### 2. Connect to your AI agent

Add the server to your MCP client config. For example, in Claude Code (`~/.claude.json` or your IDE's MCP settings):

```json
{
  "mcpServers": {
    "task-review-manager": {
      "command": "node",
      "args": ["/absolute/path/to/task-review-manager/dist/bundle.js"]
    }
  }
}
```

Restart your AI agent. The tools will be available immediately.

### 3. Use the workflows

The server ships with two prompt workflows you can invoke as slash commands:

| Command | What it does |
|---|---|
| `/refine-feature` | Takes a feature description, breaks it into tasks, and runs stakeholder reviews |
| `/dev-workflow` | Takes an approved feature slug, implements each task through dev → review → QA → done |

Or call any of the 12 MCP tools directly from your agent.

---

## How It Works

### The Two Workflows

#### Workflow 1: Feature Refinement (`/refine-feature`)

Turn a feature idea into stakeholder-approved, implementation-ready tasks.

```
Feature Idea
  │
  ├─ 1. Determine scope (enhancement / bug fix / refinement)
  ├─ 2. Analyze attachments (Excel, images, docs)
  ├─ 3. Clarify ambiguities with the user
  ├─ 4. Generate SMART acceptance criteria
  ├─ 5. Generate test scenarios
  ├─ 6. Break into 5-8 discrete tasks
  │
  └─ 7. Stakeholder Review Cycle (per task)
       │
       │  ┌─ Product Director ──approve──→ Architect ──approve──→ Lead Engineer ──approve──→ CFO ──approve──→ CSO ──approve──→ Ready ✓
       │  │         │                         │                         │                      │                   │
       │  │      reject                    reject                   reject                  reject              reject
       │  │         └─────────────────────────┴─────────────────────────┴──────────────────────┴───────────────────┘
       │  │                                              ▼
       │  │                                      NeedsRefinement (restart from Product Director)
       │  └──────────────────────────────────────────────┘
       │
       └─ All tasks reach "ReadyForDevelopment"
```

Each stakeholder reviews with role-specific focus areas (market fit, architecture, resource planning, budget, security) and can approve or reject.

#### Workflow 2: Development Execution (`/dev-workflow`)

Take approved tasks and drive them through implementation.

```
ReadyForDevelopment
  └──→ ToDo ──→ InProgress ──→ InReview ──→ InQA ──→ Done ✓
                     │              │           │
                     └──────────────┴───────────┘
                           NeedsChanges (loop back to InProgress)
```

For each task the agent adopts three roles sequentially:
- **Developer** — Implements the feature, writes tests, submits for review
- **Code Reviewer** — Reviews code quality, approves or requests changes
- **QA** — Runs test scenarios, verifies acceptance criteria, marks done or flags bugs

---

## Available MCP Tools

| Tool | Description |
|---|---|
| `create_feature` | Create a new feature entry in the database |
| `add_task` | Add a task to a feature |
| `get_feature` | Load complete feature data with all tasks |
| `add_stakeholder_review` | Submit a stakeholder review (approve/reject) with role-specific fields |
| `get_task_status` | Get current status, completed/pending reviews, allowed transitions |
| `get_review_summary` | Completion percentage, stakeholder progress across all tasks |
| `validate_workflow` | Dry-run validation — check if a review can proceed |
| `transition_task_status` | Move a task through development stages (ToDo → InProgress → Done) |
| `get_next_task` | Get the next task to work on, optionally filtered by status |
| `get_next_step` | Get the next role and instructions for a task (drives the orchestration loop) |
| `update_task` | Modify task properties (title, description, acceptance criteria, etc.) |
| `delete_task` | Remove a task and all associated data |
| `update_acceptance_criteria` | Mark acceptance criteria as verified |
| `get_tasks_by_status` | List all tasks with a specific status |
| `verify_all_tasks_complete` | Check if every task in a feature is Done |

---

## Dashboard

The server starts a web dashboard on **port 5111** automatically when you run `npm start`.

Open **http://localhost:5111** to see:
- Task status overview with completion tracking
- Color-coded status indicators
- Filter tasks by status
- Auto-refresh every 5 seconds

Run the dashboard standalone:

```bash
npm run dashboard
```

---

## Project Structure

```
src/
├── index.ts                 # MCP server entry point & tool definitions
├── TaskReviewManager.ts     # Core business logic
├── WorkflowValidator.ts     # State machine & transition rules
├── DatabaseHandler.ts       # SQLite operations
├── rolePrompts.ts           # Stakeholder role prompts for get_next_step
├── dashboard.ts             # Express web dashboard
├── types.ts                 # TypeScript interfaces
├── migrate.ts               # JSON → SQLite migration utility
└── JsonFileHandler.ts       # Legacy file handler (migration only)

.github/prompts/
├── refine-feature.prompt.md # Refinement workflow prompt
└── dev-workflow.prompt.md   # Development workflow prompt
```

**Storage:** SQLite database at `tasks.db` in your workspace root.

---

## Configuration

### Environment Variables

None required. The server uses convention-based defaults:

| Setting | Default | Description |
|---|---|---|
| Database path | `./tasks.db` | SQLite database location |
| Dashboard port | `5111` | Web dashboard port |

### Migrating from JSON files

If you have existing `task.json` files from a previous version:

```bash
npm run migrate
```

This scans `.github/artifacts/*/task.json` and imports all features into the SQLite database.

---

## Development

```bash
npm run dev       # Watch mode with auto-recompile
npm run build     # Production build → dist/bundle.js
npm test          # Run tests
npm run lint      # Lint TypeScript
```

---

## Stakeholder Roles

Each stakeholder in the review chain has a specific focus:

| Role | Focus Areas |
|---|---|
| **Product Director** | Market fit, user value, priority, acceptance criteria quality |
| **Architect** | Technical feasibility, design patterns, technology recommendations |
| **Lead Engineer** | Resource planning, implementation phases, effort estimation |
| **CFO** | Budget impact, cost-benefit analysis, resource allocation |
| **CSO** | Security requirements, compliance, risk assessment |

Roles can add structured fields to their reviews (e.g., `technologyRecommendations[]`, `securityRequirements[]`, `marketAnalysis`).

---

## Actor Permissions (Development Workflow)

| Actor | Allowed Transitions |
|---|---|
| `developer` | ToDo → InProgress, InProgress → InReview, NeedsChanges → InProgress |
| `reviewer` | InReview → InQA, InReview → NeedsChanges |
| `qa` | InQA → Done, InQA → NeedsChanges |
| `stakeholder` | ReadyForDevelopment → PendingCFO, PendingCFO → ToDo |
| `system` | Any transition |

---

## License

MIT
