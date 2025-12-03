-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- 2. METASCHEMA LAYER (Definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS node_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    parent_node_type_id UUID REFERENCES node_types(id) ON DELETE SET NULL,
    props JSONB DEFAULT '{}'::jsonb, -- Schema definition (fields, validation)
    meta JSONB DEFAULT '{}'::jsonb,  -- System config (audit, versioning)
    ai VECTOR(1536),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    source_node_type_id UUID REFERENCES node_types(id) ON DELETE CASCADE,
    target_node_type_id UUID REFERENCES node_types(id) ON DELETE CASCADE,
    props JSONB DEFAULT '{}'::jsonb, -- Schema definition
    meta JSONB DEFAULT '{}'::jsonb,  -- System config
    ai VECTOR(1536),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. DATA LAYER (The Graph)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type_id UUID NOT NULL REFERENCES node_types(id) ON DELETE RESTRICT,
    props JSONB DEFAULT '{}'::jsonb, -- Actual Business Data
    meta JSONB DEFAULT '{}'::jsonb,  -- Audit logs, Dirty Flags, Permissions
    ai VECTOR(1536),                 -- Semantic Search Vector

-- HYBRID SEARCH: Generated column for Keyword Search (updates auto-magically)
text_search tsvector 
        GENERATED ALWAYS AS (jsonb_to_tsvector('english', props, '["all"]')) STORED,
    
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- Soft Delete
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    edge_type_id UUID NOT NULL REFERENCES edge_types(id) ON DELETE RESTRICT,
    props JSONB DEFAULT '{}'::jsonb,
    meta JSONB DEFAULT '{}'::jsonb,
    ai VECTOR(1536),

-- HYBRID SEARCH for Edges
text_search tsvector 
        GENERATED ALWAYS AS (jsonb_to_tsvector('english', props, '["all"]')) STORED,

    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT edges_no_self_loops CHECK (source_node_id != target_node_id)
);

-- ============================================================================
-- 4. INDEXING STRATEGY
-- ============================================================================

-- A. Standard FK & Lookup Indexes
CREATE INDEX idx_nodes_type ON nodes (node_type_id);

CREATE INDEX idx_edges_connections ON edges (
    source_node_id,
    target_node_id
);

CREATE INDEX idx_edges_type ON edges (edge_type_id);

-- B. JSONB Indexes (GIN) for high-speed property filtering
CREATE INDEX idx_nodes_props ON nodes USING GIN (props);

CREATE INDEX idx_edges_props ON edges USING GIN (props);
-- Index meta to find dirty flags fast: WHERE meta @> '{"embedding_status": "dirty"}'
CREATE INDEX idx_nodes_meta ON nodes USING GIN (meta);

CREATE INDEX idx_edges_meta ON edges USING GIN (meta);

-- C. Hybrid Search Indexes (Full Text)
CREATE INDEX idx_nodes_fts ON nodes USING GIN (text_search);

CREATE INDEX idx_edges_fts ON edges USING GIN (text_search);

-- D. Vector Indexes (HNSW) - PARTIAL INDEXES
-- Vital Optimization: Do not index archived rows for vector search to save RAM
CREATE INDEX idx_nodes_ai ON nodes USING hnsw (ai vector_cosine_ops)
WHERE
    archived_at IS NULL;

CREATE INDEX idx_edges_ai ON edges USING hnsw (ai vector_cosine_ops)
WHERE
    archived_at IS NULL;

-- ============================================================================
-- 5. AUTOMATION LOGIC (Triggers)
-- ============================================================================

-- A. Timestamp Updater
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B. "Dirty Flag" Automator
-- This function ensures that any time 'props' changes, we flag the row
-- so your AI Worker knows it needs to re-embed this item.
CREATE OR REPLACE FUNCTION flag_embedding_dirty()
RETURNS TRIGGER AS $$
BEGIN
    -- Only flag if:
    -- 1. It is a new record (INSERT)
    -- 2. OR The 'props' column specifically has changed (UPDATE)
    -- We do NOT flag if only 'meta' or 'archived_at' changed.
    IF (TG_OP = 'INSERT') OR (NEW.props IS DISTINCT FROM OLD.props) THEN
        -- Merge the dirty flag into the existing meta JSON
        NEW.meta = COALESCE(NEW.meta, '{}'::jsonb) || '{"embedding_status": "dirty"}'::jsonb;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- C. Graph Integrity (Optional but recommended)
-- Ensures edges obey the schema defined in edge_types
CREATE OR REPLACE FUNCTION validate_edge_types()
RETURNS TRIGGER AS $$
DECLARE
    req_source UUID;
    req_target UUID;
    actual_source UUID;
    actual_target UUID;
BEGIN
    SELECT source_node_type_id, target_node_type_id INTO req_source, req_target
    FROM edge_types WHERE id = NEW.edge_type_id;

    SELECT node_type_id INTO actual_source FROM nodes WHERE id = NEW.source_node_id;
    SELECT node_type_id INTO actual_target FROM nodes WHERE id = NEW.target_node_id;

    IF (req_source IS NOT NULL AND req_source != actual_source) THEN
        RAISE EXCEPTION 'Schema Violation: Edge requires Source Node Type %', req_source;
    END IF;

    IF (req_target IS NOT NULL AND req_target != actual_target) THEN
        RAISE EXCEPTION 'Schema Violation: Edge requires Target Node Type %', req_target;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. APPLY TRIGGERS
-- ============================================================================

-- Apply Timestamp triggers
CREATE TRIGGER set_timestamp_nodes BEFORE UPDATE ON nodes FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_edges BEFORE UPDATE ON edges FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_nt BEFORE UPDATE ON node_types FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_timestamp_et BEFORE UPDATE ON edge_types FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Apply Dirty Flag triggers (Only on Data Layer)
CREATE TRIGGER set_dirty_nodes BEFORE INSERT OR UPDATE ON nodes FOR EACH ROW EXECUTE FUNCTION flag_embedding_dirty();

CREATE TRIGGER set_dirty_edges BEFORE INSERT OR UPDATE ON edges FOR EACH ROW EXECUTE FUNCTION flag_embedding_dirty();

-- Apply Graph Integrity trigger
CREATE TRIGGER check_graph_integrity BEFORE INSERT OR UPDATE ON edges FOR EACH ROW EXECUTE FUNCTION validate_edge_types();