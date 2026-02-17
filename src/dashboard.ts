/**
 * Dashboard Server - Web interface for viewing task progress in real-time
 */
import express from 'express';
import { TaskReviewManager } from './TaskReviewManager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRepoRoutes } from './dashboard/routes/repo.routes.js';
import { createFeatureRoutes } from './dashboard/routes/feature.routes.js';
import { createTaskRoutes } from './dashboard/routes/task.routes.js';
import { createRefinementRoutes } from './dashboard/routes/refinement.routes.js';

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

  /**
   * Serve the dashboard HTML (for SPA routing)
   */
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start server
  const server = app.listen(PORT, () => {
    console.error(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   Task Review Manager Dashboard                                ║
║                                                                ║
║   🚀 Server running on http://localhost:${PORT}                   ║
║                                                                ║
║   API Endpoints:                                               ║
║   • GET /api/tasks?featureSlug=<slug>                          ║
║   • GET /api/task?featureSlug=<slug>&id=<taskId>               ║
║   • GET /api/tasks/by-status?featureSlug=<slug>&status=<...>   ║
║   • GET /api/verify-complete?featureSlug=<slug>                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
  });

  // Expose server on app for test cleanup
  (app as any)._server = server;

  return app;
}

// Start dashboard if run directly
if (import.meta.url.endsWith('dashboard.js') || process.argv[1]?.endsWith('dashboard.js')) {
  startDashboard();
}
