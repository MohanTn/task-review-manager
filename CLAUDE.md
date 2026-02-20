# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**AIConductor** is an MCP (Model Context Protocol) server that orchestrates multi-stakeholder task review workflows. It provides:
- **Feature Refinement Pipeline** — Break ideas into tasks, route through stakeholder reviews (Product → Architect → UX/UX Expert → Security)
- **Development Execution Pipeline** — Drive tasks through implementation (Developer → Code Reviewer → QA)
- **Web Dashboard** — Real-time progress tracking with auto-refresh
- **Multi-Repository Support** — Manage multiple codebases from a single MCP server

The server uses SQLite for persistence and can run either locally or in Docker with a shared database.

---

## Architecture at a Glance

```
┌─── MCP Server (index.ts) ─────────────────────────────────┐
│  - Exposes 20+ tools for workflows                         │
│  - Handles tool requests and state transitions             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ AIConductor (orchestration logic)              │  │
│  │ - Feature/Task CRUD                                  │  │
│  │ - Stakeholder review handling                        │  │
│  │ - Development pipeline transitions                   │  │
│  └─────────────────┬──────────────────────────────────┘  │
│                    │                                       │
│  ┌─────────────────▼──────────────────────────────────┐  │
│  │ WorkflowValidator (state machine)                   │  │
│  │ - Validates transitions                             │  │
│  │ - Enforces role permissions                         │  │
│  │ - Returns system prompts for next role              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DatabaseHandler (SQLite operations)                 │  │
│  │ - CRUD for features, tasks, reviews, transitions    │  │
│  │ - Acceptance criteria, test scenarios               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─── Dashboard (Express web server on :5111) ─────────────────┐
│  - API routes for repos, features, tasks, refinement        │
│  - React SPA frontend with real-time updates                │
│  - Auto-refresh every 5 seconds                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Feature Refinement (`/refine-feature`):**
1. Create feature with 5-8 tasks (all start in `PendingProductDirector`)
2. **Batched role reviews** — Product Director reviews ALL tasks, then Architect reviews ALL, etc.
3. Each role can approve (move to next role) or reject (back to `NeedsRefinement`)
4. Once all tasks reach `ReadyForDevelopment`, refinement is complete

**Development Execution (`/dev-workflow`):**
1. Get all tasks with `ReadyForDevelopment` status
2. **Batched role execution** — Developer implements ALL, then Code Reviewer reviews ALL, then QA tests ALL
3. Each role transitions all approved tasks together
4. Tasks rejected to `NeedsChanges` re-enter developer phase
5. All tasks must reach `Done` before deployment

---

## Key Concepts

### Workflow Statuses

**Refinement Phase:**
- `PendingProductDirector` → `PendingArchitect` → `PendingUiUxExpert` → `PendingSecurityOfficer` → `ReadyForDevelopment`
- `NeedsRefinement` — Rejected; restart from Product Director after fixes

**Development Phase:**
- `ReadyForDevelopment` → `ToDo` → `InProgress` → `InReview` → `InQA` → `Done`
- `NeedsChanges` — Rejected by Code Reviewer or QA; restart from `InProgress`

### Batched Role Processing (Optimized)

**Old Approach (Per-Task):** Task1→PD→Task1→Arch, Task2→PD→Task2→Arch... (🔴 Inefficient)

**New Approach (Batched):** All Tasks→PD, All Tasks→Arch, All Tasks→UX... (✅ Efficient)

- Single role adoption per batch
- Consolidated research phase per role
- All tasks move together to next stage
- Dramatically reduces context switching and MCP tool overhead

See `.claude/commands/refine-feature.md` and `.claude/commands/dev-workflow.md` for implementation details.

### Get Next Step (Orchestration)

The **`get_next_step`** tool is the primary orchestration mechanism:
- Takes `featureSlug` and `taskId`
- Returns the next role that should act (e.g., "Architect")
- Provides `systemPrompt` with detailed instructions for that role
- Includes `previousRoleNotes` for context from prior stakeholders
- Returns `requiredOutputFields` for role-specific data (e.g., `securityRequirements[]` for Security Officer)

All workflows use `get_next_step` to determine what to do next—it drives the entire state machine.

---

## Essential Commands

### Build & Development
```bash
# Development mode — watch and auto-recompile
npm run dev

# Production build (TypeScript → JavaScript)
npm run build

# Build client separately (Vite)
npm run build:client

# Run client dev server (HMR on :5173)
npm run dev:client
```

### Testing & Linting
```bash
# Run all tests
npm test

# Run single test file
npm test -- all-tools.test.ts

# Lint TypeScript
npm lint

# Type check without emitting
npx tsc --noEmit
```

### Running the Server
```bash
# Start MCP server (uses ./tasks.db locally)
npm start

# Start dashboard web UI (port 5111)
npm run dashboard

