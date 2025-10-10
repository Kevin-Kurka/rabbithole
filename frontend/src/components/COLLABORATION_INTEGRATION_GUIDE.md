# Collaboration System Integration Guide

## Overview

The real-time collaboration system enables multiple users to work on the same knowledge graph simultaneously. It provides:

- **User Presence Tracking**: See who's online and active
- **Cursor Tracking**: View cursor positions of other users on the canvas
- **Real-Time Chat**: Communicate with collaborators
- **Auto-Join/Leave**: Automatic presence management on mount/unmount

## Architecture

### Components

1. **CollaborationPanel** (`/components/CollaborationPanel.tsx`)
   - Fixed right-side panel
   - Collapsible design
   - Tabs for Users and Chat
   - Active user list with colored avatars

2. **Chat** (`/components/Chat.tsx`)
   - Message list with auto-scroll
   - Send button and keyboard shortcuts
   - Username and timestamp display
   - Current user highlighting

3. **RemoteCursor** (`/components/RemoteCursor.tsx`)
   - SVG cursor rendering
   - Color-coded by user
   - Username tooltip
   - Smooth CSS transitions

4. **GraphCanvas** (`/components/GraphCanvas.tsx`)
   - Enhanced with cursor tracking
   - Mouse move event broadcasting
   - Remote cursor rendering overlay

### Hooks

**useCollaboration** (`/hooks/useCollaboration.ts`)

```typescript
interface UseCollaborationResult {
  activeUsers: ActiveUser[];
  sendChatMessage: (message: string) => Promise<void>;
  chatMessages: ChatMessage[];
  updateCursor: (x: number, y: number) => void;
  isConnected: boolean;
}

function useCollaboration(graphId: string): UseCollaborationResult
```

Features:
- Auto-joins graph on mount
- Auto-leaves on unmount
- Throttles cursor updates to 10/sec
- Manages max 100 chat messages in memory
- Subscribes to all real-time events

### GraphQL Operations

Located in `/graphql/queries/collaboration.ts`:

**Subscriptions:**
- `userJoined` - User joined the graph
- `userLeft` - User left the graph
- `cursorMoved` - Cursor position updated
- `chatMessage` - New chat message received

**Mutations:**
- `sendChatMessage` - Send a chat message
- `updatePresence` - Update cursor position or join/leave

**Queries:**
- `activeUsers` - Get current active users (optional)

## Integration Steps

### 1. Import Required Components and Hooks

```typescript
import GraphCanvas from '@/components/GraphCanvas';
import CollaborationPanel from '@/components/CollaborationPanel';
import { useCollaboration } from '@/hooks/useCollaboration';
```

### 2. Initialize Collaboration Hook

```typescript
export default function GraphPage() {
  const { data: session } = useSession();
  const [currentGraphId, setCurrentGraphId] = useState<string>('graph-123');

  // Initialize collaboration
  const { activeUsers, updateCursor, chatMessages, sendChatMessage } =
    useCollaboration(currentGraphId);

  const currentUserId = session?.user?.id;

  // ... rest of component
}
```

### 3. Pass Props to GraphCanvas

```typescript
<GraphCanvas
  graphId={currentGraphId}
  // ... other props
  activeUsers={activeUsers}
  onCursorMove={updateCursor}
/>
```

### 4. Add CollaborationPanel

```typescript
<CollaborationPanel
  graphId={currentGraphId}
  currentUserId={currentUserId}
/>
```

### Complete Example

```typescript
"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import GraphCanvas from '@/components/GraphCanvas';
import CollaborationPanel from '@/components/CollaborationPanel';
import { useCollaboration } from '@/hooks/useCollaboration';

export default function CollaborativeGraphEditor() {
  const { data: session } = useSession();
  const [graphId] = useState('example-graph-123');

  // Collaboration
  const { activeUsers, updateCursor } = useCollaboration(graphId);

  return (
    <div className="w-screen h-screen relative">
      {/* Graph Canvas with Collaboration */}
      <GraphCanvas
        graphId={graphId}
        activeUsers={activeUsers}
        onCursorMove={updateCursor}
        showMinimap={true}
        showControls={true}
        showBackground={true}
      />

      {/* Collaboration Panel */}
      <CollaborationPanel
        graphId={graphId}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
```

## Styling

### CollaborationPanel

The panel is styled with:
- Fixed positioning on right side
- Width: 360px (expanded), 60px (collapsed)
- Dark theme (gray-900 background)
- Z-index: 40 (below modals, above canvas)

### RemoteCursor

Cursors use:
- Absolute positioning
- Smooth CSS transitions (150ms ease-out)
- Drop shadow for visibility
- Z-index: 50 (above canvas elements)

### User Avatars

