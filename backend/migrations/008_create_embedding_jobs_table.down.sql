-- Drop embedding jobs table and cleanup function
DROP FUNCTION IF EXISTS sys.cleanup_old_embedding_jobs;
DROP TABLE IF EXISTS sys.embedding_jobs CASCADE;
