-- Migration 011: Graph Versioning and Forking System
-- This migration adds version tracking and forking capabilities to graphs

-- Table for storing graph version snapshots
CREATE TABLE IF NOT EXISTS public."GraphVersions" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    snapshot_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by uuid REFERENCES public."Users"(id),
    CONSTRAINT unique_graph_version UNIQUE (graph_id, version_number)
);

-- Add parent_graph_id column to Graphs table for fork tracking
ALTER TABLE public."Graphs"
ADD COLUMN IF NOT EXISTS parent_graph_id uuid REFERENCES public."Graphs"(id) ON DELETE SET NULL;

-- Add fork metadata column to track fork relationships
ALTER TABLE public."Graphs"
ADD COLUMN IF NOT EXISTS fork_metadata JSONB;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_graph_versions_graph_id ON public."GraphVersions"(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_versions_created_at ON public."GraphVersions"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_graphs_parent_graph_id ON public."Graphs"(parent_graph_id);

-- Function to automatically create a version snapshot when graph is modified
CREATE OR REPLACE FUNCTION create_graph_version_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
    snapshot JSONB;
BEGIN
    -- Only create snapshot for Level 1 graphs (Level 0 is immutable)
    IF NEW.level = 1 THEN
        -- Get the next version number
        SELECT COALESCE(MAX(version_number), 0) + 1
        INTO next_version
        FROM public."GraphVersions"
        WHERE graph_id = NEW.id;

        -- Build snapshot data
        SELECT jsonb_build_object(
            'graph', jsonb_build_object(
                'id', NEW.id,
                'name', NEW.name,
                'description', NEW.description,
                'level', NEW.level,
                'methodology', NEW.methodology,
                'privacy', NEW.privacy,
                'parent_graph_id', NEW.parent_graph_id,
                'updated_at', NEW.updated_at
            ),
            'nodes', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', n.id,
                        'node_type_id', n.node_type_id,
                        'props', n.props,
                        'meta', n.meta,
                        'weight', n.weight,
                        'content_hash', n.content_hash,
                        'primary_source_id', n.primary_source_id,
                        'is_level_0', n.is_level_0,
                        'created_at', n.created_at,
                        'updated_at', n.updated_at
                    )
                ), '[]'::jsonb)
                FROM public."Nodes" n
                WHERE n.graph_id = NEW.id
            ),
            'edges', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', e.id,
                        'edge_type_id', e.edge_type_id,
                        'source_node_id', e.source_node_id,
                        'target_node_id', e.target_node_id,
                        'props', e.props,
                        'meta', e.meta,
                        'weight', e.weight,
                        'is_level_0', e.is_level_0,
                        'created_at', e.created_at,
                        'updated_at', e.updated_at
                    )
                ), '[]'::jsonb)
                FROM public."Edges" e
                WHERE e.graph_id = NEW.id
            )
        ) INTO snapshot;

        -- Insert version snapshot
        INSERT INTO public."GraphVersions" (
            graph_id,
            version_number,
            snapshot_data,
            snapshot_metadata,
            created_by
        ) VALUES (
            NEW.id,
            next_version,
            snapshot,
            jsonb_build_object(
                'trigger_type', TG_OP,
                'snapshot_timestamp', now()
            ),
            NEW.created_by
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create version snapshots on graph updates
-- Note: We don't trigger on INSERT to avoid creating version 1 before any content exists
CREATE TRIGGER trigger_graph_version_snapshot
AFTER UPDATE ON public."Graphs"
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION create_graph_version_snapshot();

-- Function to get version history for a graph
CREATE OR REPLACE FUNCTION get_graph_version_history(target_graph_id uuid)
RETURNS TABLE (
    version_id uuid,
    version_number INTEGER,
    created_at TIMESTAMPTZ,
    created_by uuid,
    snapshot_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gv.id,
        gv.version_number,
        gv.created_at,
        gv.created_by,
        gv.snapshot_metadata
    FROM public."GraphVersions" gv
    WHERE gv.graph_id = target_graph_id
    ORDER BY gv.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all forks of a graph
CREATE OR REPLACE FUNCTION get_graph_forks(target_graph_id uuid)
RETURNS TABLE (
    fork_id uuid,
    fork_name TEXT,
    fork_description TEXT,
    created_at TIMESTAMPTZ,
    created_by uuid,
    fork_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.description,
        g.created_at,
        g.created_by,
        g.fork_metadata
    FROM public."Graphs" g
    WHERE g.parent_graph_id = target_graph_id
    ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get fork ancestry (parent chain)
CREATE OR REPLACE FUNCTION get_graph_ancestry(target_graph_id uuid)
RETURNS TABLE (
    ancestor_id uuid,
    ancestor_name TEXT,
    ancestor_level INTEGER,
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE ancestry AS (
        SELECT
            g.id,
            g.name,
            g.level,
            0 AS depth,
            g.parent_graph_id
        FROM public."Graphs" g
        WHERE g.id = target_graph_id

        UNION ALL

        SELECT
            g.id,
            g.name,
            g.level,
            a.depth + 1,
            g.parent_graph_id
        FROM public."Graphs" g
        INNER JOIN ancestry a ON g.id = a.parent_graph_id
        WHERE a.depth < 10  -- Prevent infinite loops
    )
    SELECT
        a.id,
        a.name,
        a.level,
        a.depth
    FROM ancestry a
    ORDER BY a.depth ASC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE public."GraphVersions" IS 'Stores version snapshots of graph states for rollback and history tracking';
COMMENT ON COLUMN public."Graphs".parent_graph_id IS 'References the parent graph if this graph is a fork';
COMMENT ON COLUMN public."Graphs".fork_metadata IS 'JSONB metadata about the fork (original_version, fork_reason, etc.)';
COMMENT ON FUNCTION create_graph_version_snapshot() IS 'Automatically creates a version snapshot when a graph is updated';
COMMENT ON FUNCTION get_graph_version_history(uuid) IS 'Returns version history for a specific graph';
COMMENT ON FUNCTION get_graph_forks(uuid) IS 'Returns all child forks of a specific graph';
COMMENT ON FUNCTION get_graph_ancestry(uuid) IS 'Returns the parent chain of a forked graph';
