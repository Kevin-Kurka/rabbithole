-- ============================================================================
-- Helper function to get embedding configuration from config node
-- ============================================================================
CREATE OR REPLACE FUNCTION get_embedding_config()
RETURNS TABLE (
    enabled BOOLEAN,
    embedding_model TEXT,
    chunk_size INT,
    chunk_overlap INT,
    batch_size INT,
    worker_pool_size INT,
    poll_interval_seconds INT,
    retry_backoff_multiplier NUMERIC,
    ai_service_address TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((n.props->>'enabled')::BOOLEAN, true) AS enabled,
        COALESCE(n.props->>'embedding_model', 'text-embedding-3-small') AS embedding_model,
        COALESCE((n.props->>'chunk_size')::INT, 500) AS chunk_size,
        COALESCE((n.props->>'chunk_overlap')::INT, 50) AS chunk_overlap,
        COALESCE((n.props->>'batch_size')::INT, 10) AS batch_size,
        COALESCE((n.props->>'worker_pool_size')::INT, 5) AS worker_pool_size,
        COALESCE((n.props->>'poll_interval_seconds')::INT, 1) AS poll_interval_seconds,
        COALESCE((n.props->>'retry_backoff_multiplier')::NUMERIC, 2.0) AS retry_backoff_multiplier,
        COALESCE(n.props->>'ai_service_address', 'ai-service:50053') AS ai_service_address
    FROM nodes n
    JOIN node_types nt ON n.node_type_id = nt.id
    WHERE nt.name = 'system:embedding_config'
    ORDER BY n.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_embedding_config IS 'Retrieves current embedding configuration from config node';

-- ============================================================================
-- Trigger function to update meta.diff_log (SYNCHRONOUS)
-- Tracks changes to props field for audit trail
-- ============================================================================
CREATE OR REPLACE FUNCTION update_node_meta_diff_log()
RETURNS TRIGGER AS $$
DECLARE
    diff_entry JSONB;
    old_props JSONB;
    new_props JSONB;
    changed_keys TEXT[];
    key TEXT;
BEGIN
    -- Only process updates, not inserts
    IF TG_OP = 'UPDATE' AND OLD.props IS DISTINCT FROM NEW.props THEN

        -- Build diff object with timestamp
        diff_entry := jsonb_build_object('updated_at', NOW());
        old_props := COALESCE(OLD.props, '{}'::JSONB);
        new_props := COALESCE(NEW.props, '{}'::JSONB);

        -- Find all keys that changed (added, removed, or modified)
        SELECT ARRAY_AGG(DISTINCT key)
        INTO changed_keys
        FROM (
            SELECT key FROM jsonb_each(old_props)
            UNION
            SELECT key FROM jsonb_each(new_props)
        ) AS all_keys
        WHERE old_props->key IS DISTINCT FROM new_props->key;

        -- Add old values for changed keys to diff_entry
        IF changed_keys IS NOT NULL AND array_length(changed_keys, 1) > 0 THEN
            FOREACH key IN ARRAY changed_keys
            LOOP
                IF old_props ? key THEN
                    diff_entry := diff_entry || jsonb_build_object(key, old_props->key);
                ELSE
                    diff_entry := diff_entry || jsonb_build_object(key, NULL);
                END IF;
            END LOOP;

            -- Initialize meta if needed
            IF NEW.meta IS NULL THEN
                NEW.meta := '{}'::JSONB;
            END IF;

            -- Append to diff_log array in meta
            IF NEW.meta ? 'diff_log' THEN
                NEW.meta := jsonb_set(
                    NEW.meta,
                    '{diff_log}',
                    (NEW.meta->'diff_log') || jsonb_build_array(diff_entry)
                );
            ELSE
                NEW.meta := NEW.meta || jsonb_build_object(
                    'diff_log', jsonb_build_array(diff_entry)
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_node_meta_diff_log IS 'Maintains audit log of prop changes in meta.diff_log';

-- ============================================================================
-- Trigger function to queue embedding jobs (ASYNCHRONOUS)
-- Queues node for embedding generation without blocking the transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_embedding_job()
RETURNS TRIGGER AS $$
DECLARE
    config_enabled BOOLEAN;
    node_type_name TEXT;
BEGIN
    -- Get the node type name to check if this is a system node
    SELECT nt.name INTO node_type_name
    FROM node_types nt
    WHERE nt.id = NEW.node_type_id;

    -- Skip embedding for system nodes (avoid infinite loops)
    IF node_type_name LIKE 'system:%' THEN
        RETURN NEW;
    END IF;

    -- Check if embeddings are enabled from config node
    SELECT enabled INTO config_enabled
    FROM get_embedding_config()
    LIMIT 1;

    -- Default to true if config not found
    IF config_enabled IS NULL THEN
        config_enabled := true;
    END IF;

    -- Only queue job if enabled and props exist
    IF config_enabled AND NEW.props IS NOT NULL AND jsonb_typeof(NEW.props) = 'object' THEN
        -- Insert job into queue
        -- Use ON CONFLICT DO NOTHING to prevent duplicate jobs for same node
        -- The unique index ensures only one pending/processing job per node exists
        INSERT INTO sys.embedding_jobs (node_id, props, status, attempts)
        VALUES (NEW.id, NEW.props, 'pending', 0)
        ON CONFLICT (node_id) WHERE status IN ('pending', 'processing') DO NOTHING;

        -- Notify workers that a new job is available (non-blocking)
        PERFORM pg_notify('embedding_job_created', json_build_object(
            'node_id', NEW.id,
            'node_type', node_type_name,
            'queued_at', NOW()
        )::TEXT);
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to queue embedding job for node %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION queue_embedding_job IS 'Queues node for async embedding generation via sys.embedding_jobs';
