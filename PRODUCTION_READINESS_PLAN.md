# Production Readiness Plan

## Implementation Status

### ✅ Completed (Phase 1-3)

#### Migrations
- [x] Migration 016: Add missing NodeTypes (SystemConfiguration, EvidenceType, CredibilityThreshold, Conversation, ConversationMessage, GraphLock, PresenceSession, File)
- [x] Migration 017: Remove column violations and migrate data to JSONB props

#### Services Rewritten to Node/Edge Pattern
- [x] CredibilityCalculationService: Complete rewrite with node type caching
- [x] FormalInquiryService: Fixed to update consensusScore in props
- [x] ThresholdFilteringService: Rewritten to use node/edge pattern
- [x] ConversationalAIService: Rewritten to use Conversation and ConversationMessage NodeTypes
- [x] InquiryDeduplicationService: Rewritten to use Inquiry NodeType
- [x] AmendmentService: Rewritten to use Amendment NodeType (stored as nodes)
- [x] FileStorageService: Rewritten to use File NodeType

#### Resolvers Rewritten to Node/Edge Pattern
- [x] AdminConfigurationResolver: Rewritten to use SystemConfiguration NodeType
- [x] ConversationalAIResolver: Rewritten to use Conversation and ConversationMessage NodeTypes
- [x] ActivityResolver: Rewritten to use ActivityPost NodeType and proper lowercase table names
- [x] CollaborativePresenceResolver: Rewritten to use GraphLock and PresenceSession NodeTypes

### 🔄 Remaining Work
- [ ] Update tests to work with new architecture
- [ ] Enable CI tests
- [ ] Fix security vulnerabilities
- [ ] Add Amendment NodeType to migrations (currently service handles missing type gracefully)
- [ ] Add ActivityPost NodeType to migrations if not present

---

## Executive Summary

This project uses a **strict 4-table graph database architecture**:
- `node_types` - Schema definitions
- `edge_types` - Relationship definitions
- `nodes` - All data stored in JSONB `props`
- `edges` - All relationships stored in JSONB `props`

**Evidence, Users, Inquiries, etc. are all NodeTypes** - NOT standalone tables.

### Current Issues

1. **CredibilityCalculationService** queries non-existent tables (`Inquiries`, `InquiryPositions`, `EvidenceTypes`, `Users`, `CredibilityThresholds`)
2. **Migrations 008, 009, 010** add columns directly to nodes/edges tables (violates props-only rule)
3. **Multiple resolvers** reference non-existent tables
4. **consensus_score used as column** instead of props field

---

## Phase 1: Fix Database Schema Violations (CRITICAL)

### Task 1.1: Remove Invalid Migrations

**Files to modify:**
- `backend/migrations/008_add_user_reputation.up.sql` - DELETE (references non-existent `Users` table)
- `backend/migrations/009_add_consensus_score.up.sql` - DELETE (adds columns instead of using props)
- `backend/migrations/010_add_edge_credibility.up.sql` - DELETE (adds columns instead of using props)

**Action:** Create a cleanup migration that:
1. Removes `consensus_score` column from nodes (move to props)
2. Removes `consensus_score` column from edges (move to props)
3. Removes `credibility_score` column from edges (move to props)

### Task 1.2: Create Proper NodeTypes for Missing Concepts

Add these NodeTypes to `002_seed_system_types.up.sql` or create new migration:

```sql
-- EvidenceType (for categorizing evidence weight)
INSERT INTO node_types (name, props, meta) VALUES
('EvidenceType', '{
  "description": "Defines types of evidence with associated weights",
  "fields": {
    "code": {"type": "string", "required": true},
    "name": {"type": "string", "required": true},
    "weight": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5},
    "description": {"type": "string"}
  }
}'::jsonb, '{"system": true}'::jsonb),

-- CredibilityThreshold (system configuration)
('CredibilityThreshold', '{
  "description": "Threshold configuration for credibility calculations",
  "fields": {
    "inquiryType": {"type": "string", "required": true},
    "inclusionThreshold": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5}
  }
}'::jsonb, '{"system": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;
```

---

## Phase 2: Fix CredibilityCalculationService (CRITICAL)

**File:** `backend/src/services/CredibilityCalculationService.ts`

