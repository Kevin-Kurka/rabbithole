-- ============================================================================
-- Migration 017: System Configuration Management
-- ============================================================================
-- Description: Creates tables for managing system-wide configuration settings
--              with audit logging and security features
-- Author: Admin Configuration Team
-- Date: 2025-11-13
-- ============================================================================

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SYSTEM CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."SystemConfiguration" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL, -- Stored as string, parsed based on data_type
    category TEXT NOT NULL CHECK (category IN (
        'database', 'redis', 'rabbitmq', 'openai', 'ollama',
        'docling', 'whisper', 'storage', 'media', 'system', 'security'
    )),
    description TEXT,
    data_type TEXT NOT NULL DEFAULT 'string' CHECK (data_type IN (
        'string', 'number', 'boolean', 'json', 'url', 'secret'
    )),
    is_secret BOOLEAN NOT NULL DEFAULT false, -- If true, value will be masked in queries
    is_system BOOLEAN NOT NULL DEFAULT false, -- System configs cannot be deleted
    updated_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_system_config_category
    ON public."SystemConfiguration"(category);

CREATE INDEX IF NOT EXISTS idx_system_config_key
    ON public."SystemConfiguration"(key);

CREATE INDEX IF NOT EXISTS idx_system_config_updated_at
    ON public."SystemConfiguration"(updated_at DESC);

