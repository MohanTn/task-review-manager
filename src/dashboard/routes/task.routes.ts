/**
 * Task-related routes
 */
import { Router, Request, Response } from 'express';
import { AIConductor } from '../../AIConductor.js';

export function createTaskRoutes(reviewManager: AIConductor): Router {
  const router = Router();

  /**
   * GET /api/tasks?featureSlug=<slug>&repoName=<repo>
   * Get all tasks from a feature
   */
  router.get('/tasks', async (req: Request, res: Response): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const repoName = (req.query.repoName as string) || 'default';

      if (!featureSlug) {
        res.status(400).json({ error: 'Feature slug is required' });
        return;
      }

      const summary = await reviewManager.getReviewSummary(repoName, featureSlug);
      res.json(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes('Feature not found') ? 404 : 500;
      res.status(status).json({ error: message });
    }
  });

  /**
   * POST /api/tasks
   * Add a task to a feature
   */
  router.post('/tasks', async (req: Request, res: Response): Promise<void> => {
    try {
      const { featureSlug, task, repoName } = req.body;

      if (!featureSlug || !task) {
        res.status(400).json({ error: 'Feature slug and task data are required' });
        return;
      }

      reviewManager['dbHandler'].addTask(featureSlug, task, repoName || 'default');
      res.json({ success: true, message: 'Task added successfully' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * GET /api/task?featureSlug=<slug>&id=<taskId>&repoName=<repo>
   * Get detailed information about a specific task
   */
  router.get('/task', async (req: Request, res: Response): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const taskId = req.query.id as string;
      const repoName = (req.query.repoName as string) || 'default';

      if (!featureSlug || !taskId) {
        res.status(400).json({ error: 'Feature slug and task ID are required' });
        return;
      }

      const status = await reviewManager.getTaskStatus(repoName, featureSlug, taskId);
      res.json(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: message });
    }
  });

  /**
   * GET /api/task/full?featureSlug=<slug>&id=<taskId>&repoName=<repo>
   * Get full task object (with description, transitions, criteria, etc.)
   */
  router.get('/task/full', async (req: Request, res: Response): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const taskId = req.query.id as string;
      const repoName = (req.query.repoName as string) || 'default';

      if (!featureSlug || !taskId) {
        res.status(400).json({ error: 'Feature slug and task ID are required' });
        return;
      }

      const taskFile = await reviewManager['dbHandler'].loadByFeatureSlug(featureSlug, repoName);
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
   * PUT /api/tasks/:taskId
   * Update an existing task
   */
  router.put('/tasks/:taskId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { featureSlug, updates, repoName } = req.body;
      const taskId = req.params.taskId as string;

      if (!featureSlug || !updates) {
        res.status(400).json({ error: 'Feature slug and updates are required' });
        return;
      }

      const result = await reviewManager.updateTask({
        repoName: repoName || 'default',
        featureSlug,
        taskId,
        updates,
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * DELETE /api/tasks/:taskId?featureSlug=<slug>&repoName=<repo>
   * Delete a task
   */
  router.delete('/tasks/:taskId', async (req: Request, res: Response): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const repoName = (req.query.repoName as string) || 'default';
      const taskId = req.params.taskId as string;

      if (!featureSlug) {
        res.status(400).json({ error: 'Feature slug is required' });
        return;
      }

      const result = await reviewManager.deleteTask(repoName, featureSlug, taskId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/tasks/by-status?featureSlug=<slug>&status=<status>&repoName=<repo>
   * Get tasks filtered by status
   */
  router.get('/tasks/by-status', async (req: Request, res: Response): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const status = req.query.status as string;
      const repoName = (req.query.repoName as string) || 'default';
      
      if (!featureSlug || !status) {
        res.status(400).json({ error: 'Feature slug and status are required' });
        return;
      }

      const result = await reviewManager.getTasksByStatus({
        repoName,
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
   * GET /api/verify-complete?featureSlug=<slug>&repoName=<repo>
   * Check if all tasks are complete
   */
  router.get('/verify-complete', async (req: Request, res: Response): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const repoName = (req.query.repoName as string) || 'default';
      
      if (!featureSlug) {
        res.status(400).json({ error: 'Feature slug is required' });
        return;
      }

      const result = await reviewManager.verifyAllTasksComplete({
        repoName,
        featureSlug,
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  return router;
}
