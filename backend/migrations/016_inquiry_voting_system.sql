-- ============================================================================
-- Migration 016: Inquiry Voting System (Separate from Credibility)
-- ============================================================================
-- Description: Implements voting system for inquiries that is completely
--              separate from credibility/confidence scoring. Voting shows
--              community opinion (agree/disagree) but NEVER affects the
--              evidence-based confidence scores.
--
-- Key Principle: TRUTH IS NOT DEMOCRATIC
--
-- Author: Inquiry System Architecture Team
-- Date: 2025-01-12
-- Dependencies:
--   - Requires base schema with Users, Inquiries tables
-- ============================================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RENAME: Challenge → Inquiry (Terminology Update)
-- ============================================================================
-- Note: This migration begins the process of renaming "Challenges" to "Inquiries"
-- to reflect the truth-seeking nature of the system.

-- Rename the Inquiries table (from earlier migration) to FormalInquiries to distinguish
-- from simple Q&A inquiries, and add formal evaluation fields

-- First, check if FormalInquiries already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'FormalInquiries') THEN
        -- If the Inquiries table exists but FormalInquiries doesn't, rename it
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Inquiries') THEN
            ALTER TABLE public."Inquiries" RENAME TO "FormalInquiries";
        ELSE
            -- Create FormalInquiries table from scratch
            CREATE TABLE public."FormalInquiries" (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

                -- Target (what is being inquired about)
                target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
                target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,

                -- Inquiry details
                user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT NOT NULL,

                -- Evidence-based evaluation (AI-judged, vote-independent)
                confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
                max_allowed_score DECIMAL(3,2) CHECK (max_allowed_score >= 0.00 AND max_allowed_score <= 1.00),
                ai_determination TEXT,
                ai_rationale TEXT,
                evaluated_at TIMESTAMPTZ,
                evaluated_by VARCHAR(50) DEFAULT 'ai',

                -- Related nodes that constrain confidence score (weakest link rule)
                related_node_ids uuid[] DEFAULT '{}',
                weakest_node_credibility DECIMAL(3,2),

                -- Status tracking
                status TEXT DEFAULT 'open' CHECK (status IN ('open', 'evaluating', 'evaluated', 'resolved', 'withdrawn')),

                -- Timestamps
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now(),
                resolved_at TIMESTAMPTZ,

                -- Constraint: Must target either node or edge, not both
                CONSTRAINT either_node_or_edge CHECK (
                    (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
                    (target_node_id IS NULL AND target_edge_id IS NOT NULL)
                )
            );

            -- Create indexes
            CREATE INDEX idx_formal_inquiries_target_node ON public."FormalInquiries" (target_node_id) WHERE target_node_id IS NOT NULL;
            CREATE INDEX idx_formal_inquiries_target_edge ON public."FormalInquiries" (target_edge_id) WHERE target_edge_id IS NOT NULL;
            CREATE INDEX idx_formal_inquiries_user ON public."FormalInquiries" (user_id);
            CREATE INDEX idx_formal_inquiries_status ON public."FormalInquiries" (status);
            CREATE INDEX idx_formal_inquiries_created ON public."FormalInquiries" (created_at DESC);
            CREATE INDEX idx_formal_inquiries_confidence ON public."FormalInquiries" (confidence_score DESC) WHERE confidence_score IS NOT NULL;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- TABLE: InquiryVotes
-- ============================================================================
-- Voting system for inquiries - shows community opinion (NOT evidence quality)
-- CRITICAL: Vote counts do NOT affect confidence scores

CREATE TABLE IF NOT EXISTS public."InquiryVotes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    inquiry_id uuid NOT NULL REFERENCES public."FormalInquiries"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Vote type: simple agree/disagree (no reputation weighting)
    vote_type TEXT NOT NULL CHECK (vote_type IN ('agree', 'disagree')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- One vote per user per inquiry
    CONSTRAINT unique_user_inquiry_vote UNIQUE (inquiry_id, user_id)
);

-- Create indexes for InquiryVotes
CREATE INDEX idx_inquiry_votes_inquiry ON public."InquiryVotes" (inquiry_id);
CREATE INDEX idx_inquiry_votes_user ON public."InquiryVotes" (user_id);
CREATE INDEX idx_inquiry_votes_type ON public."InquiryVotes" (vote_type);
CREATE INDEX idx_inquiry_votes_created ON public."InquiryVotes" (created_at DESC);

-- ============================================================================
-- MATERIALIZED VIEW: InquiryVoteStats
-- ============================================================================
-- Fast access to vote statistics per inquiry
-- NOTE: This is ONLY for showing community opinion, NOT for AI evaluation

CREATE MATERIALIZED VIEW IF NOT EXISTS public."InquiryVoteStats" AS
SELECT
    inquiry_id,
    COUNT(*) FILTER (WHERE vote_type = 'agree') AS agree_count,
    COUNT(*) FILTER (WHERE vote_type = 'disagree') AS disagree_count,
    COUNT(*) AS total_votes,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE vote_type = 'agree') / NULLIF(COUNT(*), 0),
        1
    ) AS agree_percentage,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE vote_type = 'disagree') / NULLIF(COUNT(*), 0),
        1
    ) AS disagree_percentage
