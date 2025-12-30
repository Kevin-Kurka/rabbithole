-- ============================================================================
-- CLEANUP: Remove columns that violate the props-only architecture
-- ============================================================================
-- Per CONTRIBUTING.md: ALL DATA MUST BE STORED IN JSONB `props` FIELD - NO EXCEPTIONS
-- This migration removes columns added by migrations 008, 009, 010 that violated
-- the strict 4-table schema requirement.
-- ============================================================================

-- ============================================================================
-- 1. MIGRATE EXISTING DATA TO PROPS (preserve any existing data)
-- ============================================================================

-- Migrate node column data to props
UPDATE nodes
SET props = props || jsonb_build_object(
    'consensusScore', COALESCE(consensus_score, 0.5),
    'credibilityScore', COALESCE(credibility_score, 0.5),
    'lastCredibilityUpdate', COALESCE(last_credibility_update, NOW())::text
)
WHERE consensus_score IS NOT NULL
   OR credibility_score IS NOT NULL
   OR last_credibility_update IS NOT NULL;

-- Migrate edge column data to props
UPDATE edges
SET props = props || jsonb_build_object(
    'consensusScore', COALESCE(consensus_score, 0.5),
    'credibilityScore', COALESCE(credibility_score, 1.0)
)
WHERE consensus_score IS NOT NULL
   OR credibility_score IS NOT NULL;

-- ============================================================================
-- 2. DROP VIOLATING COLUMNS FROM NODES TABLE
-- ============================================================================

ALTER TABLE nodes DROP COLUMN IF EXISTS consensus_score;
ALTER TABLE nodes DROP COLUMN IF EXISTS credibility_score;
ALTER TABLE nodes DROP COLUMN IF EXISTS last_credibility_update;

-- ============================================================================
-- 3. DROP VIOLATING COLUMNS FROM EDGES TABLE
-- ============================================================================

ALTER TABLE edges DROP COLUMN IF EXISTS consensus_score;
ALTER TABLE edges DROP COLUMN IF EXISTS credibility_score;

-- ============================================================================
-- 4. DROP INDEXES ON REMOVED COLUMNS
-- ============================================================================

DROP INDEX IF EXISTS idx_nodes_consensus;
DROP INDEX IF EXISTS idx_edges_credibility;

-- ============================================================================
-- 5. CREATE JSONB EXPRESSION INDEXES FOR PROPS QUERIES
-- ============================================================================
-- These indexes allow efficient queries on credibility/consensus in props

-- Index for credibility score queries on nodes
CREATE INDEX IF NOT EXISTS idx_nodes_props_credibility
ON nodes (((props->>'credibilityScore')::double precision))
WHERE props->>'credibilityScore' IS NOT NULL;

-- Index for consensus score queries on nodes
CREATE INDEX IF NOT EXISTS idx_nodes_props_consensus
ON nodes (((props->>'consensusScore')::double precision))
WHERE props->>'consensusScore' IS NOT NULL;

-- Index for credibility score queries on edges
CREATE INDEX IF NOT EXISTS idx_edges_props_credibility
ON edges (((props->>'credibilityScore')::double precision))
WHERE props->>'credibilityScore' IS NOT NULL;

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS FOR PROPS ACCESS
-- ============================================================================

-- Helper function to get credibility score from props with default
CREATE OR REPLACE FUNCTION get_credibility_score(node_props JSONB)
RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN COALESCE((node_props->>'credibilityScore')::double precision, 0.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to get consensus score from props with default
CREATE OR REPLACE FUNCTION get_consensus_score(node_props JSONB)
RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN COALESCE((node_props->>'consensusScore')::double precision, 0.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to update credibility in props
CREATE OR REPLACE FUNCTION update_credibility_props(
    current_props JSONB,
    new_credibility DOUBLE PRECISION
)
RETURNS JSONB AS $$
BEGIN
    RETURN current_props || jsonb_build_object(
        'credibilityScore', new_credibility,
        'lastCredibilityUpdate', NOW()::text
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to update consensus in props
CREATE OR REPLACE FUNCTION update_consensus_props(
    current_props JSONB,
    new_consensus DOUBLE PRECISION
)
RETURNS JSONB AS $$
BEGIN
    RETURN current_props || jsonb_build_object(
        'consensusScore', new_consensus
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
