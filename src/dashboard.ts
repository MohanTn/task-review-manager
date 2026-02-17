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
  
  // Serve static files from Vite build output
  app.use(express.static(path.join(__dirname, 'client')));

  // API Endpoints

  /**
   * GET /api/tasks?featureSlug=<slug>&repoName=<repo>
   * Get all tasks from a feature
   */
  app.get('/api/tasks', async (req, res): Promise<void> => {
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
   * GET /api/task?featureSlug=<slug>&id=<taskId>&repoName=<repo>
   * Get detailed information about a specific task
   */
  app.get('/api/task', async (req, res): Promise<void> => {
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
   * GET /api/tasks/by-status?featureSlug=<slug>&status=<status>&repoName=<repo>
   * Get tasks filtered by status
   */
  app.get('/api/tasks/by-status', async (req, res): Promise<void> => {
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
  app.get('/api/verify-complete', async (req, res): Promise<void> => {
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

  /**
   * POST /api/repos
   * Register a new repository
   */
  app.post('/api/repos', async (req, res): Promise<void> => {
    try {
      const { repoName, repoPath, repoUrl, defaultBranch } = req.body;

      if (!repoName || !repoPath) {
        res.status(400).json({ error: 'repoName and repoPath are required' });
        return;
      }

      // Validate repoName: alphanumeric + hyphens only
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(repoName) && !/^[a-z0-9]$/.test(repoName)) {
        res.status(400).json({ error: 'repoName must match pattern [a-z0-9-]+ (lowercase alphanumeric and hyphens, no leading/trailing hyphens)' });
        return;
      }

      // Validate repoPath: no shell metacharacters
      if (/[;|&$`]/.test(repoPath)) {
        res.status(400).json({ error: 'repoPath must not contain shell metacharacters' });
        return;
      }

      const result = await reviewManager.registerRepo({
        repoName,
        repoPath,
        repoUrl: repoUrl || undefined,
        defaultBranch: defaultBranch || undefined,
      });

      if (result.success) {
        res.status(201).json(result);
      } else {
        // Check for duplicate
        const isDuplicate = result.error && result.error.includes('UNIQUE constraint');
        res.status(isDuplicate ? 409 : 400).json(result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isDuplicate = message.includes('UNIQUE constraint');
      res.status(isDuplicate ? 409 : 500).json({ error: message });
    }
  });

  /**
   * GET /api/features/:featureSlug/details?repoName=<repo>
   * Get feature details including AC, test scenarios, refinement steps, clarifications
   */
  app.get('/api/features/:featureSlug/details', (req, res) => {
    try {
      const featureSlug = req.params.featureSlug;
      const repoName = (req.query.repoName as string) || 'default';

      // Get all feature detail data
      const acceptanceCriteria = reviewManager['dbHandler'].getFeatureAcceptanceCriteria(repoName, featureSlug);
      const testScenarios = reviewManager['dbHandler'].getFeatureTestScenarios(repoName, featureSlug);
      const refinementSteps = reviewManager['dbHandler'].getRefinementSteps(repoName, featureSlug);
      const clarifications = reviewManager['dbHandler'].getClarifications(repoName, featureSlug);
      const refinementStatus = reviewManager['dbHandler'].getRefinementStatus(repoName, featureSlug);

      // Get feature metadata from features list
      const features = reviewManager['dbHandler'].getAllFeatures(repoName);
      const feature = features.find((f: any) => f.featureSlug === featureSlug);

      if (!feature) {
        res.status(404).json({ error: `Feature '${featureSlug}' not found in repo '${repoName}'` });
        return;
      }

      res.json({
        success: true,
        feature: {
          featureSlug: feature.featureSlug,
          featureName: feature.featureName,
          lastModified: feature.lastModified,
          totalTasks: feature.totalTasks,
        },
        acceptanceCriteria,
        testScenarios,
        refinementSteps,
        clarifications,
        refinementStatus,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/refinement-status?featureSlug=<slug>&repoName=<repo>
   * Get refinement progress for a feature
   */
  app.get('/api/refinement-status', (req, res) => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const repoName = (req.query.repoName as string) || 'default';

      if (!featureSlug) {
        res.status(400).json({ error: 'featureSlug is required' });
        return;
      }

      const status = reviewManager['dbHandler'].getRefinementStatus(repoName, featureSlug);
      res.json({ success: true, ...status });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/repos
   * List all registered repositories
   */
  app.get('/api/repos', async (_req, res): Promise<void> => {
    try {
      const result = await reviewManager.listRepos();
      // Transform to dictionary format expected by client
      const reposDict: Record<string, any> = {};
      if (result.success && result.repos) {
        result.repos.forEach(repo => {
          reposDict[repo.repoName] = {
            repoPath: repo.repoPath,
            featureCount: repo.featureCount,
            totalTasks: repo.totalTasks,
            completedTasks: repo.completedTasks,
            lastAccessedAt: repo.lastAccessedAt,
          };
        });
      }
      res.json(reposDict);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  /**
   * GET /api/features?repoName=<repo>
   * Get all features for a repository
   */
  app.get('/api/features', (req, res) => {
    try {
      const repoName = (req.query.repoName as string) || 'default';
      const features = reviewManager['dbHandler'].getAllFeatures(repoName);
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
      const { featureSlug, featureName, repoName } = req.body;
      
      if (!featureSlug || !featureName) {
        res.status(400).json({ error: 'Feature slug and name are required' });
        return;
      }

      reviewManager['dbHandler'].createFeature(featureSlug, featureName, repoName || 'default');
      res.json({ success: true, message: 'Feature created successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  /**
   * DELETE /api/features/:featureSlug?repoName=<repo>
   * Delete a feature
   */
  app.delete('/api/features/:featureSlug', async (req, res): Promise<void> => {
    try {
      const featureSlug = req.params.featureSlug;
      const repoName = (req.query.repoName as string) || 'default';
      
      if (!featureSlug) {
        res.status(400).json({ error: 'Feature slug is required' });
        return;
      }

      reviewManager['dbHandler'].deleteFeature(featureSlug, repoName);
      res.json({ success: true, message: 'Feature deleted successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  /**
   * GET /api/task/full?featureSlug=<slug>&id=<taskId>&repoName=<repo>
   * Get full task object (with description, transitions, criteria, etc.)
   */
  app.get('/api/task/full', async (req, res): Promise<void> => {
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
   * POST /api/tasks
   * Add a task to a feature
   */
  app.post('/api/tasks', async (req, res): Promise<void> => {
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
   * PUT /api/tasks/:taskId
   * Update an existing task
   */
  app.put('/api/tasks/:taskId', async (req, res): Promise<void> => {
    try {
      const { featureSlug, updates, repoName } = req.body;
      const taskId = req.params.taskId;

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
  app.delete('/api/tasks/:taskId', async (req, res): Promise<void> => {
    try {
      const featureSlug = req.query.featureSlug as string;
      const repoName = (req.query.repoName as string) || 'default';
      const taskId = req.params.taskId;

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
