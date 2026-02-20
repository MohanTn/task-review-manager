/**
 * Dashboard Server - Web interface for viewing task progress in real-time
 * Includes WebSocket server for real-time updates (T01)
 */
import express from 'express';
import { TaskReviewManager } from './TaskReviewManager.js';
import { wsManager } from './websocket.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { createRepoRoutes } from './dashboard/routes/repo.routes.js';
import { createFeatureRoutes } from './dashboard/routes/feature.routes.js';
import { createTaskRoutes } from './dashboard/routes/task.routes.js';
import { createRefinementRoutes } from './dashboard/routes/refinement.routes.js';
import { createSettingsRoutes } from './dashboard/routes/settings.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start the dashboard server
 * @param port Port number (default: 5111)
 * @returns Express app instance
 */
export function startDashboard(port: number = 5111) {
  const app = express();
  const PORT = process.env.PORT || port;

  // Initialize task review manager
  const reviewManager = new TaskReviewManager();

  // Middleware
  app.use(express.json());

  // Serve static files from Vite build output
  app.use(express.static(path.join(__dirname, 'client')));

  // API Route Modules
  app.use('/api', createRepoRoutes(reviewManager));
  app.use('/api', createFeatureRoutes(reviewManager));
  app.use('/api', createTaskRoutes(reviewManager));
  app.use('/api', createRefinementRoutes(reviewManager));
  app.use('/api', createSettingsRoutes(reviewManager));

  /**
   * Serve the dashboard HTML (for SPA routing)
   */
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      websocket: 'enabled',
      connections: wsManager.getConnectionCount(),
    });
  });

  // Create HTTP server to support both Express and WebSocket
  const httpServer = createServer(app);

  // Initialize WebSocket server (T01)
  wsManager.initialize(httpServer);

  // Note: Task status change events will be broadcast via WebSocket
  // when implemented in TaskReviewManager (T04)

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.error(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   Task Review Manager Dashboard                                ║
║                                                                ║
║   🚀 Server running on http://localhost:${PORT}                   ║
║   🔌 WebSocket server on ws://localhost:${PORT}                   ║
║                                                                ║
║   API Endpoints:                                               ║
║   • GET /api/tasks?featureSlug=<slug>                          ║
║   • GET /api/task?featureSlug=<slug>&id=<taskId>               ║
║   • GET /api/tasks/by-status?featureSlug=<slug>&status=<...>   ║
║   • GET /api/verify-complete?featureSlug=<slug>                ║
║                                                                ║
║   WebSocket Events:                                            ║
║   • connection: Welcome message with connectionId              ║
║   • presence-update: User presence tracking                    ║
║   • task-status-changed: Real-time task updates                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
  });

  // Expose servers on app for test cleanup
  (app as any)._server = httpServer;
  (app as any)._wsManager = wsManager;

  return app;
}

// Start dashboard if run directly
if (import.meta.url.endsWith('dashboard.js') || process.argv[1]?.endsWith('dashboard.js')) {
  startDashboard();
}
