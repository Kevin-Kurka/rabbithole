-- Add reputation column to Users table
ALTER TABLE public."Users" ADD COLUMN IF NOT EXISTS "reputation" REAL DEFAULT 0.5 CHECK (reputation >= 0.0 AND reputation <= 1.0);

-- Update existing users to have default reputation
UPDATE public."Users" SET "reputation" = 0.5 WHERE "reputation" IS NULL;