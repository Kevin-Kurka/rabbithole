-- Methodology System Database Migration
-- Version: 1.0.0
-- Description: Adds support for investigation methodologies with custom node/edge types

-- ================================================
-- Methodology Categories Enum
-- ================================================
CREATE TYPE methodology_category AS ENUM (
    'analytical',      -- Root cause analysis, problem-solving
    'creative',        -- Ideation, brainstorming
    'strategic',       -- Planning, decision-making
    'investigative',   -- Research, discovery
    'systems',         -- Systems thinking, mapping
    'custom'           -- User-defined methodologies
);

-- ================================================
-- Methodology Status Enum
-- ================================================
CREATE TYPE methodology_status AS ENUM (
    'draft',          -- In development
    'private',        -- Available to creator only
    'shared',         -- Shared with specific users
    'published',      -- Publicly available
    'deprecated'      -- No longer maintained
);

-- ================================================
-- Core Methodologies Table
-- ================================================
CREATE TABLE IF NOT EXISTS public."Methodologies" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category methodology_category NOT NULL,
    status methodology_status NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    is_system BOOLEAN NOT NULL DEFAULT false,  -- Pre-built methodologies
    icon TEXT,                                  -- Icon identifier or URL
    color TEXT,                                  -- Hex color for UI theming
    tags TEXT[],                                 -- Searchable tags

    -- Configuration
    config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Methodology-specific settings

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),

    -- Relationships
    created_by uuid REFERENCES public."Users"(id),
    parent_methodology_id uuid REFERENCES public."Methodologies"(id), -- For versioning/forking

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_system_methodology_name UNIQUE (name, is_system),
    CONSTRAINT valid_version CHECK (version > 0)
);

-- ================================================
-- Methodology Node Types
-- ================================================
CREATE TABLE IF NOT EXISTS public."MethodologyNodeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,

    -- Basic properties
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,                              -- Default color for nodes of this type

    -- Schema definition
    properties_schema JSONB NOT NULL DEFAULT '{}'::jsonb,  -- JSON Schema for properties
    default_properties JSONB DEFAULT '{}'::jsonb,         -- Default values
    required_properties TEXT[],                            -- Required property keys

    -- Behavior configuration
    constraints JSONB DEFAULT '{}'::jsonb,    -- Validation rules and constraints
    suggestions JSONB DEFAULT '{}'::jsonb,    -- Suggested connections and actions

    -- Visual configuration
    visual_config JSONB DEFAULT '{}'::jsonb,  -- Shape, size, styling options

    -- Ordering for UI
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT unique_node_type_per_methodology UNIQUE (methodology_id, name)
);

-- ================================================
-- Methodology Edge Types
-- ================================================
CREATE TABLE IF NOT EXISTS public."MethodologyEdgeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,

    -- Basic properties
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,

    -- Directionality
    is_directed BOOLEAN NOT NULL DEFAULT true,
    is_bidirectional BOOLEAN DEFAULT false,

    -- Valid connections
    valid_source_types JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of node type names
    valid_target_types JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of node type names

    -- Cardinality constraints
    source_cardinality JSONB DEFAULT '{"min": 0, "max": null}'::jsonb,
    target_cardinality JSONB DEFAULT '{"min": 0, "max": null}'::jsonb,

    -- Visual configuration
    line_style TEXT DEFAULT 'solid',          -- solid, dashed, dotted
    line_color TEXT,
    arrow_style TEXT DEFAULT 'arrow',         -- arrow, none, circle, diamond

    -- Properties schema
    properties_schema JSONB DEFAULT '{}'::jsonb,
    default_properties JSONB DEFAULT '{}'::jsonb,

    -- Ordering for UI
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT unique_edge_type_per_methodology UNIQUE (methodology_id, name)
);

-- ================================================
-- Methodology Workflows
-- ================================================
CREATE TABLE IF NOT EXISTS public."MethodologyWorkflows" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,

    -- Workflow definition
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of workflow steps
    initial_canvas_state JSONB DEFAULT '{}'::jsonb,  -- Pre-populated nodes/edges

    -- Configuration
    is_linear BOOLEAN DEFAULT false,           -- Sequential vs. flexible workflow
    allow_skip BOOLEAN DEFAULT true,           -- Can skip steps
    require_completion BOOLEAN DEFAULT false,  -- Must complete all steps

    -- Help content
    instructions TEXT,
    example_graph_id uuid REFERENCES public."Graphs"(id),
    tutorial_url TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT one_workflow_per_methodology UNIQUE (methodology_id)
);

-- ================================================
-- Methodology Templates (Marketplace)
-- ================================================
CREATE TABLE IF NOT EXISTS public."MethodologyTemplates" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id),

    -- Marketplace metadata
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    thumbnail_url TEXT,
    preview_data JSONB,                        -- Sample nodes/edges for preview

    -- Pricing (for future monetization)
    price DECIMAL(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',

    -- Statistics
    download_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,

    -- Visibility
    is_featured BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,         -- Verified by platform

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT one_template_per_methodology UNIQUE (methodology_id)
);

-- ================================================
-- User Methodology Progress (Workflow tracking)
-- ================================================
CREATE TABLE IF NOT EXISTS public."UserMethodologyProgress" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id),

    -- Progress tracking
    current_step INTEGER DEFAULT 0,
    completed_steps JSONB DEFAULT '[]'::jsonb,  -- Array of completed step IDs
    step_data JSONB DEFAULT '{}'::jsonb,        -- Data collected at each step

    -- Status
    status TEXT CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_progress_per_user_graph UNIQUE (user_id, graph_id)
);

