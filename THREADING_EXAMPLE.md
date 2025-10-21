# Threaded Comments - Visual Example

## User Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NODE: "Climate Evidence"                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 💬 Comments                                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ 👤 @alice • 5m ago                                                   │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ This evidence supports the hypothesis. @bob should review     │   │
│ │ the methodology section.                                       │   │
│ └───────────────────────────────────────────────────────────────┘   │
│ [Reply] 2 replies                                                    │
│                                                                       │
│     👤 @bob • 3m ago                                                 │
│     ┌─────────────────────────────────────────────────────────┐     │
│     │ @alice I agree, but we need more sources to validate   │     │
│     │ this claim. The sample size seems small.                │     │
│     └─────────────────────────────────────────────────────────┘     │
│     [Reply] 1 reply                                                  │
│                                                                       │
│         👤 @charlie • 1m ago                                         │
│         ┌───────────────────────────────────────────────────┐       │
│         │ I found additional sources @alice @bob! Check     │       │
│         │ the new evidence node I just added.               │       │
│         └───────────────────────────────────────────────────┘       │
│         [Reply]                                                      │
│                                                                       │
│     👤 @alice • 2m ago                                               │
│     ┌─────────────────────────────────────────────────────────┐     │
│     │ @bob Good point. I'll add more peer-reviewed papers.   │     │
│     └─────────────────────────────────────────────────────────┘     │
│     [Reply]                                                          │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Notification Flow

### Bob's Notification Feed (when Alice mentions him)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔔 Notifications                                [Mark all as read]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ 🔵 You were mentioned                                     • 1m ago   │
│    @charlie mentioned you in a comment                               │
│    "I found additional sources @alice @bob! Check..."                │
│                                                                       │
│ 🔵 New reply to your comment                              • 2m ago   │
│    @alice replied to your comment                                    │
│    "@bob Good point. I'll add more peer-reviewed..."                 │
│                                                                       │
│    You were mentioned                                     • 5m ago   │
│    @alice mentioned you in a comment                                 │
│    "This evidence supports the hypothesis. @bob should..."           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Representation

```sql
-- Top-level comment by Alice
INSERT INTO "Comments" (id, text, author_id, target_node_id, parent_comment_id)
VALUES (
  'comment-1',
  'This evidence supports the hypothesis. @bob should review...',
  'alice-uuid',
  'node-uuid',
  NULL  -- No parent (top-level)
);

-- Bob's reply to Alice
INSERT INTO "Comments" (id, text, author_id, target_node_id, parent_comment_id)
VALUES (
  'comment-2',
  '@alice I agree, but we need more sources to validate...',
  'bob-uuid',
  'node-uuid',
  'comment-1'  -- Parent is Alice's comment
);

-- Charlie's reply to Bob
INSERT INTO "Comments" (id, text, author_id, target_node_id, parent_comment_id)
VALUES (
  'comment-3',
  'I found additional sources @alice @bob! Check...',
  'charlie-uuid',
  'node-uuid',
  'comment-2'  -- Parent is Bob's comment
);

-- Alice's second reply to Bob (sibling of Charlie's comment)
INSERT INTO "Comments" (id, text, author_id, target_node_id, parent_comment_id)
VALUES (
  'comment-4',
  '@bob Good point. I will add more peer-reviewed papers.',
  'alice-uuid',
  'node-uuid',
  'comment-2'  -- Parent is Bob's comment (same as Charlie's)
);
```

## Notification Records Created

```sql
-- Notification 1: Alice mentions Bob (from comment-1)
INSERT INTO "Notifications" (user_id, type, title, message, entity_id, related_user_id)
VALUES (
  'bob-uuid',
  'mention',
  'You were mentioned',
  '@alice mentioned you in a comment',
  'node-uuid',
  'alice-uuid'
);

-- Notification 2: Bob replies to Alice (from comment-2)
INSERT INTO "Notifications" (user_id, type, title, message, entity_id, related_user_id)
VALUES (
  'alice-uuid',
  'reply',
  'New reply to your comment',
  '@bob replied to your comment',
  'node-uuid',
  'bob-uuid'
);

-- Notification 3: Charlie mentions Alice (from comment-3)
INSERT INTO "Notifications" (user_id, type, title, message, entity_id, related_user_id)
VALUES (
  'alice-uuid',
  'mention',
  'You were mentioned',
  '@charlie mentioned you in a comment',
  'node-uuid',
  'charlie-uuid'
);

-- Notification 4: Charlie mentions Bob (from comment-3)
INSERT INTO "Notifications" (user_id, type, title, message, entity_id, related_user_id)
VALUES (
  'bob-uuid',
  'mention',
  'You were mentioned',
  '@charlie mentioned you in a comment',
  'node-uuid',
  'charlie-uuid'
);

-- Notification 5: Charlie replies to Bob (from comment-3)
INSERT INTO "Notifications" (user_id, type, title, message, entity_id, related_user_id)
VALUES (
  'bob-uuid',
  'reply',
  'New reply to your comment',
  '@charlie replied to your comment',
  'node-uuid',
  'charlie-uuid'
);

-- Notification 6: Alice replies to Bob (from comment-4)
-- NOTE: Alice mentioned Bob, but she's also replying to him
-- Only ONE notification is sent (reply takes precedence over mention in same thread)
INSERT INTO "Notifications" (user_id, type, title, message, entity_id, related_user_id)
VALUES (
  'bob-uuid',
  'reply',
  'New reply to your comment',
  '@alice replied to your comment',
  'node-uuid',
  'alice-uuid'
);
```

## GraphQL Query Result

