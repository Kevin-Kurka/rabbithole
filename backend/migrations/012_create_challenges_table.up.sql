-- ============================================================================
-- Migration: Create Challenges Table
-- Description: Support for challenge system where users can challenge nodes/edges
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."Challenges" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id UUID NOT NULL,
    target_node_id UUID REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id UUID REFERENCES public."Edges"(id) ON DELETE CASCADE,
    challenge_type TEXT NOT NULL,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Ensure at least one target is specified
    CONSTRAINT check_has_target CHECK (
        target_node_id IS NOT NULL OR target_edge_id IS NOT NULL
    )
);

-- Indexes for efficient queries
CREATE INDEX idx_challenges_challenger_id ON public."Challenges"(challenger_id);
CREATE INDEX idx_challenges_target_node_id ON public."Challenges"(target_node_id) WHERE target_node_id IS NOT NULL;
CREATE INDEX idx_challenges_target_edge_id ON public."Challenges"(target_edge_id) WHERE target_edge_id IS NOT NULL;
CREATE INDEX idx_challenges_status ON public."Challenges"(status);
CREATE INDEX idx_challenges_created_at ON public."Challenges"(created_at DESC);

-- Comments
COMMENT ON TABLE public."Challenges" IS 'Stores challenges to nodes and edges for community review';
COMMENT ON COLUMN public."Challenges".challenge_type IS 'Type of challenge: veracity, relevance, etc.';
COMMENT ON COLUMN public."Challenges".status IS 'Challenge status: pending, accepted, rejected, resolved';
