# Real-Time Collaboration - Quick Start Guide

## Overview

The Rabbit Hole platform now supports real-time collaboration for knowledge graph editing. Multiple users can work on the same graph simultaneously with live cursor tracking, presence indicators, and integrated chat.

## Features

### User Presence
- See who's currently viewing the graph
- Active/idle status indicators
- Auto-join on mount, auto-leave on unmount
- Colored avatars with user initials

### Cursor Tracking
- Real-time cursor positions for all active users
- Color-coded cursors matching user avatars
- Username labels on hover
- Smooth animations with CSS transitions
- Throttled to 10 updates/second for performance

### Integrated Chat
- Real-time messaging between collaborators
- Auto-scroll to latest messages
- Timestamp display (relative for today)
- Keyboard shortcuts (Enter to send)
- Maximum 100 messages in memory

### Collapsible Panel
- Fixed right-side panel (360px expanded, 60px collapsed)
- Tabs for Users and Chat
- Connection status indicator
- Unread message notifications

## Quick Integration

### 1. Basic Setup

```typescript
import { useCollaboration } from '@/hooks/useCollaboration';
import CollaborationPanel from '@/components/CollaborationPanel';
import GraphCanvas from '@/components/GraphCanvas';

function MyGraphPage() {
  const graphId = 'my-graph-id';
  const currentUserId = 'current-user-id';

  // Initialize collaboration
  const { activeUsers, updateCursor } = useCollaboration(graphId);

  return (
    <div className="relative w-screen h-screen">
      <GraphCanvas
        graphId={graphId}
        activeUsers={activeUsers}
        onCursorMove={updateCursor}
      />
      <CollaborationPanel
        graphId={graphId}
        currentUserId={currentUserId}
      />
    </div>
  );
}
```

### 2. With Authentication

```typescript
import { useSession } from 'next-auth/react';

function AuthenticatedGraphPage() {
  const { data: session } = useSession();
  const graphId = 'my-graph-id';

  const { activeUsers, updateCursor } = useCollaboration(graphId);

  return (
    <div className="relative w-screen h-screen">
      <GraphCanvas
        graphId={graphId}
        activeUsers={activeUsers}
        onCursorMove={updateCursor}
      />
      <CollaborationPanel
        graphId={graphId}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
```

## Component API

### CollaborationPanel

```typescript
interface CollaborationPanelProps {
  graphId: string;           // Graph ID for collaboration
  currentUserId?: string;    // Current user's ID (optional)
  className?: string;        // Additional CSS classes
}
```

**Example:**

```tsx
<CollaborationPanel
  graphId="graph-123"
  currentUserId="user-456"
  className="custom-panel"
/>
```

### useCollaboration Hook

```typescript
interface UseCollaborationResult {
  activeUsers: ActiveUser[];                      // List of active users
  sendChatMessage: (message: string) => Promise<void>;  // Send chat message
  chatMessages: ChatMessage[];                    // Chat message history
  updateCursor: (x: number, y: number) => void;   // Update cursor position
  isConnected: boolean;                           // Connection status
}

function useCollaboration(graphId: string): UseCollaborationResult;
```

**Example:**

```typescript
const {
  activeUsers,
  sendChatMessage,
  chatMessages,
  updateCursor,
  isConnected
} = useCollaboration('my-graph-id');

// Send a message
await sendChatMessage('Hello, collaborators!');

// Update cursor position
updateCursor(100, 200);

// Check connection
if (isConnected) {
  console.log('Connected to collaboration server');
}
```

### GraphCanvas (Updated)

Added collaboration props:

```typescript
interface GraphCanvasProps {
  // ... existing props
  activeUsers?: ActiveUser[];                   // Active users for cursor rendering
  onCursorMove?: (x: number, y: number) => void;  // Cursor move callback
}
```

**Example:**

```tsx
<GraphCanvas
  graphId="graph-123"
  activeUsers={activeUsers}
  onCursorMove={updateCursor}
  // ... other props
/>
```

## Types

### ActiveUser

```typescript
interface ActiveUser {
  userId: string;          // Unique user ID
  username: string;        // Display name
  cursor: {                // Cursor position (null if idle)
    x: number;
    y: number;
  } | null;
  color: string;           // User's assigned color (HSL)
  lastSeen: number;        // Last activity timestamp
}
```

### ChatMessage

```typescript
interface ChatMessage {
  id: string;              // Unique message ID
  userId: string;          // Sender's user ID
  username: string;        // Sender's display name
  message: string;         // Message content
  timestamp: number;       // Unix timestamp (ms)
}
```

## Styling

### Theme Integration

The collaboration components use the application's dark theme:

