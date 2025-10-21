# Threaded Comments & Notifications - API Reference

## Quick Start

### Using ThreadedComments Component

```tsx
import ThreadedComments from '@/components/ThreadedComments';

// In your node/edge detail page
<ThreadedComments
  targetId={nodeId}           // Node or Edge UUID
  currentUserId={user?.id}    // Optional: for highlighting own comments
/>
```

### Using NotificationBell Component

```tsx
import NotificationBell from '@/components/NotificationBell';

// In your navigation/header
<NotificationBell />
```

The NotificationBell automatically:
- Fetches notifications for current user
- Subscribes to real-time updates
- Shows unread count badge
- Handles mark as read

## GraphQL API

### Queries

#### Get Comments for a Node/Edge

```graphql
query GetComments($targetId: ID!) {
  getComments(targetId: $targetId) {
    id
    text
    parentCommentId
    createdAt
    updatedAt
    author {
      id
      username
    }
    targetNodeId
    targetEdgeId
    replies {
      id
      text
      author { username }
      createdAt
    }
  }
}
```

**Variables:**
```json
{
  "targetId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Get User Notifications

```graphql
query GetNotifications($limit: Int!, $offset: Int!, $unreadOnly: Boolean!) {
  getNotifications(limit: $limit, offset: $offset, unreadOnly: $unreadOnly) {
    id
    type
    title
    message
    read
    entityType
    entityId
    createdAt
    relatedUser {
      id
      username
    }
    metadata
  }
}
```

**Variables:**
```json
{
  "limit": 20,
  "offset": 0,
  "unreadOnly": false
}
```

#### Get Unread Count

```graphql
query GetUnreadNotificationCount {
  getUnreadNotificationCount
}
```

**Response:**
```json
{
  "data": {
    "getUnreadNotificationCount": 5
  }
}
```

### Mutations

#### Create a Comment

```graphql
mutation CreateComment($input: CommentInput!) {
  createComment(input: $input) {
    id
    text
    parentCommentId
    createdAt
    author {
      id
      username
    }
  }
}
```

**Variables (top-level comment):**
```json
{
  "input": {
    "targetId": "550e8400-e29b-41d4-a716-446655440000",
    "text": "This is a great insight! @alice what do you think?"
  }
}
```

**Variables (reply to comment):**
```json
{
  "input": {
    "targetId": "550e8400-e29b-41d4-a716-446655440000",
    "text": "@bob I completely agree with your analysis",
    "parentCommentId": "parent-comment-uuid"
  }
}
```

#### Mark Notification as Read

```graphql
mutation MarkNotificationAsRead($notificationId: ID!) {
  markNotificationAsRead(notificationId: $notificationId) {
    id
    read
  }
}
```

**Variables:**
```json
{
  "notificationId": "notification-uuid"
}
```

#### Mark All Notifications as Read

```graphql
mutation MarkAllNotificationsAsRead {
  markAllNotificationsAsRead
}
```

**Response:**
```json
{
  "data": {
    "markAllNotificationsAsRead": 12
  }
}
```

### Subscriptions

#### Subscribe to New Comments

```graphql
subscription OnNewComment {
  newComment {
    id
    text
    parentCommentId
    targetNodeId
    targetEdgeId
    createdAt
    author {
      id
      username
    }
  }
}
```

**Usage:**
```typescript
const { data } = useSubscription(NEW_COMMENT_SUBSCRIPTION, {
  onData: ({ data }) => {
    const newComment = data.data?.newComment;
    // Filter by targetId to update relevant UI
    if (newComment?.targetNodeId === currentNodeId) {
      refetchComments();
    }
  }
});
```

#### Subscribe to Notifications

```graphql
subscription OnNotificationCreated {
  notificationCreated {
    id
    type
    title
    message
    read
    entityType
    entityId
    createdAt
    relatedUser {
      id
      username
    }
  }
}
```

**Usage:**
```typescript
useSubscription(NOTIFICATION_SUBSCRIPTION, {
  onData: ({ data }) => {
    const notification = data.data?.notificationCreated;
    // Update notification count
    refetchUnreadCount();
    // Optionally show toast
    toast.info(notification.title);
  }
});
```

## Backend Service API

### NotificationService

#### Import

```typescript
import { NotificationService } from './services/NotificationService';
```

#### Usage in Resolver

```typescript
@Mutation(() => SomeType)
async someAction(
  @Ctx() { notificationService }: { notificationService: NotificationService }
) {
  // Create a notification
  await notificationService.createNotification(userId, {
    type: 'custom_action',
    title: 'Action Completed',
    message: 'Your action was successful',
    entityType: 'node',
    entityId: nodeId,
    relatedUserId: actorUserId,
    metadata: { additionalData: 'value' }
  });
}
```

#### Methods

##### createNotification()

```typescript
await notificationService.createNotification(
  userId: string,
  data: {
    type: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
    relatedUserId?: string,
    metadata?: any
  }
): Promise<Notification>
```

##### createBulkNotifications()

```typescript
await notificationService.createBulkNotifications(
  userIds: string[],
  data: NotificationData
): Promise<Notification[]>
```

##### notifyMentionedUsers()

```typescript
await notificationService.notifyMentionedUsers(
  commentText: string,
  mentionedUserIds: string[],
  commentAuthorId: string,
  commentAuthorUsername: string,
  entityType: 'node' | 'edge',
  entityId: string
): Promise<void>
```

##### parseMentions()

```typescript
const mentions = notificationService.parseMentions(
  text: string
): string[]  // Returns array of usernames (without @)

