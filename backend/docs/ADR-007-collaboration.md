# ADR-007: Real-Time Collaboration System Architecture

## Status
Accepted

## Date
2024-10-09

## Context
RabbitHole requires a robust real-time collaboration system that allows multiple users to work on the same Level 1 graph simultaneously. The system must handle:
- Real-time presence (who's online)
- Concurrent editing with conflict resolution
- Graph sharing with granular permissions
- Activity feeds and notifications
- Scalability to 100+ concurrent users per graph

## Decision

### 1. Architecture Overview

We will implement a hybrid architecture combining:
- **WebSocket connections** for real-time bidirectional communication
- **GraphQL subscriptions** for reactive data updates
- **Redis** for pub/sub messaging and presence management
- **PostgreSQL** for persistent state and audit logs
- **Operational Transform (OT)** for conflict resolution

```
┌─────────────┐     WebSocket      ┌──────────────────┐
│   Client    │◄──────────────────►│  Collaboration   │
│  (Browser)  │                    │     Gateway      │
└─────────────┘                    └──────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────┐
                    │         Collaboration Service         │
                    │  ┌─────────────┐  ┌───────────────┐ │
                    │  │  Presence   │  │   Activity    │ │
                    │  │   Manager   │  │    Logger     │ │
                    │  └─────────────┘  └───────────────┘ │
                    │  ┌─────────────┐  ┌───────────────┐ │
                    │  │     OT      │  │ Notification  │ │
                    │  │   Engine    │  │   Service     │ │
                    │  └─────────────┘  └───────────────┘ │
                    └───────────────────────────────────────┘
                               │              │
                    ┌──────────▼──────────────▼──────────┐
                    │                                     │
              ┌─────▼──────┐                   ┌─────────▼────┐
              │    Redis    │                   │  PostgreSQL  │
              │  Pub/Sub    │                   │   Database   │
              └─────────────┘                   └──────────────┘
```

### 2. Technology Stack

- **WebSocket Server**: `ws` library with `graphql-ws` for GraphQL subscriptions
- **Presence Management**: Redis with TTL-based presence tracking
- **Conflict Resolution**: Operational Transform (OT) library for text and JSON operations
- **Message Queue**: Redis Pub/Sub for event distribution
- **Persistence**: PostgreSQL for graph state and audit logs

### 3. Core Components

#### 3.1 Collaboration Gateway
- Manages WebSocket connections
- Authenticates users via JWT tokens
- Routes messages to appropriate handlers
- Maintains connection pool per graph

#### 3.2 Presence Manager
- Tracks online users per graph
- Manages cursor positions and selections
- Broadcasts presence updates
- Handles heartbeat and cleanup

#### 3.3 OT Engine
- Transforms concurrent operations
- Maintains operation history
- Resolves conflicts deterministically
- Supports undo/redo operations

#### 3.4 Activity Logger
- Records all graph modifications
- Provides activity feed API
- Maintains audit trail
- Supports time-travel debugging

#### 3.5 Notification Service
- Real-time push notifications
- Email notifications for offline users
- Configurable notification preferences
- Rate limiting and batching

## Consequences

### Positive
- **Scalability**: Redis pub/sub enables horizontal scaling
- **Reliability**: OT ensures consistent state across clients
- **Performance**: WebSocket reduces latency vs HTTP polling
- **Flexibility**: GraphQL subscriptions provide fine-grained updates
- **Auditability**: Complete activity log for compliance

### Negative
- **Complexity**: OT implementation requires careful testing
- **Infrastructure**: Requires Redis cluster for high availability
- **Network**: WebSocket connections require sticky sessions
- **Storage**: Activity logs grow linearly with usage

## Implementation Strategy

### Phase 1: Foundation (Week 1)
- WebSocket server setup
- Basic presence tracking
- GraphQL subscription infrastructure

### Phase 2: Collaboration (Week 2)
- OT engine implementation
- Conflict resolution algorithms
- Optimistic UI updates

### Phase 3: Sharing (Week 3)
- Permission system
- Invitation workflow
- Access control

### Phase 4: Polish (Week 4)
- Activity feed
- Notifications
- Performance optimization

## Monitoring & Metrics

Key metrics to track:
- WebSocket connection count
- Message throughput (ops/second)
- OT transformation latency (p50, p95, p99)
- Conflict rate
- Presence accuracy
- Redis memory usage
- Database query performance

## Security Considerations

- JWT tokens for authentication
- Rate limiting per user/IP
- Input validation for all operations
- Encryption for sensitive data
- CORS configuration for WebSocket
- DDoS protection via connection limits

## References

- [Operational Transformation](http://ot.substance.io/ot-for-javascript.html)
- [CRDT vs OT Comparison](https://www.inkandswitch.com/peritext/)
- [WebSocket Security Best Practices](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client_Side_Testing/10-Testing_WebSockets)
- [GraphQL Subscriptions Architecture](https://www.apollographql.com/docs/apollo-server/data/subscriptions/)