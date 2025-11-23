-- ============================================================================
-- Migration: 020_system_node_types
-- Description: Create system node type hierarchy for all application features
-- Date: 2025-11-23
--
-- ARCHITECTURE: All application data is stored in Nodes table with JSONB props.
-- This migration defines the node type taxonomy using parent_node_type_id for
-- hierarchical organization.
--
-- NO NEW TABLES - Everything is a node with data in props field!
-- ============================================================================

-- Parent Category: System
-- Core system-level node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('System', 'Parent category for core system node types', NULL, NOW(), NOW());

-- Parent Category: Content
-- Content and knowledge graph node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('Content', 'Parent category for content-related node types', NULL, NOW(), NOW());

-- Parent Category: Social
-- Social interaction node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('Social', 'Parent category for social interaction node types', NULL, NOW(), NOW());

-- Parent Category: Curation
-- Curator system node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('Curation', 'Parent category for curator system node types', NULL, NOW(), NOW());

-- Parent Category: Media
-- Media processing node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('Media', 'Parent category for media processing node types', NULL, NOW(), NOW());

-- Parent Category: Gamification
-- Gamification and achievement node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('Gamification', 'Parent category for gamification node types', NULL, NOW(), NOW());

-- Parent Category: AI
-- AI assistant and conversation node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('AI', 'Parent category for AI-related node types', NULL, NOW(), NOW());

-- Parent Category: Notifications
-- Notification system node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('Notifications', 'Parent category for notification node types', NULL, NOW(), NOW());

-- Parent Category: Consensus
-- Community consensus node types
INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
VALUES
  ('Consensus', 'Parent category for consensus-related node types', NULL, NOW(), NOW());

-- ============================================================================
-- Content Node Types (children of Content)
-- ============================================================================

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'Challenge',
  'Challenge to a node or edge claiming inaccuracy or requesting updates',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Content';

