/**
 * Repository-related routes
 */
import { Router, Request, Response } from 'express';
import { TaskReviewManager } from '../../TaskReviewManager.js';

export function createRepoRoutes(reviewManager: TaskReviewManager): Router {
  const router = Router();

  /**
   * POST /api/repos
   * Register a new repository
   */
  router.post('/repos', async (req: Request, res: Response): Promise<void> => {
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
   * GET /api/repos
   * List all registered repositories
   */
  router.get('/repos', async (_req: Request, res: Response): Promise<void> => {
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
   * DELETE /api/repos/:repoName
   * Delete a repository and all associated features, tasks, and related data
   */
  router.delete('/repos/:repoName', async (req: Request, res: Response): Promise<void> => {
    try {
      const repoName = req.params.repoName as string;

      if (!repoName || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(repoName) && !/^[a-z0-9]$/.test(repoName)) {
        res.status(400).json({ error: 'Invalid repoName format' });
        return;
      }

      const result = await reviewManager.deleteRepo(repoName);

      if (result.success) {
        res.json(result);
      } else if (result.error && result.error.includes('not found')) {
        res.status(404).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
