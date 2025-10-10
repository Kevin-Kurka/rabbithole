-- ============================================================================
-- Migration 001: Initial Schema
-- ============================================================================
-- Description: Creates the base schema for the Rabbit Hole project
-- Author: Database Architecture Team
-- Date: 2025-10-09
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CORE TABLES (in dependency order)
-- ============================================================================

-- Table for storing users (no dependencies)
CREATE TABLE IF NOT EXISTS public."Users" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for defining types of nodes (no dependencies except Users)
CREATE TABLE IF NOT EXISTS public."NodeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    parent_node_type_id uuid REFERENCES public."NodeTypes"(id)
);

-- Table for defining types of edges (depends on NodeTypes)
CREATE TABLE IF NOT EXISTS public."EdgeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    source_node_type_id uuid REFERENCES public."NodeTypes"(id),
    target_node_type_id uuid REFERENCES public."NodeTypes"(id)
);

-- Table for graphs (depends on Users)
CREATE TABLE IF NOT EXISTS public."Graphs" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level IN (0, 1)),
    methodology TEXT,
    privacy TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('private', 'unlisted', 'public')),
    created_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Main table for storing all node instances (depends on Graphs, NodeTypes, Users)
CREATE TABLE IF NOT EXISTS public."Nodes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    node_type_id uuid NOT NULL REFERENCES public."NodeTypes"(id),
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    weight REAL DEFAULT 0.0 CHECK (weight >= 0.0 AND weight <= 1.0),
    content_hash TEXT,
    primary_source_id uuid REFERENCES public."Nodes"(id),
    is_level_0 BOOLEAN NOT NULL DEFAULT false,
    created_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Main table for storing all edge instances (relationships) (depends on Graphs, EdgeTypes, Nodes, Users)
CREATE TABLE IF NOT EXISTS public."Edges" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    edge_type_id uuid NOT NULL REFERENCES public."EdgeTypes"(id),
    source_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    weight REAL DEFAULT 0.0 CHECK (weight >= 0.0 AND weight <= 1.0),
    is_level_0 BOOLEAN NOT NULL DEFAULT false,
    created_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for storing challenges against nodes or edges (depends on Nodes, Edges)
CREATE TABLE IF NOT EXISTS public."Challenges" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open',
    rebuttal_claim TEXT,
    rebuttal_grounds JSONB,
    rebuttal_warrant TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT either_node_or_edge CHECK (
        (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
        (target_node_id IS NULL AND target_edge_id IS NOT NULL)
    )
);

-- Table for storing comments (depends on Users, Nodes, Edges)
CREATE TABLE IF NOT EXISTS public."Comments" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    author_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT either_node_or_edge_comment CHECK (
        (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
        (target_node_id IS NULL AND target_edge_id IS NOT NULL)
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Graphs indexes
CREATE INDEX IF NOT EXISTS idx_graphs_level ON public."Graphs" (level);
CREATE INDEX IF NOT EXISTS idx_graphs_created_by ON public."Graphs" (created_by);

-- Nodes indexes
CREATE INDEX IF NOT EXISTS idx_nodes_graph_id ON public."Nodes" (graph_id);
CREATE INDEX IF NOT EXISTS idx_nodes_node_type_id ON public."Nodes" (node_type_id);
CREATE INDEX IF NOT EXISTS idx_nodes_primary_source_id ON public."Nodes" (primary_source_id);
CREATE INDEX IF NOT EXISTS idx_nodes_is_level_0 ON public."Nodes" (is_level_0);
CREATE INDEX IF NOT EXISTS idx_nodes_created_by ON public."Nodes" (created_by);

-- Edges indexes
CREATE INDEX IF NOT EXISTS idx_edges_graph_id ON public."Edges" (graph_id);
CREATE INDEX IF NOT EXISTS idx_edges_edge_type_id ON public."Edges" (edge_type_id);
CREATE INDEX IF NOT EXISTS idx_edges_source_node_id ON public."Edges" (source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target_node_id ON public."Edges" (target_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_is_level_0 ON public."Edges" (is_level_0);
CREATE INDEX IF NOT EXISTS idx_edges_created_by ON public."Edges" (created_by);

-- Challenges indexes
CREATE INDEX IF NOT EXISTS idx_challenges_target_node_id ON public."Challenges" (target_node_id);
CREATE INDEX IF NOT EXISTS idx_challenges_target_edge_id ON public."Challenges" (target_edge_id);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public."Comments" (author_id);
CREATE INDEX IF NOT EXISTS idx_comments_target_node_id ON public."Comments" (target_node_id);
CREATE INDEX IF NOT EXISTS idx_comments_target_edge_id ON public."Comments" (target_edge_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for Level 0 nodes
CREATE OR REPLACE VIEW public."Level0Nodes" AS
SELECT * FROM public."Nodes" WHERE is_level_0 = true;

-- View for Level 1 nodes
CREATE OR REPLACE VIEW public."Level1Nodes" AS
SELECT * FROM public."Nodes" WHERE is_level_0 = false;

-- View for Level 0 edges
CREATE OR REPLACE VIEW public."Level0Edges" AS
SELECT * FROM public."Edges" WHERE is_level_0 = true;

-- View for Level 1 edges
CREATE OR REPLACE VIEW public."Level1Edges" AS
SELECT * FROM public."Edges" WHERE is_level_0 = false;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