FROM public."InquiryVotes"
GROUP BY inquiry_id;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_inquiry_vote_stats_inquiry ON public."InquiryVoteStats" (inquiry_id);

-- ============================================================================
-- FUNCTION: refresh_inquiry_vote_stats
-- ============================================================================
-- Refreshes the materialized view when votes change

CREATE OR REPLACE FUNCTION refresh_inquiry_vote_stats()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public."InquiryVoteStats";
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-refresh vote stats on vote changes
-- ============================================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS refresh_vote_stats ON public."InquiryVotes";

-- Create trigger
CREATE TRIGGER refresh_vote_stats
AFTER INSERT OR UPDATE OR DELETE ON public."InquiryVotes"
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_inquiry_vote_stats();

-- ============================================================================
-- FUNCTION: calculate_confidence_score_ceiling
-- ============================================================================
-- Implements the "weakest link" rule: confidence score can NEVER exceed
-- the lowest credibility of any related node

CREATE OR REPLACE FUNCTION calculate_confidence_score_ceiling(p_inquiry_id uuid)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    v_related_node_ids uuid[];
    v_min_credibility DECIMAL(3,2);
BEGIN
    -- Get related node IDs from the inquiry
    SELECT related_node_ids INTO v_related_node_ids
    FROM public."FormalInquiries"
    WHERE id = p_inquiry_id;

    -- If no related nodes, return 1.00 (no ceiling)
    IF v_related_node_ids IS NULL OR array_length(v_related_node_ids, 1) IS NULL THEN
        RETURN 1.00;
    END IF;

    -- Find minimum credibility among related nodes
    SELECT MIN(credibility) INTO v_min_credibility
    FROM public."Nodes"
    WHERE id = ANY(v_related_node_ids);

    -- Return the ceiling (minimum credibility)
    RETURN COALESCE(v_min_credibility, 1.00);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: apply_confidence_score_ceiling
-- ============================================================================
-- Applies the weakest link rule when setting confidence scores

CREATE OR REPLACE FUNCTION apply_confidence_score_ceiling()
RETURNS TRIGGER AS $$
DECLARE
    v_max_allowed_score DECIMAL(3,2);
BEGIN
    -- Calculate the ceiling based on weakest related node
    v_max_allowed_score := calculate_confidence_score_ceiling(NEW.id);

    -- Update max_allowed_score
    NEW.max_allowed_score := v_max_allowed_score;

    -- If confidence_score exceeds ceiling, cap it
    IF NEW.confidence_score IS NOT NULL AND NEW.confidence_score > v_max_allowed_score THEN
        NEW.confidence_score := v_max_allowed_score;
    END IF;

    -- Store weakest node credibility for audit trail
    NEW.weakest_node_credibility := v_max_allowed_score;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Enforce confidence score ceiling
