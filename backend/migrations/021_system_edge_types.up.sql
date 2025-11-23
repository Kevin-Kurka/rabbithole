-- ============================================================================
-- Migration: 021_system_edge_types
-- Description: Create system edge types defining relationships and their semantics
-- Date: 2025-11-23
--
-- ARCHITECTURE: Edges define directed relationships between nodes.
-- Direction: source_node_id → target_node_id
-- All relationship data is stored in JSONB props field.
--
-- Edge Type Naming Convention: VERB or RELATIONSHIP_NAME in CAPS
-- ============================================================================

-- ============================================================================
-- Content Relationship Edge Types
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('CHALLENGES', '{"description": "Challenge node challenges a target node or edge for accuracy/completeness"}'::jsonb, NOW(), NOW());

-- Direction: Challenge → Node/Edge being challenged
-- Props: {
--   "challengeType": "factual_error" | "missing_context" | "bias",
--   "severity": "minor" | "major" | "critical",
--   "status": "open" | "resolved"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('ATTACHES_FILE',  '{"description": "Node references an uploaded evidence file"}'::jsonb, NOW(), NOW());

-- Direction: Node → EvidenceFile
-- Props: {
--   "attachmentType": "primary_source" | "supporting_evidence" | "reference",
--   "relevance": number,
--   "uploadedBy": "userId"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('INVESTIGATES',  '{"description": "Formal inquiry investigates a node or topic"}'::jsonb, NOW(), NOW());

-- Direction: FormalInquiry → Node being investigated
-- Props: {
--   "focus": "veracity" | "completeness" | "bias",
--   "methodology": "scientific_method" | "legal_discovery",
--   "progress": number
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('EXTRACTS_CLAIM',  '{"description": "Evidence file contains extracted claim node"}'::jsonb, NOW(), NOW());

-- Direction: EvidenceFile → Claim node
-- Props: {
--   "confidence": number,
--   "extractionMethod": "manual" | "ai_extraction",
--   "pageNumber": number,
--   "textSnippet": "string"
-- }

-- ============================================================================
-- Social Interaction Edge Types
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('POSTED_ON',  '{"description": "Activity post is associated with a graph"}'::jsonb, NOW(), NOW());

-- Direction: ActivityPost → Graph node
-- Props: {
--   "visibility": "public" | "followers" | "private",
--   "pinned": boolean
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('REPLIES_TO',  '{"description": "Activity post replies to another post"}'::jsonb, NOW(), NOW());

-- Direction: Reply post → Parent post
-- Props: {
--   "depth": number,
--   "threadId": "uuid"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('SHARES',  '{"description": "Activity post shares another post"}'::jsonb, NOW(), NOW());

-- Direction: Share post → Original post
-- Props: {
--   "commentary": "text",
--   "shareType": "quote" | "repost"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('MENTIONS_NODE',  '{"description": "Post mentions a specific node"}'::jsonb, NOW(), NOW());

-- Direction: ActivityPost → Mentioned node
-- Props: {
--   "position": number,
--   "context": "text"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('LIKES',  '{"description": "User likes a post or node"}'::jsonb, NOW(), NOW());

-- Direction: User node → Liked post/node
-- Props: {
--   "likedAt": "timestamp"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('INVITES_TO',  '{"description": "Graph invitation invites user to graph"}'::jsonb, NOW(), NOW());

-- Direction: GraphInvitation → Graph node
-- Props: {
--   "role": "viewer" | "editor" | "curator",
--   "expiresAt": "timestamp"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('VIEWING',  '{"description": "User presence indicates viewing of specific node"}'::jsonb, NOW(), NOW());

-- Direction: UserPresence → Node being viewed
-- Props: {
--   "startedAt": "timestamp",
--   "lastActivity": "timestamp",
--   "cursorPosition": {"x": number, "y": number}
-- }

-- ============================================================================
-- Curation System Edge Types
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('HAS_CURATOR_ROLE',  '{"description": "User has been assigned a curator role"}'::jsonb, NOW(), NOW());

-- Direction: UserCurator → CuratorRole
-- Props: {
--   "assignedBy": "userId",
--   "assignedAt": "timestamp",
--   "status": "active" | "suspended" | "revoked",
--   "specialties": ["specialty1", "specialty2"]
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('APPLIES_FOR',  '{"description": "User applies for curator role"}'::jsonb, NOW(), NOW());

-- Direction: CuratorApplication → CuratorRole
-- Props: {
--   "status": "pending" | "approved" | "rejected",
--   "reviewedBy": "userId",
--   "reviewedAt": "timestamp"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('CURATES',  '{"description": "Curator reviews/approves a node or edge"}'::jsonb, NOW(), NOW());

-- Direction: User (curator) → Node/Edge being curated
-- Props: {
--   "action": "approve" | "reject" | "request_changes",
--   "reasoning": "text",
--   "confidenceScore": number,
--   "curatorTier": 1 | 2 | 3 | 4
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('AUDITS',  '{"description": "Audit log records curator action"}'::jsonb, NOW(), NOW());

-- Direction: CuratorAuditLog → Target node/edge/user
-- Props: {
--   "action": "approve" | "reject" | "promote" | "suspend",
--   "timestamp": "timestamp",
--   "ipAddress": "string",
--   "metadata": {}
-- }

-- ============================================================================
-- Media Processing Edge Types
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('PROCESSES_FILE',  '{"description": "Media job processes a specific file"}'::jsonb, NOW(), NOW());

-- Direction: MediaJob → EvidenceFile
-- Props: {
--   "jobType": "transcription" | "video_analysis" | "document_parsing",
--   "priority": "low" | "normal" | "high",
--   "queuedAt": "timestamp"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('EXTRACTS_SECTION',  '{"description": "Document section extracted from document"}'::jsonb, NOW(), NOW());

-- Direction: EvidenceFile → DocumentSection
-- Props: {
--   "pageNumber": number,
--   "order": number,
--   "extractionMethod": "docling" | "manual"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('EXTRACTS_FRAME',  '{"description": "Video frame extracted from video"}'::jsonb, NOW(), NOW());

-- Direction: EvidenceFile → VideoFrame
-- Props: {
--   "timestamp": number,
--   "frameNumber": number,
--   "sceneId": "uuid"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('BELONGS_TO_SCENE',  '{"description": "Frame belongs to video scene"}'::jsonb, NOW(), NOW());

-- Direction: VideoFrame → Scene node
-- Props: {
--   "sceneStart": number,
--   "sceneEnd": number
-- }

-- ============================================================================
-- Gamification Edge Types
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('UNLOCKS',  '{"description": "User unlocks achievement"}'::jsonb, NOW(), NOW());

-- Direction: UserAchievement → Achievement
-- Props: {
--   "unlockedAt": "timestamp",
--   "progress": number,
--   "notified": boolean
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('EARNS_POINTS',  '{"description": "User earns points from action on node"}'::jsonb, NOW(), NOW());

-- Direction: User → Node (contribution)
-- Props: {
--   "points": number,
--   "action": "create" | "edit" | "verify" | "challenge",
--   "earnedAt": "timestamp"
-- }

-- ============================================================================
-- AI Assistant Edge Types
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('HAS_MESSAGE',  '{"description": "Conversation contains message"}'::jsonb, NOW(), NOW());

-- Direction: Conversation → ConversationMessage
-- Props: {
--   "messageOrder": number,
--   "role": "user" | "assistant" | "system"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('REFERENCES_IN_CONVERSATION',  '{"description": "Conversation message references node or edge"}'::jsonb, NOW(), NOW());

-- Direction: ConversationMessage → Node/Edge being discussed
-- Props: {
--   "relevance": number,
--   "context": "text"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('SUGGESTS',  '{"description": "AI assistant suggests related node or evidence"}'::jsonb, NOW(), NOW());

-- Direction: ConversationMessage → Suggested node
-- Props: {
--   "confidence": number,
--   "suggestionType": "related" | "evidence" | "contradiction",
--   "reasoning": "text"
-- }

-- ============================================================================
-- Notification Edge Types
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('NOTIFIES_ABOUT',  '{"description": "Notification relates to specific node/edge/post"}'::jsonb, NOW(), NOW());

-- Direction: Notification → Target node/edge/post
-- Props: {
--   "notificationType": "mention" | "reply" | "challenge" | "curator_action",
--   "isRead": boolean,
--   "readAt": "timestamp"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('NOTIFIES_USER',  '{"description": "Notification targets specific user"}'::jsonb, NOW(), NOW());

-- Direction: Notification → User node
-- Props: {
--   "priority": "low" | "medium" | "high",
--   "deliveryMethod": "in_app" | "email" | "both"
-- }

-- ============================================================================
-- Consensus Edge Types
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('VOTES_ON',  '{"description": "Consensus vote cast on challenge, promotion, or application"}'::jsonb, NOW(), NOW());

-- Direction: ConsensusVote → Target (Challenge/FormalInquiry/CuratorApplication)
-- Props: {
--   "voteType": "approve" | "reject" | "abstain",
--   "weight": number,
--   "reasoning": "text",
--   "expertise": ["specialty1", "specialty2"]
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('CAST_BY',  '{"description": "Vote was cast by specific user"}'::jsonb, NOW(), NOW());

-- Direction: ConsensusVote → User (voter)
-- Props: {
--   "votedAt": "timestamp",
--   "curatorTier": 1 | 2 | 3 | 4 | null
-- }

-- ============================================================================
-- Evidence System Edge Types (from VeracityResolver pattern)
-- ============================================================================

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('SUPPORTS',  '{"description": "Evidence supports a claim or node"}'::jsonb, NOW(), NOW());

-- Direction: Evidence node/Reference → Claim/Node being supported
-- Props: {
--   "evidenceType": "supporting",
--   "weight": number,
--   "confidence": number,
--   "content": "text",
--   "createdBy": "userId"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('REFUTES',  '{"description": "Evidence refutes a claim or node"}'::jsonb, NOW(), NOW());

-- Direction: Evidence node/Reference → Claim/Node being refuted
-- Props: {
--   "evidenceType": "refuting",
--   "weight": number,
--   "confidence": number,
--   "content": "text",
--   "createdBy": "userId"
-- }

INSERT INTO public."EdgeTypes" (name, props, created_at, updated_at)
VALUES
  ('NEUTRAL_EVIDENCE',  '{"description": "Evidence provides context without supporting/refuting"}'::jsonb, NOW(), NOW());

-- Direction: Evidence node/Reference → Claim/Node
-- Props: {
--   "evidenceType": "neutral",
--   "weight": number,
--   "confidence": number,
--   "content": "text",
--   "createdBy": "userId"
-- }

-- ============================================================================
-- Summary
-- ============================================================================
-- Created 31 edge types defining relationships and their semantics:
--
-- Content (4): CHALLENGES, ATTACHES_FILE, INVESTIGATES, EXTRACTS_CLAIM
-- Social (7): POSTED_ON, REPLIES_TO, SHARES, MENTIONS_NODE, LIKES, INVITES_TO, VIEWING
-- Curation (4): HAS_CURATOR_ROLE, APPLIES_FOR, CURATES, AUDITS
-- Media (4): PROCESSES_FILE, EXTRACTS_SECTION, EXTRACTS_FRAME, BELONGS_TO_SCENE
-- Gamification (2): UNLOCKS, EARNS_POINTS
-- AI (3): HAS_MESSAGE, REFERENCES_IN_CONVERSATION, SUGGESTS
-- Notifications (2): NOTIFIES_ABOUT, NOTIFIES_USER
-- Consensus (2): VOTES_ON, CAST_BY
-- Evidence (3): SUPPORTS, REFUTES, NEUTRAL_EVIDENCE
--
-- All relationships have clear direction (source → target) and semantics!
-- All relationship data stored in JSONB props field - NO NEW TABLES!
-- ============================================================================
