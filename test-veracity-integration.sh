#!/bin/bash

# Veracity System Integration Test Script
# Tests GraphQL API endpoints for veracity functionality

API_URL="http://localhost:4000/graphql"

echo "========================================"
echo "Veracity System Integration Test"
echo "========================================"
echo ""

# Test 1: Query nodes with veracity field
echo "Test 1: Query nodes with veracity scores..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { graphs { id name nodes { id is_level_0 veracity { veracity_score evidence_count } } } }"
  }' | jq '.'

echo ""
echo "========================================"
echo ""

# Test 2: Query specific veracity score
echo "Test 2: Get veracity score for first node..."
NODE_ID=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { graphs { nodes { id } } }"}' | \
  jq -r '.data.graphs[0].nodes[0].id')

if [ ! -z "$NODE_ID" ]; then
  echo "Testing with node ID: $NODE_ID"
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"query GetVeracity(\$nodeId: ID) { getVeracityScore(nodeId: \$nodeId) { veracity_score evidence_count consensus_score calculated_at } }\",
      \"variables\": {\"nodeId\": \"$NODE_ID\"}
    }" | jq '.'
else
  echo "No nodes found to test with"
fi

echo ""
echo "========================================"
echo ""

# Test 3: Query sources
echo "Test 3: Get sources..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getSources(limit: 5) { id title source_type credibility { credibility_score } } }"
  }' | jq '.'

echo ""
echo "========================================"
echo ""

# Test 4: Check disputed claims
echo "Test 4: Get disputed claims..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getDisputedClaims(threshold: 0.5, limit: 5) { veracity_score evidence_count challenge_count } }"
  }' | jq '.'

echo ""
echo "========================================"
echo ""

# Test 5: Create a test source
echo "Test 5: Create a test source..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createSource(sourceType: \"academic_paper\", title: \"Test Paper for Veracity System\", url: \"https://example.com/test.pdf\") { id title source_type credibility { credibility_score } } }"
  }' | jq '.'

echo ""
echo "========================================"
echo ""

echo "✓ All integration tests completed!"
echo ""
echo "You can now open http://localhost:4000/graphql in your browser"
echo "to interact with the GraphQL Playground and test more queries."
