# Rabbit Hole Database Status Report
**Generated:** 2025-10-09
**Environment:** Docker Compose (PostgreSQL + Redis + API + Frontend)

---

## Executive Summary

✅ **Methodologies Seeded:** 8 core methodologies with 28 node types and 22 edge types
✅ **Migrations Applied:** 5 of 6 migrations (001-005)
⚠️ **Critical Issues:** Evidence table creation failed, veracity function has bugs
✅ **Database Operational:** All containers running, core tables functional

---

## 1. Docker Container Status

All containers are **RUNNING**:

| Container | Service | Status | Ports |
|-----------|---------|--------|-------|
| rabbithole-postgres-1 | PostgreSQL (pgvector) | Up 10 hours (healthy) | 5432:5432 |
| rabbithole-redis-1 | Redis 7-alpine | Up 18 hours | 6379:6379 |
| rabbithole-api-1 | API Backend | Up 32 minutes | 4000:4000 |
| rabbithole-frontend-1 | Frontend | Up 18 hours | 3001:3000 |

**Database Size:** 10 MB

---

## 2. Schema Migration Status

### Applied Migrations (5/6)

| Version | Description | Applied At | Status |
|---------|-------------|------------|--------|
| 001 | Initial schema - base tables | 2025-10-09 17:05:12 | ✅ SUCCESS |
| 002 | Level 0/1 system verification | 2025-10-09 17:05:12 | ✅ SUCCESS |
| 003 | Veracity scoring system | 2025-10-09 17:05:13 | ⚠️ PARTIAL |
| 004 | Challenge system | 2025-10-09 17:05:13 | ✅ SUCCESS |
| 005 | Evidence management system | 2025-10-09 17:05:13 | ❌ FAILED |

### Pending Migrations

Migration 006 files exist but not yet applied:
- `006_collaboration_system.sql`
- `006_curator_system.sql`
- `006_methodology_system.sql` (already applied manually - tables exist)

---

## 3. Database Tables Present (27 Total)

### Core System Tables
- ✅ Users (1 row)
- ✅ Graphs (0 rows)
- ✅ Nodes (0 rows)
- ✅ Edges (0 rows)
- ✅ NodeTypes
- ✅ EdgeTypes
- ✅ Comments

### Methodology System Tables
- ✅ **Methodologies** (8 rows) ⭐
- ✅ **MethodologyNodeTypes** (28 rows) ⭐
- ✅ **MethodologyEdgeTypes** (22 rows) ⭐
- ✅ **MethodologyWorkflows** (1 row) ⭐
- ✅ MethodologyPermissions
- ✅ UserMethodologyProgress

### Veracity & Source Tables
- ✅ Sources (0 rows)
- ✅ SourceCredibility (0 rows)
- ✅ VeracityScores (0 rows)
- ✅ VeracityScoreHistory (0 rows)
- ✅ ConsensusSnapshots (0 rows)

### Challenge System Tables
- ✅ **ChallengeTypes** (10 rows) ⭐
- ✅ Challenges (0 rows)
- ✅ ChallengeVotes
- ✅ ChallengeComments
- ✅ ChallengeNotifications
- ✅ ChallengeResolutions

### Missing Tables (From Failed Migrations)
- ❌ **Evidence** (CRITICAL - table creation failed)
- ❌ **EvidenceFiles**
- ❌ **EvidenceAttachments**
- ❌ **EvidenceMetadata**
- ❌ **EvidenceReviews**
- ❌ **EvidenceReviewVotes**
- ❌ **EvidenceAuditLog**
- ❌ **EvidenceDuplicates**
- ❌ **EvidenceSearchIndex**

### System Tables
- ✅ schema_migrations
- ✅ UserReputation
- ✅ SpamReports

---

## 4. Methodology Data Seeded Successfully ✅

### Summary
**8 Core Methodologies** have been seeded with full configuration:

| Methodology | Category | Node Types | Edge Types | Workflow Steps | Icon | Color |
|-------------|----------|------------|------------|----------------|------|-------|
| 5 Whys Root Cause Analysis | analytical | 4 | 3 | 5 | search | #3B82F6 |
| Fishbone (Ishikawa) Diagram | analytical | 4 | 2 | 0 | git-branch | #06B6D4 |
| Mind Mapping | creative | 4 | 2 | 0 | share-2 | #EC4899 |
| SWOT Analysis | strategic | 6 | 3 | 0 | grid | #14B8A6 |
| Systems Thinking Causal Loop | systems | 2 | 3 | 0 | repeat | #06B6D4 |
| Decision Tree | strategic | 3 | 2 | 0 | git-merge | #F59E0B |
| Concept Mapping | investigative | 2 | 4 | 0 | share-2 | #A855F7 |
| Timeline Analysis | investigative | 3 | 3 | 0 | clock | #EC4899 |

