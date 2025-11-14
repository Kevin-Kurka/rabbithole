-- =====================================================
-- Migration: 017_conversational_ai_system.sql
-- Description: Database schema for ConversationalAI service
-- Features:
--   - Conversations table for managing chat sessions
--   - ConversationMessages table for storing chat history
--   - Support for graph-scoped and global conversations
--   - Metadata for extensibility
-- =====================================================

-- =====================================================
-- Conversations Table
-- Stores conversation sessions with optional graph context
-- =====================================================

CREATE TABLE IF NOT EXISTS public."Conversations" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  graph_id UUID REFERENCES public."Graphs"(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT conversation_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
  CONSTRAINT conversation_title_length CHECK (LENGTH(title) <= 200)
);

-- Indexes for efficient queries
CREATE INDEX idx_conversations_user_id ON public."Conversations"(user_id);
CREATE INDEX idx_conversations_graph_id ON public."Conversations"(graph_id) WHERE graph_id IS NOT NULL;
CREATE INDEX idx_conversations_updated_at ON public."Conversations"(updated_at DESC);
CREATE INDEX idx_conversations_user_updated ON public."Conversations"(user_id, updated_at DESC);

-- =====================================================
-- ConversationMessages Table
-- Stores individual messages within conversations
-- =====================================================

CREATE TABLE IF NOT EXISTS public."ConversationMessages" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public."Conversations"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT message_content_not_empty CHECK (LENGTH(TRIM(content)) > 0),
  CONSTRAINT message_content_length CHECK (LENGTH(content) <= 50000)
);

-- Indexes for efficient queries
CREATE INDEX idx_conversation_messages_conversation ON public."ConversationMessages"(conversation_id, created_at ASC);
CREATE INDEX idx_conversation_messages_user ON public."ConversationMessages"(user_id);
CREATE INDEX idx_conversation_messages_created_at ON public."ConversationMessages"(created_at DESC);
CREATE INDEX idx_conversation_messages_role ON public."ConversationMessages"(role);

-- Partial index for user messages only (for analytics)
CREATE INDEX idx_conversation_messages_user_role ON public."ConversationMessages"(conversation_id, created_at ASC)
  WHERE role = 'user';

-- =====================================================
-- Trigger: Update conversation timestamp on new message
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public."Conversations"
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_message_inserted
AFTER INSERT ON public."ConversationMessages"
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Uncomment to create sample conversation for testing
-- NOTE: Replace user_id with actual user ID from your database

/*
DO $$
DECLARE
  sample_user_id UUID;
  sample_conversation_id UUID;
BEGIN
  -- Get first user or create a test user
  SELECT id INTO sample_user_id FROM public."Users" LIMIT 1;

  IF sample_user_id IS NULL THEN
    INSERT INTO public."Users" (id, username, email, password_hash)
    VALUES (uuid_generate_v4(), 'ai_test_user', 'ai_test@example.com', 'hashed_password')
    RETURNING id INTO sample_user_id;
  END IF;

  -- Create sample conversation
  INSERT INTO public."Conversations" (id, user_id, title, metadata)
  VALUES (uuid_generate_v4(), sample_user_id, 'AI Assistant Demo', '{"source": "migration_seed"}'::jsonb)
  RETURNING id INTO sample_conversation_id;

  -- Add sample messages
  INSERT INTO public."ConversationMessages" (conversation_id, user_id, role, content, metadata)
  VALUES
    (sample_conversation_id, sample_user_id, 'user', 'What is the JFK assassination?', '{}'::jsonb),
    (sample_conversation_id, sample_user_id, 'assistant', 'The JFK assassination refers to the killing of President John F. Kennedy on November 22, 1963, in Dallas, Texas. Let me search for relevant information in the knowledge graph...', '{"relevantNodeIds": []}'::jsonb),
    (sample_conversation_id, sample_user_id, 'user', 'Who was Lee Harvey Oswald?', '{}'::jsonb);

  RAISE NOTICE 'Sample conversation created with ID: %', sample_conversation_id;
END $$;
*/

