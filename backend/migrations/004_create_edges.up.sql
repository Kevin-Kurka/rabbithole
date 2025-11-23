-- Create Edges table (Data Graph)
-- Stores relationships/edges between nodes in the knowledge graph

CREATE TABLE IF NOT EXISTS edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    edge_type_id UUID NOT NULL REFERENCES edge_types(id) ON DELETE RESTRICT,
    props JSONB DEFAULT '{}'::jsonb,
    ai VECTOR(1536), -- OpenAI ada-002 embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent self-loops (optional constraint, can be removed if self-loops are needed)
    CONSTRAINT edges_no_self_loops CHECK (source_node_id != target_node_id)
);

-- Create indexes for graph traversal (critical for performance)
CREATE INDEX idx_edges_source ON edges(source_node_id);
CREATE INDEX idx_edges_target ON edges(target_node_id);
CREATE INDEX idx_edges_edge_type ON edges(edge_type_id);

-- Composite index for common traversal patterns (source + type)
CREATE INDEX idx_edges_source_type ON edges(source_node_id, edge_type_id);

-- Composite index for reverse traversal (target + type)
CREATE INDEX idx_edges_target_type ON edges(target_node_id, edge_type_id);

-- Create GIN index on props for JSONB queries
CREATE INDEX idx_edges_props ON edges USING GIN(props);

-- Create index on created_at for temporal queries
CREATE INDEX idx_edges_created_at ON edges(created_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_edges_updated_at
    BEFORE UPDATE ON edges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE edges IS 'Data graph table storing edges/relationships between nodes';
COMMENT ON COLUMN edges.id IS 'Unique identifier for the edge';
COMMENT ON COLUMN edges.source_node_id IS 'Source node of the relationship';
COMMENT ON COLUMN edges.target_node_id IS 'Target node of the relationship';
COMMENT ON COLUMN edges.edge_type_id IS 'Type of this edge (foreign key to edge_types)';
COMMENT ON COLUMN edges.props IS 'JSONB properties containing edge data';
COMMENT ON COLUMN edges.ai IS 'Vector embedding for semantic search of relationships';
