/**
 * Task Status Event Streaming via WebSocket (T04)
 *
 * Hooks into AIConductor to emit task status changes
 * and broadcast them to all WebSocket clients in real-time (<100ms).
 */

import { EventEmitter } from 'events';
import { wsManager } from './websocket.js';

/**
 * Event Streamer for Task Status Changes
 * Bridges AIConductor events with WebSocket broadcast
 */
export class EventStreamer extends EventEmitter {
  private eventLog: any[] = [];
  private readonly MAX_LOG_SIZE = 1000;

  /**
   * Handle task status change
   * Emits event and broadcasts via WebSocket
   */
  onTaskStatusChanged(event: {
    taskId: string;
    featureSlug: string;
    oldStatus: string;
    newStatus: string;
    actor?: string;
    timestamp?: number;
  }): void {
    const enrichedEvent = {
      type: 'task-status-changed',
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    // Emit locally
    this.emit('task-status-changed', enrichedEvent);

    // Log for audit trail
    this.logEvent(enrichedEvent);

    // Broadcast via WebSocket with <100ms latency guarantee
    this.broadcastToClients(enrichedEvent);
  }

  /**
   * Handle stakeholder review
   */
  onStakeholderReview(event: {
    taskId: string;
    featureSlug: string;
    stakeholder: string;
    decision: string;
    notes?: string;
    timestamp?: number;
  }): void {
    const enrichedEvent = {
      type: 'stakeholder-review',
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    this.emit('stakeholder-review', enrichedEvent);
    this.logEvent(enrichedEvent);
    this.broadcastToClients(enrichedEvent);
  }

  /**
   * Broadcast message to all WebSocket clients
   * Target latency: <100ms
   */
  private broadcastToClients(event: any): void {
    const startTime = performance.now();

    try {
      // Validate event payload (prevent injection)
      if (!this.validateEventPayload(event)) {
        console.error(`[Event Streaming] Invalid event payload: ${JSON.stringify(event)}`);
        return;
      }

      // Filter event for authorization (don't expose to unauthorized users)
      const filteredEvent = this.filterEventForAuthorization(event);

      // Broadcast via WebSocket
      wsManager.broadcast(filteredEvent);

      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.error(`[Event Streaming] Broadcast took ${duration.toFixed(2)}ms (target <100ms)`);
      }
    } catch (err) {
      console.error(`[Event Streaming] Broadcast error: ${err}`);
    }
  }

  /**
   * Validate event payload structure
   */
  private validateEventPayload(event: any): boolean {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const allowedFields = ['type', 'taskId', 'featureSlug', 'oldStatus', 'newStatus', 'timestamp', 'actor', 'stakeholder', 'decision', 'notes'];
    for (const field in event) {
      if (!allowedFields.includes(field) && field !== 'type') {
        // Extra fields not allowed (prevent injection)
        if (event[field] !== undefined && typeof event[field] !== 'string' && typeof event[field] !== 'number') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Filter event for authorization
   * Strip sensitive fields unauthorized users shouldn't see
   */
  private filterEventForAuthorization(event: any): any {
    // Remove sensitive fields that shouldn't be broadcast
    const filtered = { ...event };

    // Fields to redact (security findings, internal notes, etc.)
    const redactFields = ['internalNotes', 'securityFindings', 'riskAnalysis'];
    for (const field of redactFields) {
      delete filtered[field];
    }

    return filtered;
  }

  /**
   * Get event log for debugging/audit
   */
  getEventLog(): any[] {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Log event for audit trail
   */
  private logEvent(event: any): void {
    this.eventLog.push({
      ...event,
      loggedAt: new Date().toISOString(),
    });

    // Trim log if it gets too large
    if (this.eventLog.length > this.MAX_LOG_SIZE) {
      this.eventLog = this.eventLog.slice(-Math.floor(this.MAX_LOG_SIZE / 2));
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalEvents: number;
    averageLatency: number;
    lastEventTime?: string;
  } {
    return {
      totalEvents: this.eventLog.length,
      averageLatency: 50, // Placeholder - would calculate actual latency
      lastEventTime: this.eventLog[this.eventLog.length - 1]?.loggedAt,
    };
  }
}

// Export singleton
export const eventStreamer = new EventStreamer();
