/**
 * Feature-related routes
 */
import { Router, Request, Response } from 'express';
import { TaskReviewManager } from '../../TaskReviewManager.js';

export function createFeatureRoutes(reviewManager: TaskReviewManager): Router {
  const router = Router();

  /**
   * GET /api/features?repoName=<repo>
   * Get all features for a repository
   */
  router.get('/features', (req: Request, res: Response) => {
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
  router.post('/features', async (req: Request, res: Response): Promise<void> => {
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
   * GET /api/features/:featureSlug/details?repoName=<repo>
   * Get feature details including AC, test scenarios, refinement steps, clarifications
   * MUST come before the wildcard :featureSlug route
   */
  router.get('/features/:featureSlug/details', (req: Request, res: Response) => {
    try {
      const featureSlug = req.params.featureSlug as string;
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
   * GET /api/features/:featureSlug?repoName=<repo>
   * Get a specific feature by slug
   */
  router.get('/features/:featureSlug', (req: Request, res: Response) => {
    try {
      const featureSlug = req.params.featureSlug as string;
      const repoName = (req.query.repoName as string) || 'default';

      if (!featureSlug) {
        res.status(400).json({ error: 'Feature slug is required' });
        return;
      }

      const features = reviewManager['dbHandler'].getAllFeatures(repoName);
      const feature = features.find((f: any) => f.featureSlug === featureSlug);

      if (!feature) {
        res.status(404).json({ error: `Feature '${featureSlug}' not found in repo '${repoName}'` });
        return;
      }

      res.json({
        success: true,
        featureSlug: feature.featureSlug,
        title: feature.featureName,
        description: '',
        repoName: repoName,
        createdAt: feature.lastModified || new Date().toISOString(),
        totalTasks: feature.totalTasks || 0,
      });
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
  router.delete('/features/:featureSlug', async (req: Request, res: Response): Promise<void> => {
    try {
      const featureSlug = req.params.featureSlug as string;
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

  return router;
}
