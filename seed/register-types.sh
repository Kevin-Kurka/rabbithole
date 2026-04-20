#!/bin/bash
# Register Rabbithole node and edge types in Sentient
# Requires: SENTIENT_API_URL and SENTIENT_TOKEN env vars (or running sentient-cli)

API="${SENTIENT_API_URL:-http://localhost:8005}"
TOKEN="${SENTIENT_TOKEN:-}"
AUTH="Authorization: Bearer $TOKEN"

echo "Registering node types..."

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "USER",
  "description": "Platform user",
  "properties_schema": {"type":"object","properties":{"username":{"type":"string"},"display_name":{"type":"string"},"bio":{"type":"string"},"reputation_score":{"type":"number"},"joined_at":{"type":"string"}},"required":["username","display_name"]}
}'

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "ARTICLE",
  "description": "User-authored research piece",
  "properties_schema": {"type":"object","properties":{"title":{"type":"string"},"body":{"type":"string"},"summary":{"type":"string"},"status":{"type":"string","enum":["draft","published"]},"published_at":{"type":"string"}},"required":["title","body","status"]}
}'

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "CLAIM",
  "description": "A specific statement extracted from an article",
  "properties_schema": {"type":"object","properties":{"text":{"type":"string"},"highlight_start":{"type":"integer"},"highlight_end":{"type":"integer"},"status":{"type":"string","enum":["unchallenged","challenged","verified","debunked","contested"]}},"required":["text","status"]}
}'

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "CHALLENGE",
  "description": "A formal dispute of a claim or evidence",
  "properties_schema": {"type":"object","properties":{"title":{"type":"string"},"rationale":{"type":"string"},"target_type":{"type":"string","enum":["claim","evidence"]},"status":{"type":"string","enum":["open","in_review","resolved"]},"community_score":{"type":"number"},"ai_score":{"type":"number"},"ai_analysis":{"type":"string"},"verdict":{"type":"string","enum":["pending","verified","debunked","contested","insufficient_evidence"]},"opened_at":{"type":"string"},"resolved_at":{"type":"string"}},"required":["title","rationale","target_type","status"]}
}'

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "EVIDENCE",
  "description": "Supporting or refuting material in a challenge",
  "properties_schema": {"type":"object","properties":{"title":{"type":"string"},"body":{"type":"string"},"source_url":{"type":"string"},"source_type":{"type":"string","enum":["primary_source","document","data","testimony","expert_opinion","media","academic"]},"side":{"type":"string","enum":["for","against"]},"relevance_score":{"type":"number"},"credibility_score":{"type":"number"},"status":{"type":"string","enum":["unchallenged","challenged","verified","debunked"]}},"required":["title","body","source_type","side"]}
}'

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "THEORY",
  "description": "A connected narrative spanning multiple pieces",
  "properties_schema": {"type":"object","properties":{"title":{"type":"string"},"summary":{"type":"string"},"body":{"type":"string"},"status":{"type":"string","enum":["draft","published"]},"published_at":{"type":"string"}},"required":["title","body","status"]}
}'

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "OPINION",
  "description": "User commentary (not evidence)",
  "properties_schema": {"type":"object","properties":{"body":{"type":"string"},"created_at":{"type":"string"}},"required":["body"]}
}'

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "SOURCE",
  "description": "An external citation",
  "properties_schema": {"type":"object","properties":{"url":{"type":"string"},"title":{"type":"string"},"publication":{"type":"string"},"author":{"type":"string"},"date":{"type":"string"},"source_type":{"type":"string","enum":["news","academic","government","primary","other"]},"credibility_rating":{"type":"number"}},"required":["url","title","source_type"]}
}'

curl -s -X POST "$API/admin/node-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "VOTE",
  "description": "A user vote on a challenge",
  "properties_schema": {"type":"object","properties":{"side":{"type":"string","enum":["for","against"]},"cast_at":{"type":"string"}},"required":["side"]}
}'

echo ""
echo "Registering edge types..."

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "AUTHORED",
  "description": "User created this content",
  "source_node_types": ["USER"],
  "target_node_types": ["ARTICLE", "THEORY", "OPINION"]
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "CONTAINS_CLAIM",
  "description": "Article contains this claim",
  "source_node_types": ["ARTICLE"],
  "target_node_types": ["CLAIM"]
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "CHALLENGES",
  "description": "Challenge disputes this target",
  "source_node_types": ["CHALLENGE"],
  "target_node_types": ["CLAIM", "EVIDENCE"]
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "SUBMITTED_BY",
  "description": "Who submitted this",
  "source_node_types": ["CHALLENGE", "EVIDENCE", "OPINION"],
  "target_node_types": ["USER"]
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "SUPPORTS",
  "description": "Evidence supporting the challenge",
  "source_node_types": ["EVIDENCE"],
  "target_node_types": ["CHALLENGE"]
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "REFUTES",
  "description": "Evidence against the challenge",
  "source_node_types": ["EVIDENCE"],
  "target_node_types": ["CHALLENGE"]
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "CITES",
  "description": "Cites external source",
  "source_node_types": ["ARTICLE", "EVIDENCE", "THEORY"],
  "target_node_types": ["SOURCE"],
  "properties_schema": {"type":"object","properties":{"context":{"type":"string"}}}
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "REFERENCES",
  "description": "Internal cross-reference",
  "source_node_types": ["ARTICLE", "THEORY"],
  "target_node_types": ["ARTICLE", "CLAIM", "EVIDENCE"],
  "properties_schema": {"type":"object","properties":{"context":{"type":"string"}}}
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "CONNECTS",
  "description": "Theory connects these pieces",
  "source_node_types": ["THEORY"],
  "target_node_types": ["CLAIM", "ARTICLE", "EVIDENCE"],
  "properties_schema": {"type":"object","properties":{"sequence":{"type":"integer"},"annotation":{"type":"string"}}}
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "VOTED_ON",
  "description": "Vote cast on challenge",
  "source_node_types": ["VOTE"],
  "target_node_types": ["CHALLENGE"]
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "CAST_BY",
  "description": "Who cast this vote",
  "source_node_types": ["VOTE"],
  "target_node_types": ["USER"]
}'

curl -s -X POST "$API/admin/edge-types" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "RELATED_TO",
  "description": "AI or user discovered connection",
  "source_node_types": [],
  "target_node_types": [],
  "properties_schema": {"type":"object","properties":{"discovered_by":{"type":"string","enum":["ai","user"]},"confidence":{"type":"number"}}}
}'

echo ""
echo "Done! All Rabbithole types registered."
