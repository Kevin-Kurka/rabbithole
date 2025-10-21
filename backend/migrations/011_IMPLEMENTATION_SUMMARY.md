# Graph Fork and Version History Implementation Summary

## Overview

This implementation adds comprehensive version tracking and graph forking capabilities to Project Rabbit Hole. Users can now:

- Create snapshots of graph states for rollback
- View complete version history with metadata
- Fork graphs to create independent branches
- Track fork ancestry and relationships
- Revert graphs to previous versions

## Files Created

### 1. Database Migration
**Location:** `/Users/kmk/rabbithole/backend/migrations/011_graph_versioning.sql`

**Key Components:**
- `GraphVersions` table for storing version snapshots
- `parent_graph_id` and `fork_metadata` columns added to `Graphs` table
- Automatic version snapshot trigger on graph updates
- PostgreSQL functions for version history, fork discovery, and ancestry tracking

### 2. TypeGraphQL Entities
**Location:** `/Users/kmk/rabbithole/backend/src/entities/GraphVersion.ts`

**Types:**
- `GraphVersion` - Full version snapshot with JSONB data
- `GraphVersionHistory` - Lightweight version metadata
- `GraphFork` - Fork metadata and relationships
- `GraphAncestor` - Fork ancestry chain data

### 3. Business Logic Service
**Location:** `/Users/kmk/rabbithole/backend/src/services/GraphVersionService.ts`

**Methods:**
- `createSnapshot(graphId, userId)` - Manually save current state
- `getVersionHistory(graphId)` - List all versions with metadata
- `revertToVersion(graphId, versionNumber, userId)` - Restore previous state
- `forkGraph(graphId, newName, userId, forkReason)` - Create branched copy
- `getGraphForks(graphId)` - Find all child forks
- `getGraphAncestry(graphId)` - Get parent chain

### 4. GraphQL Resolver
**Location:** `/Users/kmk/rabbithole/backend/src/resolvers/GraphVersionResolver.ts`

**Queries:**
- `graphVersionHistory(graphId)` - Get all versions
- `graphForks(graphId)` - Get all forks
- `graphAncestry(graphId)` - Get fork lineage
- `graphVersion(graphId, versionNumber)` - Get specific snapshot

**Mutations:**
- `createGraphSnapshot(graphId, userId)` - Manual snapshot
- `forkGraph(graphId, newName, userId, forkReason)` - Create fork
- `revertGraph(graphId, versionNumber, userId)` - Restore version
- `deleteGraphVersion(graphId, versionNumber)` - Remove snapshot

### 5. Updated Files
- `/Users/kmk/rabbithole/backend/src/entities/Graph.ts` - Added `parent_graph_id` and `fork_metadata` fields
- `/Users/kmk/rabbithole/backend/src/index.ts` - Registered `GraphVersionResolver`

## Installation Instructions

### Step 1: Apply Database Migration

```bash
# From project root
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/011_graph_versioning.sql
```

### Step 2: Rebuild and Restart Backend

```bash
# From backend directory
cd backend
npm run build
docker-compose restart api
```

### Step 3: Verify Installation

```bash
# Check tables were created
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\dt public.\"GraphVersions\""

# Check columns were added
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\d public.\"Graphs\""
```

## GraphQL API Examples

### 1. Create Manual Version Snapshot

```graphql
mutation CreateSnapshot {
  createGraphSnapshot(
    graphId: "550e8400-e29b-41d4-a716-446655440000"
    userId: "user-123"
  ) {
    id
    version_number
    created_at
    snapshot_metadata
  }
}
```

**Response:**
```json
{
  "data": {
    "createGraphSnapshot": {
      "id": "version-uuid",
      "version_number": 5,
      "created_at": "2025-10-10T12:34:56.789Z",
      "snapshot_metadata": "{\"manual_snapshot\":true,\"snapshot_timestamp\":\"2025-10-10T12:34:56.789Z\"}"
    }
  }
}
```

### 2. Fork a Graph

