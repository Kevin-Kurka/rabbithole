-- Migration: Add Methodologies and related tables
-- Source: frontend/docs/methodology-system/database-migration.sql

-- Methodology categories and status types
CREATE TYPE IF NOT EXISTS methodology_category AS ENUM (
    'analytical',
    'creative',
    'strategic',
    'investigative',
    'systems',
    'custom'
);

CREATE TYPE IF NOT EXISTS methodology_status AS ENUM (
    'draft',
    'private',
    'shared',
    'published',
    'deprecated'
);

-- Core Methodologies Table
CREATE TABLE IF NOT EXISTS public."Methodologies" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category methodology_category NOT NULL,
    status methodology_status NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    is_system BOOLEAN NOT NULL DEFAULT false,
    icon TEXT,
    color TEXT,
    tags TEXT[],
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    created_by uuid REFERENCES public."Users"(id),
    parent_methodology_id uuid REFERENCES public."Methodologies"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ,
    CONSTRAINT unique_system_methodology_name UNIQUE (name, is_system),
    CONSTRAINT valid_version CHECK (version > 0)
);

-- Methodology Node Types
CREATE TABLE IF NOT EXISTS public."MethodologyNodeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    properties_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_properties JSONB DEFAULT '{}'::jsonb,
    required_properties TEXT[],
    constraints JSONB DEFAULT '{}'::jsonb,
    suggestions JSONB DEFAULT '{}'::jsonb,
    visual_config JSONB DEFAULT '{}'::jsonb,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_node_type_per_methodology UNIQUE (methodology_id, name)
);

-- Methodology Edge Types
CREATE TABLE IF NOT EXISTS public."MethodologyEdgeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_directed BOOLEAN NOT NULL DEFAULT true,
    is_bidirectional BOOLEAN DEFAULT false,
    valid_source_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    valid_target_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_cardinality JSONB DEFAULT '{"min": 0, "max": null}'::jsonb,
    target_cardinality JSONB DEFAULT '{"min": 0, "max": null}'::jsonb,
    line_style TEXT DEFAULT 'solid',
    line_color TEXT,
    arrow_style TEXT DEFAULT 'arrow',
    properties_schema JSONB DEFAULT '{}'::jsonb,
    default_properties JSONB DEFAULT '{}'::jsonb,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_edge_type_per_methodology UNIQUE (methodology_id, name)
);

-- Methodology Workflows
CREATE TABLE IF NOT EXISTS public."MethodologyWorkflows" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    initial_canvas_state JSONB DEFAULT '{}'::jsonb,
    is_linear BOOLEAN DEFAULT false,
    allow_skip BOOLEAN DEFAULT true,
    require_completion BOOLEAN DEFAULT false,
    instructions TEXT,
    example_graph_id uuid REFERENCES public."Graphs"(id),
    tutorial_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT one_workflow_per_methodology UNIQUE (methodology_id)
);

-- Methodology Templates
CREATE TABLE IF NOT EXISTS public."MethodologyTemplates" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    thumbnail_url TEXT,
    preview_data JSONB,
    price DECIMAL(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    download_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT one_template_per_methodology UNIQUE (methodology_id)
);

-- User Methodology Progress
CREATE TABLE IF NOT EXISTS public."UserMethodologyProgress" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id),
    current_step INTEGER DEFAULT 0,
    completed_steps JSONB DEFAULT '[]'::jsonb,
    step_data JSONB DEFAULT '{}'::jsonb,
    status TEXT CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    started_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_progress_per_user_graph UNIQUE (user_id, graph_id)
);