# Both together in Docker
docker-compose up -d
```

### Database & Migration
```bash
# Migrate from JSON files (.github/artifacts/*/task.json) to SQLite
npm run migrate

# Access SQLite directly in Docker
docker exec -it aiconductor-mcp sqlite3 /data/tasks.db

# Backup database
docker cp aiconductor-mcp:/data/tasks.db ./tasks-backup.db
```

### Docker
```bash
# Build and start
docker-compose up -d --build

# View logs
docker logs -f aiconductor-mcp

# Rebuild after code changes
docker-compose up -d --build

# Stop and remove volumes (reset database)
docker-compose down -v
```

---

## Project Structure

### Core Backend (`src/`)
- **`index.ts`** — MCP server entry point; defines all 20+ tools
- **`AIConductor.ts`** — Business logic for all workflow operations
- **`WorkflowValidator.ts`** — State machine; validates transitions and returns system prompts
- **`DatabaseHandler.ts`** — SQLite CRUD operations; all data persistence
- **`rolePrompts.ts`** — System prompts for each stakeholder role (Product Director, Architect, etc.)
- **`types.ts`** — TypeScript interfaces for all data structures
- **`migrate.ts`** — Utility to migrate from JSON files to SQLite

### Dashboard (`src/dashboard/` + `src/client/`)

**Backend Express Routes:**
- **`dashboard/routes/repo.routes.ts`** — `/api/repos` endpoints
- **`dashboard/routes/feature.routes.ts`** — `/api/features` endpoints
- **`dashboard/routes/task.routes.ts`** — `/api/tasks` endpoints
- **`dashboard/routes/refinement.routes.ts`** — `/api/refinement` endpoints

**Frontend React (SPA):**
- **`client/App.tsx`** — Root component with layout
- **`client/components/`** — Sidebar, MainContent, Board, DetailPanel, etc.
- **`client/api/`** — API client methods (repos.api.ts, features.api.ts, tasks.api.ts)
- **`client/state/AppState.tsx`** — Global state management (React Context)
- **`client/types/index.ts`** — Frontend TypeScript interfaces

### Tests (`src/__tests__/`)
- **`all-tools.test.ts`** — Tests all MCP tools
- **`multi-repo.test.ts`** — Tests multi-repository functionality
- **`dashboard-api.test.ts`** — Tests dashboard API endpoints

### Workflows (`.claude/commands/` and `.github/prompts/`)
- **`refine-feature.md`** / **`refine-feature.prompt.md`** — Feature refinement workflow (batched role processing)
- **`dev-workflow.md`** / **`dev-workflow.prompt.md`** — Development execution workflow (batched role processing)

---

## Key Design Patterns

### 1. State Machine via WorkflowValidator
All status transitions are validated by `WorkflowValidator.validateTransition()`. It:
- Checks if the actor has permission to make this transition
- Returns what role should act next (if in a review phase)
- Returns the system prompt for that role
- Prevents invalid state changes

**Example:** `get_next_step` calls `validateTransition` to determine if a task is ready for Architect review and returns the Architect's system prompt.

### 2. Batched Role Processing
Instead of switching roles per task:
- Call `get_next_step` ONCE to get role instructions
- Process ALL tasks in that batch with that role
- Transition ALL approved tasks together
- Move to next role

This is implemented in the workflows (`.claude/commands/refine-feature.md`, `.dev-workflow.md`) and dramatically reduces context switching.

### 3. Role-Specific System Prompts
`rolePrompts.ts` defines detailed system prompts for each role:
- **Product Director** — Focus on market fit, UX value
- **Architect** — Focus on technical feasibility, design patterns
- **UI/UX Expert** — Focus on usability, accessibility, user behavior
- **Security Officer** — Focus on security requirements, compliance

Each role has `requiredOutputFields` (e.g., `marketAnalysis` for Product Director, `securityRequirements` for Security Officer).

### 4. Transition Metadata
When transitioning a task, include role-specific metadata:
- Developer: `developerNotes`, `filesChanged`, `testFiles`
- Code Reviewer: `codeReviewerNotes`, `testResultsSummary`
- QA: `qaNotes`, `testExecutionSummary`, `acceptanceCriteriaMet`

This metadata is stored in `previousRoleNotes` for downstream roles.

### 5. Feature-Level vs Task-Level Data
- **Feature-level** — Acceptance criteria and test scenarios at feature scope
- **Task-level** — Acceptance criteria and test scenarios scoped to individual tasks
- Dashboard Detail view displays both (feature-level + aggregated task-level)

---

## Important Implementation Details

### Database Schema
Key tables in SQLite:
- **`features`** — feature_slug, feature_name, created_at, last_modified
- **`tasks`** — task_id, feature_slug, title, status, order_of_execution
- **`acceptance_criteria`** — criterion_id, task_id, criterion, priority, verified
- **`test_scenarios`** — scenario_id, task_id, title, priority
- **`transitions`** — from_status, to_status, actor, timestamp, additional_data (JSON)
- **`stakeholder_reviews`** — stakeholder, decision, notes, additional_data (JSON)

See `DatabaseHandler.ts` `initializeTables()` for complete schema.

### Multi-Repository Support
- All tools accept `repoName` parameter (defaults to `'default'`)
- Database stores features scoped by repo: `(repoName, featureSlug)` is unique
- Dashboard allows switching repos via dropdown
- Enables managing multiple projects from one MCP server

### Local vs Docker Storage
- **Local development:** SQLite at `./tasks.db` (workspace root)
- **Docker:** SQLite at `/data/tasks.db` (persistent volume `task-review-data`)
- Set `DATABASE_PATH` env var to override

### Dashboard Auto-Refresh
- Client polls every 5 seconds via `MainContent.tsx` `useEffect`
- API endpoints (`/api/tasks`, `/api/features`) hit the database
- React Context (AppState.tsx) manages current repo, feature, and view mode

---

## Common Development Tasks

### Adding a New MCP Tool
1. Define input/output types in `src/types.ts`
2. Implement logic in `src/AIConductor.ts`
3. Add tool definition in `src/index.ts` (in `TOOLS` array)
4. Add handler in `handleToolCall()` switch statement

### Adding a Dashboard API Endpoint
1. Create or edit a route file in `src/dashboard/routes/`
2. Use Express router: `router.get('/path', (req, res) => { ... })`
3. Import and register in `src/dashboard.ts`: `app.use('/api', createXxxRoutes(reviewManager))`

### Adding a Dashboard UI Component
1. Create React component in `src/client/components/`
2. Use client API methods from `src/client/api/`
3. Access global state via `useAppState()` hook (from AppState.tsx)
4. Import in parent component

### Modifying the Workflow
1. Edit `.claude/commands/refine-feature.md` or `.claude/commands/dev-workflow.md`
2. Also update corresponding `.github/prompts/` files for consistency
3. These are read by AI agents; they define the step-by-step process

---

## Debugging Tips

### 1. Inspect the Database
```bash
# Local
sqlite3 ./tasks.db ".tables"
sqlite3 ./tasks.db "SELECT * FROM tasks WHERE feature_slug = 'my-feature';"

