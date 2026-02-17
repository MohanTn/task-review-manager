/**
 * Refinement-related routes
 */
import { Router, Request, Response } from 'express';
import { TaskReviewManager } from '../../TaskReviewManager.js';

export function createRefinementRoutes(reviewManager: TaskReviewManager): Router {
  const router = Router();

  /**
   * GET /api/refinement-status?featureSlug=<slug>&repoName=<repo>
   * Get refinement progress for a feature
   */
  router.get('/refinement-status', (req: Request, res: Response) => {
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

  return router;
}
