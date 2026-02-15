# Task Review Manager Dashboard

A real-time web dashboard for monitoring task progress, stakeholder reviews, and development workflow status.

## Features

- **Real-time Updates**: Auto-refreshes every 5 seconds to show latest task status
- **Visual Statistics**: Overview of total tasks, completion percentage, and in-progress items
- **Status Filtering**: Filter tasks by status (All, Done, In Progress, In Review, In QA, Ready for Development)
- **Color-coded Status**: Easy-to-read color indicators for each task status
- **Order Tracking**: Tasks displayed in execution order
- **Responsive Design**: Beautiful, modern UI that works on all screen sizes

## Quick Start

### Automatic Start (Recommended)

The dashboard starts automatically when you run the MCP server:

```bash
npm start
```

The dashboard will be available at **http://localhost:5111**

### Manual Start (Optional)

You can also run the dashboard standalone:

### 1. Build the Project

```bash
npm run build
```

### 2. Start the Dashboard Server

```bash
npm run dashboard
```

The server will start on `http://localhost:5111` (or the port specified in the `PORT` environment variable).

### 3. Open in Browser

Navigate to `http://localhost:5111` in your web browser.

## Load Your Feature

Enter your feature slug in the input field and click "Load Tasks".

Example feature slugs:
- `smart-strangle-engine`
- `user-authentication-v2`
- `payment-gateway-integration`

The dashboard will automatically load the feature data from the SQLite database at `tasks.db` in your workspace root.

## API Endpoints

The dashboard server exposes several REST API endpoints:

### GET /api/tasks?featureSlug=<slug>
Get summary of all tasks including statistics and task list.

**Response:**
```json
{
  "featureSlug": "feature-name",
  "featureName": "Feature Display Name",
  "totalTasks": 10,
  "completionPercentage": 40,
  "tasksByStatus": {
    "Done": 4,
    "InProgress": 2,
    "ToDo": 3,
    ...
  },
  "tasks": [...]
}
```

### GET /api/task?featureSlug=<slug>&id=<taskId>
Get detailed information about a specific task.

**Response:**
```json
{
  "taskId": "T01",
  "status": "InProgress",
  "currentStakeholder": null,
  "completedReviews": ["productDirector", "architect"],
  "pendingReviews": ["leadEngineer", "cfo", "cso"],
  "canTransitionTo": ["InReview"],
  "orderOfExecution": 1
}
```

### GET /api/tasks/by-status?featureSlug=<slug>&status=<status>
Get all tasks with a specific status.

**Response:**
```json
{
  "success": true,
  "tasks": [...],
  "count": 3
}
```

### GET /api/verify-complete?featureSlug=<slug>
Check if all tasks are marked as Done.

**Response:**
```json
{
  "success": true,
  "allComplete": false,
  "totalTasks": 10,
  "completedTasks": 4,
  "incompleteTasks": [
    {
      "taskId": "T05",
      "title": "Task Title",
      "status": "InProgress"
    }
  ]
}
```

## Task Status Colors

The dashboard uses color-coding to make status identification easy:

- **🔴 Red Tones**: Stakeholder review stages (PendingProductDirector, PendingArchitect, etc.)
- **🟠 Orange**: Needs attention (NeedsRefinement, NeedsChanges)
- **🟢 Green**: Ready/Complete (ReadyForDevelopment, Done)
- **🔵 Blue**: Active development (ToDo, InProgress)
- **🟣 Purple**: Review/QA stages (InReview, InQA)

## Configuration

### Custom Port

Set the `PORT` environment variable to use a different port:

```bash
# Windows
set PORT=8080 && npm run dashboard

# macOS/Linux
PORT=8080 npm run dashboard
```

### Auto-refresh Interval

The dashboard auto-refreshes every 5 seconds by default. To modify this, edit the `autoRefreshInterval` in `src/public/index.html`:

```javascript
// Change 5000 (5 seconds) to your desired interval in milliseconds
autoRefreshInterval = setInterval(() => loadTasks(), 5000);
```

## Integration with MCP Server

The dashboard runs as a separate web server and uses the same `TaskReviewManager` class as the MCP server. This means:

1. ✅ **Same business logic**: All validation and workflow rules are enforced
2. ✅ **Read-only operations**: The dashboard only reads task files, never modifies them
3. ✅ **No file locking conflicts**: Uses the same safe file reading methods

You can run both the MCP server and dashboard simultaneously:

```bash
# Terminal 1: Start the MCP server
npm start

# Terminal 2: Start the dashboard
npm run dashboard
```

## Troubleshooting

### "Feature not found" error
- Verify the feature exists in the database
- Run `npm run migrate` if you have existing task.json files
- Check that the database exists at `tasks.db` in your workspace root

### Tasks not updating
- Check that the auto-refresh indicator is pulsing (green dot)
- Verify the database is being updated by your workflow
- Try manually clicking the "Refresh" button
- Check database file permissions

### Port already in use
- Another application is using port 5111
- Stop the other application or use a custom port with `PORT=8080 npm run dashboard`
- Stop the other application or use a custom port (see Configuration above)

## Development

### Running in Development Mode

```bash
# Terminal 1: Watch for TypeScript changes
npm run dev

# Terminal 2: Run dashboard (will need to restart after changes)
npm run dashboard
```

### Customizing the UI

The dashboard HTML and CSS are in `src/public/index.html`. After making changes:

1. Run `npm run build` to copy changes to `dist/public/`
2. Restart the dashboard server
3. Refresh your browser

## License

MIT
