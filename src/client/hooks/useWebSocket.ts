/**
 * useWebSocket Hook - Client-Side WebSocket Connection & Auto-Reconnection (T06)
 *
 * Manages WebSocket connection lifecycle with exponential backoff reconnection.
 * Listens for task-status-changed and presence events.
 *
 * Callbacks are stored in refs so `connect` is created once on mount and never
 * re-created on re-renders. Previously `connect` depended on the `options` object
 * which is a new reference every render, causing the useEffect to disconnect and
 * reconnect on every render, burning through the retry limit immediately.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// Send a ping every 2 minutes to prevent the server's 5-minute idle timeout
const PING_INTERVAL_MS = 2 * 60 * 1000;

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store callbacks in refs so `connect` doesn't need them as dependencies.
  // This means the callbacks always call the latest version without causing
  // connect/disconnect churn on every render.
  const onMessageRef = useRef(options.onMessage);
  const onConnectRef = useRef(options.onConnect);
  const onDisconnectRef = useRef(options.onDisconnect);
  const urlRef = useRef(options.url);

  // Keep refs current without triggering re-connects
  useEffect(() => {
    onMessageRef.current = options.onMessage;
    onConnectRef.current = options.onConnect;
    onDisconnectRef.current = options.onDisconnect;
    urlRef.current = options.url;
  });

  // connect is created ONCE on mount — no dependency on options
  const connect = useCallback(() => {
    // Close any existing stale connection before opening a new one
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.onclose = null; // prevent re-triggering reconnect
      wsRef.current.close();
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const baseUrl = urlRef.current || `${protocol}//${window.location.host}`;

      // Browsers cannot send custom headers with the WebSocket constructor,
      // so we pass the auth token as a query parameter instead.
      const wsUrl = baseUrl.includes('?') ? `${baseUrl}&token=dashboard` : `${baseUrl}?token=dashboard`;
      console.log(`[WebSocket] Connecting to ${wsUrl}`);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnectRef.current?.();

        ws.send(JSON.stringify({
          type: 'presence-update',
          status: 'online',
          currentFeature: getCurrentFeature(),
        }));

        // Keep-alive: send a ping every 2 minutes so the server's
        // 5-minute idle timeout never fires on an open tab.
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessageRef.current?.(message);

          if (message.type === 'welcome') {
            console.log(`[WebSocket] Welcome: ${message.connectionId}`);
          } else if (message.type === 'task-status-changed') {
            console.log(`[WebSocket] Task update: ${message.taskId} -> ${message.newStatus}`);
          }
        } catch (err) {
          console.error(`[WebSocket] Parse error: ${err}`);
        }
      };

      ws.onerror = () => {
        setError('WebSocket error');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnected(false);
        onDisconnectRef.current?.();
        // Clear keep-alive ping
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        wsRef.current = null;
        scheduleReconnect();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error(`[WebSocket] Connection error: ${err}`);
      setError(`${err}`);
      scheduleReconnect();
    }
  }, []); // ← stable: no dependencies

  // Unlimited retries with capped exponential backoff (max 30s)
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return; // already scheduled

    const attempt = reconnectAttemptsRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    reconnectAttemptsRef.current += 1;

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${attempt + 1})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // suppress auto-reconnect on manual disconnect
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const updatePresence = useCallback((feature: string) => {
    send({
      type: 'presence-update',
      currentFeature: feature,
    });
  }, [send]);

  // Connect exactly once on mount; clean up on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    connected,
    error,
    send,
    updatePresence,
    disconnect,
  };
}

/**
 * Helper: Get current feature from URL/state
 */
function getCurrentFeature(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('feature') || 'dashboard';
}
