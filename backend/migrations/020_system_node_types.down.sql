-- ============================================================================
-- Migration Rollback: 020_system_node_types
-- Description: Remove all system node types created in 020_system_node_types.up.sql
-- Date: 2025-11-23
-- ============================================================================

-- Delete all child node types first (reverse order of creation)
DELETE FROM public."NodeTypes" WHERE name = 'ConsensusVote';
DELETE FROM public."NodeTypes" WHERE name = 'Notification';
DELETE FROM public."NodeTypes" WHERE name = 'ConversationMessage';
DELETE FROM public."NodeTypes" WHERE name = 'Conversation';
DELETE FROM public."NodeTypes" WHERE name = 'UserAchievement';
DELETE FROM public."NodeTypes" WHERE name = 'Achievement';
DELETE FROM public."NodeTypes" WHERE name = 'VideoFrame';
DELETE FROM public."NodeTypes" WHERE name = 'DocumentSection';
DELETE FROM public."NodeTypes" WHERE name = 'MediaJob';
DELETE FROM public."NodeTypes" WHERE name = 'CuratorAuditLog';
DELETE FROM public."NodeTypes" WHERE name = 'CuratorApplication';
DELETE FROM public."NodeTypes" WHERE name = 'UserCurator';
DELETE FROM public."NodeTypes" WHERE name = 'CuratorRole';
DELETE FROM public."NodeTypes" WHERE name = 'GraphInvitation';
DELETE FROM public."NodeTypes" WHERE name = 'UserPresence';
DELETE FROM public."NodeTypes" WHERE name = 'ActivityPost';
DELETE FROM public."NodeTypes" WHERE name = 'FormalInquiry';
DELETE FROM public."NodeTypes" WHERE name = 'EvidenceFile';
DELETE FROM public."NodeTypes" WHERE name = 'Challenge';

-- Delete parent categories
DELETE FROM public."NodeTypes" WHERE name = 'Consensus';
DELETE FROM public."NodeTypes" WHERE name = 'Notifications';
DELETE FROM public."NodeTypes" WHERE name = 'AI';
DELETE FROM public."NodeTypes" WHERE name = 'Gamification';
DELETE FROM public."NodeTypes" WHERE name = 'Media';
DELETE FROM public."NodeTypes" WHERE name = 'Curation';
DELETE FROM public."NodeTypes" WHERE name = 'Social';
DELETE FROM public."NodeTypes" WHERE name = 'Content';
DELETE FROM public."NodeTypes" WHERE name = 'System';
