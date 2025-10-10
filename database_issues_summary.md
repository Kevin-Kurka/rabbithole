# Database Issues Summary - Quick Reference

## Status at a Glance
- ✅ **Methodologies:** 8 seeded successfully with 28 node types, 22 edge types
- ✅ **Containers:** All running (postgres, redis, api, frontend)
- ✅ **Migrations:** 5/6 applied (001, 002, 003-partial, 004, 005-failed)
- ⚠️ **Critical Issues:** 2 blockers prevent Evidence system from working

---

## Critical Issues (Must Fix)

### 🔴 Issue #1: Evidence Table Missing
**Problem:** Migration 003 failed to create Evidence table due to invalid CHECK constraint

**Error:**
```
ERROR: cannot use subquery in check constraint
CONSTRAINT no_evidence_for_level_0 CHECK (
    (target_node_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public."Nodes" WHERE id = target_node_id AND is_level_0 = true
    ))
)
```

**Location:** `/Users/kmk/rabbithole/backend/migrations/003_veracity_system.sql` lines 250-255

**Impact:**
- Evidence table doesn't exist
- 8 related tables also missing (EvidenceFiles, EvidenceAttachments, EvidenceMetadata, etc.)
- Evidence management system completely non-functional

**Fix:**
```sql
-- Remove the CHECK constraint entirely, add a trigger instead:

-- 1. Remove lines 250-260 (the problematic CHECK constraint)

-- 2. Add after table creation:
CREATE OR REPLACE FUNCTION prevent_evidence_on_level_0()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.target_node_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public."Nodes" WHERE id = NEW.target_node_id AND is_level_0 = true) THEN
            RAISE EXCEPTION 'Cannot attach evidence to Level 0 nodes (immutable truth)';
        END IF;
    END IF;

    IF NEW.target_edge_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public."Edges" WHERE id = NEW.target_edge_id AND is_level_0 = true) THEN
            RAISE EXCEPTION 'Cannot attach evidence to Level 0 edges (immutable truth)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_no_evidence_on_level_0
    BEFORE INSERT OR UPDATE ON public."Evidence"
    FOR EACH ROW EXECUTE FUNCTION prevent_evidence_on_level_0();
```

---

### 🔴 Issue #2: calculate_veracity_score Function Bug
**Problem:** Ambiguous column reference prevents function from running

**Error:**
```
ERROR: column reference "is_level_0" is ambiguous
LINE 1: SELECT is_level_0 INTO is_level_0
```

**Location:** Function `calculate_veracity_score` in migration 003

**Current Code (BROKEN):**
```sql
DECLARE
    is_level_0 BOOLEAN;  -- Variable name
BEGIN
    IF target_type = 'node' THEN
        SELECT is_level_0 INTO is_level_0  -- Ambiguous!
        FROM public."Nodes" WHERE id = target_id;
```

**Fix:**
```sql
DECLARE
    target_is_level_0 BOOLEAN;  -- Renamed variable
BEGIN
    IF target_type = 'node' THEN
        SELECT n.is_level_0 INTO target_is_level_0  -- Use alias
        FROM public."Nodes" n WHERE n.id = target_id;
    ELSE
        SELECT e.is_level_0 INTO target_is_level_0  -- Use alias
        FROM public."Edges" e WHERE e.id = target_id;
    END IF;

    -- Update all references from is_level_0 to target_is_level_0
    IF target_is_level_0 THEN
        RETURN 1.0;
    END IF;
    ...
```

---

## Medium Priority Issues

### 🟡 Issue #3: Migration 005 Partial Index Syntax
**Problem:** Inline partial unique constraints not supported

**Error:**
```
ERROR: syntax error at or near "WHERE"
CONSTRAINT one_primary_file_per_evidence UNIQUE (evidence_id) WHERE is_primary = true
```

**Fix:** Convert to separate CREATE INDEX statements:
```sql
-- Remove from table definition, add after CREATE TABLE:
CREATE UNIQUE INDEX idx_one_primary_file_per_evidence
    ON public."EvidenceFiles"(evidence_id)
    WHERE is_primary = true;
```

**Locations to fix:**
- Line 272: EvidenceFiles table
- Line 275: EvidenceAttachments table

---

### 🟡 Issue #4: FILTER Syntax Error
**Problem:** Incorrect FILTER syntax in aggregate function

