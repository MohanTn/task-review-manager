# WebSocket Real-Time System - Architecture & Deployment Guide

## Overview

The AIConductor now includes a comprehensive WebSocket-based real-time notification and presence system. This guide covers architecture, setup, deployment, and troubleshooting.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  useWebSocket Hook (T06)                     │  │
│  │  - Auto-reconnection (1s, 2s, 4s, 8s backoff)  │  │
│  │  - Message handling                          │  │
│  │  - Presence updates on navigation            │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │ WebSocket                      │
│  ┌──────────────────▼───────────────────────────┐  │
│  │  ReviewerPresence Component (T05)            │  │
│  │  - Display active reviewers                  │  │
│  │  - Real-time status badges                   │  │
│  │  - Presence list with time online            │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ▲
                        │ ws://
                        ▼
┌─────────────────────────────────────────────────────┐
│              Backend (Node.js Express)               │
│  ┌──────────────────────────────────────────────┐  │
│  │  WebSocketServerManager (T01)                │  │
│  │  - Connection registry                       │  │
│  │  - Auth validation (handshake + per-message)│  │
│  │  - Rate limiting (10 connections/IP)        │  │
│  │  - Connection timeout (5 min idle)           │  │
│  │  - Keepalive (ping/pong)                     │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │ emit event                     │
│  ┌──────────────────▼───────────────────────────┐  │
│  │  EventStreamer (T04)                         │  │
│  │  - Task status change events                 │  │
│  │  - Event validation & filtering              │  │
│  │  - Broadcast to all clients (<100ms)        │  │
│  │  - Audit logging                             │  │
│  └──────────────────┬───────────────────────────┘  │
│  ┌──────────────────▼───────────────────────────┐  │
│  │  RedisPubSub (T02)                           │  │
│  │  - Multi-server event sync                   │  │
│  │  - Channels: tasks:updates, presence:updates│  │
│  │  - Graceful fallback if Redis unavailable   │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Database (T03)                              │  │
│  │  - reviewer_presence table with TTL         │  │
│  │  - 30-minute expiry, auto cleanup every 5min │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Key Features

### 1. WebSocket Server (T01)
- **Port**: 5111 (alongside Express)
- **Auth**: Token validation in handshake + per-message validation
- **Rate Limiting**: Max 10 connections per IP
- **Timeout**: 5 minutes idle with keepalive pings
- **Memory Safety**: Weak references, proper cleanup on disconnect

### 2. Presence Tracking (T03)
- **TTL**: 30 minutes (configurable)
- **Storage**: SQLite `reviewer_presence` table
- **Auto Cleanup**: Every 5 minutes
- **Metadata**: reviewer_id, status, current_feature, timestamps

### 3. Event Streaming (T04)
- **Latency Target**: <100ms
- **Broadcast**: All connected clients
- **Types**: task-status-changed, stakeholder-review
- **Filtering**: Authorization checks, sensitive field redaction
- **Audit**: Event log for debugging

### 4. Multi-Server Support (T02)
- **Pub/Sub**: Redis pub/sub for cross-server sync
- **Channels**: tasks:updates, presence:updates, admin:notifications
- **Fallback**: Single-server mode if Redis unavailable
- **Reconnection**: Exponential backoff with circuit breaker

## Local Development

### Prerequisites
```bash
- Node.js 20+
- npm or yarn
- SQLite (included)
- Redis (optional, for multi-server)
```

### Setup

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Start dashboard (includes WebSocket server)
npm run dashboard

# WebSocket will be available at: ws://localhost:5111
# Dashboard at: http://localhost:5111
```

### Environment Variables

```bash
# Optional Redis URL for multi-server support
REDIS_URL=redis://localhost:6379

# WebSocket port (default 5111)
WEBSOCKET_PORT=5111

# Database path (default ./tasks.db)
DATABASE_PATH=./tasks.db
```

## Docker Deployment

### Single-Server Setup

```bash
# Build
docker-compose up -d

# WebSocket at: ws://localhost:5111
# Dashboard at: http://localhost:5111
```

### Multi-Server Setup with Redis

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  app-server-1:
    build: .
    ports:
      - "5111:5111"
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - redis

  app-server-2:
    build: .
    ports:
      - "5112:5111"
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app-server-1
      - app-server-2
```

## API & WebSocket Events

### WebSocket Events (Received by Client)

