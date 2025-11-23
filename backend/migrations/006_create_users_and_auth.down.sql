-- Drop authentication and authorization tables

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users CASCADE;
