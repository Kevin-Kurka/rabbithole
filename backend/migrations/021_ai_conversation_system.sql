-- Migration 021: AI Conversation System
-- Creates tables for conversational AI, claim extraction, and verification

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE public."Conversations" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public."Conversations" IS 'Stores conversation threads between users and AI assistant';
COMMENT ON COLUMN public."Conversations".title IS 'Optional title for the conversation, can be auto-generated from first message';

-- ============================================================================
-- CONVERSATION MESSAGES TABLE
-- ============================================================================
CREATE TABLE public."ConversationMessages" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id uuid NOT NULL REFERENCES public."Conversations"(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    node_links uuid[], -- Array of node IDs mentioned in response
    embedding vector(768), -- Ollama nomic-embed-text dimension
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public."ConversationMessages" IS 'Stores all messages in conversations with embeddings for semantic search';
COMMENT ON COLUMN public."ConversationMessages".role IS 'Message sender: user (human), assistant (AI), or system (automated)';
COMMENT ON COLUMN public."ConversationMessages".node_links IS 'Array of node UUIDs referenced in this message';
COMMENT ON COLUMN public."ConversationMessages".embedding IS '768-dimensional vector from Ollama nomic-embed-text model';

-- ============================================================================
-- EXTRACTED CLAIMS TABLE
-- ============================================================================
CREATE TABLE public."ExtractedClaims" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id uuid REFERENCES public."EvidenceFiles"(id) ON DELETE SET NULL,
    claim_text TEXT NOT NULL,
    context TEXT, -- Surrounding text for context
    confidence DECIMAL(3,2) CHECK (confidence >= 0.0 AND confidence <= 1.0), -- 0.0-1.0
    claim_type TEXT CHECK (claim_type IN ('factual', 'opinion', 'hypothesis', 'prediction', 'statistical')),
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public."ExtractedClaims" IS 'Claims automatically extracted from uploaded documents';
COMMENT ON COLUMN public."ExtractedClaims".file_id IS 'Source file; nullable if claim comes from other sources';
COMMENT ON COLUMN public."ExtractedClaims".context IS 'Surrounding text from document to provide context';
COMMENT ON COLUMN public."ExtractedClaims".confidence IS 'AI confidence in claim extraction (0.0-1.0)';
COMMENT ON COLUMN public."ExtractedClaims".claim_type IS 'Classification of claim type';

-- ============================================================================
-- CLAIM VERIFICATIONS TABLE
-- ============================================================================
CREATE TABLE public."ClaimVerifications" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id uuid NOT NULL REFERENCES public."ExtractedClaims"(id) ON DELETE CASCADE,
    veracity_score DECIMAL(3,2) CHECK (veracity_score >= 0.0 AND veracity_score <= 1.0), -- 0.0-1.0
    supporting_evidence uuid[], -- Node IDs
    conflicting_evidence uuid[], -- Node IDs
    verification_report JSONB,
    inquiry_id uuid REFERENCES public."FormalInquiries"(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public."ClaimVerifications" IS 'Verification results for extracted claims against knowledge graph';
COMMENT ON COLUMN public."ClaimVerifications".veracity_score IS 'Overall truthfulness score (0.0=false, 1.0=verified true)';
COMMENT ON COLUMN public."ClaimVerifications".supporting_evidence IS 'Array of node UUIDs that support this claim';
COMMENT ON COLUMN public."ClaimVerifications".conflicting_evidence IS 'Array of node UUIDs that contradict this claim';
COMMENT ON COLUMN public."ClaimVerifications".verification_report IS 'Detailed JSON report with reasoning and sources';
COMMENT ON COLUMN public."ClaimVerifications".inquiry_id IS 'Optional link to formal inquiry investigating this claim';

-- ============================================================================
-- CLAIM NODE MATCHES TABLE
-- ============================================================================
CREATE TABLE public."ClaimNodeMatches" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id uuid NOT NULL REFERENCES public."ExtractedClaims"(id) ON DELETE CASCADE,
    node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4) CHECK (similarity_score >= 0.0 AND similarity_score <= 1.0), -- 0.0-1.0
    match_type TEXT CHECK (match_type IN ('semantic', 'exact', 'partial', 'contextual')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(claim_id, node_id)
);

COMMENT ON TABLE public."ClaimNodeMatches" IS 'Links between extracted claims and knowledge graph nodes';
COMMENT ON COLUMN public."ClaimNodeMatches".similarity_score IS 'Cosine similarity or other metric (0.0-1.0)';
COMMENT ON COLUMN public."ClaimNodeMatches".match_type IS 'Type of match: semantic (vector), exact (text), partial (keyword), contextual (related)';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Conversation indexes
CREATE INDEX idx_conversations_user_id ON public."Conversations"(user_id);
CREATE INDEX idx_conversations_created_at ON public."Conversations"(created_at DESC);
CREATE INDEX idx_conversations_updated_at ON public."Conversations"(updated_at DESC);

-- Message indexes
CREATE INDEX idx_messages_conversation_id ON public."ConversationMessages"(conversation_id);
CREATE INDEX idx_messages_created_at ON public."ConversationMessages"(created_at DESC);
CREATE INDEX idx_messages_role ON public."ConversationMessages"(role);

-- HNSW index for message embedding similarity search (cosine distance)
CREATE INDEX idx_messages_embedding_hnsw ON public."ConversationMessages"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Extracted claims indexes
CREATE INDEX idx_claims_file_id ON public."ExtractedClaims"(file_id);
CREATE INDEX idx_claims_claim_type ON public."ExtractedClaims"(claim_type);
CREATE INDEX idx_claims_confidence ON public."ExtractedClaims"(confidence DESC);
CREATE INDEX idx_claims_created_at ON public."ExtractedClaims"(created_at DESC);

-- HNSW index for claim embedding similarity search (cosine distance)
CREATE INDEX idx_claims_embedding_hnsw ON public."ExtractedClaims"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Claim verification indexes
CREATE INDEX idx_verifications_claim_id ON public."ClaimVerifications"(claim_id);
CREATE INDEX idx_verifications_inquiry_id ON public."ClaimVerifications"(inquiry_id);
CREATE INDEX idx_verifications_veracity_score ON public."ClaimVerifications"(veracity_score DESC);
CREATE INDEX idx_verifications_verified_at ON public."ClaimVerifications"(verified_at DESC);

-- GIN index for array searches on supporting/conflicting evidence
CREATE INDEX idx_verifications_supporting_evidence ON public."ClaimVerifications" USING gin(supporting_evidence);
CREATE INDEX idx_verifications_conflicting_evidence ON public."ClaimVerifications" USING gin(conflicting_evidence);

-- Claim-node match indexes
CREATE INDEX idx_matches_claim_id ON public."ClaimNodeMatches"(claim_id);
CREATE INDEX idx_matches_node_id ON public."ClaimNodeMatches"(node_id);
CREATE INDEX idx_matches_similarity_score ON public."ClaimNodeMatches"(similarity_score DESC);
CREATE INDEX idx_matches_match_type ON public."ClaimNodeMatches"(match_type);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Search conversation history using semantic similarity
CREATE OR REPLACE FUNCTION search_conversation_history(
    p_conversation_id uuid,
    p_query_embedding vector(768),
    p_limit integer DEFAULT 10,
    p_threshold decimal DEFAULT 0.7
)
RETURNS TABLE (
    message_id uuid,
    role text,
    content text,
    similarity_score decimal,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.role,
        cm.content,
        ROUND((1 - (cm.embedding <=> p_query_embedding))::numeric, 4) AS similarity_score,
        cm.created_at
    FROM public."ConversationMessages" cm
    WHERE cm.conversation_id = p_conversation_id
        AND cm.embedding IS NOT NULL
        AND (1 - (cm.embedding <=> p_query_embedding)) >= p_threshold
    ORDER BY cm.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_conversation_history IS 'Search conversation messages by semantic similarity to query embedding';

-- Function: Find similar claims using vector similarity
CREATE OR REPLACE FUNCTION find_similar_claims(
    p_claim_embedding vector(768),
    p_threshold decimal DEFAULT 0.8,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    claim_id uuid,
    claim_text text,
    claim_type text,
    confidence decimal,
    similarity_score decimal,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        ec.claim_text,
        ec.claim_type,
        ec.confidence,
        ROUND((1 - (ec.embedding <=> p_claim_embedding))::numeric, 4) AS similarity_score,
        ec.created_at
    FROM public."ExtractedClaims" ec
    WHERE ec.embedding IS NOT NULL
        AND (1 - (ec.embedding <=> p_claim_embedding)) >= p_threshold
    ORDER BY ec.embedding <=> p_claim_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_similar_claims IS 'Find semantically similar claims using vector similarity search';

-- Function: Get claim verification status with evidence summary
CREATE OR REPLACE FUNCTION get_claim_verification_status(p_claim_id uuid)
RETURNS TABLE (
    claim_id uuid,
    claim_text text,
    veracity_score decimal,
    num_supporting integer,
    num_conflicting integer,
    verification_report jsonb,
    verified_at timestamptz,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        ec.claim_text,
        cv.veracity_score,
        COALESCE(array_length(cv.supporting_evidence, 1), 0) AS num_supporting,
        COALESCE(array_length(cv.conflicting_evidence, 1), 0) AS num_conflicting,
        cv.verification_report,
        cv.verified_at,
        CASE
            WHEN cv.veracity_score >= 0.8 THEN 'verified'
            WHEN cv.veracity_score >= 0.5 THEN 'likely_true'
            WHEN cv.veracity_score >= 0.3 THEN 'uncertain'
            WHEN cv.veracity_score < 0.3 THEN 'disputed'
            ELSE 'unverified'
        END AS status
    FROM public."ExtractedClaims" ec
    LEFT JOIN public."ClaimVerifications" cv ON cv.claim_id = ec.id
    WHERE ec.id = p_claim_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_claim_verification_status IS 'Get comprehensive verification status for a claim including evidence counts';

-- Function: Get matched nodes for a claim with similarity scores
CREATE OR REPLACE FUNCTION get_claim_matched_nodes(
    p_claim_id uuid,
    p_min_similarity decimal DEFAULT 0.0
)
RETURNS TABLE (
    node_id uuid,
    node_name text,
    node_type text,
    similarity_score decimal,
    match_type text,
    node_veracity decimal
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.name,
        n.type,
        cnm.similarity_score,
        cnm.match_type,
        n.veracity
    FROM public."ClaimNodeMatches" cnm
    INNER JOIN public."Nodes" n ON n.id = cnm.node_id
    WHERE cnm.claim_id = p_claim_id
        AND cnm.similarity_score >= p_min_similarity
    ORDER BY cnm.similarity_score DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_claim_matched_nodes IS 'Get all nodes matched to a claim with similarity scores';

-- Function: Update conversation updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public."Conversations"
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update conversation timestamp when new message added
CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON public."ConversationMessages"
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

COMMENT ON TRIGGER trigger_update_conversation_timestamp ON public."ConversationMessages" IS 'Automatically updates conversation updated_at when new messages are added';

-- ============================================================================
-- SAMPLE VERIFICATION REPORT JSONB STRUCTURE
-- ============================================================================
COMMENT ON COLUMN public."ClaimVerifications".verification_report IS
'JSON structure: {
  "methodology": "string (e.g., semantic_similarity, expert_review)",
  "sources": [{"node_id": "uuid", "relevance": 0.95, "excerpt": "text"}],
  "reasoning": "string explanation of verification logic",
  "confidence_factors": {
    "source_credibility": 0.9,
    "evidence_strength": 0.85,
    "consistency": 0.95
  },
  "recommendations": ["string", "string"],
  "last_updated": "timestamp"
}';