- Colored circles with initials
- Colors generated consistently from userId hash
- HSL color space for vibrant, accessible colors

## Performance Considerations

### Cursor Throttling

Cursor updates are throttled to maximum 10 per second (100ms):

```typescript
const CURSOR_THROTTLE_MS = 100;

// In useCollaboration hook
const updateCursor = useCallback((x: number, y: number) => {
  // Throttling logic
  if (now - lastUpdate >= CURSOR_THROTTLE_MS) {
    // Send immediately
  } else {
    // Schedule throttled update
  }
}, [graphId]);
```

### Chat Message Limit

Maximum 100 messages kept in memory:

```typescript
const MAX_CHAT_MESSAGES = 100;

setChatMessages((messages) => {
  const newMessages = [...messages, message];
  if (newMessages.length > MAX_CHAT_MESSAGES) {
    return newMessages.slice(-MAX_CHAT_MESSAGES);
  }
  return newMessages;
});
```

### Subscription Management

All subscriptions are properly cleaned up on unmount:

```typescript
useEffect(() => {
  // Join on mount
  joinGraph();

  return () => {
    // Leave on unmount
    leaveGraph();
  };
}, [graphId]);
```

## Type Definitions

### ActiveUser

```typescript
interface ActiveUser {
  userId: string;
  username: string;
  cursor: CursorPosition | null;
  color: string; // Generated from userId
  lastSeen: number;
}
```

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}
```

### CursorPosition

```typescript
interface CursorPosition {
  x: number;
  y: number;
}
```

## Backend Requirements

The backend must implement these GraphQL operations:

### Subscriptions

```graphql
subscription OnUserJoined($graphId: ID!) {
  userJoined(graphId: $graphId) {
    userId
    username
    action
  }
}

subscription OnUserLeft($graphId: ID!) {
  userLeft(graphId: $graphId) {
    userId
    username
    action
  }
}

subscription OnCursorMoved($graphId: ID!) {
  cursorMoved(graphId: $graphId) {
    userId
    username
    cursor { x y }
  }
}

subscription OnChatMessage($graphId: ID!) {
  chatMessage(graphId: $graphId) {
    id
    userId
    username
    message
    timestamp
  }
}
```

### Mutations

```graphql
mutation SendChatMessage($graphId: ID!, $message: String!) {
  sendChatMessage(graphId: $graphId, message: $message) {
    id
    message
    timestamp
  }
}

mutation UpdatePresence($graphId: ID!, $cursor: CursorInput) {
  updatePresence(graphId: $graphId, cursor: $cursor) {
    success
  }
}
```

## Troubleshooting

### Cursors Not Showing

1. Check WebSocket connection status in browser DevTools
2. Verify `activeUsers` array is populated
3. Ensure `onCursorMove` is passed to GraphCanvas
4. Check console for subscription errors

### Chat Messages Not Sending

1. Verify mutation is defined in backend
2. Check authentication headers
3. Look for errors in mutation response
4. Ensure `graphId` is valid

### Users Not Appearing in List

1. Check `userJoined` subscription is active
2. Verify backend publishes join events
3. Ensure user filtering logic is correct
4. Check `currentUserId` is set properly

### Performance Issues

1. Increase cursor throttle time if needed
2. Reduce max chat messages if memory is constrained
3. Consider pagination for user list (100+ users)
4. Monitor subscription event frequency

## Future Enhancements

- Typing indicators in chat
- User status (online/idle/away)
- @mentions in chat
- Collaborative selection (highlight selected nodes)
- Follow user mode (camera follows another user)
- Conflict resolution for simultaneous edits
- Chat history persistence
- File sharing in chat
- Voice/video call integration

## Files Modified/Created

### New Files
- `/src/components/CollaborationPanel.tsx`
- `/src/components/Chat.tsx`
- `/src/components/RemoteCursor.tsx`
- `/src/hooks/useCollaboration.ts`
- `/src/graphql/queries/collaboration.ts`
- `/src/types/collaboration.ts`

### Modified Files
- `/src/components/GraphCanvas.tsx` - Added cursor tracking and rendering
- `/src/types/graph.ts` - Added collaboration props to GraphCanvasProps
- `/src/app/graph/page.tsx` - Integrated collaboration components

## Testing Checklist

- [ ] Multiple users can join the same graph
- [ ] Cursors appear and move smoothly
- [ ] Chat messages send and receive correctly
- [ ] User list updates on join/leave
- [ ] Panel collapses/expands properly
- [ ] Colors are consistent for each user
- [ ] Auto-scroll works in chat
- [ ] Enter key sends messages
- [ ] Cursor throttling works (max 10/sec)
- [ ] Memory limit enforced (100 messages)
- [ ] Cleanup on unmount (no memory leaks)
- [ ] Connection status indicator accurate