-- =====================================================
-- Utility Views (Optional)
-- =====================================================

-- View: Recent conversations with message count
CREATE OR REPLACE VIEW public."ConversationSummaries" AS
SELECT
  c.id,
  c.user_id,
  c.graph_id,
  c.title,
  c.metadata,
  c.created_at,
  c.updated_at,
  u.username,
  g.name as graph_name,
  COUNT(cm.id) as message_count,
  MAX(cm.created_at) as last_message_at
FROM public."Conversations" c
LEFT JOIN public."Users" u ON c.user_id = u.id
LEFT JOIN public."Graphs" g ON c.graph_id = g.id
LEFT JOIN public."ConversationMessages" cm ON c.id = cm.conversation_id
GROUP BY c.id, c.user_id, c.graph_id, c.title, c.metadata, c.created_at, c.updated_at, u.username, g.name
ORDER BY c.updated_at DESC;

-- =====================================================
-- Cleanup Functions
-- =====================================================

-- Function to delete old conversations (older than N days)
CREATE OR REPLACE FUNCTION cleanup_old_conversations(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public."Conversations"
  WHERE updated_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation statistics
CREATE OR REPLACE FUNCTION get_conversation_stats(target_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_conversations BIGINT,
  total_messages BIGINT,
  avg_messages_per_conversation NUMERIC,
  most_active_day DATE,
  oldest_conversation TIMESTAMPTZ,
  newest_conversation TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT c.id)::BIGINT as total_conversations,
    COUNT(cm.id)::BIGINT as total_messages,
    ROUND(COUNT(cm.id)::NUMERIC / NULLIF(COUNT(DISTINCT c.id), 0), 2) as avg_messages_per_conversation,
    DATE(cm.created_at) as most_active_day,
    MIN(c.created_at) as oldest_conversation,
    MAX(c.created_at) as newest_conversation
  FROM public."Conversations" c
  LEFT JOIN public."ConversationMessages" cm ON c.id = cm.conversation_id
  WHERE target_user_id IS NULL OR c.user_id = target_user_id
  GROUP BY DATE(cm.created_at)
  ORDER BY COUNT(cm.id) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE public."Conversations" IS 'Stores AI conversation sessions with optional graph context';
COMMENT ON TABLE public."ConversationMessages" IS 'Stores individual messages within AI conversations';
COMMENT ON COLUMN public."Conversations".graph_id IS 'Optional graph scope for conversation context';
COMMENT ON COLUMN public."Conversations".metadata IS 'Extensible JSON metadata for custom properties';
COMMENT ON COLUMN public."ConversationMessages".role IS 'Message role: user, assistant, or system';
COMMENT ON COLUMN public."ConversationMessages".metadata IS 'Stores referenced node IDs and model information';
COMMENT ON FUNCTION update_conversation_timestamp() IS 'Automatically updates conversation timestamp when new message is added';
COMMENT ON FUNCTION cleanup_old_conversations(INTEGER) IS 'Deletes conversations older than specified days';
COMMENT ON FUNCTION get_conversation_stats(UUID) IS 'Returns conversation statistics for user or all users';

-- =====================================================
-- Grant Permissions (Adjust as needed for your setup)
-- =====================================================

-- Example: Grant permissions to application role
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public."Conversations" TO app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public."ConversationMessages" TO app_role;
-- GRANT SELECT ON public."ConversationSummaries" TO app_role;
-- GRANT EXECUTE ON FUNCTION cleanup_old_conversations(INTEGER) TO app_role;
-- GRANT EXECUTE ON FUNCTION get_conversation_stats(UUID) TO app_role;

-- =====================================================
-- Migration Complete
-- =====================================================

SELECT 'Migration 017: Conversational AI System - COMPLETED' as status;
