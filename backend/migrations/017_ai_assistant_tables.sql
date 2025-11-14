-- Migration: AI Assistant Resolver Tables
-- Description: Creates tables for conversational AI, claim extraction, and verification
-- Date: 2025-01-13

-- ============================================================================
-- CONVERSATION MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ConversationMessages" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}', -- Array of file IDs
  node_links JSONB, -- Array of linked nodes with metadata
  graph_id UUID REFERENCES public."Graphs"(id) ON DELETE SET NULL,
  node_id UUID REFERENCES public."Nodes"(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_messages_conversation_id ON public."ConversationMessages"(conversation_id);
CREATE INDEX idx_conversation_messages_user_id ON public."ConversationMessages"(user_id);
CREATE INDEX idx_conversation_messages_created_at ON public."ConversationMessages"(created_at DESC);
CREATE INDEX idx_conversation_messages_graph_id ON public."ConversationMessages"(graph_id);

COMMENT ON TABLE public."ConversationMessages" IS 'Stores chat messages between users and AI assistant';
COMMENT ON COLUMN public."ConversationMessages".conversation_id IS 'Unique identifier for conversation thread';
COMMENT ON COLUMN public."ConversationMessages".role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN public."ConversationMessages".node_links IS 'References to nodes mentioned in the message';

-- ============================================================================
-- EXTRACTED CLAIMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ExtractedClaims" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  context TEXT, -- Surrounding text for context
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  category VARCHAR(100) NOT NULL, -- fact, opinion, hypothesis, prediction, etc.
  start_position INTEGER, -- Character position in source text
  end_position INTEGER,
  extracted_by UUID NOT NULL REFERENCES public."Users"(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extracted_claims_file_id ON public."ExtractedClaims"(file_id);
CREATE INDEX idx_extracted_claims_category ON public."ExtractedClaims"(category);
CREATE INDEX idx_extracted_claims_extracted_by ON public."ExtractedClaims"(extracted_by);
CREATE INDEX idx_extracted_claims_confidence ON public."ExtractedClaims"(confidence DESC);

-- Full-text search on claims
CREATE INDEX idx_extracted_claims_text_search ON public."ExtractedClaims"
  USING gin(to_tsvector('english', claim_text || ' ' || COALESCE(context, '')));

COMMENT ON TABLE public."ExtractedClaims" IS 'Claims automatically extracted from evidence files';
COMMENT ON COLUMN public."ExtractedClaims".confidence IS 'AI confidence in claim extraction (0-1)';
COMMENT ON COLUMN public."ExtractedClaims".category IS 'Type of claim: fact, opinion, hypothesis, etc.';

-- ============================================================================
-- CLAIMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."Claims" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_text TEXT NOT NULL,
  source_node_id UUID REFERENCES public."Nodes"(id) ON DELETE SET NULL,
  veracity_score FLOAT CHECK (veracity_score >= 0 AND veracity_score <= 1),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'verified', 'disputed', 'retracted')),
  submitted_by UUID NOT NULL REFERENCES public."Users"(id),
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES public."Users"(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_source_node_id ON public."Claims"(source_node_id);
CREATE INDEX idx_claims_status ON public."Claims"(status);
CREATE INDEX idx_claims_veracity_score ON public."Claims"(veracity_score DESC);
CREATE INDEX idx_claims_submitted_by ON public."Claims"(submitted_by);

-- Full-text search on claims
CREATE INDEX idx_claims_text_search ON public."Claims"
  USING gin(to_tsvector('english', claim_text));

COMMENT ON TABLE public."Claims" IS 'User-submitted or extracted claims requiring verification';
COMMENT ON COLUMN public."Claims".veracity_score IS 'Calculated veracity score from evidence (0-1)';
COMMENT ON COLUMN public."Claims".status IS 'Verification status of the claim';

-- ============================================================================
-- CLAIM VERIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ClaimVerifications" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public."Claims"(id) ON DELETE CASCADE,
  veracity_score FLOAT NOT NULL CHECK (veracity_score >= 0 AND veracity_score <= 1),
  conclusion VARCHAR(50) NOT NULL CHECK (conclusion IN ('verified', 'refuted', 'unverified', 'mixed')),
  reasoning TEXT,
  supporting_evidence_ids UUID[] DEFAULT '{}',
  opposing_evidence_ids UUID[] DEFAULT '{}',
  total_evidence_reviewed INTEGER NOT NULL DEFAULT 0,
  limitations TEXT[],
  verified_by UUID REFERENCES public."Users"(id),
  verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claim_verifications_claim_id ON public."ClaimVerifications"(claim_id);
CREATE INDEX idx_claim_verifications_conclusion ON public."ClaimVerifications"(conclusion);
CREATE INDEX idx_claim_verifications_veracity_score ON public."ClaimVerifications"(veracity_score DESC);

COMMENT ON TABLE public."ClaimVerifications" IS 'Verification results for claims with supporting evidence';
COMMENT ON COLUMN public."ClaimVerifications".conclusion IS 'Final conclusion: verified, refuted, unverified, or mixed';
COMMENT ON COLUMN public."ClaimVerifications".reasoning IS 'AI-generated explanation of verification result';

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- Extend existing AuditLog or create if not exists
CREATE TABLE IF NOT EXISTS public."AuditLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public."Users"(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public."AuditLog"(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public."AuditLog"(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public."AuditLog"(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public."AuditLog"(created_at DESC);

COMMENT ON TABLE public."AuditLog" IS 'Comprehensive audit trail for all system actions';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate claim veracity from evidence
CREATE OR REPLACE FUNCTION calculate_claim_veracity(claim_id_param UUID)
RETURNS FLOAT AS $$
DECLARE
  supporting_weight FLOAT;
  opposing_weight FLOAT;
  total_weight FLOAT;
BEGIN
  -- Get total supporting evidence weight
  SELECT COALESCE(SUM(e.weight * e.confidence), 0)
  INTO supporting_weight
  FROM public."Evidence" e
  WHERE e.content ILIKE '%' || (SELECT claim_text FROM public."Claims" WHERE id = claim_id_param) || '%'
    AND e.evidence_type = 'supporting';

  -- Get total opposing evidence weight
  SELECT COALESCE(SUM(e.weight * e.confidence), 0)
  INTO opposing_weight
  FROM public."Evidence" e
  WHERE e.content ILIKE '%' || (SELECT claim_text FROM public."Claims" WHERE id = claim_id_param) || '%'
    AND e.evidence_type = 'refuting';

  -- Calculate veracity score (0-1)
  total_weight := supporting_weight + opposing_weight;

  IF total_weight = 0 THEN
    RETURN 0.5; -- Neutral if no evidence
  END IF;

  RETURN supporting_weight / total_weight;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_claim_veracity IS 'Calculate veracity score for a claim based on supporting/opposing evidence';

-- Function to get recent conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(
  conversation_id_param VARCHAR(255),
  user_id_param UUID,
  limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  role VARCHAR(50),
  content TEXT,
  attachments TEXT[],
  node_links JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.role,
    cm.content,
    cm.attachments,
    cm.node_links,
    cm.created_at
  FROM public."ConversationMessages" cm
  WHERE cm.conversation_id = conversation_id_param
    AND cm.user_id = user_id_param
  ORDER BY cm.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_conversation_messages IS 'Retrieve conversation history for a user';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Conversation messages
DROP TRIGGER IF EXISTS trigger_update_conversation_messages_timestamp ON public."ConversationMessages";
CREATE TRIGGER trigger_update_conversation_messages_timestamp
  BEFORE UPDATE ON public."ConversationMessages"
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Extracted claims
DROP TRIGGER IF EXISTS trigger_update_extracted_claims_timestamp ON public."ExtractedClaims";
CREATE TRIGGER trigger_update_extracted_claims_timestamp
  BEFORE UPDATE ON public."ExtractedClaims"
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Claims
DROP TRIGGER IF EXISTS trigger_update_claims_timestamp ON public."Claims";
CREATE TRIGGER trigger_update_claims_timestamp
  BEFORE UPDATE ON public."Claims"
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- SAMPLE DATA (for development only)
-- ============================================================================

-- Add sample conversation (only if in dev environment)
DO $$
BEGIN
  IF current_setting('server_version_num')::int >= 140000 THEN
    -- PostgreSQL 14+ syntax
    IF EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.environment' AND setting = 'development') THEN
      -- Sample conversation data would go here
      RAISE NOTICE 'Development environment detected - sample data can be added';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- GRANTS (adjust based on your role structure)
-- ============================================================================

-- Grant permissions (adjust user roles as needed)
-- GRANT SELECT, INSERT, UPDATE ON public."ConversationMessages" TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON public."ExtractedClaims" TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON public."Claims" TO app_user;
-- GRANT SELECT, INSERT ON public."ClaimVerifications" TO app_user;
-- GRANT SELECT, INSERT ON public."AuditLog" TO app_user;

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 017_ai_assistant_tables.sql completed successfully';
  RAISE NOTICE 'Created tables: ConversationMessages, ExtractedClaims, Claims, ClaimVerifications, AuditLog (if not exists)';
  RAISE NOTICE 'Created indexes for full-text search and foreign keys';
  RAISE NOTICE 'Created helper functions: calculate_claim_veracity, get_conversation_messages';
END $$;