-- ============================================================================
-- CONFIGURATION AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ConfigurationAuditLog" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key TEXT NOT NULL,
    old_value TEXT, -- NULL for new configurations
    new_value TEXT NOT NULL,
    changed_by uuid NOT NULL REFERENCES public."Users"(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason TEXT
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_config_audit_key
    ON public."ConfigurationAuditLog"(config_key);

CREATE INDEX IF NOT EXISTS idx_config_audit_changed_by
    ON public."ConfigurationAuditLog"(changed_by);

CREATE INDEX IF NOT EXISTS idx_config_audit_changed_at
    ON public."ConfigurationAuditLog"(changed_at DESC);

-- ============================================================================
-- CONFIGURATION DEFAULT VALUES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ConfigurationDefaults" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    default_value TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL DEFAULT 'string',
    is_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SEED DEFAULT CONFIGURATIONS
-- ============================================================================

-- Database configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('database.pool.max', '20', 'database', 'Maximum number of database connections in pool', 'number', false),
    ('database.pool.min', '2', 'database', 'Minimum number of database connections in pool', 'number', false),
    ('database.pool.idle_timeout', '30000', 'database', 'Idle timeout for database connections (ms)', 'number', false),
    ('database.pool.connection_timeout', '2000', 'database', 'Connection timeout for database (ms)', 'number', false),
    ('database.query_timeout', '30000', 'database', 'Query timeout for database operations (ms)', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- Redis configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('redis.cache.ttl', '3600', 'redis', 'Default TTL for cached items (seconds)', 'number', false),
    ('redis.cache.max_size', '1000', 'redis', 'Maximum number of items in cache', 'number', false),
    ('redis.connection.retry_delay', '1000', 'redis', 'Retry delay for Redis connections (ms)', 'number', false),
    ('redis.connection.max_retries', '10', 'redis', 'Maximum retry attempts for Redis', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- RabbitMQ configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('rabbitmq.queue.vectorization', 'vectorization_queue', 'rabbitmq', 'Queue name for vectorization tasks', 'string', false),
    ('rabbitmq.queue.notifications', 'notifications_queue', 'rabbitmq', 'Queue name for notifications', 'string', false),
    ('rabbitmq.prefetch', '10', 'rabbitmq', 'Prefetch count for RabbitMQ consumers', 'number', false),
    ('rabbitmq.connection.heartbeat', '60', 'rabbitmq', 'Heartbeat interval (seconds)', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- OpenAI configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('openai.model', 'gpt-4-turbo-preview', 'openai', 'Default GPT model for completions', 'string', false),
    ('openai.embedding_model', 'text-embedding-3-small', 'openai', 'Model for text embeddings', 'string', false),
    ('openai.temperature', '0.7', 'openai', 'Default temperature for completions', 'number', false),
    ('openai.max_tokens', '2000', 'openai', 'Maximum tokens for completions', 'number', false),
    ('openai.timeout', '30000', 'openai', 'API request timeout (ms)', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- Ollama configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('ollama.url', 'http://localhost:11434', 'ollama', 'Ollama server URL', 'url', false),
    ('ollama.chat_model', 'llama2', 'ollama', 'Default model for chat completions', 'string', false),
    ('ollama.embedding_model', 'llama2', 'ollama', 'Model for embeddings', 'string', false),
    ('ollama.vision_model', 'llava', 'ollama', 'Model for vision tasks', 'string', false),
    ('ollama.timeout', '60000', 'ollama', 'API request timeout (ms)', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- Docling configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('docling.url', 'http://localhost:8080', 'docling', 'Docling server URL', 'url', false),
    ('docling.timeout', '30000', 'docling', 'API request timeout (ms)', 'number', false),
    ('docling.max_file_size', '52428800', 'docling', 'Maximum file size for processing (bytes)', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- Whisper configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('whisper.model', 'base', 'whisper', 'Whisper model size (tiny/base/small/medium/large)', 'string', false),
    ('whisper.language', 'en', 'whisper', 'Default language for transcription', 'string', false),
    ('whisper.max_retries', '3', 'whisper', 'Maximum retry attempts', 'number', false),
    ('whisper.retry_delay', '1000', 'whisper', 'Delay between retries (ms)', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- Storage configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('storage.provider', 'local', 'storage', 'Storage provider (local/s3/r2)', 'string', false),
    ('storage.local.path', '/app/storage', 'storage', 'Local storage path', 'string', false),
    ('storage.max_upload_size', '104857600', 'storage', 'Maximum upload size (bytes)', 'number', false),
    ('storage.allowed_types', '["image/*","video/*","audio/*","application/pdf"]', 'storage', 'Allowed MIME types (JSON array)', 'json', false)
ON CONFLICT (key) DO NOTHING;

-- Media processing configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('media.ffmpeg.path', '/usr/bin/ffmpeg', 'media', 'Path to FFmpeg binary', 'string', false),
    ('media.ffmpeg.threads', '4', 'media', 'Number of FFmpeg threads', 'number', false),
    ('media.tesseract.config', '--oem 3 --psm 3', 'media', 'Tesseract OCR configuration', 'string', false),
    ('media.tesseract.lang', 'eng', 'media', 'Tesseract language packs', 'string', false),
    ('media.image.max_dimension', '4096', 'media', 'Maximum image dimension (pixels)', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- Security configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('security.jwt.expiry', '86400', 'security', 'JWT token expiry (seconds)', 'number', false),
    ('security.password.min_length', '8', 'security', 'Minimum password length', 'number', false),
    ('security.rate_limit.window', '900000', 'security', 'Rate limit window (ms)', 'number', false),
    ('security.rate_limit.max_requests', '100', 'security', 'Max requests per window', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- System configurations
INSERT INTO public."ConfigurationDefaults" (key, default_value, category, description, data_type, is_required) VALUES
    ('system.environment', 'development', 'system', 'Environment (development/staging/production)', 'string', true),
    ('system.log_level', 'info', 'system', 'Logging level (debug/info/warn/error)', 'string', false),
    ('system.enable_metrics', 'true', 'system', 'Enable metrics collection', 'boolean', false),
    ('system.enable_tracing', 'false', 'system', 'Enable distributed tracing', 'boolean', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- INITIALIZE SYSTEM CONFIGURATIONS FROM DEFAULTS
-- ============================================================================

-- This would typically be run during initial setup or can be triggered manually
-- Uncomment to auto-populate from defaults:

-- INSERT INTO public."SystemConfiguration" (key, value, category, description, data_type, is_system)
-- SELECT key, default_value, category, description, data_type, is_required
-- FROM public."ConfigurationDefaults"
-- WHERE is_required = true
-- ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public."SystemConfiguration" IS 'Stores system-wide configuration settings with version control';
COMMENT ON TABLE public."ConfigurationAuditLog" IS 'Audit log for all configuration changes';
COMMENT ON TABLE public."ConfigurationDefaults" IS 'Default values for system configurations';

COMMENT ON COLUMN public."SystemConfiguration".key IS 'Unique configuration key (e.g., database.pool.max)';
COMMENT ON COLUMN public."SystemConfiguration".value IS 'Configuration value stored as string';
COMMENT ON COLUMN public."SystemConfiguration".data_type IS 'Data type for validation and parsing';
COMMENT ON COLUMN public."SystemConfiguration".is_secret IS 'If true, value is masked in API responses';
COMMENT ON COLUMN public."SystemConfiguration".is_system IS 'System configurations cannot be deleted';

-- ============================================================================
-- GRANT PERMISSIONS (adjust as needed for your user setup)
-- ============================================================================

-- Grant appropriate permissions to your application user
-- GRANT SELECT, INSERT, UPDATE ON public."SystemConfiguration" TO your_app_user;
-- GRANT SELECT, INSERT ON public."ConfigurationAuditLog" TO your_app_user;
-- GRANT SELECT ON public."ConfigurationDefaults" TO your_app_user;