-- Methodology Permissions
CREATE TABLE IF NOT EXISTS public."MethodologyPermissions" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id uuid NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public."Users"(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_fork BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    shared_by uuid REFERENCES public."Users"(id),
    shared_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT unique_permission_per_user_methodology UNIQUE (methodology_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_methodologies_category ON public."Methodologies" (category);
CREATE INDEX IF NOT EXISTS idx_methodologies_status ON public."Methodologies" (status);
CREATE INDEX IF NOT EXISTS idx_methodologies_created_by ON public."Methodologies" (created_by);
CREATE INDEX IF NOT EXISTS idx_methodologies_is_system ON public."Methodologies" (is_system);
CREATE INDEX IF NOT EXISTS idx_methodologies_tags ON public."Methodologies" USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_methodology_node_types_methodology ON public."MethodologyNodeTypes" (methodology_id);
CREATE INDEX IF NOT EXISTS idx_methodology_edge_types_methodology ON public."MethodologyEdgeTypes" (methodology_id);
CREATE INDEX IF NOT EXISTS idx_methodology_workflows_methodology ON public."MethodologyWorkflows" (methodology_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public."UserMethodologyProgress" (user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_graph ON public."UserMethodologyProgress" (graph_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_methodology ON public."UserMethodologyProgress" (methodology_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON public."UserMethodologyProgress" (status);

CREATE INDEX IF NOT EXISTS idx_methodology_permissions_methodology ON public."MethodologyPermissions" (methodology_id);
CREATE INDEX IF NOT EXISTS idx_methodology_permissions_user ON public."MethodologyPermissions" (user_id);

-- Alter existing tables to reference methodologies
ALTER TABLE public."Graphs"
ADD COLUMN IF NOT EXISTS methodology_id uuid REFERENCES public."Methodologies"(id),
ADD COLUMN IF NOT EXISTS methodology_compliance_score DECIMAL(3,2) DEFAULT 0.00
    CHECK (methodology_compliance_score >= 0 AND methodology_compliance_score <= 1);

CREATE INDEX IF NOT EXISTS idx_graphs_methodology ON public."Graphs" (methodology_id);

ALTER TABLE public."Nodes"
ADD COLUMN IF NOT EXISTS methodology_node_type_id uuid REFERENCES public."MethodologyNodeTypes"(id);

CREATE INDEX IF NOT EXISTS idx_nodes_methodology_type ON public."Nodes" (methodology_node_type_id);

ALTER TABLE public."Edges"
ADD COLUMN IF NOT EXISTS methodology_edge_type_id uuid REFERENCES public."MethodologyEdgeTypes"(id);

CREATE INDEX IF NOT EXISTS idx_edges_methodology_type ON public."Edges" (methodology_edge_type_id);

-- Triggers and functions
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

CREATE TRIGGER IF NOT EXISTS trigger_update_methodology_usage
AFTER INSERT ON public."Graphs"
FOR EACH ROW
EXECUTE FUNCTION update_methodology_usage();

CREATE OR REPLACE FUNCTION validate_node_methodology_type()
RETURNS TRIGGER AS $$
DECLARE
    graph_methodology_id uuid;
    node_methodology_id uuid;
BEGIN
    SELECT methodology_id INTO graph_methodology_id
    FROM public."Graphs"
    WHERE id = NEW.graph_id;

    IF graph_methodology_id IS NULL THEN
        RETURN NEW;
    END IF;

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

CREATE TRIGGER IF NOT EXISTS trigger_validate_node_methodology
BEFORE INSERT OR UPDATE ON public."Nodes"
FOR EACH ROW
EXECUTE FUNCTION validate_node_methodology_type();

CREATE OR REPLACE FUNCTION validate_edge_methodology_type()
RETURNS TRIGGER AS $$
DECLARE
    graph_methodology_id uuid;
    edge_methodology_id uuid;
BEGIN
    SELECT methodology_id INTO graph_methodology_id
    FROM public."Graphs"
    WHERE id = NEW.graph_id;

    IF graph_methodology_id IS NULL THEN
        RETURN NEW;
    END IF;

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

CREATE TRIGGER IF NOT EXISTS trigger_validate_edge_methodology
BEFORE INSERT OR UPDATE ON public."Edges"
FOR EACH ROW
EXECUTE FUNCTION validate_edge_methodology_type();
