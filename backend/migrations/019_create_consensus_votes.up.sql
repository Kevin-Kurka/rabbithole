-- ============================================================================
-- Migration: Create Consensus Votes Table
-- Description: Track community consensus votes on nodes, edges, and challenges
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ConsensusVotes" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    vote_value INTEGER NOT NULL,
    reasoning TEXT,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Prevent duplicate votes
    CONSTRAINT unique_voter_target UNIQUE (voter_id, target_type, target_id),

    -- Validate vote values
    CONSTRAINT check_vote_value CHECK (vote_value IN (-1, 0, 1))
);

-- Indexes for efficient vote aggregation
CREATE INDEX idx_consensus_votes_target_type ON public."ConsensusVotes"(target_type);
CREATE INDEX idx_consensus_votes_target_id ON public."ConsensusVotes"(target_id);
CREATE INDEX idx_consensus_votes_voter_id ON public."ConsensusVotes"(voter_id);
CREATE INDEX idx_consensus_votes_composite ON public."ConsensusVotes"(target_type, target_id, vote_value);
CREATE INDEX idx_consensus_votes_created_at ON public."ConsensusVotes"(created_at DESC);

-- Comments
COMMENT ON TABLE public."ConsensusVotes" IS 'Community consensus voting on various entities';
COMMENT ON COLUMN public."ConsensusVotes".target_type IS 'Entity type: node, edge, challenge, claim';
COMMENT ON COLUMN public."ConsensusVotes".target_id IS 'UUID of the voted entity';
COMMENT ON COLUMN public."ConsensusVotes".vote_value IS 'Vote: -1 (disagree), 0 (neutral), 1 (agree)';
COMMENT ON COLUMN public."ConsensusVotes".reasoning IS 'Optional explanation for the vote';