# Docker
docker exec -it aiconductor-mcp sqlite3 /data/tasks.db ".schema tasks"
```

### 2. Check MCP Tool Availability
Look at `src/index.ts` to see all exposed tools. Verify:
- Tool name matches what's being called
- Input schema matches what's being passed
- Required parameters are present

### 3. Trace Workflow State
Use `get_task_status` to see:
- Current task status
- What stakeholders have reviewed
- What transitions are allowed
- Previous role notes

### 4. Dashboard Issues
- Check browser console for API errors
- Verify `localhost:5111/api/health` returns `{"status":"ok",...}`
- Check server logs: `docker logs -f aiconductor-mcp`
- Verify `/api/repos` endpoint returns data

### 5. TypeScript Compilation
```bash
# Check for type errors without building
npx tsc --noEmit

# View all errors in a file
npx tsc src/SomeFile.ts --noEmit
```

---

## Performance Considerations

### Batched Role Processing (Efficiency)
- **Old:** Process 1 task through all 4 roles, then next task → 4N tool calls
- **New:** All tasks through each role → 4 tool calls total
- **Benefit:** Dramatically reduces context length and MCP overhead

### Client Polling
- Dashboard polls every 5 seconds (configurable in `MainContent.tsx`)
- For real-time dashboards with many tasks, consider WebSocket instead
- Database queries are indexed on `(feature_slug, task_id)` for fast lookups

### Database Indexing
- Primary keys on feature_slug, task_id
- Composite unique constraints on `(feature_slug, task_id)`
- Consider adding indexes on `status` column for large datasets

---

## Deployment

### Local Development
```bash
npm install && npm run build
npm start & npm run dashboard
```
Both MCP server and dashboard run; share local SQLite.

### Docker Production
```bash
docker-compose up -d
```
Container has shared database volume, MCP server, and dashboard built-in.

### Multi-IDE Setup
- All IDEs connect to same MCP server (docker or local)
- All share same SQLite database
- Dashboard accessible at `http://localhost:5111` from any machine

---

## When Something Breaks

1. **MCP tools not available** → Check `npm run build` succeeded, restart server
2. **Database locked** → Kill any open SQLite connections or restart Docker
3. **Dashboard shows stale data** → Browser cache; clear and refresh
4. **Workflow stuck in a status** → Use `transition_task_status` with `actor: "system"` to force transition
5. **Type errors in TypeScript** → Run `npm run build` to see full errors

If unclear, check logs:
```bash
docker logs -f aiconductor-mcp
# or locally:
npm run dev
```

