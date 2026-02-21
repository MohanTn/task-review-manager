/**
 * Queue API - Queue item listing, management, and audit trail endpoints
 */
import { BaseClient } from './base.js';

export interface QueueItem {
  id: number;
  repo_name: string;
  feature_slug: string;
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  cli_tool: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  worker_pid: number | null;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export class QueueAPI extends BaseClient {
  /**
   * List queue items with optional filters.
   */
  static async getQueueItems(
    repoName?: string,
    featureSlug?: string,
    status?: string,
  ): Promise<QueueItem[]> {
    const params = new URLSearchParams();
    if (repoName) params.set('repoName', repoName);
    if (featureSlug) params.set('featureSlug', featureSlug);
    if (status) params.set('status', status);
    const qs = params.toString();
    const data = await this.request<{ success: boolean; items: QueueItem[] }>(
      `${this.apiBase}/queue${qs ? `?${qs}` : ''}`,
    );
    return data.items;
  }

  /**
   * Get aggregate queue statistics.
   */
  static async getQueueStats(): Promise<QueueStats> {
    const data = await this.request<QueueStats & { success: boolean }>(
      `${this.apiBase}/queue/stats`,
    );
    return {
      pending: data.pending,
      running: data.running,
      completed: data.completed,
      failed: data.failed,
      total: data.total,
    };
  }

  /**
   * Get a single queue item by ID.
   */
  static async getQueueItem(id: number): Promise<QueueItem> {
    const data = await this.request<{ success: boolean; item: QueueItem }>(
      `${this.apiBase}/queue/${id}`,
    );
    return data.item;
  }

  /**
   * Re-enqueue a failed queue item (reset to pending).
   */
  static async reenqueueItem(id: number): Promise<QueueItem> {
    const data = await this.request<{ success: boolean; item: QueueItem }>(
      `${this.apiBase}/queue/${id}/reenqueue`,
      { method: 'POST' },
    );
    return data.item;
  }

  /**
   * Cancel (remove) a pending queue item.
   */
  static async cancelItem(id: number): Promise<void> {
    await this.request<{ success: boolean }>(
      `${this.apiBase}/queue/${id}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Prune old completed/failed queue items.
   */
  static async pruneItems(olderThanDays?: number): Promise<number> {
    const data = await this.request<{ success: boolean; removed: number }>(
      `${this.apiBase}/queue/prune`,
      {
        method: 'POST',
        body: JSON.stringify(olderThanDays !== undefined ? { olderThanDays } : {}),
      },
    );
    return data.removed;
  }
}
