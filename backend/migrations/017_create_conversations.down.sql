-- ============================================================================
-- Migration Rollback: Drop Conversations Tables
-- ============================================================================

DROP TABLE IF EXISTS public."ConversationMessages" CASCADE;
DROP TABLE IF EXISTS public."Conversations" CASCADE;