```json
{
  "data": {
    "getComments": [
      {
        "id": "comment-1",
        "text": "This evidence supports the hypothesis. @bob should review...",
        "author": { "username": "alice" },
        "createdAt": "2025-10-10T10:00:00Z",
        "parentCommentId": null,
        "replies": [
          {
            "id": "comment-2",
            "text": "@alice I agree, but we need more sources to validate...",
            "author": { "username": "bob" },
            "createdAt": "2025-10-10T10:02:00Z",
            "parentCommentId": "comment-1",
            "replies": [
              {
                "id": "comment-3",
                "text": "I found additional sources @alice @bob! Check...",
                "author": { "username": "charlie" },
                "createdAt": "2025-10-10T10:04:00Z",
                "parentCommentId": "comment-2"
              },
              {
                "id": "comment-4",
                "text": "@bob Good point. I will add more peer-reviewed papers.",
                "author": { "username": "alice" },
                "createdAt": "2025-10-10T10:03:00Z",
                "parentCommentId": "comment-2"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Real-time Event Flow

```
TIME: 10:00 AM
Alice types comment with @bob
    ↓
Backend: createComment mutation
    ↓
Backend: Parse "@bob" from text
    ↓
Backend: Lookup bob-uuid from username
    ↓
Backend: Create notification for Bob (type: mention)
    ↓
Backend: Publish to Redis → NOTIFICATION_CREATED_bob-uuid
    ↓
Backend: Publish to Redis → NEW_COMMENT
    ↓
WebSocket: Push notification to Bob's browser
    ↓
Bob's UI: Bell icon badge updates (1 → 2)
    ↓
All users viewing node: Comment appears in thread

---

TIME: 10:02 AM
Bob clicks "Reply" on Alice's comment
Bob types: "@alice I agree..."
    ↓
Backend: createComment with parent_comment_id = comment-1
    ↓
Backend: Parse "@alice" from text
    ↓
Backend: Detect reply to Alice's comment
    ↓
Backend: Create notification for Alice (type: reply)
    ↓
Backend: Skip duplicate mention notification (same thread)
    ↓
WebSocket: Push to Alice's browser
    ↓
Alice's UI: Bell icon updates, dropdown shows new reply

---

TIME: 10:04 AM
Charlie replies to Bob with "@alice @bob"
    ↓
Backend: Parse two mentions
    ↓
Backend: Create 3 notifications:
  1. Reply notification to Bob (parent comment author)
  2. Mention notification to Alice
  3. Mention notification to Bob (but Bob already gets reply, so merge)
    ↓
WebSocket: Push to both Alice and Bob
    ↓
Both users: Real-time notification + comment appears
```

## Component Hierarchy

```
<ThreadedComments targetId="node-uuid">
  │
  ├─ <CommentForm> (top-level)
  │   └─ <textarea> with @mention detection
  │
  └─ <CommentList>
      │
      ├─ <CommentItem comment={comment-1}>
      │   ├─ <Avatar username="alice" />
      │   ├─ <CommentText highlighted mentions />
      │   ├─ <ReplyButton onClick={showReplyForm} />
      │   │
      │   └─ <RepliesList>
      │       │
      │       ├─ <CommentItem comment={comment-2}>
      │       │   ├─ <Avatar username="bob" />
      │       │   ├─ <CommentText />
      │       │   │
      │       │   └─ <RepliesList>
      │       │       ├─ <CommentItem comment={comment-3} />
      │       │       └─ <CommentItem comment={comment-4} />
      │       │
      │       └─ [Conditional] <ReplyForm parentId={comment-2} />
      │
      └─ [More top-level comments...]
```

## State Management

### Frontend State (React):

```typescript
const [comments, setComments] = useState<Comment[]>([]);
const [replyingTo, setReplyingTo] = useState<string | null>(null);
const [replyText, setReplyText] = useState<{ [commentId: string]: string }>({});

// When user clicks "Reply" on comment-2
setReplyingTo('comment-2');
setReplyText({ 'comment-2': '@bob ' }); // Pre-fill mention

// When user submits reply
createComment({
  variables: {
    input: {
      targetId: 'node-uuid',
      text: replyText['comment-2'],
      parentCommentId: 'comment-2'
    }
  }
});

// Reset state after mutation
setReplyingTo(null);
setReplyText({});
```

### Apollo Cache Update:

```typescript
// Subscription handler
useSubscription(NEW_COMMENT_SUBSCRIPTION, {
  onData: ({ data }) => {
    const newComment = data.data?.newComment;

    // Refetch all comments to rebuild thread tree
    refetch();

    // Alternative: Optimistic update
    const existingComments = cache.readQuery({ query: GET_COMMENTS });
    cache.writeQuery({
      query: GET_COMMENTS,
      data: {
        getComments: [...existingComments.getComments, newComment]
      }
    });
  }
});
```

## Performance Considerations

### Indexes Created:
- `idx_comments_parent_id` - Fast thread traversal
- `idx_notifications_user_id` - Fast user notification lookup
- `idx_notifications_read` - Efficient unread filtering

### Query Optimization:
```sql
-- Fetch comments with single JOIN (avoid N+1)
SELECT c.*, u.id as author_id, u.username, u.email
FROM "Comments" c
JOIN "Users" u ON c.author_id = u.id
WHERE c.target_node_id = $1
ORDER BY c.created_at ASC;

-- Use field resolver for lazy-loading replies
-- Only fetches when client requests 'replies' field
```

### Subscription Efficiency:
- User-scoped channels prevent broadcast spam
- Only relevant users receive notifications
- No polling for notifications (pure WebSocket)
