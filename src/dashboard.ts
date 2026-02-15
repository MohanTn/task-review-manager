/**
 * Dashboard Server - Web interface for viewing task progress in real-time
 */
import express from 'express';
import { TaskReviewManager } from './TaskReviewManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

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
  app.use(express.static(path.join(__dirname, 'public')));

  // API Endpoints

  /**
   * GET /api/tasks?featureSlug=<slug>
   * Get all tasks from a feature
   */
  app.get('/api/tasks', async (req, res): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;

      if (!featureSlug) {
        res.status(400).json({ error: 'Feature slug is required' });
        return;
      }

      const summary = await reviewManager.getReviewSummary(featureSlug);
      res.json(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes('Feature not found') ? 404 : 500;
      res.status(status).json({ error: message });
    }
  });

  /**
   * GET /api/task?featureSlug=<slug>&id=<taskId>
   * Get detailed information about a specific task
   */
  app.get('/api/task', async (req, res): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const taskId = req.query.id as string;

      if (!featureSlug || !taskId) {
        res.status(400).json({ error: 'Feature slug and task ID are required' });
        return;
      }

      const status = await reviewManager.getTaskStatus(featureSlug, taskId);
      res.json(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: message });
    }
  });

  /**
   * GET /api/tasks/by-status?featureSlug=<slug>&status=<status>
   * Get tasks filtered by status
   */
  app.get('/api/tasks/by-status', async (req, res): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const status = req.query.status as string;
      
      if (!featureSlug || !status) {
        res.status(400).json({ error: 'Feature slug and status are required' });
        return;
      }

      const result = await reviewManager.getTasksByStatus({
        featureSlug,
        status: status as any,
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  /**
   * GET /api/verify-complete?featureSlug=<slug>
   * Check if all tasks are complete
   */
  app.get('/api/verify-complete', async (req, res): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      
      if (!featureSlug) {
        res.status(400).json({ error: 'Feature slug is required' });
        return;
      }

      const result = await reviewManager.verifyAllTasksComplete({
        featureSlug,
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  /**
   * Serve the dashboard HTML
   */
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/features
   * Get all features
   */
  app.get('/api/features', (_req, res) => {
    try {
      const features = reviewManager['dbHandler'].getAllFeatures();
      res.json({ success: true, features });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  /**
   * POST /api/features
   * Create a new feature
   */
  app.post('/api/features', async (req, res): Promise<void> => {
    try {
      const { featureSlug, featureName } = req.body;
      
      if (!featureSlug || !featureName) {
        res.status(400).json({ error: 'Feature slug and name are required' });
        return;
      }

      reviewManager['dbHandler'].createFeature(featureSlug, featureName);
      res.json({ success: true, message: 'Feature created successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  /**
   * DELETE /api/features/:featureSlug
   * Delete a feature
   */
  app.delete('/api/features/:featureSlug', async (req, res): Promise<void> => {
    try {
      const featureSlug = req.params.featureSlug;
      
      if (!featureSlug) {
        res.status(400).json({ error: 'Feature slug is required' });
        return;
      }

      reviewManager['dbHandler'].deleteFeature(featureSlug);
      res.json({ success: true, message: 'Feature deleted successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  /**
   * GET /api/task/full?featureSlug=<slug>&id=<taskId>
   * Get full task object (with description, transitions, criteria, etc.)
   */
  app.get('/api/task/full', async (req, res): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const taskId = req.query.id as string;

      if (!featureSlug || !taskId) {
        res.status(400).json({ error: 'Feature slug and task ID are required' });
        return;
      }

      const taskFile = await reviewManager['dbHandler'].loadByFeatureSlug(featureSlug);
      const task = taskFile.tasks.find((t: { taskId: string }) => t.taskId === taskId);

      if (!task) {
        res.status(404).json({ error: `Task not found: ${taskId}` });
        return;
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * POST /api/tasks
   * Add a task to a feature
   */
  app.post('/api/tasks', async (req, res): Promise<void> => {
    try {
      const { featureSlug, task } = req.body;
      
      if (!featureSlug || !task) {
        res.status(400).json({ error: 'Feature slug and task data are required' });
        return;
      }

      reviewManager['dbHandler'].addTask(featureSlug, task);
      res.json({ success: true, message: 'Task added successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Start server
  app.listen(PORT, () => {
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

  return app;
}

// Start dashboard if run directly
const isDirectRun = (() => {
  if (!process.argv[1]) return false;
  const argUrl = new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href;
  return import.meta.url === argUrl;
})();
if (isDirectRun) {
  startDashboard();
}
