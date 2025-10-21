# Graph Versioning - Quick Reference Card

## Installation (One Command)

```bash
./backend/migrations/install_011_graph_versioning.sh
```

## GraphQL Mutations (Common)

### Save Current State
```graphql
mutation {
  createGraphSnapshot(graphId: "YOUR_GRAPH_ID", userId: "USER_ID") {
    version_number
  }
}
```

### Fork Graph
```graphql
mutation {
  forkGraph(graphId: "YOUR_GRAPH_ID", newName: "Fork Name") {
    id
    parent_graph_id
  }
}
```

### Undo Changes
```graphql
mutation {
  revertGraph(graphId: "YOUR_GRAPH_ID", versionNumber: 3, userId: "USER_ID")
}
```

## GraphQL Queries (Common)

### List Versions
```graphql
query {
  graphVersionHistory(graphId: "YOUR_GRAPH_ID") {
    version_number
    created_at
  }
}
```

### List Forks
```graphql
query {
  graphForks(graphId: "YOUR_GRAPH_ID") {
    fork_name
    created_at
  }
}
```

### Show Ancestry
```graphql
query {
  graphAncestry(graphId: "FORKED_GRAPH_ID") {
    ancestor_name
    depth
  }
}
```

## React Component (Basic)

```tsx
import { useMutation } from '@apollo/client';
import { CREATE_GRAPH_SNAPSHOT } from '@/graphql/mutations';

function SnapshotButton({ graphId, userId }) {
  const [createSnapshot] = useMutation(CREATE_GRAPH_SNAPSHOT);

  return (
    <button onClick={() => createSnapshot({ variables: { graphId, userId }})}>
      Save Snapshot
    </button>
  );
}
```

## Database Functions

```sql
-- Get history
SELECT * FROM get_graph_version_history('graph-id');

-- Get forks
SELECT * FROM get_graph_forks('graph-id');

-- Get ancestry
SELECT * FROM get_graph_ancestry('forked-graph-id');
```

## Troubleshooting

### Snapshots not creating?
```sql
-- Check trigger
SELECT tgenabled FROM pg_trigger WHERE tgname = 'trigger_graph_version_snapshot';
```

### Level 0 error?
Level 0 graphs are immutable. Fork them instead:
```graphql
mutation { forkGraph(graphId: "LEVEL_0_ID", newName: "My Fork") { id } }
```

## Files

| File | Purpose |
|------|---------|
| `011_graph_versioning.sql` | Migration |
| `GraphVersionService.ts` | Business logic |
| `GraphVersionResolver.ts` | GraphQL API |
| `011_IMPLEMENTATION_SUMMARY.md` | Full docs |
| `011_FRONTEND_INTEGRATION.md` | React examples |
| `011_GRAPHQL_EXAMPLES.md` | Query examples |

## Key Concepts

- **Snapshot**: Point-in-time save of graph state
- **Fork**: Independent copy with parent link
- **Revert**: Restore to previous version (creates backup first)
- **Version Number**: Sequential integer per graph
- **Ancestry**: Parent chain of forks

## Limits

- Max ancestry depth: 10 levels
- Level 0 graphs: Cannot snapshot/fork/revert
- Snapshot size: Grows with graph size

## Next Steps

1. Install migration: `./install_011_graph_versioning.sh`
2. Test in playground: `http://localhost:4000/graphql`
3. Add React components from `011_FRONTEND_INTEGRATION.md`
4. Review full docs in `011_IMPLEMENTATION_SUMMARY.md`