**Error:**
```
ERROR: syntax error at or near "FILTER"
LINE 30: ...[EXTRACT(YEAR FROM em.publication_date)::INTEGER] FILTER (WHERE...
```

**Location:** Migration 005, function creating evidence statistics

**Fix:** Use proper FILTER syntax:
```sql
-- Change from:
array_agg(year) FILTER (WHERE year IS NOT NULL)

-- To:
array_agg(year) FILTER (WHERE year IS NOT NULL) AS years
-- Or use conditional aggregation:
array_agg(year) AS years
```

---

## Steps to Fix Everything

### Option 1: Quick Fix (Recommended)
```bash
# 1. Connect to database
docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# 2. Drop and recreate the broken function
DROP FUNCTION IF EXISTS calculate_veracity_score(text, uuid);

# 3. Paste the fixed function (from Issue #2 above)

# 4. Fix migration files locally
# Edit: /Users/kmk/rabbithole/backend/migrations/003_veracity_system.sql
# Edit: /Users/kmk/rabbithole/backend/migrations/005_evidence_management.sql

# 5. Manually create Evidence table with trigger instead of CHECK constraint

# 6. Run remaining table creation statements from migration 005
```

### Option 2: Clean Slate (If needed)
```bash
# 1. Backup current state
docker exec rabbithole-postgres-1 pg_dump -U postgres rabbithole_db > backup_before_fix.sql

# 2. Drop and recreate database
docker exec rabbithole-postgres-1 psql -U postgres -c "DROP DATABASE rabbithole_db;"
docker exec rabbithole-postgres-1 psql -U postgres -c "CREATE DATABASE rabbithole_db;"

# 3. Fix migration files first (all issues above)

# 4. Re-run migration script
cd /Users/kmk/rabbithole
./run_migrations.sh

# 5. Re-seed methodologies
cd backend && docker exec rabbithole-api-1 npm run seed:docker
```

---

## Files to Edit

1. **`/Users/kmk/rabbithole/backend/migrations/003_veracity_system.sql`**
   - Lines 250-260: Remove CHECK constraint, add trigger
   - Function `calculate_veracity_score`: Rename variable, add table aliases

2. **`/Users/kmk/rabbithole/backend/migrations/005_evidence_management.sql`**
   - Lines 272, 275: Convert inline constraints to CREATE INDEX
   - Line 330: Fix FILTER syntax
   - All Evidence-related table creations: Ensure no dependency on broken 003

---

## Testing After Fix

```sql
-- Test 1: Verify Evidence table exists
SELECT COUNT(*) FROM public."Evidence";

-- Test 2: Verify veracity function works
SELECT calculate_veracity_score(NULL, NULL);

-- Test 3: Verify trigger prevents Level 0 evidence
-- (Should raise exception)
INSERT INTO public."Evidence" (target_node_id, source_id, evidence_type, content, submitted_by)
VALUES (
    (SELECT id FROM public."Nodes" WHERE is_level_0 = true LIMIT 1),
    (SELECT id FROM public."Sources" LIMIT 1),
    'supporting',
    'Test evidence',
    (SELECT id FROM public."Users" LIMIT 1)
);

-- Test 4: List all tables
\dt public.*
```

---

## Current Database State Summary

**Working:**
- 27 tables created
- 8 methodologies seeded (5 Whys, Fishbone, Mind Map, SWOT, Systems, Decision Tree, Concept Map, Timeline)
- 28 node types configured
- 22 edge types configured
- 10 challenge types seeded
- All containers running

**Broken:**
- Evidence table and 8 related tables missing
- calculate_veracity_score function non-functional
- Evidence management system unusable

**After Fixes:**
- All 36+ tables will exist
- Full veracity scoring system operational
- Evidence management fully functional
- All 8 methodologies ready for production use

---

## Quick Commands

```bash
# Check container status
docker-compose ps

# Connect to database
docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# List all tables
docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\dt public.*"

# Check methodologies count
docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "SELECT COUNT(*) FROM \"Methodologies\";"

# View migration history
docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "SELECT * FROM schema_migrations ORDER BY version;"

# Test veracity function (will fail until fixed)
docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "SELECT calculate_veracity_score('node', '00000000-0000-0000-0000-000000000001'::uuid);"
```

---

**Priority:** Fix Issues #1 and #2 immediately to unblock Evidence system development.
