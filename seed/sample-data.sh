#!/bin/bash
# Seed sample data for Rabbithole
API="${SENTIENT_API_URL:-http://localhost:8005}"
TOKEN="${SENTIENT_TOKEN:-}"
AUTH="Authorization: Bearer $TOKEN"
TENANT="00000000-0000-0000-0000-000000000001"

echo "Seeding sample data..."

# Create a user node
USER_ID=$(curl -s -X POST "$API/admin/nodes" -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"tenant_id\": \"$TENANT\",
  \"type\": \"USER\",
  \"properties\": {\"username\": \"researcher1\", \"display_name\": \"Deep Researcher\", \"bio\": \"Connecting the dots since 2020\", \"reputation_score\": 42, \"joined_at\": \"2026-04-20T00:00:00Z\"}
}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created user: $USER_ID"

# Create an article
ARTICLE_ID=$(curl -s -X POST "$API/admin/nodes" -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"tenant_id\": \"$TENANT\",
  \"type\": \"ARTICLE\",
  \"properties\": {\"title\": \"The Hidden Connection Between Corporate Lobbying and Climate Policy\", \"body\": \"Recent documents reveal a systematic effort by major corporations to influence climate legislation. Internal memos show coordination between industry groups dating back to 2015. The evidence suggests a deliberate strategy to delay meaningful action while publicly supporting green initiatives.\", \"summary\": \"Examining leaked documents that show corporate influence on climate policy.\", \"status\": \"published\", \"published_at\": \"2026-04-20T12:00:00Z\"}
}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created article: $ARTICLE_ID"

# Create a claim from the article
CLAIM_ID=$(curl -s -X POST "$API/admin/nodes" -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"tenant_id\": \"$TENANT\",
  \"type\": \"CLAIM\",
  \"properties\": {\"text\": \"Internal memos show coordination between industry groups dating back to 2015\", \"highlight_start\": 98, \"highlight_end\": 175, \"status\": \"challenged\"}
}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created claim: $CLAIM_ID"

# Link article -> claim
curl -s -X POST "$API/admin/edges" -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"tenant_id\": \"$TENANT\",
  \"source_node_id\": \"$ARTICLE_ID\",
  \"target_node_id\": \"$CLAIM_ID\",
  \"edge_type\": \"CONTAINS_CLAIM\",
  \"properties\": {}
}" > /dev/null

# Link user -> article
curl -s -X POST "$API/admin/edges" -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"tenant_id\": \"$TENANT\",
  \"source_node_id\": \"$USER_ID\",
  \"target_node_id\": \"$ARTICLE_ID\",
  \"edge_type\": \"AUTHORED\",
  \"properties\": {}
}" > /dev/null

echo "Done! Sample data seeded."
echo "  User: $USER_ID"
echo "  Article: $ARTICLE_ID"
echo "  Claim: $CLAIM_ID"