```graphql
mutation ForkGraph {
  forkGraph(
    graphId: "original-graph-id"
    newName: "Alternative Theory Branch"
    userId: "user-123"
    forkReason: "Testing alternative hypothesis about X"
  ) {
    id
    name
    parent_graph_id
    fork_metadata
    nodes {
      id
      props
    }
    edges {
      id
      source_node_id
      target_node_id
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "forkGraph": {
      "id": "new-fork-id",
      "name": "Alternative Theory Branch",
      "parent_graph_id": "original-graph-id",
      "fork_metadata": "{\"forked_from\":\"original-graph-id\",\"forked_at\":\"2025-10-10T12:35:00.000Z\",\"fork_reason\":\"Testing alternative hypothesis about X\",\"original_name\":\"Original Investigation\"}",
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

### 3. Get Version History

```graphql
query GetVersionHistory {
  graphVersionHistory(graphId: "graph-id") {
    version_id
    version_number
    created_at
    created_by
    snapshot_metadata
  }
}
```

**Response:**
```json
{
  "data": {
    "graphVersionHistory": [
      {
        "version_id": "version-5-id",
        "version_number": 5,
        "created_at": "2025-10-10T14:00:00.000Z",
        "created_by": "user-123",
        "snapshot_metadata": "{\"manual_snapshot\":true}"
      },
      {
        "version_id": "version-4-id",
        "version_number": 4,
        "created_at": "2025-10-10T12:00:00.000Z",
        "created_by": null,
        "snapshot_metadata": "{\"trigger_type\":\"UPDATE\"}"
      }
    ]
  }
}
```

### 4. Revert to Previous Version

```graphql
mutation RevertGraph {
  revertGraph(
    graphId: "graph-id"
    versionNumber: 3
    userId: "user-123"
  )
}
```

**Response:**
```json
{
  "data": {
    "revertGraph": true
  }
}
```

### 5. Get All Forks of a Graph

```graphql
query GetForks {
  graphForks(graphId: "original-graph-id") {
    fork_id
    fork_name
    fork_description
    created_at
    created_by
    fork_metadata
  }
}
```

**Response:**
```json
{
  "data": {
    "graphForks": [
      {
        "fork_id": "fork-1-id",
        "fork_name": "Alternative Theory Branch",
        "fork_description": null,
        "created_at": "2025-10-10T12:35:00.000Z",
        "created_by": "user-123",
        "fork_metadata": "{\"forked_from\":\"original-graph-id\",\"fork_reason\":\"Testing alternative hypothesis\"}"
      }
    ]
  }
}
```

### 6. Get Fork Ancestry (Parent Chain)

```graphql
query GetAncestry {
  graphAncestry(graphId: "deeply-forked-graph-id") {
    ancestor_id
    ancestor_name
    ancestor_level
    depth
  }
}
```

**Response:**
```json
{
  "data": {
    "graphAncestry": [
      {
        "ancestor_id": "deeply-forked-graph-id",
        "ancestor_name": "Current Fork",
        "ancestor_level": 1,
        "depth": 0
      },
      {
        "ancestor_id": "parent-fork-id",
        "ancestor_name": "Parent Fork",
        "ancestor_level": 1,
        "depth": 1
      },
      {
        "ancestor_id": "original-graph-id",
        "ancestor_name": "Original Investigation",
        "ancestor_level": 1,
        "depth": 2
      }
    ]
  }
}
```

### 7. Get Specific Version Snapshot

```graphql
query GetVersion {
  graphVersion(graphId: "graph-id", versionNumber: 3) {
    id
    version_number
    snapshot_data
    created_at
    created_by {
      id
      username
    }
  }
}
```

## Database Schema Details

### GraphVersions Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `graph_id` | uuid | Reference to parent graph |
| `version_number` | integer | Sequential version number |
| `snapshot_data` | jsonb | Complete graph state snapshot |
| `snapshot_metadata` | jsonb | Trigger type, timestamp, etc. |
| `created_at` | timestamptz | Snapshot creation time |
| `created_by` | uuid | User who created snapshot |

### Graphs Table Additions

| Column | Type | Description |
|--------|------|-------------|
| `parent_graph_id` | uuid | Reference to parent if forked |
| `fork_metadata` | jsonb | Fork reason, timestamp, original name |

### Snapshot Data Structure

```json
{
  "graph": {
    "id": "graph-uuid",
    "name": "Investigation Name",
    "description": "...",
    "level": 1,
    "methodology": "scientific_method",
    "privacy": "private",
    "parent_graph_id": null,
    "updated_at": "2025-10-10T12:00:00.000Z"
  },
  "nodes": [
    {
      "id": "node-uuid",
      "node_type_id": "type-uuid",
      "props": {...},
      "meta": {...},
      "weight": 0.85,
      "content_hash": "hash",
      "primary_source_id": null,
      "is_level_0": false,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "edges": [
    {
      "id": "edge-uuid",
      "edge_type_id": "type-uuid",
      "source_node_id": "node-1-uuid",
      "target_node_id": "node-2-uuid",
      "props": {...},
      "meta": {...},
      "weight": 0.9,
      "is_level_0": false,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

## Key Features

### Automatic Version Snapshots

- Trigger creates snapshot on every graph UPDATE (not INSERT)
- Only applies to Level 1 graphs (Level 0 is immutable)
- Stores complete state: graph metadata, all nodes, all edges
- Sequential version numbering per graph

### Manual Snapshots

- Users can create named checkpoints
- Useful before major changes or experiments
- Metadata tracks manual vs automatic snapshots

### Graph Forking

- Creates complete copy with new UUID
- Maintains parent link via `parent_graph_id`
- All nodes and edges duplicated with new IDs
- Edge relationships preserved via ID mapping
- Forks always start as Level 1 (user workspace)
- Initial snapshot created automatically

### Version Reversion

- Atomic transaction restores entire graph state
- Creates backup snapshot before reverting
- Deletes current nodes/edges
- Restores nodes/edges from snapshot with original IDs
- Updates graph metadata to match snapshot

### Fork Ancestry Tracking

- Recursive CTE finds entire parent chain
- Prevents circular references (max depth: 10)
- Returns ordered hierarchy from current to root

## Security and Constraints

### Level 0 Protection

- ✅ Cannot create snapshots of Level 0 graphs
- ✅ Cannot revert Level 0 graphs
- ✅ Level 0 graphs excluded from auto-snapshot trigger

### Data Integrity

- ✅ Foreign key constraints on all references
- ✅ CASCADE delete removes versions when graph deleted
- ✅ SET NULL on fork parent deletion (orphan forks allowed)
- ✅ Unique constraint on (graph_id, version_number)
- ✅ Atomic transactions for revert operations

### Performance Considerations

- ✅ Indexes on `graph_id`, `created_at`, `parent_graph_id`
- ⚠️ Large graphs may have substantial snapshot data
- ⚠️ Consider version retention policies (auto-delete old versions)
- ⚠️ Revert operation is expensive for large graphs

## Use Cases

### 1. Experimental Branching
User forks investigation to test controversial theory without affecting original.

### 2. Rollback After Mistakes
User accidentally deletes critical nodes, reverts to last snapshot.

### 3. Collaborative Variations
Multiple users fork same base graph to explore different hypotheses.

### 4. Temporal Analysis
User compares how investigation evolved over time using version history.

### 5. Audit Trail
Curator reviews version history to verify research methodology.

### 6. Fork Merging (Future)
User compares fork ancestry to understand divergence points (not yet implemented).

## Future Enhancements

### 1. Differential Snapshots
Store only changes between versions instead of full snapshots to reduce storage.

### 2. Fork Merging
Allow users to merge changes from forks back to parent graph.

### 3. Version Comparison
Diff tool to compare two versions or forks side-by-side.

### 4. Automatic Retention Policy
Auto-delete snapshots older than N days (configurable per graph).

### 5. Version Tags
Allow users to tag important versions (e.g., "pre-publication", "milestone-1").

### 6. Fork Network Visualization
ReactFlow component showing fork tree with divergence metrics.

## Testing Recommendations

### Unit Tests
- Test snapshot creation with various graph sizes
- Test fork creation preserves all relationships
- Test revert restores exact state
- Test ancestry function with deep hierarchies

### Integration Tests
- Test GraphQL mutations return correct data
- Test auto-snapshot trigger fires on updates
- Test concurrent snapshot creation

### E2E Tests
- User workflow: create → snapshot → modify → revert
- User workflow: fork → diverge → compare ancestry
- Error handling: revert to non-existent version

## Performance Benchmarks (Recommendations)

Test with graphs of varying sizes:
- Small: 10-50 nodes, 20-100 edges
- Medium: 100-500 nodes, 200-1000 edges
- Large: 1000+ nodes, 2000+ edges

Measure:
- Snapshot creation time
- Fork creation time
- Revert operation time
- Query performance for version history

## Migration Rollback (If Needed)

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trigger_graph_version_snapshot ON public."Graphs";

-- Remove functions
DROP FUNCTION IF EXISTS create_graph_version_snapshot();
DROP FUNCTION IF EXISTS get_graph_version_history(uuid);
DROP FUNCTION IF EXISTS get_graph_forks(uuid);
DROP FUNCTION IF EXISTS get_graph_ancestry(uuid);

-- Remove columns from Graphs
ALTER TABLE public."Graphs" DROP COLUMN IF EXISTS parent_graph_id;
ALTER TABLE public."Graphs" DROP COLUMN IF EXISTS fork_metadata;

-- Remove table
DROP TABLE IF EXISTS public."GraphVersions";
```

## Support and Troubleshooting

### Common Issues

**Issue:** Snapshot trigger not firing
**Solution:** Verify trigger exists: `\dy trigger_graph_version_snapshot` in psql

**Issue:** Fork creation fails with "foreign key constraint"
**Solution:** Ensure all referenced node_type_id and edge_type_id exist

**Issue:** Revert fails mid-operation
**Solution:** Transaction rolls back automatically, check error message for node/edge issues

**Issue:** Large snapshot size
**Solution:** Consider pruning old versions or implementing differential snapshots

## Conclusion

This implementation provides robust version control for graphs in Project Rabbit Hole, enabling safe experimentation through forking and easy recovery through snapshots. The system respects Level 0 immutability while giving Level 1 users full version management capabilities.

All operations are transaction-safe, indexed for performance, and include comprehensive metadata for audit trails and analytics.
