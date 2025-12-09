-- Add credibility_score to edges
ALTER TABLE edges
ADD COLUMN IF NOT EXISTS credibility_score DOUBLE PRECISION DEFAULT 1.0;

-- Add index for performance in recursive queries
CREATE INDEX IF NOT EXISTS idx_edges_credibility ON edges (credibility_score);