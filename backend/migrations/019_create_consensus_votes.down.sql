-- ============================================================================
-- Migration Rollback: Drop Consensus Votes Table
-- ============================================================================

DROP TABLE IF EXISTS public."ConsensusVotes" CASCADE;
