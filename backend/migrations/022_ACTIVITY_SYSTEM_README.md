# Activity System (Twitter-like Posts)

## Overview

This migration creates a comprehensive Twitter-like activity system for node-based social interactions. Users can:
- Post content about nodes
- Reply to posts (threaded conversations)
- Share/repost posts
- React to posts (like, love, laugh, etc.)
- Mention other nodes in posts
- Attach evidence files to posts

## Database Schema

### ActivityPosts Table

```sql
CREATE TABLE public."ActivityPosts" (
    id UUID PRIMARY KEY,
    node_id UUID NOT NULL,              -- What node this post is about
    author_id UUID NOT NULL,            -- Post author
    content TEXT NOT NULL,              -- Post content
    mentioned_node_ids UUID[],          -- Array of mentioned node IDs
    attachment_ids UUID[],              -- Array of EvidenceFile IDs
    is_reply BOOLEAN DEFAULT FALSE,
    parent_post_id UUID,                -- Reference to parent if reply
    is_share BOOLEAN DEFAULT FALSE,
    shared_post_id UUID,                -- Reference to original post if share
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP                -- Soft delete
);
```

### ActivityReactions Table

```sql
CREATE TABLE public."ActivityReactions" (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction_type VARCHAR(50),          -- 'like', 'love', 'laugh', etc.
    created_at TIMESTAMP,
    UNIQUE(post_id, user_id, reaction_type)
);
```

## GraphQL API

### Queries

#### getNodeActivity
Get activity feed for a specific node (paginated)

```graphql
query GetNodeActivity($nodeId: ID!, $limit: Int, $offset: Int) {
  getNodeActivity(nodeId: $nodeId, limit: $limit, offset: $offset) {
    id
    content
    author {
      id
      username
    }
    node {
      id
      title
    }
    replyCount
    shareCount
    reactionCounts  # JSON: {"like": 5, "love": 2}
    totalReactionCount
    userReactions   # Array of current user's reactions
    created_at
  }
}
```

#### getPost
Get a single post with full details

```graphql
query GetPost($postId: ID!) {
  getPost(postId: $postId) {
    id
    content
    author {
      id
      username
    }
    attachments {
      id
      original_filename
      cdn_url
    }
    mentionedNodes {
      id
      title
    }
    parentPost {
      id
      content
      author {
        username
      }
    }
    sharedPost {
      id
      content
    }
    replyCount
    shareCount
    reactionCounts
    created_at
  }
}
```

#### getPostReplies
Get all replies to a post

```graphql
query GetPostReplies($postId: ID!, $limit: Int) {
  getPostReplies(postId: $postId, limit: $limit) {
    id
    content
    author {
      id
      username
    }
    replyCount
    reactionCounts
    created_at
  }
}
```

#### getUserFeed
Get personalized activity feed for a user

```graphql
query GetUserFeed($userId: ID, $limit: Int, $offset: Int) {
  getUserFeed(userId: $userId, limit: $limit, offset: $offset) {
    id
    content
    author {
      username
    }
    node {
      title
    }
    replyCount
    shareCount
    reactionCounts
    created_at
  }
}
```

### Mutations

#### createPost
Create a new post about a node

```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    content
    created_at
  }
}

# Input:
{
  "input": {
    "nodeId": "uuid",
    "content": "This is my post about this node!",
    "mentionedNodeIds": ["uuid1", "uuid2"],
    "attachmentIds": ["file-uuid"]
  }
}
```

#### replyToPost
Reply to an existing post

```graphql
mutation ReplyToPost($input: ReplyToPostInput!) {
  replyToPost(input: $input) {
    id
    content
    parent_post_id
    created_at
  }
}

# Input:
{
  "input": {
    "parentPostId": "uuid",
    "content": "Great point!",
    "mentionedNodeIds": []
  }
}
```

#### sharePost
Share/repost an existing post

```graphql
mutation SharePost($input: SharePostInput!) {
  sharePost(input: $input) {
    id
    shared_post_id
    content  # Optional comment when sharing
    created_at
  }
}

# Input:
{
  "input": {
    "postId": "uuid",
    "comment": "This is important!"
  }
}
```

#### reactToPost
Add a reaction to a post

```graphql
mutation ReactToPost($postId: ID!, $reactionType: String!) {
  reactToPost(postId: $postId, reactionType: $reactionType)
}

# Example:
{
  "postId": "uuid",
  "reactionType": "like"  # or "love", "laugh", "wow", "sad", "angry"
}
```

#### removeReaction
Remove a reaction from a post

```graphql
mutation RemoveReaction($postId: ID!, $reactionType: String!) {
  removeReaction(postId: $postId, reactionType: $reactionType)
}
```

#### deletePost
Soft delete a post (only author can delete)

```graphql
mutation DeletePost($postId: ID!) {
  deletePost(postId: $postId)
}
```

## Features

### 1. Node-Based Posts
Every post is associated with a node, creating activity streams for each node in the knowledge graph.

### 2. Threaded Replies
Posts can be replies to other posts, creating conversation threads. Replies inherit the node_id from their parent.

### 3. Share/Repost
Users can share posts with optional comments, similar to retweets.

### 4. Multiple Reaction Types
Support for various reaction types beyond simple likes:
- like
- love
- laugh
- wow
- sad
- angry
- (custom types can be added)

### 5. Mentions
Posts can mention other nodes using the `mentioned_node_ids` array.

### 6. File Attachments
Posts can include attachments from the EvidenceFiles system.

