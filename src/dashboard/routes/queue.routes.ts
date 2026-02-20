/**
 * Queue API Routes — Endpoints for inspecting and managing the dev queue.
 *
 * T05: Dashboard API routes for queue and settings
 */
import { Router, Request, Response } from 'express';
import { AIConductor } from '../../AIConductor.js';

export function createQueueRoutes(reviewManager: AIConductor): Router {
  const router = Router();

  // ─── Queue Items ────────────────────────────────────────────────────

  /**
   * GET /api/queue
   * List queue items with optional filters:
   *   ?repoName=...&featureSlug=...&status=pending|running|completed|failed
   */
  router.get('/queue', (req: Request, res: Response): void => {
    try {
      const { repoName, featureSlug, status } = req.query;
      const items = reviewManager.getQueueItems(
        repoName as string | undefined,
        featureSlug as string | undefined,
        status as string | undefined,
      );
      res.json({ success: true, items, total: items.length });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/queue/stats
   * Returns aggregate counts: pending, running, completed, failed, total.
   */
  router.get('/queue/stats', (_req: Request, res: Response): void => {
    try {
      const stats = reviewManager.getQueueStats();
      res.json({ success: true, ...stats });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/queue/prune
   * Remove completed/failed items older than N days (default 7).
   * Body: { olderThanDays?: number }
   */
  router.post('/queue/prune', (req: Request, res: Response): void => {
    try {
      const days = req.body?.olderThanDays;
      if (days !== undefined && (typeof days !== 'number' || days < 1)) {
        res.status(400).json({ success: false, error: 'olderThanDays must be a positive number' });
        return;
      }
      const removed = reviewManager.pruneQueueItems(days);
      res.json({ success: true, removed });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