**Total:** 28 node types, 22 edge types, 1 complete workflow

### Category Distribution
- **Analytical:** 2 methodologies (5 Whys, Fishbone)
- **Creative:** 1 methodology (Mind Mapping)
- **Strategic:** 2 methodologies (SWOT, Decision Tree)
- **Systems:** 1 methodology (Causal Loop)
- **Investigative:** 2 methodologies (Concept Mapping, Timeline)

All methodologies are:
- Status: `published`
- System methodologies: `is_system = true`
- Ready for use with 4 tags each

### Example: 5 Whys Root Cause Analysis

**Node Types:**
1. Problem Statement (problem)
2. Why Question (why)
3. Root Cause (root_cause)
4. Solution (solution)

**Edge Types:**
1. Asks Why (asks) - problem/why → why
2. Reveals Root Cause (reveals) - why → root_cause
3. Addresses (addresses) - solution → root_cause

**Workflow:** 5-step guided workflow with linear progression

---

## 5. Veracity Functions Status

### Functions Exist (7 total)
✅ All veracity calculation functions created:

| Function Name | Purpose | Status |
|---------------|---------|--------|
| calculate_veracity_score | Main score calculation | ⚠️ HAS BUG |
| calculate_consensus_score | Consensus calculation | ✅ OK |
| calculate_challenge_impact | Challenge impact | ✅ OK |
| calculate_evidence_quality_score | Evidence quality | ⚠️ UNTESTABLE |
| calculate_evidence_weight | Evidence weighting | ⚠️ UNTESTABLE |
| calculate_vote_weight | Vote weighting | ✅ OK |
| calculate_user_reputation_tier | User tier calc | ✅ OK |

### Critical Bug in `calculate_veracity_score`

**Error:** Column reference "is_level_0" is ambiguous

**Root Cause:** Function declares a variable named `is_level_0` and also queries a column named `is_level_0`, causing PostgreSQL to be unable to distinguish between them.

**Location:** Lines 11 and 14 in function definition:
```sql
DECLARE
    is_level_0 BOOLEAN;  -- Variable name
BEGIN
    SELECT is_level_0 INTO is_level_0  -- Column name conflicts with variable
    FROM public."Nodes" WHERE id = target_id;
```

**Impact:** Cannot calculate veracity scores until fixed.

**Recommended Fix:** Rename the variable to avoid conflict:
```sql
DECLARE
    target_is_level_0 BOOLEAN;  -- Different name
BEGIN
    SELECT n.is_level_0 INTO target_is_level_0  -- Use table alias
    FROM public."Nodes" n WHERE n.id = target_id;
```

---

## 6. Critical Issues from Migration Report

### Issue #1: Evidence Table Creation Failed ⚠️

**Error:** `cannot use subquery in check constraint` (Line 69 & 192)

**Root Cause:** Migration 003 attempted to create CHECK constraint with EXISTS subquery:
```sql
CONSTRAINT no_evidence_for_level_0 CHECK (
    (target_node_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public."Nodes" WHERE id = target_node_id AND is_level_0 = true
    ))
    ...
)
```

**Impact:**
- Evidence table was NOT created
- All Evidence-related tables failed to create
- 9 critical tables missing from schema
- Evidence management system is non-functional

**PostgreSQL Limitation:** CHECK constraints cannot contain subqueries. They can only reference columns in the same row.

**Recommended Fix:** Remove the CHECK constraint and implement the validation as:
1. A BEFORE INSERT/UPDATE trigger function
2. Application-level validation
3. Or redesign to avoid the need for this constraint

### Issue #2: Invalid FILTER Syntax (Line 330)

**Error:** `syntax error at or near "FILTER"` in migration 005

**Location:** Function creating aggregated evidence statistics

**Impact:** Evidence statistics function not created

### Issue #3: Invalid Partial Unique Constraint Syntax

**Error:** `syntax error at or near "WHERE"` (Lines 272, 275)

**Example:**
```sql
CONSTRAINT one_primary_file_per_evidence UNIQUE (evidence_id) WHERE is_primary = true
```

**Correct Syntax:** Partial unique constraints must be created as indexes, not inline constraints:
```sql
CREATE UNIQUE INDEX idx_one_primary_file_per_evidence
    ON "EvidenceFiles"(evidence_id)
    WHERE is_primary = true;
```

### Issue #4: Migration 005 Test Failures

All migration 005 tests failed due to:
- Missing Evidence table
- `node_type_id` NOT NULL constraint violations
- Invalid UUID format in test data

### Issue #5: Missing Database Roles

**Warnings:**
```
ERROR: role "backend_app" does not exist
ERROR: role "readonly_user" does not exist
```

**Impact:** GRANT statements failed, but doesn't affect functionality in development

**Recommendation:** Create roles or remove GRANT statements for development environment

