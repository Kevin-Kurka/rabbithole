# Real-Time Collaboration - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend Application                         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Graph Page (page.tsx)                      │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  useCollaboration(graphId)                              │  │ │
│  │  │  ├─ activeUsers: ActiveUser[]                           │  │ │
│  │  │  ├─ chatMessages: ChatMessage[]                         │  │ │
│  │  │  ├─ updateCursor(x, y)                                  │  │ │
│  │  │  ├─ sendChatMessage(message)                            │  │ │
│  │  │  └─ isConnected: boolean                                │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                               │                                 │ │
│  │              ┌────────────────┴────────────────┐                │ │
│  │              ▼                                 ▼                │ │
│  │  ┌─────────────────────┐          ┌─────────────────────────┐  │ │
│  │  │   GraphCanvas       │          │  CollaborationPanel     │  │ │
│  │  │                     │          │                         │  │ │
│  │  │ Props:              │          │ Props:                  │  │ │
│  │  │ - activeUsers       │          │ - graphId               │  │ │
│  │  │ - onCursorMove      │          │ - currentUserId         │  │ │
│  │  │                     │          │                         │  │ │
│  │  │ Renders:            │          │ Components:             │  │ │
│  │  │ - ReactFlow canvas  │          │ - User list             │  │ │
│  │  │ - RemoteCursors     │          │ - Chat (embedded)       │  │ │
│  │  └─────────────────────┘          └─────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ GraphQL over WebSocket
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                        Apollo Client (WSLink)                         │
│                                                                       │
│  Subscriptions:                    Mutations:                        │
│  - userJoined                      - sendChatMessage                 │
│  - userLeft                        - updatePresence                  │
│  - cursorMoved                                                       │
│  - chatMessage                                                       │
└───────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ WebSocket (ws://localhost:4000/graphql)
                                   │
┌──────────────────────────────────▼───────────────────────────────────┐
│                         Backend Server (GraphQL)                      │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                      Subscription Manager                        │ │
│  │                                                                  │ │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐            │ │
│  │  │ Presence   │    │  Cursor    │    │   Chat     │            │ │
│  │  │ Tracking   │    │  Tracking  │    │  Manager   │            │ │
│  │  └─────┬──────┘    └─────┬──────┘    └─────┬──────┘            │ │
│  │        │                 │                  │                   │ │
│  │        └─────────────────┴──────────────────┘                   │ │
│  │                          │                                       │ │
│  │                    ┌─────▼─────┐                                │ │
│  │                    │  Redis    │                                │ │
│  │                    │  Pub/Sub  │                                │ │
│  │                    └───────────┘                                │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
GraphPage
├── useCollaboration(graphId)
│   ├── Subscriptions
│   │   ├── userJoined
│   │   ├── userLeft
│   │   ├── cursorMoved
│   │   └── chatMessage
│   ├── Mutations
│   │   ├── sendChatMessage
│   │   └── updatePresence
│   └── State Management
│       ├── activeUsers[]
│       ├── chatMessages[]
│       ├── isConnected
│       └── Throttling logic
│
├── GraphCanvas
│   ├── ReactFlow
│   │   ├── Nodes
│   │   ├── Edges
│   │   ├── Controls
│   │   └── MiniMap
│   ├── RemoteCursor (for each activeUser)
│   │   ├── SVG cursor icon
│   │   └── Username label
│   └── Event Handlers
│       └── onPaneMouseMove → updateCursor
│
└── CollaborationPanel
    ├── Header
    │   ├── Title
    │   ├── Connection status
    │   └── Collapse button
    ├── Tabs
    │   ├── Users tab
    │   └── Chat tab
    ├── Users List (when active)
    │   ├── User card (for each activeUser)
    │   │   ├── Avatar (colored circle)
    │   │   ├── Username
    │   │   └── Status (active/idle)
    │   └── Current user ("You")
    └── Chat (when active)
        ├── Message list
        │   └── ChatMessage components
        ├── Auto-scroll anchor
        └── Input area
            ├── Text input
            └── Send button
```

## Data Flow

### Cursor Movement

```
User moves mouse on canvas
        │
        ▼
GraphCanvas.onPaneMouseMove(event)
        │
        ├─ Calculate relative position (x, y)
        │
        ▼
onCursorMove(x, y)  [prop from useCollaboration]
        │
        ▼
useCollaboration.updateCursor(x, y)
        │
        ├─ Check throttle (100ms)
        │
        ├─ If allowed: Send immediately
        │  └─> updatePresence mutation
        │
        └─ If throttled: Schedule update
           └─> setTimeout → updatePresence mutation
                    │
                    ▼
            Backend receives cursor position
                    │
                    ├─ Publish to Redis
                    │
                    ▼
            cursorMoved subscription triggered
                    │
                    ▼
            Other clients receive cursor update
                    │
                    ▼
            useCollaboration updates activeUsers state
                    │
                    ▼
            GraphCanvas re-renders RemoteCursor components
```

### Chat Message

```
User types message and presses Enter
        │
        ▼
Chat.handleSend()
        │
        ▼
onSendMessage(text)  [prop from CollaborationPanel]
        │
        ▼
useCollaboration.sendChatMessage(text)
        │
        ▼
sendChatMessage mutation
        │
        ▼
Backend receives message
        │
        ├─ Save to database (optional)
        ├─ Publish to Redis
        │
        ▼
chatMessage subscription triggered
        │
        ▼
All clients receive message
        │
        ▼
useCollaboration updates chatMessages state
        │
        ▼
CollaborationPanel.Chat re-renders with new message
        │
        ▼
Auto-scroll to bottom
```

### User Join/Leave

```
Component mounts
        │
        ▼
useCollaboration useEffect runs
        │
        ▼
updatePresence mutation (cursor: null = join)
        │
        ▼
Backend receives join event
        │
        ├─ Add to active users list
        ├─ Publish to Redis
        │
        ▼
userJoined subscription triggered
        │
        ▼
All clients receive join event
        │
        ▼
useCollaboration updates activeUsers state
        │
        ▼
CollaborationPanel.Users re-renders with new user

─────────────────────────────────

Component unmounts
        │
        ▼
useCollaboration cleanup runs
        │
        ▼
updatePresence mutation (cursor: null = leave)
        │
        ▼
Backend receives leave event
        │
        ├─ Remove from active users list
        ├─ Publish to Redis
        │
        ▼
userLeft subscription triggered
        │
        ▼
All clients receive leave event
        │
        ▼
useCollaboration updates activeUsers state
        │
        ▼
CollaborationPanel.Users re-renders without user
```

## State Management

### useCollaboration Hook State

```typescript
// Local state
const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
const [isConnected, setIsConnected] = useState(false);

// Refs (for throttling, no re-renders)
const lastCursorUpdate = useRef<number>(0);
const pendingCursorUpdate = useRef<CursorPosition | null>(null);
const throttleTimer = useRef<NodeJS.Timeout | null>(null);
```

### CollaborationPanel State

```typescript
const [isExpanded, setIsExpanded] = useState(true);
const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
```

### Chat State

```typescript
const [inputValue, setInputValue] = useState('');
const [isSending, setIsSending] = useState(false);
const messagesEndRef = useRef<HTMLDivElement>(null);
```

## WebSocket Connection Flow

```
1. App loads
   ↓
2. Apollo Client creates WSLink
   ↓
3. WebSocket connection to ws://localhost:4000/graphql
   ↓
4. Connection established
   ↓
5. useCollaboration hook initializes subscriptions
   ↓
6. Subscriptions registered on server
   ↓
7. Server tracks active subscriptions per client
   ↓
8. Events published to all subscribed clients
   ↓
9. Client receives events → updates state → UI re-renders
   ↓
10. On unmount: Subscriptions unsubscribed
    ↓
11. On disconnect: Server cleans up client subscriptions
```

## Performance Optimizations

### 1. Cursor Throttling

```
Mouse move events (60-120 Hz)
        │
        ▼
Throttle to 10 Hz (100ms)
        │
        ├─ Immediate send if > 100ms passed
        │
        └─ Otherwise: Schedule with setTimeout
           └─> Clear on unmount
```

### 2. Message Limiting

```
New message arrives
        │
        ▼
Add to chatMessages array
        │
        ▼
Check length > 100?
        │
        ├─ Yes: slice(-100) to keep last 100
        │
        └─ No: Keep all messages
```

### 3. Memoization

```typescript
// User color (cached by userId)
const userColor = useMemo(
  () => getUserColor(user.userId),
  [user.userId]
);

// Filtered user list
const otherUsers = useMemo(
  () => activeUsers.filter(u => u.userId !== currentUserId),
  [activeUsers, currentUserId]
);
```

## Error Handling

```
GraphQL Error
        │
        ▼
Catch in mutation/subscription callback
        │
        ├─ Log to console
        ├─ Show error notification (optional)
        └─ Update connection status
```

## Security Considerations

1. **Authentication:**
   - All GraphQL operations require authentication
   - User ID verified server-side
   - Session tokens in headers

2. **Authorization:**
   - Check user has access to graph
   - Validate graph ID exists
   - Rate limiting on mutations

3. **Input Validation:**
   - Sanitize chat messages
   - Validate cursor positions (reasonable bounds)
   - Limit message length

4. **WebSocket Security:**
   - Use WSS in production
   - Verify origin headers
   - Implement heartbeat/timeout

## Scalability

### Horizontal Scaling

```
Client 1 ──┐
           ├─> Load Balancer ──┐
Client 2 ──┘                   ├─> Server Instance 1 ──┐
                               │                       ├─> Redis Pub/Sub
Client 3 ──┐                   ├─> Server Instance 2 ──┤
           ├─> Load Balancer ──┘                       │
Client 4 ──┘                                           └─> Database
```

### Performance Metrics

- **Cursor Updates:** 10 Hz per user
- **Chat Messages:** As frequent as users send
- **User Join/Leave:** Infrequent (on mount/unmount)

**Example Load:**
- 10 concurrent users
- Cursor updates: 100 messages/sec
- Chat messages: ~1-10 messages/sec
- Total: ~110 events/sec

## Browser Compatibility

- **WebSocket:** All modern browsers
- **CSS Grid:** All modern browsers
- **Smooth Scroll:** All modern browsers (fallback to instant scroll)
- **Transitions:** All modern browsers

## Development vs Production

### Development
- WebSocket: `ws://localhost:4000/graphql`
- HTTP: `http://localhost:4000/graphql`
- No SSL required

### Production
- WebSocket: `wss://api.rabbithole.com/graphql`
- HTTP: `https://api.rabbithole.com/graphql`
- SSL required
- Load balancer with sticky sessions

---

**Architecture designed for:**
- Real-time collaboration
- Low latency (<100ms)
- Horizontal scalability
- Graceful degradation
- Security and privacy