```json
{
  "type": "welcome",
  "connectionId": "conn_abc123",
  "message": "Connected to AIConductor WebSocket server",
  "timestamp": 1708344000000
}

{
  "type": "task-status-changed",
  "taskId": "T01",
  "featureSlug": "websocket-realtime-system",
  "oldStatus": "InProgress",
  "newStatus": "InReview",
  "timestamp": 1708344030000
}

{
  "type": "presence-update",
  "connectionId": "conn_xyz789",
  "userId": "alice",
  "role": "architect",
  "currentFeature": "websocket-realtime-system",
  "timestamp": 1708344060000
}
```

### WebSocket Events (Sent by Client)

```json
{
  "type": "presence-update",
  "currentFeature": "websocket-realtime-system",
  "status": "online"
}
```

## Troubleshooting

### Connection Issues

**Problem**: WebSocket connection fails
**Solution**:
```bash
# Check server is running
curl http://localhost:5111/health

# Check WebSocket port is open
nc -zv localhost 5111

# Verify auth token is being sent
# Check browser console for connection errors
```

### Latency Issues

**Problem**: Events arriving slowly (>100ms)
**Solutions**:
1. Check network latency: `ping server`
2. Monitor server CPU/memory: `docker stats`
3. Check Redis connection: `redis-cli ping`
4. Reduce client load (disconnect idle clients)

### Auth Failures

**Problem**: Connection rejected with 401
**Solution**:
1. Verify auth token format
2. Check token expiry
3. Ensure token is in Authorization header
4. Server logs will show auth failures

### Presence Tracking

**Problem**: Presence records not updating
**Solution**:
```bash
# Check database
sqlite3 tasks.db "SELECT * FROM reviewer_presence;"

# Run cleanup manually
sqlite3 tasks.db "DELETE FROM reviewer_presence WHERE expires_at < strftime('%s', 'now');"
```

## Performance Tuning

### For 100+ Concurrent Users

1. **Increase file descriptors**:
   ```bash
   ulimit -n 10000
   ```

2. **Tune Node.js**:
   ```bash
   node --max-old-space-size=4096 dist/dashboard.js
   ```

3. **Enable compression**:
   ```javascript
   // In dashboard.ts
   app.use(compression());
   ```

4. **Use Redis** for multi-server load balancing

5. **Monitor metrics**:
   ```bash
   # Check WebSocket health
   curl http://localhost:5111/health
   ```

## Security Checklist

- [ ] Use WSS (wss://) in production
- [ ] Validate auth tokens (JWT or session)
- [ ] Enable Redis AUTH password
- [ ] Use Redis TLS
- [ ] Rate limit connections per IP
- [ ] Log all connection events
- [ ] Encrypt database at rest
- [ ] Implement message validation
- [ ] Strip sensitive fields from broadcasts

## Monitoring & Metrics

### Health Endpoint

```bash
curl http://localhost:5111/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T08:50:00.000Z",
  "websocket": "enabled",
  "connections": 42
}
```

### Metrics to Monitor

- Connection count
- Event broadcast latency (p50, p95, p99)
- Auth failure rate
- Reconnection attempts
- Database query time
- Redis pub/sub lag (multi-server)

## Next Steps

1. **Production Deployment**:
   - Use WSS (WebSocket Secure)
   - Deploy with load balancer (nginx, HAProxy)
   - Use Redis for state synchronization
   - Enable monitoring and alerting

2. **Scaling**:
   - Horizontal scaling with Redis pub/sub
   - Database optimization (indexes, partitioning)
   - Client-side optimization (message batching)

3. **Enhancement**:
   - Implement offline message queuing
   - Add event replay on reconnect
   - Per-client event filtering
   - Advanced presence analytics

## Testing

```bash
# Run all tests
npm test

# Run WebSocket tests only
npm test -- websocket.test.ts

# Run integration tests
npm test -- websocket-integration.test.ts

# Load testing (requires Artillery)
npx artillery quick --count 100 --num 1000 ws://localhost:5111
```

## References

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws npm package](https://github.com/websockets/ws)
- [Redis Pub/Sub](https://redis.io/docs/manual/pubsub/)
- [ioredis](https://github.com/luin/ioredis)

## Support

For issues or questions:
1. Check this guide and troubleshooting section
2. Review server logs: `docker logs <container-id>`
3. Check browser console for client-side errors
4. Run diagnostics: `curl http://localhost:5111/health`