---

## 7. Test Results

### Migration 003 Veracity Tests
- ❌ **FAILED** - All tests rolled back due to ambiguous column reference in `calculate_veracity_score`
- Tests attempted: Veracity calculation, temporal decay, source credibility updates
- Root cause: Function bug prevents any veracity operations

### Migration 005 Evidence Tests
- ❌ **FAILED** - All tests rolled back due to missing Evidence table
- Tests attempted: 8 test suites covering constraints, file management, search, reviews
- Root cause: Evidence table creation failed

---

## 8. Database Integrity

### Foreign Key Violations
✅ **No foreign key violations found**

### Table Row Counts

| Table | Rows | Notes |
|-------|------|-------|
| Users | 1 | Default user created |
| Graphs | 0 | Ready for use |
| Nodes | 0 | Ready for use |
| Edges | 0 | Ready for use |
| Methodologies | 8 | ✅ Seeded |
| MethodologyNodeTypes | 28 | ✅ Seeded |
| MethodologyEdgeTypes | 22 | ✅ Seeded |
| MethodologyWorkflows | 1 | ✅ Seeded (5 Whys) |
| ChallengeTypes | 10 | ✅ Seeded |
| Challenges | 0 | Ready for use |
| Sources | 0 | Ready for use |
| VeracityScores | 0 | Ready (if function fixed) |

---

## 9. Recommendations

### Immediate Actions Required

1. **Fix Evidence Table Creation (CRITICAL)**
   - Remove subquery CHECK constraints from migration 003
   - Replace with trigger-based validation
   - Re-run Evidence table creation
   - Test Evidence system functionality

2. **Fix calculate_veracity_score Function (HIGH)**
   - Rename ambiguous variable `is_level_0`
   - Use table aliases in SELECT queries
   - Test function with NULL and valid UUIDs

3. **Fix Migration 005 Syntax Errors (MEDIUM)**
   - Convert partial UNIQUE constraints to partial indexes
   - Fix FILTER syntax in aggregate functions
   - Update test data with valid UUIDs

4. **Apply Migration 006 (OPTIONAL)**
   - Methodology system already manually applied
   - Consider applying collaboration and curator systems if needed

### Optional Improvements

5. **Database Roles** - Create development roles or remove GRANT statements
6. **Test Data** - Add sample graphs/nodes for integration testing
7. **Performance** - Add additional indexes based on query patterns
8. **Documentation** - Document Evidence system redesign without subquery constraints

---

## 10. File Locations

### Seed Scripts
- ✅ `/Users/kmk/rabbithole/backend/src/seeds/methodologies.ts` (used for seeding)

### Migration Files
- `/Users/kmk/rabbithole/backend/migrations/001_initial_schema.sql` ✅
- `/Users/kmk/rabbithole/backend/migrations/002_level0_system.sql` ✅
- `/Users/kmk/rabbithole/backend/migrations/003_veracity_system.sql` ⚠️ (has issues)
- `/Users/kmk/rabbithole/backend/migrations/003_veracity_system_test.sql`
- `/Users/kmk/rabbithole/backend/migrations/004_challenge_system.sql` ✅
- `/Users/kmk/rabbithole/backend/migrations/005_evidence_management.sql` ❌ (failed)
- `/Users/kmk/rabbithole/backend/migrations/005_evidence_management_test.sql`
- `/Users/kmk/rabbithole/backend/migrations/006_collaboration_system.sql` (pending)
- `/Users/kmk/rabbithole/backend/migrations/006_curator_system.sql` (pending)
- `/Users/kmk/rabbithole/backend/migrations/006_methodology_system.sql` (manually applied)

### Reports
- `/Users/kmk/rabbithole/migration_report.txt` (detailed migration log)
- `/Users/kmk/rabbithole/database_status_report.md` (this file)

### Backups
- `/Users/kmk/rabbithole/backups/rabbithole_backup_20251009_100506.sql`

---

## 11. Summary

### What's Working ✅
- Core database infrastructure (Users, Graphs, Nodes, Edges)
- Methodology system (8 methodologies fully configured)
- Challenge system (types and structure)
- Veracity score tables and history
- Source credibility tracking
- Most calculation functions

### What Needs Fixing ⚠️
- Evidence table and 8 related tables (migration 003/005 issues)
- `calculate_veracity_score` function (ambiguous column reference)
- Evidence-related calculation functions (untestable without Evidence table)

### Next Steps
1. Fix Evidence table creation by removing subquery constraints
2. Fix veracity function variable naming conflict
3. Re-run failed migrations 003 and 005
4. Verify all functions work correctly
5. Consider applying remaining migration 006 files

---

**Report Generated By:** Database Architecture Expert Agent
**Contact:** Review `/Users/kmk/rabbithole/migration_report.txt` for detailed error logs
