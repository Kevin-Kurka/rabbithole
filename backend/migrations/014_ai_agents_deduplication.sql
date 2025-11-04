-- Migration 014: AI Agents, Deduplication, and Enhanced Features
-- Adds tables for multi-AI agent system, content deduplication, and supporting infrastructure

-- ============================================================================
-- Agent Execution Logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."AgentExecutionLog" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB,
    confidence REAL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_log_task_id ON public."AgentExecutionLog" (task_id);
CREATE INDEX idx_agent_log_agent_type ON public."AgentExecutionLog" (agent_type);
CREATE INDEX idx_agent_log_created_at ON public."AgentExecutionLog" (created_at DESC);

-- ============================================================================
-- Deduplication Support
-- ============================================================================

-- Add perceptual_hash and canonical_node_id columns to Nodes
ALTER TABLE public."Nodes"
    ADD COLUMN IF NOT EXISTS perceptual_hash TEXT,
    ADD COLUMN IF NOT EXISTS canonical_node_id uuid REFERENCES public."Nodes"(id);

CREATE INDEX IF NOT EXISTS idx_nodes_perceptual_hash ON public."Nodes" (perceptual_hash)
    WHERE perceptual_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nodes_canonical ON public."Nodes" (canonical_node_id)
    WHERE canonical_node_id IS NOT NULL;

-- Merge history tracking
CREATE TABLE IF NOT EXISTS public."MergeHistory" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    merged_node_ids uuid[] NOT NULL,
    strategy JSONB NOT NULL,
    created_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merge_history_canonical ON public."MergeHistory" (canonical_node_id);
CREATE INDEX idx_merge_history_created_at ON public."MergeHistory" (created_at DESC);

-- ============================================================================
-- Federal Rules of Evidence (FRE) Compliance Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."EvidenceValidation" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    validation_result JSONB NOT NULL, -- Stores full FRE compliance results
    overall_score REAL NOT NULL CHECK (overall_score >= 0.0 AND overall_score <= 1.0),
    passed BOOLEAN NOT NULL DEFAULT false,
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    validated_by_agent TEXT,
    UNIQUE(node_id) -- One validation per node (latest)
);

CREATE INDEX idx_evidence_validation_node ON public."EvidenceValidation" (node_id);
CREATE INDEX idx_evidence_validation_score ON public."EvidenceValidation" (overall_score DESC);

-- ============================================================================
-- Promotion Eligibility Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."PromotionEligibility" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    methodology_completion REAL NOT NULL CHECK (methodology_completion >= 0.0 AND methodology_completion <= 1.0),
    community_consensus REAL NOT NULL CHECK (community_consensus >= 0.0 AND community_consensus <= 1.0),
    evidence_quality REAL NOT NULL CHECK (evidence_quality >= 0.0 AND evidence_quality <= 1.0),
    open_challenges INTEGER NOT NULL DEFAULT 0,
    overall_score REAL NOT NULL CHECK (overall_score >= 0.0 AND overall_score <= 1.0),
    eligible BOOLEAN NOT NULL DEFAULT false,
    last_evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id)
);

CREATE INDEX idx_promotion_eligibility_node ON public."PromotionEligibility" (node_id);
CREATE INDEX idx_promotion_eligibility_score ON public."PromotionEligibility" (overall_score DESC);
CREATE INDEX idx_promotion_eligible ON public."PromotionEligibility" (eligible) WHERE eligible = true;

-- ============================================================================
-- Level 0 Promotion Events (Public Ledger)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."PromotionEvents" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    promoted_from_graph_id uuid REFERENCES public."Graphs"(id),
    promotion_type TEXT NOT NULL CHECK (promotion_type IN ('verified_truth', 'verified_false')),
    final_weight REAL NOT NULL CHECK (final_weight = 0.0 OR final_weight = 1.0),
    methodology_completion REAL NOT NULL,
    community_consensus REAL NOT NULL,
    evidence_quality REAL NOT NULL,
    curator_id uuid REFERENCES public."Users"(id),
    curator_notes TEXT,
    promoted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotion_events_node ON public."PromotionEvents" (node_id);
CREATE INDEX idx_promotion_events_promoted_at ON public."PromotionEvents" (promoted_at DESC);
CREATE INDEX idx_promotion_events_type ON public."PromotionEvents" (promotion_type);

