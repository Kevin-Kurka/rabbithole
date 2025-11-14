#!/bin/bash
# Simple Activity System Test

API_URL="http://localhost:4000/graphql"

echo "========================================="
echo "Activity System Test"
echo "========================================="

# Step 1: Create test data
echo "1. Creating test user and node..."
USER_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -c "
  INSERT INTO public.\"Users\" (id, username, email, password_hash, created_at)
  VALUES (gen_random_uuid(), 'activitytester', 'activity@test.com', 'hash', NOW())
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id;
" | xargs)

GRAPH_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -c "
  INSERT INTO public.\"Graphs\" (id, name, description, is_level_0, created_by, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Test Graph', 'Test', false, '$USER_ID', NOW(), NOW())
  RETURNING id;
" | xargs)

NODE_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -c "
  INSERT INTO public.\"Nodes\" (id, graph_id, title, weight, props, is_level_0, created_at, updated_at, type_id)
  VALUES (gen_random_uuid(), '$GRAPH_ID', 'Test Node for Posts', 1.0, '{}'::jsonb, false, NOW(), NOW(), (SELECT id FROM public.\"NodeTypes\" LIMIT 1))
  RETURNING id;
" | xargs)

echo "User ID: $USER_ID"
echo "Node ID: $NODE_ID"
echo ""

# Step 2: Create a post
echo "2. Creating a post..."
CREATE_POST=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { id content author { username } replyCount shareCount reactionCounts totalReactionCount created_at } }",
    "variables": {
      "input": {
        "nodeId": "'"$NODE_ID"'",
        "content": "This is my first post about this node!"
      }
    }
  }')

echo "$CREATE_POST" | jq '.'
POST_ID=$(echo "$CREATE_POST" | jq -r '.data.createPost.id // empty')

if [ -z "$POST_ID" ]; then
  echo "ERROR: Failed to create post"
  exit 1
fi

echo "Created post: $POST_ID"
echo ""

# Step 3: React to the post
echo "3. Adding a 'like' reaction..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation ReactToPost($postId: ID!, $reactionType: String!) { reactToPost(postId: $postId, reactionType: $reactionType) }",
    "variables": {
      "postId": "'"$POST_ID"'",
      "reactionType": "like"
    }
  }' | jq '.'

echo ""

# Step 4: Create a reply
echo "4. Creating a reply..."
REPLY_RESULT=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation ReplyToPost($input: ReplyToPostInput!) { replyToPost(input: $input) { id content parent_post_id created_at } }",
    "variables": {
      "input": {
        "parentPostId": "'"$POST_ID"'",
        "content": "This is a reply!"
      }
    }
  }')

echo "$REPLY_RESULT" | jq '.'
echo ""

# Step 5: Get node activity
echo "5. Getting node activity feed..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "query GetNodeActivity($nodeId: ID!, $limit: Int) { getNodeActivity(nodeId: $nodeId, limit: $limit) { id content author { username } replyCount shareCount reactionCounts totalReactionCount userReactions created_at } }",
    "variables": {
      "nodeId": "'"$NODE_ID"'",
      "limit": 10
    }
  }' | jq '.'

echo ""

# Step 6: Get post replies
echo "6. Getting post replies..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "query GetPostReplies($postId: ID!, $limit: Int) { getPostReplies(postId: $postId, limit: $limit) { id content author { username } created_at } }",
    "variables": {
      "postId": "'"$POST_ID"'",
      "limit": 10
    }
  }' | jq '.'

echo ""

# Step 7: Share the post
echo "7. Sharing the post..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation SharePost($input: SharePostInput!) { sharePost(input: $input) { id content shared_post_id created_at } }",
    "variables": {
      "input": {
        "postId": "'"$POST_ID"'",
        "comment": "This is important!"
      }
    }
  }' | jq '.'

echo ""

# Step 8: Get updated post with counts
echo "8. Getting post with updated counts..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "query GetPost($postId: ID!) { getPost(postId: $postId) { id content replyCount shareCount reactionCounts totalReactionCount userReactions } }",
    "variables": {
      "postId": "'"$POST_ID"'"
    }
  }' | jq '.'

echo ""
echo "========================================="
echo "Test completed successfully!"
echo "========================================="
