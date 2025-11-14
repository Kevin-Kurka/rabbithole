#!/bin/bash
# Test script for Activity System GraphQL API

API_URL="http://localhost:4000/graphql"

echo "========================================="
echo "Testing Activity System"
echo "========================================="
echo ""

# Test 1: Check if PostActivityResolver is loaded (introspection)
echo "1. Checking GraphQL Schema for Activity types..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __type(name: \"ActivityPost\") { name fields { name type { name kind } } } }"
  }' | jq '.'

echo ""
echo "========================================="
echo ""

# Test 2: Get a sample node and user for testing
echo "2. Getting sample node and user IDs..."
NODE_QUERY='query { getNodes(limit: 1) { id title } }'
USER_QUERY='query { users { id username } }'

NODE_DATA=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$NODE_QUERY\"}" | jq -r '.data.getNodes[0] // empty')

if [ -z "$NODE_DATA" ]; then
  echo "No nodes found! Creating test data..."
  # Insert test node directly to database
  docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "
    INSERT INTO public.\"Nodes\" (id, title, weight, props, is_level_0, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Test Node for Activity System', 1.0, '{}'::jsonb, false, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  "

  NODE_DATA=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$NODE_QUERY\"}" | jq -r '.data.getNodes[0] // empty')
fi

NODE_ID=$(echo "$NODE_DATA" | jq -r '.id')
NODE_TITLE=$(echo "$NODE_DATA" | jq -r '.title')

echo "Using Node: $NODE_TITLE ($NODE_ID)"

# Get or create user
USER_ID=$(docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -t -c "
  INSERT INTO public.\"Users\" (id, username, email, created_at)
  VALUES (gen_random_uuid(), 'testuser', 'test@example.com', NOW())
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id;
" | xargs)

echo "Using User ID: $USER_ID"
echo ""
echo "========================================="
echo ""

# Test 3: Create a post
echo "3. Creating a test post..."
CREATE_POST_MUTATION='
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
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
    reactionCounts
    totalReactionCount
    created_at
  }
}
'

POST_RESULT=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"query\": \"$CREATE_POST_MUTATION\",
    \"variables\": {
      \"input\": {
        \"nodeId\": \"$NODE_ID\",
        \"content\": \"This is a test post from the activity system! #test\"
      }
    }
  }")

echo "$POST_RESULT" | jq '.'

POST_ID=$(echo "$POST_RESULT" | jq -r '.data.createPost.id // empty')

if [ -z "$POST_ID" ]; then
  echo "Failed to create post!"
  exit 1
fi

echo ""
echo "Created Post ID: $POST_ID"
echo ""
echo "========================================="
echo ""

# Test 4: Get node activity
echo "4. Getting node activity feed..."
GET_ACTIVITY_QUERY='
query GetNodeActivity($nodeId: ID!, $limit: Int) {
  getNodeActivity(nodeId: $nodeId, limit: $limit) {
    id
    content
    author {
      username
    }
    replyCount
    shareCount
    reactionCounts
    totalReactionCount
    created_at
  }
}
'

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"query\": \"$GET_ACTIVITY_QUERY\",
    \"variables\": {
      \"nodeId\": \"$NODE_ID\",
      \"limit\": 10
    }
  }" | jq '.'

echo ""
echo "========================================="
echo ""

# Test 5: React to post
echo "5. Adding a 'like' reaction to the post..."
REACT_MUTATION='
mutation ReactToPost($postId: ID!, $reactionType: String!) {
  reactToPost(postId: $postId, reactionType: $reactionType)
}
'

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"query\": \"$REACT_MUTATION\",
    \"variables\": {
      \"postId\": \"$POST_ID\",
      \"reactionType\": \"like\"
    }
  }" | jq '.'

echo ""
echo "========================================="
echo ""

# Test 6: Create a reply
echo "6. Creating a reply to the post..."
REPLY_MUTATION='
mutation ReplyToPost($input: ReplyToPostInput!) {
  replyToPost(input: $input) {
    id
    content
    parent_post_id
    author {
      username
    }
    created_at
  }
}
'

REPLY_RESULT=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"query\": \"$REPLY_MUTATION\",
    \"variables\": {
      \"input\": {
        \"parentPostId\": \"$POST_ID\",
        \"content\": \"This is a reply to the test post!\"
      }
    }
  }")

echo "$REPLY_RESULT" | jq '.'

echo ""
echo "========================================="
echo ""

# Test 7: Get post with updated counts
echo "7. Getting post with updated reaction and reply counts..."
GET_POST_QUERY='
query GetPost($postId: ID!) {
  getPost(postId: $postId) {
    id
    content
    replyCount
    shareCount
    reactionCounts
    totalReactionCount
    userReactions
  }
}
'

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"query\": \"$GET_POST_QUERY\",
    \"variables\": {
      \"postId\": \"$POST_ID\"
    }
  }" | jq '.'

echo ""
echo "========================================="
echo ""

# Test 8: Get replies
echo "8. Getting replies to the post..."
GET_REPLIES_QUERY='
query GetPostReplies($postId: ID!, $limit: Int) {
  getPostReplies(postId: $postId, limit: $limit) {
    id
    content
    author {
      username
    }
    created_at
  }
}
'

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"query\": \"$GET_REPLIES_QUERY\",
    \"variables\": {
      \"postId\": \"$POST_ID\",
      \"limit\": 10
    }
  }" | jq '.'

echo ""
echo "========================================="
echo "Tests completed!"
echo "========================================="
