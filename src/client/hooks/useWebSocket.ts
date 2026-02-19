/**
 * useWebSocket Hook - Client-Side WebSocket Connection & Auto-Reconnection (T06)
 *
 * Manages WebSocket connection lifecycle with exponential backoff reconnection.
 * Listens for task-status-changed and presence events.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backoffDelays = [1000, 2000, 4000, 8000]; // Exponential backoff

  const connect = useCallback(() => {
    try {
      // Get auth token from httpOnly cookie (secure storage)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = options.url || `${protocol}//${window.location.host}`;

      console.log(`[WebSocket] Connecting to ${url}`);

      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        options.onConnect?.();

        // Emit presence update on connect
        ws.send(JSON.stringify({
          type: 'presence-update',
          status: 'online',
          currentFeature: getCurrentFeature(),
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          options.onMessage?.(message);

          // Handle different message types
          if (message.type === 'welcome') {
            console.log(`[WebSocket] Welcome: ${message.connectionId}`);
          } else if (message.type === 'task-status-changed') {
            console.log(`[WebSocket] Task update: ${message.taskId} -> ${message.newStatus}`);
          }
        } catch (err) {
          console.error(`[WebSocket] Parse error: ${err}`);
        }
      };

      ws.onerror = (event) => {
        console.error(`[WebSocket] Error: ${event}`);
        setError('WebSocket error');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnected(false);
        options.onDisconnect?.();
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        attemptReconnect();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error(`[WebSocket] Connection error: ${err}`);
      setError(`${err}`);
      attemptReconnect();
    }
  }, [options]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= 3) {
      setError('Connection lost. Click to retry.');
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    const delay = backoffDelays[reconnectAttemptsRef.current] || 8000;
    reconnectAttemptsRef.current++;

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
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

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

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
