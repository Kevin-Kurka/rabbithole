-- Create sys schema for system tables
-- This schema separates system/operational tables from the main graph schema

CREATE SCHEMA IF NOT EXISTS sys;

-- Grant permissions to application user
GRANT USAGE ON SCHEMA sys TO sentient_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sys TO sentient_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sys TO sentient_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA sys GRANT ALL ON TABLES TO sentient_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA sys GRANT ALL ON SEQUENCES TO sentient_user;

-- Comment on schema
COMMENT ON SCHEMA sys IS 'System schema for operational tables (job queues, metrics, logs)';
