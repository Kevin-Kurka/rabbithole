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

-- Main table for storing all node instances
CREATE TABLE IF NOT EXISTS public."Nodes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type_id uuid NOT NULL REFERENCES public."NodeTypes"(id),
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    weight REAL DEFAULT 0.0 CHECK (weight >= 0.0 AND weight <= 1.0),
    content_hash TEXT,
    primary_source_id uuid REFERENCES public."Nodes"(id)
);

-- Main table for storing all edge instances (relationships)
CREATE TABLE IF NOT EXISTS public."Edges" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_type_id uuid NOT NULL REFERENCES public."EdgeTypes"(id),
    source_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    weight REAL DEFAULT 0.0 CHECK (weight >= 0.0 AND weight <= 1.0)
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

-- Create HNSW indexes for fast vector similarity search
CREATE INDEX ON public."Nodes" USING hnsw (ai vector_cosine_ops);
CREATE INDEX ON public."Edges" USING hnsw (ai vector_cosine_ops);

-- Indexes for foreign keys to improve query performance
CREATE INDEX ON public."Nodes" (node_type_id);
CREATE INDEX ON public."Nodes" (primary_source_id);
CREATE INDEX ON public."Edges" (edge_type_id);
CREATE INDEX ON public."Edges" (source_node_id);
CREATE INDEX ON public."Edges" (target_node_id);
CREATE INDEX ON public."Challenges" (target_node_id);
CREATE INDEX ON public."Challenges" (target_edge_id);

-- Table for storing users
CREATE TABLE IF NOT EXISTS public."Users" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
