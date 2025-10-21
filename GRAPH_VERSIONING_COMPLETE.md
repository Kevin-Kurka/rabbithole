# Graph Fork and Version History - Implementation Complete

## Summary

Successfully implemented comprehensive version control and forking functionality for Project Rabbit Hole graphs. Users can now create snapshots, track version history, fork graphs for parallel investigations, and revert to previous states.

## Files Created

### Database & Backend

1. **Migration SQL**
   - `/Users/kmk/rabbithole/backend/migrations/011_graph_versioning.sql`
   - Creates `GraphVersions` table, adds fork columns, implements triggers and functions

2. **TypeGraphQL Entities**
   - `/Users/kmk/rabbithole/backend/src/entities/GraphVersion.ts`
   - Defines GraphQL types for versions, forks, and ancestry

3. **Service Layer**
   - `/Users/kmk/rabbithole/backend/src/services/GraphVersionService.ts`
   - Business logic for snapshots, forks, reverts, and history

4. **GraphQL Resolver**
   - `/Users/kmk/rabbithole/backend/src/resolvers/GraphVersionResolver.ts`
   - Queries and mutations for version control operations

5. **Updated Entity**
   - `/Users/kmk/rabbithole/backend/src/entities/Graph.ts`
   - Added `parent_graph_id` and `fork_metadata` fields

6. **Updated Index**
   - `/Users/kmk/rabbithole/backend/src/index.ts`
   - Registered `GraphVersionResolver` in Apollo Server

### Documentation & Tools

7. **Implementation Guide**
   - `/Users/kmk/rabbithole/backend/migrations/011_IMPLEMENTATION_SUMMARY.md`
   - Complete API documentation, schema details, use cases

8. **Frontend Integration**
   - `/Users/kmk/rabbithole/backend/migrations/011_FRONTEND_INTEGRATION.md`
   - React components, Apollo Client queries, Tailwind styles

9. **GraphQL Examples**
   - `/Users/kmk/rabbithole/backend/migrations/011_GRAPHQL_EXAMPLES.md`
   - Copy-paste ready queries and mutations

10. **Test Suite**
    - `/Users/kmk/rabbithole/backend/migrations/011_test_examples.sql`
    - SQL-based tests for all functionality

11. **Installation Script**
    - `/Users/kmk/rabbithole/backend/migrations/install_011_graph_versioning.sh`
    - Automated installation with verification

## Installation Instructions

### Quick Install

```bash
# From project root
cd /Users/kmk/rabbithole
./backend/migrations/install_011_graph_versioning.sh
```

### Manual Install

```bash
# Apply database migration
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/011_graph_versioning.sql

# Rebuild backend
cd backend
npm run build

# Restart services
docker-compose restart api
```

## Features Implemented

### 1. Version Snapshots
- ✅ Manual snapshot creation via GraphQL mutation
- ✅ Automatic snapshots on graph updates (trigger-based)
- ✅ Complete graph state storage (metadata, nodes, edges)
- ✅ Sequential version numbering per graph
- ✅ JSONB snapshot data with metadata

### 2. Version History
- ✅ Query all versions of a graph
- ✅ Retrieve specific version snapshot
- ✅ View creation timestamps and user attribution
- ✅ Snapshot metadata (trigger type, timestamp)

### 3. Graph Forking
- ✅ Create independent copy with parent link
- ✅ Preserve all nodes and edges
- ✅ Track fork metadata (reason, timestamp, original name)
- ✅ Automatic ID remapping for duplicated entities
- ✅ Initial snapshot of forked graph

### 4. Version Reversion
- ✅ Restore graph to any previous version
- ✅ Atomic transaction-based reversion
- ✅ Automatic backup snapshot before revert
- ✅ Complete state restoration (nodes, edges, metadata)

### 5. Fork Network
- ✅ Query all child forks of a graph
- ✅ Query fork ancestry (parent chain)
- ✅ Recursive CTE for deep hierarchies
- ✅ Fork metadata tracking

