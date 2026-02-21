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
   * GET /api/queue/:id
   * Get a single queue item by ID.
   */
  router.get('/queue/:id', (req: Request, res: Response): void => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'Invalid item ID: must be a positive integer' });
        return;
      }
      const item = reviewManager.getQueueItem(id);
      if (!item) {
        res.status(404).json({ success: false, error: `Queue item ${id} not found` });
        return;
      }
      res.json({ success: true, item });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/queue/:id/reenqueue
   * Re-enqueue a failed queue item: reset to pending with retry_count=0.
   */
  router.post('/queue/:id/reenqueue', (req: Request, res: Response): void => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'Invalid item ID: must be a positive integer' });
        return;
      }
      const result = reviewManager.reenqueueItem(id);
      if (!result.success) {
        // Determine status code based on error type
        const statusCode = result.error?.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, item: result.item });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * DELETE /api/queue/:id
   * Cancel (remove) a pending queue item.
   */
  router.delete('/queue/:id', (req: Request, res: Response): void => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'Invalid item ID: must be a positive integer' });
        return;
      }
      const result = reviewManager.cancelQueueItem(id);
      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true });
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
