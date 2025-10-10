# WebSocket Protocol Specification

## Overview

The RabbitHole collaboration system uses WebSocket connections for real-time bidirectional communication between clients and the server. This document defines the message protocol, connection lifecycle, and error handling.

## Connection Lifecycle

### 1. Connection Establishment

```typescript
// Client connects to WebSocket endpoint
ws://localhost:4000/graphql

// Authentication via connection params
{
  "type": "connection_init",
  "payload": {
    "authorization": "Bearer <JWT_TOKEN>",
    "graphId": "uuid-of-graph"
  }
}

// Server response on successful auth
{
  "type": "connection_ack",
  "payload": {
    "sessionId": "unique-session-id",
    "userId": "user-uuid",
    "reconnectToken": "token-for-reconnection"
  }
}
```

### 2. Heartbeat Mechanism

```typescript
// Client sends heartbeat every 30 seconds
{
  "type": "heartbeat",
  "timestamp": 1696867200000
}

// Server acknowledges
{
  "type": "heartbeat_ack",
  "timestamp": 1696867200100
}
```

### 3. Graceful Disconnection

```typescript
// Client initiates disconnect
{
  "type": "disconnect",
  "payload": {
    "reason": "user_logout" | "page_unload" | "network_error"
  }
}

// Server acknowledges and closes connection
{
  "type": "disconnect_ack"
}
```

## Message Types

### Presence Messages

#### USER_JOINED
Broadcast when a user joins a graph
```json
{
  "type": "user_joined",
  "payload": {
    "userId": "uuid",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "displayName": "John Doe",
      "avatarUrl": "https://..."
    },
    "sessionId": "session-uuid",
    "timestamp": 1696867200000
  }
}
```

#### USER_LEFT
Broadcast when a user leaves a graph
```json
{
  "type": "user_left",
  "payload": {
    "userId": "uuid",
    "sessionId": "session-uuid",
    "timestamp": 1696867200000
  }
}
```

#### CURSOR_MOVED
Sent when a user's cursor position changes
```json
{
  "type": "cursor_moved",
  "payload": {
    "userId": "uuid",
    "position": {
      "nodeId": "node-uuid",
      "x": 150.5,
      "y": 200.3
    },
    "timestamp": 1696867200000
  }
}
```

#### SELECTION_CHANGED
Sent when a user's selection changes
```json
{
  "type": "selection_changed",
  "payload": {
    "userId": "uuid",
    "selectedNodes": ["node-uuid-1", "node-uuid-2"],
    "selectedEdges": ["edge-uuid-1"],
    "timestamp": 1696867200000
  }
}
```

#### VIEWPORT_CHANGED
Sent when a user's viewport changes
```json
{
  "type": "viewport_changed",
  "payload": {
    "userId": "uuid",
    "viewport": {
      "x": 0,
      "y": 0,
      "zoom": 1.5
    },
    "timestamp": 1696867200000
  }
}
```

### Operation Messages

#### OPERATION
Client submits an operation
```json
{
  "type": "operation",
  "payload": {
    "id": "op-uuid",
    "operationType": "update",
    "entityType": "node",
    "entityId": "node-uuid",
    "path": ["props", "title"],
    "value": "New Title",
    "oldValue": "Old Title",
    "version": 42,
    "timestamp": 1696867200000
  }
}
```

#### OPERATION_ACK
Server acknowledges successful operation
```json
{
  "type": "operation_ack",
  "payload": {
    "operationId": "op-uuid",
    "version": 43,
    "transformedOperations": [],
    "timestamp": 1696867200000
  }
}
```

#### OPERATION_REJECT
Server rejects an operation
```json
{
  "type": "operation_reject",
  "payload": {
    "operationId": "op-uuid",
    "reason": "conflict" | "invalid" | "permission_denied",
    "conflict": {
      "type": "value",
      "expectedValue": "Old Title",
      "actualValue": "Different Title"
    },
    "timestamp": 1696867200000
  }
}
```

### Synchronization Messages

#### SYNC_REQUEST
Client requests current state
```json
{
  "type": "sync_request",
  "payload": {
    "fromVersion": 40,
    "includePresence": true,
    "timestamp": 1696867200000
  }
}
```

#### SYNC_RESPONSE
Server sends current state
```json
{
  "type": "sync_response",
  "payload": {
    "version": 43,
    "operations": [
      { /* operation 41 */ },
      { /* operation 42 */ },
      { /* operation 43 */ }
    ],
    "presence": [
      {
        "userId": "uuid",
        "status": "online",
        "cursorPosition": { /* ... */ },
        "selectedNodes": []
      }
    ],
    "timestamp": 1696867200000
  }
}
```

### Activity Messages

#### ACTIVITY
Broadcast activity to collaborators
```json
{
  "type": "activity",
  "payload": {
    "id": "activity-uuid",
    "userId": "uuid",
    "user": {
      "username": "john_doe",
      "displayName": "John Doe"
    },
    "actionType": "node_created",
    "entityType": "node",
    "entityId": "node-uuid",
    "description": "John Doe created a new node",
    "timestamp": 1696867200000
  }
}
```

### Notification Messages

#### NOTIFICATION
Server sends notification to specific user(s)
```json
{
  "type": "notification",
  "payload": {
    "id": "notification-uuid",
    "notificationType": "mention" | "comment" | "share",
    "title": "You were mentioned",
    "message": "John Doe mentioned you in a comment",
    "data": {
      "graphId": "graph-uuid",
      "nodeId": "node-uuid",
      "commentId": "comment-uuid"
    },
    "timestamp": 1696867200000
  }
}
```