-- ============================================================================
-- Challenge Appeals
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ChallengeAppeals" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    appellant_id uuid NOT NULL REFERENCES public."Users"(id),
    new_evidence_id uuid REFERENCES public."Evidence"(id),
    appeal_reasoning TEXT NOT NULL,
    novelty_score REAL, -- AI assessment of evidence novelty
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_by uuid REFERENCES public."Users"(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appeal_challenge ON public."ChallengeAppeals" (challenge_id);
CREATE INDEX idx_appeal_status ON public."ChallengeAppeals" (status);
CREATE INDEX idx_appeal_created_at ON public."ChallengeAppeals" (created_at DESC);

-- ============================================================================
-- Theory Visibility & Sharing
-- ============================================================================

-- Add privacy and sharing fields to Graphs table (if not exists)
ALTER TABLE public."Graphs"
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_unlisted BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS allow_forking BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS parent_graph_id uuid REFERENCES public."Graphs"(id),
    ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fork_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_graphs_public ON public."Graphs" (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_graphs_parent ON public."Graphs" (parent_graph_id) WHERE parent_graph_id IS NOT NULL;

-- ============================================================================
-- Reputation System Enhancements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ReputationHistory" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    change_amount INTEGER NOT NULL, -- Can be positive or negative
    reason TEXT NOT NULL,
    related_entity_type TEXT, -- 'node', 'challenge', 'evidence', etc.
    related_entity_id uuid,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reputation_history_user ON public."ReputationHistory" (user_id);
CREATE INDEX idx_reputation_history_created_at ON public."ReputationHistory" (created_at DESC);

-- Add reputation column to Users if not exists
ALTER TABLE public."Users"
    ADD COLUMN IF NOT EXISTS reputation INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS reputation_tier TEXT DEFAULT 'beginner';

CREATE INDEX IF NOT EXISTS idx_users_reputation ON public."Users" (reputation DESC);

-- ============================================================================
-- Duplicate Detection Support Functions
-- ============================================================================

-- Hamming distance function for perceptual hash comparison
CREATE OR REPLACE FUNCTION hamming_distance(hash1 TEXT, hash2 TEXT)
RETURNS INTEGER AS $$
DECLARE
    distance INTEGER := 0;
    i INTEGER;
BEGIN
    IF length(hash1) != length(hash2) THEN
        RETURN 999; -- Invalid comparison
    END IF;

    FOR i IN 1..length(hash1) LOOP
        IF substring(hash1, i, 1) != substring(hash2, i, 1) THEN
            distance := distance + 1;
        END IF;
    END LOOP;

    RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Vector Indexes for Performance (HNSW for pgvector)
-- ============================================================================

-- Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_nodes_ai_vector ON public."Nodes"
    USING hnsw (ai vector_cosine_ops)
    WHERE ai IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_edges_ai_vector ON public."Edges"
    USING hnsw (ai vector_cosine_ops)
    WHERE ai IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_node_types_ai_vector ON public."NodeTypes"
    USING hnsw (ai vector_cosine_ops)
    WHERE ai IS NOT NULL;

-- ============================================================================
-- Full Text Search Support
-- ============================================================================

-- Add tsvector columns for full-text search
ALTER TABLE public."Nodes"
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search vector on insert/update
CREATE OR REPLACE FUNCTION update_node_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.props->>'label', '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.props->>'description', '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.props::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_update_node_search_vector ON public."Nodes";
CREATE TRIGGER trig_update_node_search_vector
    BEFORE INSERT OR UPDATE OF props ON public."Nodes"
    FOR EACH ROW
    EXECUTE FUNCTION update_node_search_vector();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_nodes_search_vector ON public."Nodes"
    USING gin(search_vector);

-- ============================================================================
-- Anti-Gaming Measures
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."SuspiciousActivity" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public."Users"(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'rapid_voting', 'sock_puppet', 'coordinated_voting', etc.
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ip_address INET,
    metadata JSONB,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suspicious_activity_user ON public."SuspiciousActivity" (user_id);
CREATE INDEX idx_suspicious_activity_unresolved ON public."SuspiciousActivity" (resolved) WHERE resolved = false;
CREATE INDEX idx_suspicious_activity_created_at ON public."SuspiciousActivity" (created_at DESC);

-- ============================================================================
-- Comments & Analytics
-- ============================================================================

-- Enable pg_trgm extension for similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add similarity index for challenge deduplication
CREATE INDEX IF NOT EXISTS idx_challenges_claim_trgm ON public."Challenges"
    USING gin(rebuttal_claim gin_trgm_ops);

COMMENT ON MIGRATION IS 'Migration 014: AI Agents, Deduplication, Enhanced Features, and Level 0 Promotion Pipeline';
