-- Create EdgeTypes table (Metaschema)
-- Defines the types/classes of edges/relationships in the knowledge graph

CREATE TABLE IF NOT EXISTS edge_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    source_node_type_id UUID REFERENCES node_types(id) ON DELETE CASCADE,
    target_node_type_id UUID REFERENCES node_types(id) ON DELETE CASCADE,
    props JSONB DEFAULT '{}'::jsonb,
    ai VECTOR(1536), -- OpenAI ada-002 embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for foreign keys
CREATE INDEX idx_edge_types_source ON edge_types(source_node_type_id);
CREATE INDEX idx_edge_types_target ON edge_types(target_node_type_id);

-- Create GIN index on props for JSONB queries
CREATE INDEX idx_edge_types_props ON edge_types USING GIN(props);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_edge_types_updated_at
    BEFORE UPDATE ON edge_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE edge_types IS 'Metaschema table defining edge/relationship types in the knowledge graph';
COMMENT ON COLUMN edge_types.id IS 'Unique identifier for the edge type';
COMMENT ON COLUMN edge_types.name IS 'Human-readable name of the edge type (unique)';
COMMENT ON COLUMN edge_types.source_node_type_id IS 'Optional constraint on source node type';
COMMENT ON COLUMN edge_types.target_node_type_id IS 'Optional constraint on target node type';
COMMENT ON COLUMN edge_types.props IS 'JSONB properties for schema definition and metadata';
COMMENT ON COLUMN edge_types.ai IS 'Vector embedding for semantic search of edge types';
