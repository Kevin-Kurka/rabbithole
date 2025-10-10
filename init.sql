-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for defining types of nodes
CREATE TABLE IF NOT EXISTS public."NodeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    parent_node_type_id uuid REFERENCES public."NodeTypes"(id)
);

-- Table for defining types of edges
CREATE TABLE IF NOT EXISTS public."EdgeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    source_node_type_id uuid REFERENCES public."NodeTypes"(id),
    target_node_type_id uuid REFERENCES public."NodeTypes"(id)
);

-- Table for graphs
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

-- Main table for storing all node instances
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

-- Main table for storing all edge instances (relationships)
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

-- Table for storing challenges against nodes or edges
CREATE TABLE IF NOT EXISTS public."Challenges" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open',
    rebuttal_claim TEXT,
    rebuttal_grounds JSONB,
    rebuttal_warrant TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT either_node_or_edge CHECK (target_node_id IS NOT NULL OR target_edge_id IS NOT NULL)
);

-- Table for storing users
CREATE TABLE IF NOT EXISTS public."Users" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for storing comments
CREATE TABLE IF NOT EXISTS public."Comments" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    author_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT either_node_or_edge_comment CHECK (target_node_id IS NOT NULL OR target_edge_id IS NOT NULL)
);

-- Indexes for foreign keys to improve query performance
CREATE INDEX ON public."Graphs" (level);
CREATE INDEX ON public."Graphs" (created_by);
CREATE INDEX ON public."Nodes" (graph_id);
CREATE INDEX ON public."Nodes" (node_type_id);
CREATE INDEX ON public."Nodes" (primary_source_id);
CREATE INDEX ON public."Nodes" (is_level_0);
CREATE INDEX ON public."Nodes" (created_by);
CREATE INDEX ON public."Edges" (graph_id);
CREATE INDEX ON public."Edges" (edge_type_id);
CREATE INDEX ON public."Edges" (source_node_id);
CREATE INDEX ON public."Edges" (target_node_id);
CREATE INDEX ON public."Edges" (is_level_0);
CREATE INDEX ON public."Edges" (created_by);
CREATE INDEX ON public."Challenges" (target_node_id);
CREATE INDEX ON public."Challenges" (target_edge_id);
CREATE INDEX ON public."Comments" (author_id);
CREATE INDEX ON public."Comments" (target_node_id);
CREATE INDEX ON public."Comments" (target_edge_id);
