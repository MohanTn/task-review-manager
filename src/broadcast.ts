/**
 * Cross-Process Broadcast Helper
 *
 * When the MCP server runs as a separate `docker exec` child process, it does
 * not own the WebSocket server — the container's long-lived main process does.
 * This module lets MCP tool handlers deliver task-change events to browser
 * clients by POSTing to the dashboard's internal `/api/ws/broadcast` endpoint.
 *
 * It is intentionally fire-and-forget: a broadcast failure must never surface
 * as an MCP tool error.
 */

const DASHBOARD_URL =
  process.env.DASHBOARD_INTERNAL_URL ?? 'http://localhost:5111';

/**
 * Broadcast a WebSocket event to all connected dashboard clients.
 *
 * Attempts an HTTP POST to the dashboard.  If the dashboard is not reachable
 * (e.g. running in a unit-test environment), it logs a debug message and
 * returns silently.
 */
export async function broadcastEvent(event: {
  type: string;
  [key: string]: unknown;
}): Promise<void> {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/ws/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      // Give it 1 second — if the dashboard is down, drop the event.
      signal: AbortSignal.timeout(1000),
    });
    if (!res.ok) {
      console.error(
        `[broadcast] Dashboard returned ${res.status} for event type "${event.type}"`
      );
    }
  } catch {
    // Dashboard unreachable — silently ignore (common in test / local dev without
    // a running dashboard, or when this IS the main process and wsManager will
    // handle broadcasting natively once the dashboard route fires).
  }
}