// Example:
parseMentions("Hey @alice and @bob, check this out!")
// Returns: ["alice", "bob"]
```

##### getUserIdsByUsernames()

```typescript
const userIds = await notificationService.getUserIdsByUsernames(
  usernames: string[]
): Promise<string[]>
```

##### getUnreadCount()

```typescript
const count = await notificationService.getUnreadCount(
  userId: string
): Promise<number>
```

## Database Schema Reference

### Comments Table

```sql
CREATE TABLE public."Comments" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    author_id uuid NOT NULL REFERENCES public."Users"(id),
    target_node_id uuid REFERENCES public."Nodes"(id),
    target_edge_id uuid REFERENCES public."Edges"(id),
    parent_comment_id uuid REFERENCES public."Comments"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT either_node_or_edge_comment
        CHECK (target_node_id IS NOT NULL OR target_edge_id IS NOT NULL)
);
```

### Notifications Table

```sql
CREATE TABLE public."Notifications" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public."Users"(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    entity_type TEXT,
    entity_id uuid,
    related_user_id uuid REFERENCES public."Users"(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_comments_parent_id ON public."Comments" (parent_comment_id);
CREATE INDEX idx_notifications_user_id ON public."Notifications" (user_id);
CREATE INDEX idx_notifications_read ON public."Notifications" (user_id, read);
CREATE INDEX idx_notifications_created_at ON public."Notifications" (created_at DESC);
```

## Notification Types

| Type | Trigger | Recipient | Title |
|------|---------|-----------|-------|
| `mention` | User mentioned in comment | Mentioned user | "You were mentioned" |
| `reply` | Reply to user's comment | Parent comment author | "New reply to your comment" |

### Custom Notification Types

Add custom types by calling `createNotification()`:

```typescript
// Example: Node verification
await notificationService.createNotification(nodeAuthorId, {
  type: 'node_verified',
  title: 'Node Verified',
  message: 'Your node has been verified by a curator',
  entityType: 'node',
  entityId: nodeId,
  relatedUserId: curatorId,
  metadata: {
    veracity: 0.95,
    curatorNotes: 'Excellent sources'
  }
});
```

## Error Handling

### Common Errors

#### Target Entity Not Found

```typescript
// Throws error if targetId is not a valid node or edge
try {
  await createComment({
    variables: {
      input: { targetId: 'invalid-uuid', text: 'Test' }
    }
  });
} catch (error) {
  // Error: "Target entity not found"
}
```

#### User Not Found for @Mention

```typescript
// Silent failure - notification not created for invalid usernames
// Only valid users receive notifications
parseMentions("@validuser @invaliduser")
// Only creates notification for @validuser
```

## Best Practices

### 1. Always Parse Mentions

```typescript
// DO: Let NotificationService handle mentions
const mentions = notificationService.parseMentions(commentText);
const userIds = await notificationService.getUserIdsByUsernames(mentions);
await notificationService.notifyMentionedUsers(...);

// DON'T: Manually parse and send notifications
// This misses deduplication, validation, etc.
```

### 2. Use Field Resolvers for Lazy Loading

```typescript
// DO: Use field resolver for replies
@FieldResolver(() => [Comment])
async replies(@Root() comment: Comment) {
  return fetchReplies(comment.id);
}

// DON'T: Fetch all replies upfront
// This creates N+1 queries and loads unnecessary data
```

### 3. Subscription Filtering

```typescript
// DO: Filter subscription data on client
useSubscription(NEW_COMMENT_SUBSCRIPTION, {
  onData: ({ data }) => {
    if (data.data?.newComment.targetNodeId === currentNodeId) {
      refetch();
    }
  }
});

// DON'T: Subscribe to everything without filtering
// This causes unnecessary re-renders
```

### 4. Optimistic UI Updates

```typescript
// DO: Show comment immediately, rollback on error
const [createComment] = useMutation(CREATE_COMMENT, {
  optimisticResponse: {
    createComment: {
      __typename: 'Comment',
      id: 'temp-id',
      text: newCommentText,
      author: currentUser,
      createdAt: new Date().toISOString()
    }
  }
});

// DON'T: Wait for server response before showing comment
```

### 5. Notification Deduplication

```typescript
// DO: Check for existing notifications before creating
if (parentCommentAuthorId === replyAuthorId) {
  return; // Don't notify self
}

// DON'T: Send duplicate notifications
// Users get annoyed by notification spam
```

## Testing

### Unit Test Example

```typescript
import { NotificationService } from './NotificationService';

describe('NotificationService', () => {
  it('should parse mentions correctly', () => {
    const service = new NotificationService(mockPool, mockPubSub);
    const mentions = service.parseMentions(
      'Hey @alice and @bob, check @charlie too!'
    );
    expect(mentions).toEqual(['alice', 'bob', 'charlie']);
  });

  it('should deduplicate mentions', () => {
    const service = new NotificationService(mockPool, mockPubSub);
    const mentions = service.parseMentions('@alice @alice @bob @alice');
    expect(mentions).toEqual(['alice', 'bob']);
  });
});
```

### Integration Test Example

```typescript
describe('Comment Mutations', () => {
  it('should create notification when user is mentioned', async () => {
    const comment = await createComment({
      targetId: testNodeId,
      text: '@testuser please review'
    });

    const notifications = await getNotifications(testUserId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('mention');
  });
});
```

## Troubleshooting

### Notifications Not Appearing

1. Check WebSocket connection:
```typescript
// In browser console
console.log(apolloClient.wsLink.subscriptionClient.status);
// Should be "connected"
```

2. Verify subscription is active:
```typescript
const { data, loading, error } = useSubscription(NOTIFICATION_SUBSCRIPTION);
console.log({ data, loading, error });
```

3. Check Redis pub/sub:
```bash
# In Redis container
redis-cli
PSUBSCRIBE NOTIFICATION_CREATED_*
# Should show published messages
```

### Comments Not Threading

1. Verify `parent_comment_id` is set:
```sql
SELECT id, text, parent_comment_id FROM "Comments" WHERE id = 'comment-uuid';
```

2. Check field resolver is being called:
```typescript
// Add logging
@FieldResolver(() => [Comment])
async replies(@Root() comment: Comment) {
  console.log('Loading replies for:', comment.id);
  return fetchReplies(comment.id);
}
```

### @Mentions Not Working

1. Check regex pattern:
```typescript
const text = "Test @username here";
const matches = text.match(/@(\w+)/g);
console.log(matches); // Should be ["@username"]
```

2. Verify user exists:
```sql
SELECT id, username FROM "Users" WHERE username = 'username';
```

## Migration Checklist

- [ ] Apply database migration: `013_threaded_comments_notifications.sql`
- [ ] Restart backend server
- [ ] Verify NotificationService in context
- [ ] Test comment creation
- [ ] Test @mention parsing
- [ ] Test notification creation
- [ ] Test WebSocket subscriptions
- [ ] Test notification bell UI
- [ ] Test threaded comment UI
- [ ] Monitor Redis pub/sub logs
- [ ] Check database indexes

## Support

For issues or questions:
1. Check error logs: `docker logs rabbithole-api-1`
2. Review database schema: `\d "Comments"` in psql
3. Verify GraphQL schema: Visit `/graphql` playground
4. Test with GraphQL playground before implementing in UI