-- Props for Challenge:
-- {
--   "targetType": "node" | "edge",
--   "targetId": "uuid",
--   "challengeType": "factual_error" | "missing_context" | "bias" | "outdated",
--   "description": "text",
--   "proposedChange": "text",
--   "status": "open" | "under_review" | "accepted" | "rejected" | "resolved",
--   "evidence": ["url1", "url2"],
--   "createdBy": "userId",
--   "reviewedBy": "userId",
--   "reviewedAt": "timestamp",
--   "resolution": "text",
--   "graphId": "uuid"
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'EvidenceFile',
  'Uploaded file serving as evidence (PDF, DOCX, audio, video, image)',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Content';

-- Props for EvidenceFile:
-- {
--   "filename": "string",
--   "originalName": "string",
--   "mimeType": "string",
--   "size": number,
--   "path": "string",
--   "url": "string",
--   "fileType": "document" | "audio" | "video" | "image" | "other",
--   "uploadedBy": "userId",
--   "graphId": "uuid",
--   "extractedText": "string",
--   "metadata": {
--     "author": "string",
--     "title": "string",
--     "pageCount": number,
--     "duration": number,
--     "dimensions": {"width": number, "height": number}
--   },
--   "processingStatus": "pending" | "processing" | "completed" | "failed",
--   "processingJobId": "uuid"
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'FormalInquiry',
  'Structured inquiry following formal methodology (Scientific Method, Legal Discovery, etc.)',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Content';

-- Props for FormalInquiry:
-- {
--   "graphId": "uuid",
--   "title": "string",
--   "description": "text",
--   "questions": ["question1", "question2"],
--   "methodology": "scientific_method" | "legal_discovery" | "toulmin",
--   "status": "draft" | "open" | "in_progress" | "resolved" | "closed",
--   "priority": "low" | "medium" | "high" | "critical",
--   "createdBy": "userId",
--   "assignedTo": "userId",
--   "dueDate": "timestamp",
--   "findings": "text",
--   "resolution": "text"
-- }

-- ============================================================================
-- Social Node Types (children of Social)
-- ============================================================================

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'ActivityPost',
  'Twitter-like activity feed post with replies, shares, and mentions',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Social';

-- Props for ActivityPost:
-- {
--   "userId": "uuid",
--   "graphId": "uuid",
--   "content": "text",
--   "postType": "post" | "reply" | "share" | "announcement",
--   "parentPostId": "uuid",  // For replies
--   "sharedPostId": "uuid",  // For shares
--   "mentionedNodeIds": ["nodeId1", "nodeId2"],
--   "attachmentIds": ["fileId1", "fileId2"],
--   "visibility": "public" | "followers" | "private",
--   "likeCount": number,
--   "replyCount": number,
--   "shareCount": number,
--   "isEdited": boolean,
--   "editedAt": "timestamp"
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'UserPresence',
  'Real-time user presence tracking for collaboration',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Social';

-- Props for UserPresence:
-- {
--   "userId": "uuid",
--   "graphId": "uuid",
--   "status": "online" | "idle" | "offline",
--   "currentNodeId": "uuid",
--   "cursorPosition": {"x": number, "y": number},
--   "lastActivity": "timestamp",
--   "sessionId": "string"
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'GraphInvitation',
  'Invitation to collaborate on a graph',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Social';

-- Props for GraphInvitation:
-- {
--   "graphId": "uuid",
--   "invitedBy": "userId",
--   "invitedEmail": "string",
--   "invitedUserId": "uuid",
--   "role": "viewer" | "editor" | "curator" | "admin",
--   "status": "pending" | "accepted" | "declined" | "expired",
--   "token": "string",
--   "expiresAt": "timestamp",
--   "message": "text"
-- }

-- ============================================================================
-- Curation Node Types (children of Curation)
-- ============================================================================

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'CuratorRole',
  'Four-tier curator role definition (Community, Expert, Senior Expert, Principal)',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Curation';

-- Props for CuratorRole:
-- {
--   "name": "community" | "expert" | "senior_expert" | "principal",
--   "tier": 1 | 2 | 3 | 4,
--   "description": "text",
--   "permissions": ["approve_level_0", "promote_curators", "resolve_disputes"],
--   "requirements": {
--     "minContributions": number,
--     "minAccuracy": number,
--     "yearsActive": number
--   },
--   "isActive": boolean
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'UserCurator',
  'User curator assignment linking user to curator role',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Curation';

-- Props for UserCurator:
-- {
--   "userId": "uuid",
--   "curatorRoleId": "uuid",
--   "assignedBy": "userId",
--   "assignedAt": "timestamp",
--   "specialties": ["physics", "history"],
--   "status": "active" | "suspended" | "revoked",
--   "performanceMetrics": {
--     "approvalsCount": number,
--     "rejectionsCount": number,
--     "accuracyScore": number
--   }
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'CuratorApplication',
  'Application to become a curator',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Curation';

-- Props for CuratorApplication:
-- {
--   "userId": "uuid",
--   "requestedRoleId": "uuid",
--   "statement": "text",
--   "qualifications": "text",
--   "specialties": ["specialty1", "specialty2"],
--   "portfolioUrls": ["url1", "url2"],
--   "status": "pending" | "under_review" | "approved" | "rejected",
--   "reviewedBy": "userId",
--   "reviewedAt": "timestamp",
--   "reviewNotes": "text"
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'CuratorAuditLog',
  'Audit log entry for curator actions',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Curation';

-- Props for CuratorAuditLog:
-- {
--   "curatorId": "userId",
--   "action": "approve" | "reject" | "promote" | "suspend",
--   "targetType": "node" | "edge" | "user" | "challenge",
--   "targetId": "uuid",
--   "reason": "text",
--   "metadata": {},
--   "ipAddress": "string"
-- }

-- ============================================================================
-- Media Node Types (children of Media)
-- ============================================================================

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'MediaJob',
  'Background job for processing audio/video/document files',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Media';

-- Props for MediaJob:
-- {
--   "fileId": "uuid",
--   "jobType": "transcription" | "video_analysis" | "document_parsing",
--   "status": "queued" | "processing" | "completed" | "failed",
--   "progress": number,
--   "startedAt": "timestamp",
--   "completedAt": "timestamp",
--   "error": "string",
--   "results": {
--     "transcript": "text",
--     "summary": "text",
--     "entities": [],
--     "frames": [],
--     "scenes": []
--   },
--   "metadata": {
--     "duration": number,
--     "format": "string",
--     "bitrate": number
--   }
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'DocumentSection',
  'Extracted section from processed document',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Media';

-- Props for DocumentSection:
-- {
--   "documentId": "uuid",
--   "sectionType": "heading" | "paragraph" | "table" | "figure" | "list",
--   "content": "text",
--   "pageNumber": number,
--   "order": number,
--   "bbox": {"x": number, "y": number, "width": number, "height": number}
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'VideoFrame',
  'Extracted frame from video analysis',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Media';

-- Props for VideoFrame:
-- {
--   "videoId": "uuid",
--   "timestamp": number,
--   "frameNumber": number,
--   "imagePath": "string",
--   "sceneId": "uuid",
--   "objects": [{"label": "string", "confidence": number}],
--   "text": "string"
-- }

-- ============================================================================
-- Gamification Node Types (children of Gamification)
-- ============================================================================

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'Achievement',
  'Achievement definition for gamification',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Gamification';

-- Props for Achievement:
-- {
--   "name": "string",
--   "description": "text",
--   "category": "contribution" | "accuracy" | "collaboration" | "milestone",
--   "tier": "bronze" | "silver" | "gold" | "platinum",
--   "points": number,
--   "icon": "string",
--   "criteria": {
--     "type": "node_count" | "edge_count" | "curator_approvals",
--     "threshold": number
--   },
--   "isActive": boolean
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'UserAchievement',
  'User achievement unlock record',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Gamification';

-- Props for UserAchievement:
-- {
--   "userId": "uuid",
--   "achievementId": "uuid",
--   "unlockedAt": "timestamp",
--   "progress": number,
--   "notified": boolean
-- }

-- ============================================================================
-- AI Node Types (children of AI)
-- ============================================================================

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'Conversation',
  'AI assistant conversation session',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'AI';

-- Props for Conversation:
-- {
--   "userId": "uuid",
--   "graphId": "uuid",
--   "title": "string",
--   "model": "string",
--   "messageCount": number,
--   "lastMessageAt": "timestamp",
--   "context": {
--     "nodeIds": ["nodeId1", "nodeId2"],
--     "edgeIds": ["edgeId1", "edgeId2"]
--   }
-- }

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'ConversationMessage',
  'Individual message in AI conversation',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'AI';

-- Props for ConversationMessage:
-- {
--   "conversationId": "uuid",
--   "role": "user" | "assistant" | "system",
--   "content": "text",
--   "model": "string",
--   "tokens": number,
--   "metadata": {
--     "temperature": number,
--     "topP": number,
--     "reasoning": "text"
--   }
-- }

-- ============================================================================
-- Notifications Node Types (children of Notifications)
-- ============================================================================

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'Notification',
  'User notification for activity, challenges, mentions, etc.',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Notifications';

-- Props for Notification:
-- {
--   "userId": "uuid",
--   "type": "mention" | "reply" | "challenge" | "curator_action" | "achievement",
--   "title": "string",
--   "message": "text",
--   "linkType": "node" | "edge" | "post" | "challenge",
--   "linkId": "uuid",
--   "isRead": boolean,
--   "readAt": "timestamp",
--   "priority": "low" | "medium" | "high"
-- }

-- ============================================================================
-- Consensus Node Types (children of Consensus)
-- ============================================================================

INSERT INTO public."NodeTypes" (name, description, parent_node_type_id, created_at, updated_at)
SELECT
  'ConsensusVote',
  'Community vote on challenges, promotions, and curation decisions',
  id,
  NOW(),
  NOW()
FROM public."NodeTypes" WHERE name = 'Consensus';

-- Props for ConsensusVote:
-- {
--   "voterId": "uuid",
--   "targetType": "challenge" | "promotion" | "curator_application",
--   "targetId": "uuid",
--   "voteType": "approve" | "reject" | "abstain",
--   "weight": number,
--   "reasoning": "text",
--   "expertise": ["specialty1", "specialty2"]
-- }

-- ============================================================================
-- Summary
-- ============================================================================
-- Created 9 parent categories:
--   - System, Content, Social, Curation, Media, Gamification, AI, Notifications, Consensus
--
-- Created 23 node types:
--   Content: Challenge, EvidenceFile, FormalInquiry
--   Social: ActivityPost, UserPresence, GraphInvitation
--   Curation: CuratorRole, UserCurator, CuratorApplication, CuratorAuditLog
--   Media: MediaJob, DocumentSection, VideoFrame
--   Gamification: Achievement, UserAchievement
--   AI: Conversation, ConversationMessage
--   Notifications: Notification
--   Consensus: ConsensusVote
--
-- All data stored in JSONB props field - NO NEW TABLES!
-- ============================================================================