### 6. Security
- ✅ Level 0 graphs protected from modifications
- ✅ Foreign key constraints for data integrity
- ✅ CASCADE delete for cleanup
- ✅ Transaction safety for critical operations

## GraphQL API

### Queries

```graphql
# Get version history
graphVersionHistory(graphId: ID!): [GraphVersionHistory!]!

# Get all forks
graphForks(graphId: ID!): [GraphFork!]!

# Get fork ancestry
graphAncestry(graphId: ID!): [GraphAncestor!]!

# Get specific version
graphVersion(graphId: ID!, versionNumber: Int!): GraphVersion
```

### Mutations

```graphql
# Create manual snapshot
createGraphSnapshot(graphId: ID!, userId: ID): GraphVersion!

# Fork graph
forkGraph(graphId: ID!, newName: String!, userId: ID, forkReason: String): Graph!

# Revert to version
revertGraph(graphId: ID!, versionNumber: Int!, userId: ID): Boolean!

# Delete version
deleteGraphVersion(graphId: ID!, versionNumber: Int!): Boolean!
```

## Example Usage

### Create Snapshot Before Major Changes

```graphql
mutation {
  createGraphSnapshot(
    graphId: "550e8400-e29b-41d4-a716-446655440000"
    userId: "user-123"
  ) {
    version_number
    created_at
  }
}
```

### Fork for Parallel Investigation

```graphql
mutation {
  forkGraph(
    graphId: "original-graph-id"
    newName: "Alternative Theory Branch"
    userId: "user-123"
    forkReason: "Testing contradictory evidence"
  ) {
    id
    name
    parent_graph_id
    nodes { id }
  }
}
```

### Revert After Mistake

```graphql
mutation {
  revertGraph(
    graphId: "graph-id"
    versionNumber: 3
    userId: "user-123"
  )
}
```

### View Complete History

```graphql
query {
  graphVersionHistory(graphId: "graph-id") {
    version_number
    created_at
    snapshot_metadata
  }
}
```

## Database Schema

### New Table: GraphVersions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| graph_id | uuid | Reference to graph |
| version_number | integer | Sequential version |
| snapshot_data | jsonb | Complete graph state |
| snapshot_metadata | jsonb | Trigger info, timestamp |
| created_at | timestamptz | Creation time |
| created_by | uuid | User reference |

### Updated Table: Graphs

| Column | Type | Description |
|--------|------|-------------|
| parent_graph_id | uuid | Parent graph (if fork) |
| fork_metadata | jsonb | Fork reason, timestamp |

## Performance Considerations

### Indexes Created
- ✅ `idx_graph_versions_graph_id` on GraphVersions(graph_id)
- ✅ `idx_graph_versions_created_at` on GraphVersions(created_at DESC)
- ✅ `idx_graphs_parent_graph_id` on Graphs(parent_graph_id)

### Optimization Tips
- Large graphs (1000+ nodes) produce large snapshots
- Consider version retention policies (delete old versions)
- Future: Implement differential snapshots (store only changes)

## Testing

### Run Test Suite

```bash
# Execute SQL test suite
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/011_test_examples.sql
```

### Test in GraphQL Playground

```
http://localhost:4000/graphql
```

Use examples from `011_GRAPHQL_EXAMPLES.md`

## Frontend Integration

Ready-to-use React components available in `011_FRONTEND_INTEGRATION.md`:

- `<VersionHistory>` - Dropdown to select and revert versions
- `<ForkGraphDialog>` - Modal for creating forks
- `<ForkNetwork>` - Visualization of fork relationships
- `<SnapshotButton>` - Quick snapshot creation

## Use Cases

### 1. Safe Experimentation
Create snapshot → Make changes → Revert if needed

### 2. Collaborative Branching
Multiple users fork same graph → Explore different hypotheses → Compare results