### 7. Soft Deletes
Posts are soft-deleted to maintain referential integrity for replies and shares.

### 8. Performance Optimizations
- GIN indexes for array searches (mentions)
- Composite indexes for timeline queries
- Database functions for efficient count aggregations
- Proper foreign key indexes

## Database Functions

### get_reply_count(post_uuid UUID)
Returns the number of replies to a post.

### get_share_count(post_uuid UUID)
Returns the number of shares/reposts.

### get_reaction_counts(post_uuid UUID)
Returns JSONB object with reaction counts by type:
```json
{
  "like": 15,
  "love": 5,
  "laugh": 2
}
```

### user_has_reacted(post_uuid UUID, user_uuid UUID, reaction VARCHAR)
Checks if a specific user has reacted with a given type.

## Security & Authorization

- All mutations require authentication (`userId` in context)
- Users can only delete their own posts
- Validation ensures:
  - Referenced nodes exist
  - Referenced files exist
  - Parent posts exist (for replies)
  - Original posts exist (for shares)
  - Posts cannot be both replies and shares

## Performance Considerations

### Indexes Created
```sql
-- Activity Posts
idx_activity_posts_node_id           -- Node timeline queries
idx_activity_posts_author_id         -- User's posts
idx_activity_posts_parent_id         -- Finding replies
idx_activity_posts_shared_id         -- Finding shares
idx_activity_posts_created_at        -- Chronological ordering
idx_activity_posts_mentioned_nodes   -- GIN index for mentions
idx_activity_posts_node_timeline     -- Composite for node feeds

-- Activity Reactions
idx_activity_reactions_post_id       -- Post reactions
idx_activity_reactions_user_id       -- User's reactions
idx_activity_reactions_type          -- Filter by reaction type
idx_activity_reactions_post_type     -- Aggregation queries
```

### Query Optimization Tips

1. **Pagination**: Always use `LIMIT` and `OFFSET` for large datasets
2. **Eager Loading**: Join users, nodes, and counts in single query
3. **Caching**: Consider caching popular posts and reaction counts
4. **Aggregations**: Use database functions instead of application-level counting

## Example Usage Patterns

### Display Node Activity Feed
```typescript
const { data } = await apolloClient.query({
  query: GET_NODE_ACTIVITY,
  variables: {
    nodeId: node.id,
    limit: 20,
    offset: 0
  }
});

// Display posts with replies, shares, and reactions
data.getNodeActivity.forEach(post => {
  console.log(`${post.author.username}: ${post.content}`);
  console.log(`Replies: ${post.replyCount}, Shares: ${post.shareCount}`);

  const reactions = JSON.parse(post.reactionCounts);
  console.log(`Reactions:`, reactions);
});
```

### Create Interactive Post
```typescript
const { data } = await apolloClient.mutate({
  mutation: CREATE_POST,
  variables: {
    input: {
      nodeId: currentNode.id,
      content: "Check out these related nodes!",
      mentionedNodeIds: [relatedNode1.id, relatedNode2.id],
      attachmentIds: [evidenceFile.id]
    }
  }
});
```

### Handle Reactions
```typescript
// Toggle like
const hasLiked = post.userReactions?.includes('like');

if (hasLiked) {
  await apolloClient.mutate({
    mutation: REMOVE_REACTION,
    variables: { postId: post.id, reactionType: 'like' }
  });
} else {
  await apolloClient.mutate({
    mutation: REACT_TO_POST,
    variables: { postId: post.id, reactionType: 'like' }
  });
}
```

## Installation

```bash
# Run the migration
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < migrations/022_activity_system.sql

# Restart backend to load new resolvers
docker-compose restart api
```

## Testing

```sql
-- Test post creation
INSERT INTO public."ActivityPosts" (node_id, author_id, content)
SELECT n.id, u.id, 'Test post about ' || n.title
FROM public."Nodes" n, public."Users" u
LIMIT 1;

-- Test reply
INSERT INTO public."ActivityPosts" (node_id, author_id, content, is_reply, parent_post_id)
SELECT node_id, author_id, 'Reply to test post', TRUE, id
FROM public."ActivityPosts"
WHERE is_reply = FALSE
LIMIT 1;

-- Test reaction
INSERT INTO public."ActivityReactions" (post_id, user_id, reaction_type)
SELECT id, (SELECT id FROM public."Users" LIMIT 1), 'like'
FROM public."ActivityPosts"
LIMIT 1;

-- Query node activity
SELECT
  p.*,
  get_reply_count(p.id) as replies,
  get_share_count(p.id) as shares,
  get_reaction_counts(p.id) as reactions
FROM public."ActivityPosts" p
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC;
```

## Future Enhancements

1. **Notifications**: Integrate with notification system for mentions, replies, reactions
2. **Trending Posts**: Add algorithm to surface popular posts
3. **Hashtags**: Parse and index hashtags from content
4. **Media Previews**: Generate previews for linked content
5. **Edit History**: Track post edits with versioning
6. **Pinned Posts**: Allow pinning important posts to node
7. **Post Analytics**: Track views, engagement metrics
8. **Content Moderation**: Add reporting and moderation features
9. **Search**: Full-text search across post content
10. **Real-time Updates**: Add subscriptions for live post updates

## Related Systems

- **Evidence Files**: Used for post attachments
- **Nodes**: Central entity for all posts
- **Users**: Post authors and reactors
- **Notifications**: (Future) Notify users of interactions
- **Collaboration**: May integrate with existing activity tracking

## License

Part of Project Rabbit Hole - See main LICENSE file
