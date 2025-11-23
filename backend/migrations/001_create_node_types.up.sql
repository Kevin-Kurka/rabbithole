-- Create NodeTypes table (Metaschema)
-- Defines the types/classes of nodes in the knowledge graph

CREATE TABLE IF NOT EXISTS node_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    parent_node_type_id UUID REFERENCES node_types(id) ON DELETE SET NULL,
    props JSONB DEFAULT '{}'::jsonb,
    ai VECTOR(1536), -- OpenAI ada-002 embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on parent_node_type_id for hierarchy queries
CREATE INDEX idx_node_types_parent ON node_types(parent_node_type_id);

-- Create GIN index on props for JSONB queries
CREATE INDEX idx_node_types_props ON node_types USING GIN(props);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_node_types_updated_at
    BEFORE UPDATE ON node_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE node_types IS 'Metaschema table defining node types/classes in the knowledge graph';
COMMENT ON COLUMN node_types.id IS 'Unique identifier for the node type';
COMMENT ON COLUMN node_types.name IS 'Human-readable name of the node type (unique)';
COMMENT ON COLUMN node_types.parent_node_type_id IS 'Optional parent node type for type hierarchy';
COMMENT ON COLUMN node_types.props IS 'JSONB properties for schema definition and metadata';
COMMENT ON COLUMN node_types.ai IS 'Vector embedding for semantic search of node types';
