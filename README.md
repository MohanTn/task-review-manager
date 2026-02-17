# Task Review Manager — MCP Server

An open-source [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that orchestrates **feature refinement** and **development execution** through multi-stakeholder review workflows. Built for AI-assisted software teams that want structured, auditable task pipelines — from idea to merged code.

## 🎯 Key Features

- **🐳 Docker-based with Shared Database** — Single SQLite instance shared across all VS Code/Claude Desktop instances
- **🔄 Multi-Repository Support** — Manage tasks across multiple codebases from any editor
- **👥 Multi-Stakeholder Reviews** — Product Director → Architect → Lead → CFO → CSO approval chain
- **📊 Real-time Dashboard** — Web UI with auto-refresh and repository switching
- **✅ Development Workflow** — Developer → Code Reviewer → QA → Done lifecycle
- **💾 No External Dependencies** — Everything stored in local SQLite

## What It Does

Task Review Manager gives your AI coding agent (Claude Code, Copilot, Cursor, etc.) a set of tools to:

1. **Refine features** — Break down a feature into discrete tasks, then run each task through a sequential stakeholder review (Product Director → Architect → Lead Engineer → CFO → CSO) before any code is written.
2. **Execute development** — Drive each approved task through a Developer → Code Reviewer → QA pipeline with automatic state transitions, acceptance criteria tracking, and full audit history.
3. **Track progress** — Query task status, filter by workflow stage, and view a real-time web dashboard.

---

## Quick Start

### 1. Prerequisites

- **Docker Desktop** installed and running ([Download here](https://www.docker.com/products/docker-desktop))
  - For Windows: Docker Desktop with WSL2 backend recommended
  - For Mac: Docker Desktop for Mac
  - For Linux: Docker Engine and Docker Compose
- VS Code or Claude Desktop with MCP support

**Verify Docker is installed:**

```bash
docker --version
docker compose version
```

### 2. Build and Start the Docker Container

```bash
git clone https://github.com/your-org/task-review-manager.git
cd task-review-manager

# Build and start the container
docker-compose up -d
```

This creates a **shared SQLite database** in a Docker volume, ensuring all VS Code/Claude Desktop instances use the same database.

Verify the container is running:

```bash
docker ps | grep task-review-manager-mcp
```

### 3. Connect to your AI agent

Add the server to your MCP client config. For **Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "task-review-manager": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "task-review-manager-mcp",
        "node",
        "dist/bundle.js"
      ]
    }
  }
}
```

For **VS Code with Cline/Continue** (`.vscode/settings.json` or global settings):

```json
{
  "mcp.servers": {
    "task-review-manager": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "task-review-manager-mcp",
        "node",
        "dist/bundle.js"
      ]
    }
  }
}
```

Restart your AI agent. The tools will be available immediately.

### 4. Use the workflows

The server ships with two prompt workflows you can invoke as slash commands:

| Command | What it does |
|---|---|
| `/refine-feature` | Takes a feature description, breaks it into tasks, and runs stakeholder reviews |
| `/dev-workflow` | Takes an approved feature slug, implements each task through dev → review → QA → done |

Or call any of the 12 MCP tools directly from your agent.

---

## Docker Management

### Shared Database

The Docker setup uses a named volume (`task-review-data`) to persist the SQLite database. This ensures:
- **Single source of truth** — All VS Code/Claude Desktop instances share the same database
- **Data persistence** — Database survives container restarts
- **Multi-repo support** — Manage multiple repositories from any IDE instance

### Common Commands

```bash
# Start the container
docker compose up -d

# Stop the container
docker compose down

# View logs
docker logs task-review-manager-mcp

# Rebuild after code changes
docker compose up -d --build

# Access the database directly
docker exec -it task-review-manager-mcp sqlite3 /data/tasks.db

# Backup the database
docker cp task-review-manager-mcp:/data/tasks.db ./tasks-backup.db

# Restore the database
docker cp ./tasks-backup.db task-review-manager-mcp:/data/tasks.db
```

### Accessing the Dashboard

The dashboard runs on **port 5111** and is accessible via the Docker container:

**Option 1: Using exposed port (default in docker-compose.yml)**

Simply open **http://localhost:5111** in your browser. The dashboard is automatically available when the container is running.

**Option 2: Run dashboard manually inside container**

```bash
docker exec -d task-review-manager-mcp node dist/dashboard.js
```

The dashboard shows:
- Task status overview with completion tracking
- Color-coded status indicators
- Repository selector (switch between repos)
- Filter tasks by status
- Auto-refresh every 5 seconds

For local development (non-Docker):

```bash
npm run dashboard
```

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

Docker files:
├── Dockerfile               # Container image definition
├── docker-compose.yml       # Container orchestration
└── .dockerignore           # Build optimization
```

**Storage:** 
- **Docker:** SQLite database at `/data/tasks.db` (persistent volume `task-review-data`)
- **Local:** SQLite database at `./tasks.db` in workspace root

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `./tasks.db` | SQLite database location (set to `/data/tasks.db` in Docker) |
| Dashboard port | `5111` | Web dashboard port |

### Docker Volume

The Docker setup uses a named volume for persistent storage:

```yaml
volumes:
  task-review-data:  # Stores /data/tasks.db
```

To reset the database, remove the volume:

```bash
docker compose down -v
docker compose up -d
```

### Migrating from JSON files

If you have existing `task.json` files from a previous version:

```bash
npm run migrate
```

This scans `.github/artifacts/*/task.json` and imports all features into the SQLite database.

---

## Development

### Docker Development

```bash
# Rebuild container after code changes
docker-compose up -d --build

# View real-time logs
docker logs -f task-review-manager-mcp

# Run tests inside container
docker exec -it task-review-manager-mcp npm test

# Access container shell
docker exec -it task-review-manager-mcp sh
```

### Local Development (Non-Docker)

If you prefer to develop without Docker:

```bash
# Install dependencies
npm install

# Watch mode with auto-recompile
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint TypeScript
npm run lint

# Start local MCP server (uses ./tasks.db)
npm start

# Run dashboard
npm run dashboard
```

**Note:** Local development creates a separate `tasks.db` file in your project directory, which won't be shared with Docker instances.

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
