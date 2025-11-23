-- Create Nodes table (Data Graph)
-- Stores actual node instances in the knowledge graph

CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type_id UUID NOT NULL REFERENCES node_types(id) ON DELETE RESTRICT,
    props JSONB DEFAULT '{}'::jsonb,
    ai VECTOR(1536), -- OpenAI ada-002 embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on node_type_id for filtering by type
CREATE INDEX idx_nodes_node_type ON nodes(node_type_id);

-- Create GIN index on props for JSONB queries
CREATE INDEX idx_nodes_props ON nodes USING GIN(props);

-- Create index on created_at for temporal queries
CREATE INDEX idx_nodes_created_at ON nodes(created_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE nodes IS 'Data graph table storing node instances';
COMMENT ON COLUMN nodes.id IS 'Unique identifier for the node';
COMMENT ON COLUMN nodes.node_type_id IS 'Type of this node (foreign key to node_types)';
COMMENT ON COLUMN nodes.props IS 'JSONB properties containing node data';
COMMENT ON COLUMN nodes.ai IS 'Vector embedding for semantic search and RAG';