### Error Messages

#### ERROR
Server sends error message
```json
{
  "type": "error",
  "payload": {
    "code": "RATE_LIMIT" | "AUTH_FAILED" | "PERMISSION_DENIED" | "INVALID_OPERATION",
    "message": "Rate limit exceeded. Please slow down.",
    "details": {
      "retryAfter": 5000,
      "limit": 100,
      "window": 60000
    },
    "timestamp": 1696867200000
  }
}
```

## Binary Protocol (Optional)

For performance optimization with large graphs, we support a binary protocol using MessagePack:

```typescript
// Binary message structure
[
  messageType: uint8,    // 1 byte message type enum
  timestamp: uint64,     // 8 bytes Unix timestamp
  payloadLength: uint32, // 4 bytes payload size
  payload: bytes         // Variable length MessagePack encoded payload
]
```

## Connection State Machine

```
   ┌─────────────┐
   │ Disconnected│
   └──────┬──────┘
          │ connect()
          ▼
   ┌─────────────┐
   │ Connecting  │
   └──────┬──────┘
          │ connection_ack
          ▼
   ┌─────────────┐
   │  Connected  │◄──────┐
   └──────┬──────┘       │
          │              │ reconnect
          │ error        │
          ▼              │
   ┌─────────────┐       │
   │Reconnecting │───────┘
   └──────┬──────┘
          │ max retries
          ▼
   ┌─────────────┐
   │   Failed    │
   └─────────────┘
```

## Rate Limiting

### Operation Limits
- **Node/Edge Operations**: 100 ops/minute per user
- **Cursor Updates**: 60 updates/second per user
- **Selection Changes**: 30 changes/second per user
- **Viewport Changes**: 30 changes/second per user

### Connection Limits
- **Max connections per user**: 5 simultaneous
- **Max connections per graph**: 100 simultaneous
- **Max message size**: 1MB
- **Max operations queue**: 1000 per session

## Error Codes

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| 1000 | Normal closure | None |
| 1001 | Going away | Reconnect |
| 1003 | Unsupported data | Check protocol version |
| 1006 | Abnormal closure | Reconnect with backoff |
| 1008 | Policy violation | Check rate limits |
| 1009 | Message too big | Reduce payload size |
| 1011 | Internal error | Reconnect with backoff |
| 4000 | Authentication failed | Re-authenticate |
| 4001 | Authorization failed | Check permissions |
| 4002 | Graph not found | Verify graph ID |
| 4003 | Rate limit exceeded | Backoff and retry |
| 4004 | Session expired | Create new session |
| 4005 | Version mismatch | Sync to latest |

## Reconnection Strategy

```typescript
class ReconnectionStrategy {
  baseDelay = 1000;      // Start with 1 second
  maxDelay = 30000;      // Max 30 seconds
  maxAttempts = 10;      // Give up after 10 attempts
  backoffFactor = 1.5;   // Exponential backoff
  jitter = 0.3;          // 30% jitter

  calculateDelay(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(this.backoffFactor, attempt);
    const clampedDelay = Math.min(exponentialDelay, this.maxDelay);
    const jitterAmount = clampedDelay * this.jitter * Math.random();
    return clampedDelay + jitterAmount;
  }
}
```

## Security Considerations

### Authentication
- JWT tokens must be validated on every connection
- Tokens should expire and be refreshed periodically
- Connection-specific tokens prevent replay attacks

### Authorization
- Check graph access permissions on connection
- Validate operation permissions before processing
- Rate limit by user and IP address

### Data Validation
- Validate all incoming messages against schema
- Sanitize user input to prevent XSS
- Limit message size to prevent DoS

### Encryption
- Use WSS (WebSocket Secure) in production
- Enable TLS 1.3 minimum
- Implement certificate pinning for mobile clients

## Performance Optimizations

### Message Batching
Group multiple small messages sent within 16ms window:
```json
{
  "type": "batch",
  "payload": {
    "messages": [
      { "type": "cursor_moved", /* ... */ },
      { "type": "selection_changed", /* ... */ }
    ]
  }
}
```

### Delta Compression
Send only changed fields for updates:
```json
{
  "type": "operation",
  "payload": {
    "delta": {
      "props.title": "New Title",
      "meta.updatedAt": 1696867200000
    }
  }
}
```

### Viewport-based Updates
Only send updates for visible entities:
```json
{
  "type": "viewport_filter",
  "payload": {
    "bounds": {
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080
    }
  }
}
```

## Client SDK Example

```typescript
class CollaborationClient {
  private ws: WebSocket;
  private messageQueue: Message[] = [];
  private reconnectTimer: NodeJS.Timeout;

  connect(graphId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://api.rabbithole.app/graphql');

      this.ws.onopen = () => {
        this.send({
          type: 'connection_init',
          payload: {
            authorization: `Bearer ${token}`,
            graphId
          }
        });
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'connection_ack') {
          this.flushMessageQueue();
          resolve();
        } else {
          this.handleMessage(message);
        }
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };
    });
  }

  private handleMessage(message: Message): void {
    // Route message to appropriate handler
    switch (message.type) {
      case 'user_joined':
        this.onUserJoined(message.payload);
        break;
      case 'cursor_moved':
        this.onCursorMoved(message.payload);
        break;
      // ... other cases
    }
  }

  private handleDisconnect(): void {
    // Implement reconnection logic
    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, this.calculateReconnectDelay());
  }
}