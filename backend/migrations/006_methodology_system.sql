-- Migration 006: Methodology System Tables
-- Creates tables for the methodology framework including methodologies, node types, edge types, workflows, and user progress

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS public."UserMethodologyProgress" CASCADE;
DROP TABLE IF EXISTS public."MethodologyPermissions" CASCADE;
DROP TABLE IF EXISTS public."MethodologyWorkflows" CASCADE;
DROP TABLE IF EXISTS public."MethodologyEdgeTypes" CASCADE;
DROP TABLE IF EXISTS public."MethodologyNodeTypes" CASCADE;
DROP TABLE IF EXISTS public."Methodologies" CASCADE;

-- Methodologies table
CREATE TABLE public."Methodologies" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('analytical', 'creative', 'strategic', 'investigative', 'systems', 'custom')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'private', 'shared', 'published', 'deprecated')),
    version INTEGER NOT NULL DEFAULT 1,
    is_system BOOLEAN NOT NULL DEFAULT false,
    icon TEXT,
    color TEXT,
    tags TEXT[],
    config JSONB DEFAULT '{}'::jsonb,
    usage_count INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(3, 2),
    created_by UUID,
    parent_methodology_id UUID REFERENCES public."Methodologies"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Partial unique index for system methodologies
CREATE UNIQUE INDEX idx_unique_system_methodology ON public."Methodologies"(name) WHERE is_system = true;

CREATE INDEX idx_methodologies_category ON public."Methodologies"(category);
CREATE INDEX idx_methodologies_status ON public."Methodologies"(status);
CREATE INDEX idx_methodologies_created_by ON public."Methodologies"(created_by);
CREATE INDEX idx_methodologies_is_system ON public."Methodologies"(is_system);
CREATE INDEX idx_methodologies_tags ON public."Methodologies" USING GIN(tags);

-- MethodologyNodeTypes table
CREATE TABLE public."MethodologyNodeTypes" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id UUID NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    properties_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    required_properties TEXT[] NOT NULL DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_node_type_per_methodology UNIQUE (methodology_id, name)
);

CREATE INDEX idx_methodology_node_types_methodology ON public."MethodologyNodeTypes"(methodology_id);
CREATE INDEX idx_methodology_node_types_display_order ON public."MethodologyNodeTypes"(display_order);

-- MethodologyEdgeTypes table
CREATE TABLE public."MethodologyEdgeTypes" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id UUID NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_directed BOOLEAN NOT NULL DEFAULT true,
    valid_source_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    valid_target_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    line_style TEXT NOT NULL DEFAULT 'solid',
    arrow_style TEXT NOT NULL DEFAULT 'arrow',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_edge_type_per_methodology UNIQUE (methodology_id, name)
);

CREATE INDEX idx_methodology_edge_types_methodology ON public."MethodologyEdgeTypes"(methodology_id);
CREATE INDEX idx_methodology_edge_types_display_order ON public."MethodologyEdgeTypes"(display_order);

-- MethodologyWorkflows table
CREATE TABLE public."MethodologyWorkflows" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id UUID NOT NULL UNIQUE REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_linear BOOLEAN NOT NULL DEFAULT true,
    allow_skip BOOLEAN NOT NULL DEFAULT false,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_methodology_workflows_methodology ON public."MethodologyWorkflows"(methodology_id);

-- UserMethodologyProgress table
CREATE TABLE public."UserMethodologyProgress" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    methodology_id UUID NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    graph_id UUID,
    current_step_id TEXT,
    completed_steps TEXT[] NOT NULL DEFAULT '{}',
    progress_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT unique_user_methodology_graph UNIQUE (user_id, methodology_id, graph_id)
);

CREATE INDEX idx_user_methodology_progress_user ON public."UserMethodologyProgress"(user_id);
CREATE INDEX idx_user_methodology_progress_methodology ON public."UserMethodologyProgress"(methodology_id);
CREATE INDEX idx_user_methodology_progress_graph ON public."UserMethodologyProgress"(graph_id);

-- MethodologyPermissions table
CREATE TABLE public."MethodologyPermissions" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    methodology_id UUID NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'use', 'edit', 'admin')),
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_methodology_permission UNIQUE (methodology_id, user_id)
);

CREATE INDEX idx_methodology_permissions_methodology ON public."MethodologyPermissions"(methodology_id);
CREATE INDEX idx_methodology_permissions_user ON public."MethodologyPermissions"(user_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_methodologies_updated_at BEFORE UPDATE ON public."Methodologies"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_methodology_node_types_updated_at BEFORE UPDATE ON public."MethodologyNodeTypes"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_methodology_edge_types_updated_at BEFORE UPDATE ON public."MethodologyEdgeTypes"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_methodology_workflows_updated_at BEFORE UPDATE ON public."MethodologyWorkflows"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public."Methodologies" IS 'Investigation methodologies that define structured approaches to problem-solving';
COMMENT ON TABLE public."MethodologyNodeTypes" IS 'Defines the types of nodes allowed in a methodology';
COMMENT ON TABLE public."MethodologyEdgeTypes" IS 'Defines the types of edges/relationships allowed in a methodology';
COMMENT ON TABLE public."MethodologyWorkflows" IS 'Optional guided workflows for methodologies';
COMMENT ON TABLE public."UserMethodologyProgress" IS 'Tracks user progress through methodology workflows';
COMMENT ON TABLE public."MethodologyPermissions" IS 'Permissions for sharing and collaborating on custom methodologies';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 006: Methodology system tables created successfully';
END $$;