```typescript
// Colors
- Background: gray-900
- Panel background: gray-950
- Border: gray-800
- Text primary: white
- Text secondary: gray-400
- Text tertiary: gray-500

// User colors (auto-generated)
- HSL color space
- Saturation: 70%
- Lightness: 50%
```

### Customization

Override styles with className:

```tsx
<CollaborationPanel
  graphId="graph-123"
  currentUserId="user-456"
  className="custom-collaboration-panel"
/>
```

Custom CSS:

```css
.custom-collaboration-panel {
  /* Override default styles */
  width: 400px;
}

.custom-collaboration-panel .user-avatar {
  /* Customize avatars */
  border-radius: 4px;
}
```

## Performance

### Cursor Throttling

Cursor updates are throttled to **10 per second** (100ms interval):

```typescript
// Automatic in useCollaboration hook
updateCursor(x, y); // Throttled to 100ms
```

### Message Limits

Maximum **100 chat messages** kept in memory:

```typescript
// Oldest messages are removed when limit is exceeded
const MAX_CHAT_MESSAGES = 100;
```

### Subscription Cleanup

All subscriptions are automatically cleaned up on unmount:

```typescript
useEffect(() => {
  // Auto-join on mount
  return () => {
    // Auto-leave on unmount
  };
}, [graphId]);
```

## Backend Requirements

### GraphQL Schema

The backend must implement these operations:

**Subscriptions:**

```graphql
subscription userJoined($graphId: ID!)
subscription userLeft($graphId: ID!)
subscription cursorMoved($graphId: ID!)
subscription chatMessage($graphId: ID!)
```

**Mutations:**

```graphql
mutation sendChatMessage($graphId: ID!, $message: String!)
mutation updatePresence($graphId: ID!, $cursor: CursorInput)
```

**Types:**

```graphql
type PresenceUpdate {
  userId: ID!
  username: String!
  action: String!
}

type CursorUpdate {
  userId: ID!
  username: String!
  cursor: Cursor
}

type Cursor {
  x: Float!
  y: Float!
}

type ChatMessage {
  id: ID!
  userId: ID!
  username: String!
  message: String!
  timestamp: Float!
}
```

See `/src/graphql/queries/collaboration.ts` for complete schema.

## Troubleshooting

### Cursors Not Showing

**Problem:** Remote cursors are not visible on canvas

**Solutions:**
1. Check WebSocket connection: Open DevTools Network tab, filter by WS
2. Verify `activeUsers` array: `console.log(activeUsers)`
3. Ensure `onCursorMove` is passed to GraphCanvas
4. Check for subscription errors in console

### Chat Not Working

**Problem:** Messages not sending or receiving

**Solutions:**
1. Verify backend mutation is implemented correctly
2. Check authentication headers in network requests
3. Look for GraphQL errors in response
4. Ensure `graphId` is valid and user has access

### Panel Not Collapsing

**Problem:** CollaborationPanel won't collapse/expand

**Solutions:**
1. Check z-index conflicts with other UI elements
2. Verify no CSS overrides on the panel
3. Look for JavaScript errors in console
4. Ensure button click handlers are not blocked

### User List Empty

**Problem:** No users appear in the list

**Solutions:**
1. Check `userJoined` subscription is active
2. Verify backend publishes join events on connection
3. Ensure user filtering logic is correct
4. Check that `currentUserId` is set (for "You" section)

## Examples

### Complete Integration Example

See `/src/app/graph/page.tsx` for a complete working example.

### Custom Hook Usage

```typescript
function MyComponent() {
  const graphId = 'example-graph';
  const {
    activeUsers,
    sendChatMessage,
    chatMessages,
    updateCursor,
    isConnected
  } = useCollaboration(graphId);

  // Handle chat submit
  const handleSubmit = async (text: string) => {
    try {
      await sendChatMessage(text);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Show connection status
  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Active Users: {activeUsers.length}</div>
      <div>Messages: {chatMessages.length}</div>
    </div>
  );
}
```

### Cursor Tracking on Custom Canvas

```typescript
function CustomCanvas() {
  const { activeUsers, updateCursor } = useCollaboration('my-graph');

  const handleMouseMove = (e: MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    updateCursor(x, y);
  };

  return (
    <div onMouseMove={handleMouseMove}>
      {/* Render remote cursors */}
      {activeUsers.map(user => (
        <RemoteCursor key={user.userId} user={user} />
      ))}
    </div>
  );
}
```

## Next Steps

1. Review the [Integration Guide](./src/components/COLLABORATION_INTEGRATION_GUIDE.md)
2. Check backend WebSocket implementation
3. Test with multiple browser windows
4. Monitor performance metrics
5. Configure user authentication

## Support

For issues or questions:
1. Check the integration guide
2. Review the component source code
3. Test with the example in `/src/app/graph/page.tsx`
4. Check browser console for errors
5. Verify GraphQL subscriptions in Network tab
