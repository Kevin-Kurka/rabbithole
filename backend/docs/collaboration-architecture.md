# Real-Time Collaboration System Architecture

## System Overview

The RabbitHole collaboration system enables multiple users to work on the same Level 1 graph simultaneously with real-time synchronization, conflict resolution, and activity tracking.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Browser 1          Browser 2          Browser 3          Mobile Client    │
│  [User A]           [User B]           [User C]           [User D]          │
└────┬────────────────┬───────────────────┬───────────────────┬──────────────┘
     │                │                   │                   │
     │      WebSocket │         WebSocket │         WebSocket │
     └────────────────┴───────────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WebSocket Gateway Layer                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Connection  │  │    Auth      │  │   Message    │  │    Rate      │  │
│  │   Manager    │  │  Validator   │  │   Router     │  │   Limiter    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Collaboration Service Layer                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Presence   │  │     OT       │  │   Activity   │  │ Notification │  │
│  │   Service    │  │   Engine     │  │   Logger     │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Sharing    │  │   Session    │  │    Lock      │  │   GraphQL    │  │
│  │   Service    │  │   Manager    │  │   Manager    │  │ Subscription │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┬─────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Data Storage Layer                                 │
├──────────────────────┬──────────────────────┬──────────────────────────────┤
│      PostgreSQL      │       Redis          │         S3/CDN               │
│  ┌───────────────┐   │  ┌───────────────┐   │  ┌────────────────┐         │
│  │ Graph Data    │   │  │ Presence Data │   │  │ Graph Snapshots│         │
│  │ User Data     │   │  │ Session Cache │   │  │ Activity Logs  │         │
│  │ Permissions   │   │  │ Op Queue      │   │  │ Attachments    │         │
│  │ Activity Log  │   │  │ Pub/Sub       │   │  └────────────────┘         │
│  │ Op History    │   │  └───────────────┘   │                              │
│  └───────────────┘   │                      │                              │
└──────────────────────┴──────────────────────┴──────────────────────────────┘
```

## Component Details

### 1. WebSocket Gateway

```
┌──────────────────────────────────────────────────────────────┐
│                     WebSocket Gateway                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Connection Lifecycle:                                       │
│  ┌────────┐  auth   ┌──────────┐  heartbeat  ┌──────────┐  │
│  │ Connect├─────────►│ Active   ├─────────────►│  Idle    │  │
│  └────────┘          └────┬─────┘              └────┬─────┘  │
│                           │                          │        │
│                           │ disconnect               │ timeout│
│                           ▼                          ▼        │
│                      ┌──────────┐              ┌──────────┐  │
│                      │ Closing  │              │ Expired  │  │
│                      └──────────┘              └──────────┘  │
│                                                              │
│  Message Flow:                                               │
│  Client ──► Validate ──► Route ──► Process ──► Broadcast    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2. Operational Transform Engine

```
┌─────────────────────────────────────────────────────────────┐
│              Operational Transform Process                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client A Operation    Client B Operation                   │
│         │                      │                            │
│         ▼                      ▼                            │
│    ┌─────────┐            ┌─────────┐                      │
│    │ Op A(0) │            │ Op B(0) │                      │
│    └────┬────┘            └────┬────┘                      │
│         │                      │                            │
│         └──────────┬───────────┘                           │
│                    ▼                                        │
│           ┌──────────────┐                                  │
│           │  Transform   │                                  │
│           │   Engine     │                                  │
│           └──────────────┘                                  │
│                    │                                        │
│         ┌──────────┴───────────┐                           │
│         ▼                      ▼                            │
│    ┌─────────┐            ┌─────────┐                      │
│    │Op A'(1) │            │Op B'(1) │                      │
│    └────┬────┘            └────┬────┘                      │
│         │                      │                            │
│         ▼                      ▼                            │
│    Apply to B             Apply to A                        │
│                                                              │
│  Result: Consistent State                                   │
└──────────────────────────────────────────────────────────────┘
```

### 3. Presence Management

```
┌─────────────────────────────────────────────────────────────┐
│                  Presence Tracking System                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User State:                                                 │
│  ┌──────────┐                                               │
│  │  Online  │◄─────── Active Interaction                    │
│  └────┬─────┘                                               │
│       │                                                      │
│       │ 60s inactive                                        │
│       ▼                                                      │
│  ┌──────────┐                                               │
│  │   Idle   │◄─────── No interaction                        │
│  └────┬─────┘                                               │
│       │                                                      │
│       │ 120s inactive                                       │
│       ▼                                                      │
│  ┌──────────┐                                               │
│  │ Offline  │◄─────── Disconnected                          │
│  └──────────┘                                               │
│                                                              │
│  Data Tracked:                                               │
│  • Cursor Position (x, y, nodeId)                           │
│  • Selected Elements (nodes[], edges[])                     │
│  • Viewport (x, y, zoom)                                    │
│  • Last Activity Timestamp                                  │
│  • Session Metadata                                         │
└──────────────────────────────────────────────────────────────┘
```

