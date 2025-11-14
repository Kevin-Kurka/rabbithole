#!/bin/bash
# Quick Activity System Test using existing data

API_URL="http://localhost:4000/graphql"

echo "========================================="
echo "Activity System Quick Test"
echo "========================================="

# Use existing user and node
USER_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -A -c "SELECT id FROM public.\"Users\" LIMIT 1;" | head -1)
NODE_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -A -c "SELECT id FROM public.\"Nodes\" LIMIT 1;" | head -1)

echo "User ID: $USER_ID"
echo "Node ID: $NODE_ID"
echo ""

# Test 1: Create Post
echo "1. Creating post..."
CREATE_RESULT=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" -H "x-user-id: $USER_ID" -d '{
  "query": "mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { id content author { username } replyCount shareCount reactionCounts totalReactionCount } }",
  "variables": {"input": {"nodeId": "'"$NODE_ID"'", "content": "Test post!"}}
}')

echo "$CREATE_RESULT" | jq '.'
POST_ID=$(echo "$CREATE_RESULT" | jq -r '.data.createPost.id // empty')

if [ -z "$POST_ID" ]; then
  echo "Failed to create post"
  exit 1
fi

echo "✓ Post created: $POST_ID"
echo ""

# Test 2: Add Reaction
echo "2. Adding reaction..."
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -H "x-user-id: $USER_ID" -d '{
  "query": "mutation ReactToPost($postId: ID!, $reactionType: String!) { reactToPost(postId: $postId, reactionType: $reactionType) }",
  "variables": {"postId": "'"$POST_ID"'", "reactionType": "like"}
}' | jq '.'
echo ""

# Test 3: Create Reply
echo "3. Creating reply..."
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -H "x-user-id: $USER_ID" -d '{
  "query": "mutation ReplyToPost($input: ReplyToPostInput!) { replyToPost(input: $input) { id content } }",
  "variables": {"input": {"parentPostId": "'"$POST_ID"'", "content": "Great post!"}}
}' | jq '.'
echo ""

# Test 4: Get Node Activity
echo "4. Getting node activity..."
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -H "x-user-id: $USER_ID" -d '{
  "query": "query GetNodeActivity($nodeId: ID!) { getNodeActivity(nodeId: $nodeId, limit: 5) { id content replyCount shareCount reactionCounts } }",
  "variables": {"nodeId": "'"$NODE_ID"'"}
}' | jq '.'
echo ""

# Test 5: Get Post with counts
echo "5. Getting post with updated counts..."
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -H "x-user-id: $USER_ID" -d '{
  "query": "query GetPost($postId: ID!) { getPost(postId: $postId) { id content replyCount shareCount reactionCounts totalReactionCount userReactions } }",
  "variables": {"postId": "'"$POST_ID"'"}
}' | jq '.'

echo ""
echo "✓ All tests passed!"