### Current Problems:
1. Line 140: Joins `public."Users"` table (doesn't exist)
2. Lines 205-212: Queries `public."Inquiries"` table (should be NodeType query)
3. Lines 229-230: Queries `public."InquiryPositions"` and `public."EvidenceTypes"` (should be NodeType queries)
4. Line 114: Updates `credibility_score` column (should update props)
5. Line 191: Updates `consensus_score` column (should update props)

### Required Changes:

#### 2.1 Fix `calculateNodeConsensus` (lines 131-187)

**Before (WRONG):**
```typescript
JOIN public."Users" u ON (v.props->>'voterId')::uuid = u.id
```

**After (CORRECT):**
```typescript
// Get user reputation from UserProfile node via edge
const query = `
  SELECT
    v.props->>'voteType' as vote_type,
    COALESCE((up.props->>'reputation')::real, 0.5) as voter_reputation
  FROM public.edges e
  JOIN public.nodes v ON e.source_node_id = v.id
  JOIN public.node_types vt ON v.node_type_id = vt.id
  JOIN public.edge_types et ON e.edge_type_id = et.id
  -- Get voter's UserProfile via AUTHORED_BY edge
  LEFT JOIN public.edges author_edge ON v.id = author_edge.source_node_id
  LEFT JOIN public.edge_types author_et ON author_edge.edge_type_id = author_et.id AND author_et.name = 'AUTHORED_BY'
  LEFT JOIN public.nodes up ON author_edge.target_node_id = up.id
  WHERE e.target_node_id = $1
    AND et.name = 'VOTES_ON'
    AND vt.name = 'ConsensusVote'
`;
```

#### 2.2 Fix `calculateDirectNodeCredibility` (lines 199-257)

**Before (WRONG):**
```typescript
FROM public."Inquiries" i
LEFT JOIN public."CredibilityThresholds" t ON i.inquiry_type = t.inquiry_type
```

**After (CORRECT):**
```typescript
// Query FormalInquiry nodes that target this node
const query = `
  SELECT
    inquiry.id,
    inquiry.props,
    COALESCE((threshold.props->>'inclusionThreshold')::real, 0.5) as inclusion_threshold
  FROM public.nodes inquiry
  JOIN public.node_types inquiry_type ON inquiry.node_type_id = inquiry_type.id
  JOIN public.edges e ON inquiry.id = e.source_node_id
  JOIN public.edge_types et ON e.edge_type_id = et.id
  LEFT JOIN public.nodes threshold ON threshold.node_type_id = (
    SELECT id FROM public.node_types WHERE name = 'CredibilityThreshold'
  ) AND (threshold.props->>'inquiryType')::text = (inquiry.props->>'inquiryType')::text
  WHERE inquiry_type.name = 'FormalInquiry'
    AND et.name = 'INVESTIGATES'
    AND e.target_node_id = $1
    AND (inquiry.props->>'status')::text = 'active'
    AND COALESCE((inquiry.props->>'isMerged')::boolean, false) = false
`;
```

#### 2.3 Fix Position Queries

**Before (WRONG):**
```typescript
FROM public."InquiryPositions" p
LEFT JOIN public."EvidenceTypes" et ON p.evidence_type_id = et.id
```

**After (CORRECT):**
```typescript
// Query Position nodes linked to inquiry via HAS_POSITION edge
const positionsQuery = `
  SELECT
    pos.id,
    pos.props,
    COALESCE((et.props->>'weight')::real, 0.5) as evidence_weight_value
  FROM public.nodes pos
  JOIN public.node_types pos_type ON pos.node_type_id = pos_type.id
  JOIN public.edges e ON pos.id = e.target_node_id
  JOIN public.edge_types edge_type ON e.edge_type_id = edge_type.id
  LEFT JOIN public.nodes et ON et.node_type_id = (
    SELECT id FROM public.node_types WHERE name = 'EvidenceType'
  ) AND et.id::text = (pos.props->>'evidenceTypeId')::text
  WHERE pos_type.name = 'Position'
    AND edge_type.name = 'HAS_POSITION'
    AND e.source_node_id = $1
    AND COALESCE((pos.props->>'status')::text, 'active') != 'archived'
`;
```

#### 2.4 Update to Props Instead of Columns

**Before (WRONG):**
```typescript
await this.pool.query(
  `UPDATE public."Nodes" SET credibility_score = $1, last_credibility_update = NOW() WHERE id = $2`,
  [clampedScore, nodeId]
);
```

**After (CORRECT):**
```typescript
await this.pool.query(
  `UPDATE public.nodes
   SET props = props || $1::jsonb, updated_at = NOW()
   WHERE id = $2`,
  [JSON.stringify({ credibilityScore: clampedScore, lastCredibilityUpdate: new Date().toISOString() }), nodeId]
);
```

---

## Phase 3: Fix Other Services with Table Violations

### Files to Fix:

| File | Issue | Fix |
|------|-------|-----|
| `AdminConfigurationResolver.ts` | References `SystemConfiguration` table | Query NodeType instead |
| `AIAssistantResolver.ts` | References `EvidenceFiles`, `ConversationMessages` | Query NodeTypes instead |
| `ConversationalAIResolver.ts` | References `ConversationMessages` | Query NodeType instead |
| `CollaborativePresenceResolver.ts` | References `GraphLocks` | Query NodeType instead |

### Pattern to Follow (from FormalInquiryService):

```typescript
// 1. Get NodeType ID
const nodeTypeResult = await pool.query(
  `SELECT id FROM public.node_types WHERE name = 'YourNodeType'`
);
const nodeTypeId = nodeTypeResult.rows[0].id;

// 2. Query nodes with type filter
const result = await pool.query(
  `SELECT n.id, n.props, n.created_at, n.updated_at
   FROM public.nodes n
   WHERE n.node_type_id = $1
     AND (n.props->>'someField')::text = $2`,
  [nodeTypeId, filterValue]
);

// 3. Parse props safely
const data = result.rows.map(row => {
  const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
  return { id: row.id, ...props };
});
```

---

## Phase 4: Fix FormalInquiryService Column Usage

**File:** `backend/src/services/FormalInquiryService.ts`

### Line 647-651: Uses consensus_score column

**Before:**
```typescript
await pool.query(
  `UPDATE public.nodes SET consensus_score = $1, updated_at = NOW() WHERE id = $2`,
  [consensusScore, inquiryId]
);
```

**After:**
```typescript
await pool.query(
  `UPDATE public.nodes
   SET props = props || $1::jsonb, updated_at = NOW()
   WHERE id = $2`,
  [JSON.stringify({ consensusScore }), inquiryId]
);
```

---

## Phase 5: Add Missing NodeTypes

Create migration `016_add_missing_system_types.up.sql`:

```sql
-- Missing system node types needed by services

INSERT INTO node_types (name, props, meta) VALUES
('SystemConfiguration', '{
  "description": "System-wide configuration settings",
  "fields": {
    "key": {"type": "string", "required": true, "unique": true},
    "value": {"type": "any", "required": true},
    "description": {"type": "string"},
    "isSecret": {"type": "boolean", "default": false}
  }
}'::jsonb, '{"system": true}'::jsonb),

('ConversationMessage', '{
  "description": "Message in an AI conversation",
  "fields": {
    "conversationId": {"type": "uuid", "required": true},
    "role": {"type": "enum", "values": ["user", "assistant", "system"], "required": true},
    "content": {"type": "string", "required": true},
    "contextNodeIds": {"type": "array", "items": {"type": "uuid"}}
  }
}'::jsonb, '{"system": true}'::jsonb),

('GraphLock', '{
  "description": "Lock on a graph for exclusive editing",
  "fields": {
    "graphId": {"type": "uuid", "required": true},
    "userId": {"type": "uuid", "required": true},
    "lockType": {"type": "enum", "values": ["exclusive", "shared"], "default": "exclusive"},
    "expiresAt": {"type": "datetime", "required": true}
  }
}'::jsonb, '{"system": true}'::jsonb),

('EvidenceType', '{
  "description": "Classification of evidence with associated credibility weight",
  "fields": {
    "code": {"type": "string", "required": true},
    "name": {"type": "string", "required": true},
    "weight": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5},
    "description": {"type": "string"}
  }
}'::jsonb, '{"system": true}'::jsonb),

('CredibilityThreshold', '{
  "description": "Threshold settings for credibility calculations by inquiry type",
  "fields": {
    "inquiryType": {"type": "string", "required": true},
    "inclusionThreshold": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5},
    "verifiedThreshold": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.85}
  }
}'::jsonb, '{"system": true}'::jsonb)

ON CONFLICT (name) DO NOTHING;

-- Edge types for new node types
INSERT INTO edge_types (name, source_node_type_id, target_node_type_id, props, meta) VALUES
('HAS_MESSAGE',
  (SELECT id FROM node_types WHERE name = 'Inquiry'),
  (SELECT id FROM node_types WHERE name = 'ConversationMessage'),
  '{"description": "Links conversation to its messages", "cardinality": "one-to-many"}'::jsonb,
  '{"system": true}'::jsonb),

('LOCKS',
  (SELECT id FROM node_types WHERE name = 'GraphLock'),
  NULL,
  '{"description": "Lock targets a graph node", "cardinality": "one-to-one"}'::jsonb,
  '{"system": true}'::jsonb)

ON CONFLICT (name) DO NOTHING;
```

---

## Phase 6: Create Cleanup Migration

Create migration `017_remove_column_violations.up.sql`:

```sql
-- Remove columns that violate the props-only architecture
-- Data should be stored in JSONB props, not separate columns

-- Step 1: Migrate existing data to props (if any exists)
UPDATE nodes
SET props = props || jsonb_build_object(
  'consensusScore', COALESCE(consensus_score, 0.5),
  'credibilityScore', COALESCE(credibility_score, 0.5)
)
WHERE consensus_score IS NOT NULL OR credibility_score IS NOT NULL;

UPDATE edges
SET props = props || jsonb_build_object(
  'consensusScore', COALESCE(consensus_score, 0.5),
  'credibilityScore', COALESCE(credibility_score, 1.0)
)
WHERE consensus_score IS NOT NULL OR credibility_score IS NOT NULL;

-- Step 2: Drop the violating columns
ALTER TABLE nodes DROP COLUMN IF EXISTS consensus_score;
ALTER TABLE nodes DROP COLUMN IF EXISTS credibility_score;
ALTER TABLE nodes DROP COLUMN IF EXISTS last_credibility_update;

ALTER TABLE edges DROP COLUMN IF EXISTS consensus_score;
ALTER TABLE edges DROP COLUMN IF EXISTS credibility_score;

-- Step 3: Drop indexes on removed columns
DROP INDEX IF EXISTS idx_nodes_consensus;
DROP INDEX IF EXISTS idx_edges_credibility;

-- Step 4: Add GIN indexes for props queries on these fields
CREATE INDEX IF NOT EXISTS idx_nodes_credibility_props
ON nodes USING GIN ((props->'credibilityScore'));

CREATE INDEX IF NOT EXISTS idx_nodes_consensus_props
ON nodes USING GIN ((props->'consensusScore'));
```

---

## Phase 7: Update Tests

### Files to Update:
- All test files in `backend/src/__tests__/` that reference:
  - `consensus_score` column
  - `credibility_score` column
  - Non-existent tables

### Test Pattern:
```typescript
// Mock node type lookup
const mockNodeType = { id: 'mock-uuid', name: 'FormalInquiry' };
jest.spyOn(pool, 'query').mockImplementation((query) => {
  if (query.includes('node_types')) {
    return { rows: [mockNodeType] };
  }
  // ... other mocks
});
```

---

## Phase 8: Enable CI Tests

**File:** `.github/workflows/test.yml`

### Changes:
1. Remove `continue-on-error: true` from frontend tests (line 159)
2. Remove `continue-on-error: true` from integration tests (line 229)
3. Add frontend test script to `frontend/package.json`

---

## Phase 9: Fix Security Vulnerabilities

Run and fix:
```bash
cd backend && npm audit fix
cd frontend && npm audit fix
```

Specific vulnerabilities to address:
- `glob` - Command injection (HIGH)
- `jws` - HMAC signature verification (HIGH)
- `js-yaml` - Prototype pollution (MODERATE)
- `validator` - URL validation bypass (MODERATE)

---

## Implementation Order

| Order | Phase | Priority | Estimated Effort |
|-------|-------|----------|-----------------|
| 1 | Phase 5: Add Missing NodeTypes | CRITICAL | 1 hour |
| 2 | Phase 6: Create Cleanup Migration | CRITICAL | 1 hour |
| 3 | Phase 2: Fix CredibilityCalculationService | CRITICAL | 3 hours |
| 4 | Phase 4: Fix FormalInquiryService | HIGH | 30 mins |
| 5 | Phase 3: Fix Other Services | HIGH | 2 hours |
| 6 | Phase 7: Update Tests | HIGH | 2 hours |
| 7 | Phase 8: Enable CI Tests | MEDIUM | 1 hour |
| 8 | Phase 9: Fix Security Vulnerabilities | MEDIUM | 1 hour |

**Total Estimated Effort:** ~12 hours

---

## Verification Checklist

After implementation:

- [ ] All migrations run without errors
- [ ] `npm test` passes in backend
- [ ] No references to non-existent tables in any `.ts` files
- [ ] No direct column access for `consensus_score` or `credibility_score`
- [ ] All data stored in JSONB `props` field
- [ ] CI pipeline passes (tests, lint, build)
- [ ] `npm audit` shows no high/critical vulnerabilities

---

## Success Criteria

1. **Zero table violations** - Only 4 tables + schema_migrations exist
2. **All queries use NodeType pattern** - Filter by node_type_id, read from props
3. **All data in props** - No business data in separate columns
4. **Tests pass** - Backend and integration tests green
5. **Security clean** - No high/critical vulnerabilities