### 4. Conflict Resolution Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Conflict Resolution Matrix                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Operation Types:                                            │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐      │
│  │         │ INSERT  │ UPDATE  │ DELETE  │  MOVE   │      │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┤      │
│  │ INSERT  │  Merge  │   OK    │   OK    │   OK    │      │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┤      │
│  │ UPDATE  │   OK    │  LWW*   │ Delete  │   OK    │      │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┤      │
│  │ DELETE  │   OK    │  Wins   │  Idem   │  Error  │      │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┤      │
│  │ MOVE    │   OK    │   OK    │  Error  │ Reorder │      │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘      │
│                                                              │
│  *LWW = Last Write Wins                                     │
│  Idem = Idempotent (no-op)                                  │
│                                                              │
│  Resolution Strategies:                                      │
│  1. Operational Transform for text/array operations         │
│  2. Three-way merge for complex objects                     │
│  3. Vector clocks for causality tracking                    │
│  4. Pessimistic locking for critical sections               │
└──────────────────────────────────────────────────────────────┘
```

### 5. Permission Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Permission Model                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Graph Owner                                                 │
│      │                                                       │
│      ├─── Admin (can manage permissions)                    │
│      │      │                                                │
│      │      ├─── Edit (can modify graph)                    │
│      │      │      │                                         │
│      │      │      └─── View (read-only access)             │
│      │      │                                                │
│      │      └─── Invite (can invite others)                 │
│      │                                                       │
│      └─── Transfer Ownership                                │
│                                                              │
│  Operations by Permission:                                   │
│  ┌──────────┬──────┬──────┬───────┬───────┐               │
│  │Operation │ View │ Edit │ Admin │ Owner │               │
│  ├──────────┼──────┼──────┼───────┼───────┤               │
│  │Read Graph│  ✓   │  ✓   │   ✓   │   ✓   │               │
│  │Add Node  │  ✗   │  ✓   │   ✓   │   ✓   │               │
│  │Edit Node │  ✗   │  ✓   │   ✓   │   ✓   │               │
│  │Delete    │  ✗   │  ✗   │   ✓   │   ✓   │               │
│  │Share     │  ✗   │  ✗   │   ✓   │   ✓   │               │
│  │Settings  │  ✗   │  ✗   │   ✗   │   ✓   │               │
│  └──────────┴──────┴──────┴───────┴───────┘               │
└──────────────────────────────────────────────────────────────┘
```

## Database Schema Summary

### Core Tables
- **GraphShares**: User permissions for graphs
- **GraphInvitations**: Pending collaboration invites
- **GraphActivity**: Audit log of all actions
- **UserPresence**: Real-time user tracking
- **GraphLocks**: Pessimistic locking mechanism
- **OperationHistory**: OT operation log
- **CollaborationSessions**: WebSocket session tracking
- **NotificationPreferences**: User notification settings

## API Endpoints

### GraphQL Subscriptions
```graphql
subscription OnGraphUpdate($graphId: ID!) {
  graphUpdated(graphId: $graphId) {
    operation {
      type
      entityType
      entityId
      changes
    }
    user {
      id
      username
    }
  }
}

subscription OnPresenceUpdate($graphId: ID!) {
  presenceUpdated(graphId: $graphId) {
    userId
    status
    cursorPosition
    selectedNodes
  }
}

subscription OnActivity($graphId: ID!) {
  activityCreated(graphId: $graphId) {
    actionType
    user {
      username
    }
    description
    timestamp
  }
}
```

### REST Endpoints (Alternative)
```
POST   /api/v1/graphs/{id}/share
GET    /api/v1/graphs/{id}/collaborators
DELETE /api/v1/graphs/{id}/collaborators/{userId}
GET    /api/v1/graphs/{id}/activity
GET    /api/v1/graphs/{id}/presence
POST   /api/v1/invitations/accept
```

## Scalability Considerations

### Horizontal Scaling
```
┌─────────────────────────────────────────────────┐
│                Load Balancer                    │
│              (Sticky Sessions)                  │
└───────┬──────────┬──────────┬──────────────────┘
        │          │          │
    ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
    │ Node1 │  │ Node2 │  │ Node3 │
    └───┬───┘  └───┬───┘  └───┬───┘
        │          │          │
        └──────────┼──────────┘
                   │
            ┌──────▼──────┐
            │Redis Cluster│
            │  (Pub/Sub)  │
            └─────────────┘
```

### Performance Metrics
- **Concurrent Users**: 100+ per graph
- **Message Throughput**: 10,000 msg/sec
- **Latency**: <100ms p95
- **Availability**: 99.9% uptime

## Security Measures

1. **Authentication**: JWT tokens with refresh mechanism
2. **Authorization**: Row-level security in PostgreSQL
3. **Encryption**: TLS 1.3 for all connections
4. **Rate Limiting**: Per-user and per-IP limits
5. **Input Validation**: Schema validation for all messages
6. **Audit Logging**: Complete activity trail

## Monitoring & Observability

### Key Metrics
- WebSocket connection count
- Message queue depth
- OT transformation time
- Conflict resolution rate
- Database query performance
- Redis memory usage

### Health Checks
```
GET /health/live    - Service is running
GET /health/ready   - Service can accept traffic
GET /health/ws      - WebSocket server status
GET /metrics        - Prometheus metrics
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│              Production Environment              │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │            Kubernetes Cluster             │   │
│  ├──────────────────────────────────────────┤   │
│  │                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │ Collab Pod  │  │ Collab Pod  │       │   │
│  │  │ (Replica 1) │  │ (Replica 2) │  ...  │   │
│  │  └─────────────┘  └─────────────┘       │   │
│  │                                           │   │
│  │  ┌─────────────────────────────────┐     │   │
│  │  │    Horizontal Pod Autoscaler    │     │   │
│  │  └─────────────────────────────────┘     │   │
│  │                                           │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ Redis Cluster│  │  PostgreSQL (Primary)  │   │
│  │  (3 nodes)   │  │  + Read Replicas       │   │
│  └──────────────┘  └────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Future Enhancements

1. **CRDT Support**: For eventually consistent operations
2. **Voice/Video**: WebRTC integration for collaboration
3. **AI Assistance**: Smart conflict resolution suggestions
4. **Mobile Optimization**: Native mobile SDKs
5. **Federation**: Cross-instance collaboration
6. **Time Travel**: Playback of collaboration sessions