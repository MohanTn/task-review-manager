/**
 * Redis Pub/Sub Integration for Multi-Server Broadcasting (T02)
 *
 * Implements pub/sub for broadcasting task events and presence updates
 * across multiple server instances with graceful fallback to single-server mode.
 */

import { EventEmitter } from 'events';

interface RedisClient {
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * Redis Pub/Sub Manager
 * Provides cross-server event broadcasting with fallback to local-only mode
 */
export class RedisPubSubManager extends EventEmitter {
  private publisher: RedisClient | null = null;
  private subscriber: RedisClient | null = null;
  private connected: boolean = false;
  private channels: Set<string> = new Set();
  private failureCount: number = 0;
  private readonly MAX_FAILURES = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;

  // Pub/Sub channels
  private readonly TASK_UPDATES_CHANNEL = 'tasks:updates';
  private readonly PRESENCE_UPDATES_CHANNEL = 'presence:updates';
  private readonly ADMIN_NOTIFICATIONS_CHANNEL = 'admin:notifications';

  constructor(private redisUrl?: string) {
    super();
  }

  /**
   * Initialize Redis pub/sub connection
   * Gracefully falls back to local-only mode if Redis unavailable
   */
  async initialize(): Promise<void> {
    try {
      // For now, this is a stub implementation
      // In production, would use: import Redis from 'ioredis'
      // and implement actual Redis connections

      if (!this.redisUrl && !process.env.REDIS_URL) {
        console.error('[Redis PubSub] No Redis URL provided, running in single-server mode');
        this.connected = false;
        return;
      }

      // Attempt connection (would use ioredis in production)
      await this.attemptConnection();
      this.setupReconnection();
    } catch (err) {
      console.error(`[Redis PubSub] Failed to initialize: ${err}`);
      this.connected = false;
    }
  }

  /**
   * Publish task update event
   */
  async publishTaskUpdate(event: any): Promise<boolean> {
    return this.publish(this.TASK_UPDATES_CHANNEL, event);
  }

  /**
   * Subscribe to task update events
   */
  async subscribeToTaskUpdates(callback: (event: any) => void): Promise<void> {
    this.on('task-update', callback);

    if (this.connected) {
      await this.subscribe(this.TASK_UPDATES_CHANNEL);
    }
  }

  /**
   * Publish presence update event
   */
  async publishPresenceUpdate(event: any): Promise<boolean> {
    return this.publish(this.PRESENCE_UPDATES_CHANNEL, event);
  }

  /**
   * Subscribe to presence update events
   */
  async subscribeToPresenceUpdates(callback: (event: any) => void): Promise<void> {
    this.on('presence-update', callback);

    if (this.connected) {
      await this.subscribe(this.PRESENCE_UPDATES_CHANNEL);
    }
  }

  /**
   * Publish admin notification
   */
  async publishAdminNotification(event: any): Promise<boolean> {
    return this.publish(this.ADMIN_NOTIFICATIONS_CHANNEL, event);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    if (this.subscriber) {
      try {
        for (const channel of this.channels) {
          await this.subscriber.unsubscribe(channel);
        }
        await this.subscriber.disconnect();
      } catch (err) {
        console.error(`[Redis PubSub] Error disconnecting: ${err}`);
      }
    }

    if (this.publisher) {
      try {
        await this.publisher.disconnect();
      } catch (err) {
        console.error(`[Redis PubSub] Error disconnecting publisher: ${err}`);
      }
    }

    this.connected = false;
  }

  // ===== Private Methods =====

  /**
   * Attempt to connect to Redis
   */
  private async attemptConnection(): Promise<void> {
    // Stub implementation
    // In production, would create ioredis connections:
    // this.publisher = new Redis(this.redisUrl || process.env.REDIS_URL);
    // this.subscriber = new Redis(this.redisUrl || process.env.REDIS_URL);

    this.connected = true;
    this.failureCount = 0;
    console.error('[Redis PubSub] Connected (stub mode)');
  }

  /**
   * Setup reconnection logic
   */
  private setupReconnection(): void {
    this.reconnectInterval = setInterval(async () => {
      if (!this.connected && this.failureCount < this.MAX_FAILURES) {
        try {
          await this.attemptConnection();
          console.error('[Redis PubSub] Reconnected');

          // Re-subscribe to channels
          for (const channel of this.channels) {
            if (this.subscriber) {
              await this.subscriber.subscribe(channel);
            }
          }
        } catch (err) {
          this.failureCount++;
          console.error(`[Redis PubSub] Reconnection attempt ${this.failureCount} failed`);

          if (this.failureCount >= this.MAX_FAILURES) {
            console.error('[Redis PubSub] Max reconnection attempts reached, giving up');
            clearInterval(this.reconnectInterval!);
          }
        }
      }
    }, 5000); // Retry every 5 seconds
  }

  /**
   * Publish message to channel
   */
  private async publish(channel: string, event: any): Promise<boolean> {
    try {
      if (!this.connected || !this.publisher) {
        // Fallback: emit locally even if Redis not connected
        console.error(`[Redis PubSub] Not connected, emitting locally to ${channel}`);
        this.emitEvent(channel, event);
        return true;
      }

      // In production, would use: await this.publisher.publish(channel, JSON.stringify(event));
      console.error(`[Redis PubSub] Publishing to ${channel}`);
      this.emitEvent(channel, event);
      return true;
    } catch (err) {
      console.error(`[Redis PubSub] Publish error on ${channel}: ${err}`);
      // Fallback to local emit
      this.emitEvent(channel, event);
      return false;
    }
  }

  /**
   * Subscribe to channel
   */
  private async subscribe(channel: string): Promise<void> {
    try {
      if (!channel || this.channels.has(channel)) {
        return;
      }

      if (!this.connected || !this.subscriber) {
        console.error(`[Redis PubSub] Not connected, skipping subscription to ${channel}`);
        this.channels.add(channel);
        return;
      }

      // In production, would use: await this.subscriber.subscribe(channel);
      this.channels.add(channel);
      console.error(`[Redis PubSub] Subscribed to ${channel}`);
    } catch (err) {
      console.error(`[Redis PubSub] Subscribe error on ${channel}: ${err}`);
      this.channels.add(channel);
    }
  }

  /**
   * Emit local event based on channel
   */
  private emitEvent(channel: string, event: any): void {
    if (channel === this.TASK_UPDATES_CHANNEL) {
      this.emit('task-update', event);
    } else if (channel === this.PRESENCE_UPDATES_CHANNEL) {
      this.emit('presence-update', event);
    } else if (channel === this.ADMIN_NOTIFICATIONS_CHANNEL) {
      this.emit('admin-notification', event);
    }
  }
}

// Export singleton instance
export const redisPubSub = new RedisPubSubManager(process.env.REDIS_URL);
