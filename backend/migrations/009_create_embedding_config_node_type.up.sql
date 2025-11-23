-- Create node_type for embedding configuration
-- Config is stored as a node for consistency, versioning, and auditability

INSERT INTO node_types (id, name, description, props_schema)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,  -- Fixed UUID for system config
    'system:embedding_config',
    'Configuration for the embedding service. Controls chunking, model selection, and worker behavior.',
    '{
        "type": "object",
        "required": ["project_name", "embedding_model"],
        "properties": {
            "project_name": {
                "type": "string",
                "description": "Project identifier for this configuration",
                "default": "default",
                "minLength": 1,
                "maxLength": 255
            },
            "embedding_model": {
                "type": "string",
                "description": "OpenAI embedding model to use",
                "enum": [
                    "text-embedding-ada-002",
                    "text-embedding-3-small",
                    "text-embedding-3-large"
                ],
                "default": "text-embedding-3-small"
            },
            "chunk_size": {
                "type": "integer",
                "description": "Maximum tokens per text chunk",
                "default": 500,
                "minimum": 100,
                "maximum": 8000
            },
            "chunk_overlap": {
                "type": "integer",
                "description": "Token overlap between consecutive chunks",
                "default": 50,
                "minimum": 0,
                "maximum": 500
            },
            "enabled": {
                "type": "boolean",
                "description": "Master switch for embedding generation",
                "default": true
            },
            "batch_size": {
                "type": "integer",
                "description": "Number of texts to embed in one API call",
                "default": 10,
                "minimum": 1,
                "maximum": 100
            },
            "worker_pool_size": {
                "type": "integer",
                "description": "Number of concurrent workers processing jobs",
                "default": 5,
                "minimum": 1,
                "maximum": 20
            },
            "poll_interval_seconds": {
                "type": "integer",
                "description": "How often workers poll for new jobs (seconds)",
                "default": 1,
                "minimum": 1,
                "maximum": 60
            },
            "retry_backoff_multiplier": {
                "type": "number",
                "description": "Exponential backoff multiplier for retries",
                "default": 2.0,
                "minimum": 1.0,
                "maximum": 10.0
            },
            "ai_service_address": {
                "type": "string",
                "description": "gRPC address of AI service",
                "default": "ai-service:50053"
            }
        }
    }'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    props_schema = EXCLUDED.props_schema;

-- Create default embedding configuration node
INSERT INTO nodes (id, node_type_id, props, meta)
VALUES (
    '00000000-0000-0000-0000-000000000002'::UUID,  -- Fixed UUID for default config
    '00000000-0000-0000-0000-000000000001'::UUID,  -- system:embedding_config type
    '{
        "project_name": "default",
        "embedding_model": "text-embedding-3-small",
        "chunk_size": 500,
        "chunk_overlap": 50,
        "enabled": true,
        "batch_size": 10,
        "worker_pool_size": 5,
        "poll_interval_seconds": 1,
        "retry_backoff_multiplier": 2.0,
        "ai_service_address": "ai-service:50053"
    }'::JSONB,
    '{
        "system": true,
        "created_by": "migration",
        "description": "Default embedding configuration for all nodes"
    }'::JSONB
)
ON CONFLICT (id) DO UPDATE SET
    props = EXCLUDED.props,
    updated_at = NOW();

-- Comments
COMMENT ON COLUMN nodes.meta IS 'Metadata field for audit logs (diff_log) and application-specific data';
COMMENT ON COLUMN nodes.ai IS 'AI-generated data: embeddings, summaries, extracted entities, etc.';
