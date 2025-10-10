-- Migration 002: Level 0/1 System Verification
-- This ensures the Level 0/1 distinction is properly set up

-- Verify is_level_0 column exists in Nodes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Nodes'
        AND column_name = 'is_level_0'
    ) THEN
        ALTER TABLE public."Nodes" ADD COLUMN is_level_0 BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Verify is_level_0 column exists in Edges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Edges'
        AND column_name = 'is_level_0'
    ) THEN
        ALTER TABLE public."Edges" ADD COLUMN is_level_0 BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add index on is_level_0 for Nodes if not exists
CREATE INDEX IF NOT EXISTS idx_nodes_is_level_0 ON public."Nodes" (is_level_0);

-- Add index on is_level_0 for Edges if not exists
CREATE INDEX IF NOT EXISTS idx_edges_is_level_0 ON public."Edges" (is_level_0);

-- Create view for Level 0 nodes
CREATE OR REPLACE VIEW public."Level0Nodes" AS
SELECT * FROM public."Nodes" WHERE is_level_0 = true;

-- Create view for Level 1 nodes
CREATE OR REPLACE VIEW public."Level1Nodes" AS
SELECT * FROM public."Nodes" WHERE is_level_0 = false;

-- Migration complete
