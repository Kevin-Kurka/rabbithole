-- Add consensus_score to nodes and edges
ALTER TABLE nodes
ADD COLUMN IF NOT EXISTS consensus_score DOUBLE PRECISION DEFAULT 0.5;

ALTER TABLE edges
ADD COLUMN IF NOT EXISTS consensus_score DOUBLE PRECISION DEFAULT 0.5;

-- Add index for specific queries
CREATE INDEX IF NOT EXISTS idx_nodes_consensus ON nodes (consensus_score);