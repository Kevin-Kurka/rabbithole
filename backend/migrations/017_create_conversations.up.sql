-- ============================================================================
-- Migration: Create Conversations Tables
-- Description: AI assistant conversation history with context tracking
-- ============================================================================

-- Conversations Table
CREATE TABLE IF NOT EXISTS public."Conversations" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON public."Conversations"(user_id);
CREATE INDEX idx_conversations_created_at ON public."Conversations"(created_at DESC);
CREATE INDEX idx_conversations_updated_at ON public."Conversations"(updated_at DESC);

COMMENT ON TABLE public."Conversations" IS 'AI assistant conversation sessions';
COMMENT ON COLUMN public."Conversations".context IS 'Conversation context and metadata for AI continuity';

-- Conversation Messages Table
CREATE TABLE IF NOT EXISTS public."ConversationMessages" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public."Conversations"(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_messages_conversation_id ON public."ConversationMessages"(conversation_id);
CREATE INDEX idx_conversation_messages_created_at ON public."ConversationMessages"(created_at);

COMMENT ON TABLE public."ConversationMessages" IS 'Individual messages within AI conversations';
COMMENT ON COLUMN public."ConversationMessages".role IS 'Message role: user, assistant, system';
