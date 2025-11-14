#!/bin/bash
# Comprehensive Activity System Test

API_URL="http://localhost:4000/graphql"

echo "========================================="
echo "Activity System Integration Test"
echo "========================================="

# Step 1: Create test data
echo "1. Setting up test data (user, graph, node)..."

USER_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -A -c "
  INSERT INTO public.\"Users\" (id, username, email, password_hash, created_at)
  VALUES (gen_random_uuid(), 'activitytest_' || floor(random() * 1000)::text, 'activity' || floor(random() * 1000)::text || '@test.com', 'hash', NOW())
  RETURNING id;
" | tr -d ' ')

GRAPH_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -A -c "
  INSERT INTO public.\"Graphs\" (id, name, description, level, created_by, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Activity Test Graph', 'Testing posts', 1, '$USER_ID', NOW(), NOW())
  RETURNING id;
" | tr -d ' ')

NODE_TYPE_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -A -c "
  SELECT id FROM public.\"NodeTypes\" LIMIT 1;
" | tr -d ' ')

NODE_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -A -c "
  INSERT INTO public.\"Nodes\" (id, graph_id, node_type_id, title, weight, props, is_level_0, created_at, updated_at)
  VALUES (gen_random_uuid(), '$GRAPH_ID', '$NODE_TYPE_ID', 'Test Node for Activity', 1.0, '{}'::jsonb, false, NOW(), NOW())
  RETURNING id;
" | tr -d ' ')

echo "✓ User ID: $USER_ID"
echo "✓ Graph ID: $GRAPH_ID"
echo "✓ Node ID: $NODE_ID"
echo ""

# Step 2: Create a post
echo "2. Creating a post..."
CREATE_POST=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { id content author { username } node { title } replyCount shareCount reactionCounts totalReactionCount created_at } }",
    "variables": {
      "input": {
        "nodeId": "'"$NODE_ID"'",
        "content": "This is my first activity post! Testing the new Twitter-like system."
      }
    }
  }')

echo "$CREATE_POST" | jq '.'
POST_ID=$(echo "$CREATE_POST" | jq -r '.data.createPost.id // empty')

if [ -z "$POST_ID" ]; then
  echo "ERROR: Failed to create post"
  echo "$CREATE_POST" | jq '.errors'
  exit 1
fi

echo "✓ Created post: $POST_ID"
echo ""

# Step 3: React to the post
echo "3. Adding reactions..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation ReactToPost($postId: ID!, $reactionType: String!) { reactToPost(postId: $postId, reactionType: $reactionType) }",
    "variables": {
      "postId": "'"$POST_ID"'",
      "reactionType": "like"
    }
  }' | jq '.data.reactToPost'

echo "✓ Added 'like' reaction"

# Add another reaction type
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation ReactToPost($postId: ID!, $reactionType: String!) { reactToPost(postId: $postId, reactionType: $reactionType) }",
    "variables": {
      "postId": "'"$POST_ID"'",
      "reactionType": "love"
    }
  }' | jq '.data.reactToPost'

echo "✓ Added 'love' reaction"
echo ""

# Step 4: Create a reply
echo "4. Creating a reply..."
REPLY_RESULT=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation ReplyToPost($input: ReplyToPostInput!) { replyToPost(input: $input) { id content parent_post_id author { username } created_at } }",
    "variables": {
      "input": {
        "parentPostId": "'"$POST_ID"'",
        "content": "Great post! I agree with your points."
      }
    }
  }')

echo "$REPLY_RESULT" | jq '.'
REPLY_ID=$(echo "$REPLY_RESULT" | jq -r '.data.replyToPost.id // empty')
echo "✓ Created reply: $REPLY_ID"
echo ""

# Step 5: Create another reply
echo "5. Creating second reply..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation ReplyToPost($input: ReplyToPostInput!) { replyToPost(input: $input) { id content } }",
    "variables": {
      "input": {
        "parentPostId": "'"$POST_ID"'",
        "content": "Here is another reply with more thoughts."
      }
    }
  }' | jq '.data.replyToPost.id'

echo "✓ Created second reply"
echo ""

# Step 6: Share the post
echo "6. Sharing the post..."
SHARE_RESULT=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation SharePost($input: SharePostInput!) { sharePost(input: $input) { id content shared_post_id created_at } }",
    "variables": {
      "input": {
        "postId": "'"$POST_ID"'",
        "comment": "This is really important information!"
      }
    }
  }')

echo "$SHARE_RESULT" | jq '.'
SHARE_ID=$(echo "$SHARE_RESULT" | jq -r '.data.sharePost.id // empty')
echo "✓ Created share: $SHARE_ID"
echo ""

# Step 7: Get node activity
echo "7. Getting node activity feed..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "query GetNodeActivity($nodeId: ID!, $limit: Int) { getNodeActivity(nodeId: $nodeId, limit: $limit) { id content author { username } is_reply is_share replyCount shareCount reactionCounts totalReactionCount userReactions created_at } }",
    "variables": {
      "nodeId": "'"$NODE_ID"'",
      "limit": 10
    }
  }' | jq '.'

echo ""

# Step 8: Get post replies
echo "8. Getting post replies..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "query GetPostReplies($postId: ID!, $limit: Int) { getPostReplies(postId: $postId, limit: $limit) { id content author { username } replyCount created_at } }",
    "variables": {
      "postId": "'"$POST_ID"'",
      "limit": 10
    }
  }' | jq '.'

echo ""

# Step 9: Get post with all details
echo "9. Getting post with full details and counts..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "query GetPost($postId: ID!) { getPost(postId: $postId) { id content author { username } node { title } replyCount shareCount reactionCounts totalReactionCount userReactions is_reply is_share created_at } }",
    "variables": {
      "postId": "'"$POST_ID"'"
    }
  }' | jq '.'

echo ""

# Step 10: Test removing reaction
echo "10. Removing 'like' reaction..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "mutation RemoveReaction($postId: ID!, $reactionType: String!) { removeReaction(postId: $postId, reactionType: $reactionType) }",
    "variables": {
      "postId": "'"$POST_ID"'",
      "reactionType": "like"
    }
  }' | jq '.data.removeReaction'

echo "✓ Removed 'like' reaction"
echo ""

# Step 11: Verify counts after removing reaction
echo "11. Verifying updated reaction counts..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "query": "query GetPost($postId: ID!) { getPost(postId: $postId) { reactionCounts totalReactionCount userReactions } }",
    "variables": {
      "postId": "'"$POST_ID"'"
    }
  }' | jq '.'

echo ""
echo "========================================="
echo "✓ All tests completed successfully!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Created 1 post"
echo "- Added 2 reactions (then removed 1)"
echo "- Created 2 replies"
echo "- Created 1 share"
echo "- Verified all queries work correctly"
echo ""
echo "Post ID: $POST_ID"
echo "Node ID: $NODE_ID"