-- ============================================================================

DROP TRIGGER IF EXISTS enforce_confidence_ceiling ON public."FormalInquiries";

CREATE TRIGGER enforce_confidence_ceiling
BEFORE INSERT OR UPDATE OF confidence_score, related_node_ids ON public."FormalInquiries"
FOR EACH ROW
EXECUTE FUNCTION apply_confidence_score_ceiling();

-- ============================================================================
-- VIEW: InquiryWithVotesView
-- ============================================================================
-- Shows inquiries with both credibility (evidence-based) and voting (opinion)
-- Clearly separates the two concepts

CREATE OR REPLACE VIEW public."InquiryWithVotesView" AS
SELECT
    i.id,
    i.target_node_id,
    i.target_edge_id,
    i.user_id,
    i.title,
    i.description,
    i.content,

    -- EVIDENCE-BASED CREDIBILITY (AI-judged, vote-independent)
    i.confidence_score,
    i.max_allowed_score,
    i.weakest_node_credibility,
    i.ai_determination,
    i.ai_rationale,
    i.evaluated_at,
    i.evaluated_by,

    -- COMMUNITY OPINION (voting, does NOT affect credibility)
    COALESCE(vs.agree_count, 0) AS agree_count,
    COALESCE(vs.disagree_count, 0) AS disagree_count,
    COALESCE(vs.total_votes, 0) AS total_votes,
    COALESCE(vs.agree_percentage, 0) AS agree_percentage,
    COALESCE(vs.disagree_percentage, 0) AS disagree_percentage,

    i.status,
    i.created_at,
    i.updated_at,
    i.resolved_at
FROM public."FormalInquiries" i
LEFT JOIN public."InquiryVoteStats" vs ON i.id = vs.inquiry_id
ORDER BY i.created_at DESC;

-- ============================================================================
-- SECURITY: Ensure AI context NEVER sees vote data
-- ============================================================================
-- This is a documentation comment - in application code, ensure the AI
-- evaluation service context ONLY includes:
--   - inquiry.content
--   - inquiry.related_nodes (with their credibility)
--   - inquiry.ai_determination (previous evaluation)
--
-- AI context MUST NEVER include:
--   - vote_count, agree_count, disagree_count
--   - agree_percentage, disagree_percentage
--   - user_reputation, social_metrics
-- ============================================================================

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public."InquiryVotes" TO backend_app;
GRANT SELECT ON public."InquiryVoteStats" TO backend_app;
GRANT SELECT ON public."InquiryWithVotesView" TO backend_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO backend_app;

-- Readonly access for analytics
GRANT SELECT ON public."InquiryVotes" TO readonly_user;
GRANT SELECT ON public."InquiryVoteStats" TO readonly_user;
GRANT SELECT ON public."InquiryWithVotesView" TO readonly_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries:
-- SELECT * FROM public."InquiryWithVotesView" LIMIT 5;
-- SELECT * FROM public."InquiryVoteStats" LIMIT 5;
-- SELECT calculate_confidence_score_ceiling('some-inquiry-id');

COMMENT ON TABLE public."InquiryVotes" IS 'Community voting on inquiries - shows opinion, NOT evidence quality. Votes do NOT affect confidence scores.';
COMMENT ON MATERIALIZED VIEW public."InquiryVoteStats" IS 'Aggregated vote statistics for inquiries - community opinion only, not truth determination.';
COMMENT ON FUNCTION calculate_confidence_score_ceiling IS 'Implements weakest link rule: confidence score capped by lowest related node credibility.';
COMMENT ON VIEW public."InquiryWithVotesView" IS 'Shows inquiries with separated credibility (AI-judged) and voting (community opinion) metrics.';