-- ================================================
-- Methodology Permissions (Sharing)
-- ================================================
CREATE TABLE IF NOT EXISTS public."MethodologyPermissions" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Permission levels
    can_view BOOLEAN DEFAULT true,
    can_fork BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,

    -- Sharing metadata
    shared_by uuid REFERENCES public."Users"(id),
    shared_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,                     -- For temporary sharing

    -- Constraints
    CONSTRAINT unique_permission_per_user_methodology UNIQUE (methodology_id, user_id)
);

-- ================================================
-- Indexes for Performance
-- ================================================
CREATE INDEX idx_methodologies_category ON public."Methodologies" (category);
CREATE INDEX idx_methodologies_status ON public."Methodologies" (status);
CREATE INDEX idx_methodologies_created_by ON public."Methodologies" (created_by);
CREATE INDEX idx_methodologies_is_system ON public."Methodologies" (is_system);
CREATE INDEX idx_methodologies_tags ON public."Methodologies" USING GIN (tags);

CREATE INDEX idx_methodology_node_types_methodology ON public."MethodologyNodeTypes" (methodology_id);
CREATE INDEX idx_methodology_edge_types_methodology ON public."MethodologyEdgeTypes" (methodology_id);
CREATE INDEX idx_methodology_workflows_methodology ON public."MethodologyWorkflows" (methodology_id);

CREATE INDEX idx_user_progress_user ON public."UserMethodologyProgress" (user_id);
CREATE INDEX idx_user_progress_graph ON public."UserMethodologyProgress" (graph_id);
CREATE INDEX idx_user_progress_methodology ON public."UserMethodologyProgress" (methodology_id);
CREATE INDEX idx_user_progress_status ON public."UserMethodologyProgress" (status);

CREATE INDEX idx_methodology_permissions_methodology ON public."MethodologyPermissions" (methodology_id);
CREATE INDEX idx_methodology_permissions_user ON public."MethodologyPermissions" (user_id);

-- ================================================
-- Update Graphs table to reference methodology
-- ================================================
ALTER TABLE public."Graphs"
ADD COLUMN IF NOT EXISTS methodology_id uuid REFERENCES public."Methodologies"(id),
ADD COLUMN IF NOT EXISTS methodology_compliance_score DECIMAL(3,2) DEFAULT 0.00
    CHECK (methodology_compliance_score >= 0 AND methodology_compliance_score <= 1);

CREATE INDEX idx_graphs_methodology ON public."Graphs" (methodology_id);

-- ================================================
-- Update Nodes table for methodology types
-- ================================================
ALTER TABLE public."Nodes"
ADD COLUMN IF NOT EXISTS methodology_node_type_id uuid REFERENCES public."MethodologyNodeTypes"(id);

CREATE INDEX idx_nodes_methodology_type ON public."Nodes" (methodology_node_type_id);

-- ================================================
-- Update Edges table for methodology types
-- ================================================
ALTER TABLE public."Edges"
ADD COLUMN IF NOT EXISTS methodology_edge_type_id uuid REFERENCES public."MethodologyEdgeTypes"(id);

CREATE INDEX idx_edges_methodology_type ON public."Edges" (methodology_edge_type_id);

-- ================================================
-- Functions and Triggers
-- ================================================

-- Function to update methodology usage count
CREATE OR REPLACE FUNCTION update_methodology_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.methodology_id IS NOT NULL THEN
        UPDATE public."Methodologies"
        SET usage_count = usage_count + 1
        WHERE id = NEW.methodology_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_methodology_usage
AFTER INSERT ON public."Graphs"
FOR EACH ROW
EXECUTE FUNCTION update_methodology_usage();

-- Function to validate node type constraints
CREATE OR REPLACE FUNCTION validate_node_methodology_type()
RETURNS TRIGGER AS $$
DECLARE
    graph_methodology_id uuid;
    node_methodology_id uuid;
BEGIN
    -- Get the methodology of the graph
    SELECT methodology_id INTO graph_methodology_id
    FROM public."Graphs"
    WHERE id = NEW.graph_id;

    -- If graph has no methodology, allow any node
    IF graph_methodology_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- If node has a methodology type, validate it matches the graph's methodology
    IF NEW.methodology_node_type_id IS NOT NULL THEN
        SELECT methodology_id INTO node_methodology_id
        FROM public."MethodologyNodeTypes"
        WHERE id = NEW.methodology_node_type_id;

        IF node_methodology_id != graph_methodology_id THEN
            RAISE EXCEPTION 'Node type does not match graph methodology';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_node_methodology
BEFORE INSERT OR UPDATE ON public."Nodes"
FOR EACH ROW
EXECUTE FUNCTION validate_node_methodology_type();

-- Similar validation for edges
CREATE OR REPLACE FUNCTION validate_edge_methodology_type()
RETURNS TRIGGER AS $$
DECLARE
    graph_methodology_id uuid;
    edge_methodology_id uuid;
BEGIN
    -- Get the methodology of the graph
    SELECT methodology_id INTO graph_methodology_id
    FROM public."Graphs"
    WHERE id = NEW.graph_id;

    -- If graph has no methodology, allow any edge
    IF graph_methodology_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- If edge has a methodology type, validate it matches the graph's methodology
    IF NEW.methodology_edge_type_id IS NOT NULL THEN
        SELECT methodology_id INTO edge_methodology_id
        FROM public."MethodologyEdgeTypes"
        WHERE id = NEW.methodology_edge_type_id;

        IF edge_methodology_id != graph_methodology_id THEN
            RAISE EXCEPTION 'Edge type does not match graph methodology';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_edge_methodology
BEFORE INSERT OR UPDATE ON public."Edges"
FOR EACH ROW
EXECUTE FUNCTION validate_edge_methodology_type();