### 3. Time-Travel Debugging
View version history → Identify when bug was introduced → Revert

### 4. A/B Testing
Fork graph twice → Test different approaches → Compare outcomes

### 5. Audit Trail
Review complete history → Track changes over time → Verify methodology

## Limitations & Future Enhancements

### Current Limitations
- ⚠️ Large snapshots consume significant storage
- ⚠️ No built-in version comparison UI
- ⚠️ No automatic version retention policies
- ⚠️ Fork merging not yet implemented

### Future Enhancements
- 🔮 Differential snapshots (store only changes)
- 🔮 Version comparison/diff tool
- 🔮 Fork merge functionality
- 🔮 Version tagging system
- 🔮 Fork network visualization
- 🔮 Automated retention policies

## Troubleshooting

### Snapshots Not Auto-Creating

Check trigger status:
```sql
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trigger_graph_version_snapshot';
```

### Fork Missing Nodes

Verify all nodes copied:
```graphql
query {
  original: graph(id: "ORIGINAL") { nodes { id } }
  forked: graph(id: "FORKED") { nodes { id } }
}
```

### Revert Failed

Check error message - likely missing node/edge types or foreign key issues.

## Security Notes

### Level 0 Protection
- ✅ Cannot create snapshots of Level 0 graphs
- ✅ Cannot fork Level 0 graphs (error thrown)
- ✅ Cannot revert Level 0 graphs
- ✅ Trigger excludes Level 0 from auto-snapshots

### Data Integrity
- ✅ Foreign keys prevent orphaned records
- ✅ CASCADE delete cleans up versions when graph deleted
- ✅ SET NULL on parent deletion (orphan forks allowed)
- ✅ Unique constraint on (graph_id, version_number)

## Documentation References

- **Complete API Docs**: `backend/migrations/011_IMPLEMENTATION_SUMMARY.md`
- **Frontend Guide**: `backend/migrations/011_FRONTEND_INTEGRATION.md`
- **GraphQL Examples**: `backend/migrations/011_GRAPHQL_EXAMPLES.md`
- **SQL Tests**: `backend/migrations/011_test_examples.sql`

## Migration Details

**Migration Number**: 011
**Database Tables**: 1 new (`GraphVersions`), 1 updated (`Graphs`)
**Functions**: 4 PostgreSQL functions
**Triggers**: 1 auto-snapshot trigger
**Indexes**: 3 performance indexes

## Rollback Instructions

If needed, rollback with:

```sql
DROP TRIGGER IF EXISTS trigger_graph_version_snapshot ON public."Graphs";
DROP FUNCTION IF EXISTS create_graph_version_snapshot();
DROP FUNCTION IF EXISTS get_graph_version_history(uuid);
DROP FUNCTION IF EXISTS get_graph_forks(uuid);
DROP FUNCTION IF EXISTS get_graph_ancestry(uuid);
ALTER TABLE public."Graphs" DROP COLUMN parent_graph_id;
ALTER TABLE public."Graphs" DROP COLUMN fork_metadata;
DROP TABLE IF EXISTS public."GraphVersions";
```

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review test examples in `011_test_examples.sql`
3. Verify installation with `install_011_graph_versioning.sh`

## Success Criteria

- ✅ All files created successfully
- ✅ Database migration SQL completed
- ✅ Service layer implemented
- ✅ GraphQL resolver registered
- ✅ Comprehensive documentation provided
- ✅ Test suite created
- ✅ Frontend integration examples ready
- ✅ Installation script automated

## Next Steps

1. **Install**: Run `./backend/migrations/install_011_graph_versioning.sh`
2. **Test**: Execute SQL test suite
3. **Verify**: Test queries in GraphQL playground
4. **Integrate**: Add frontend components from integration guide
5. **Deploy**: Update production when ready

---

**Implementation Status**: ✅ COMPLETE

**Ready for**: Installation and testing

**Breaking Changes**: None (backward compatible)

**Database Version**: 011
