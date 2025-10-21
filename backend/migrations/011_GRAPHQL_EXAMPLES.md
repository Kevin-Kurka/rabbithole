# GraphQL API Examples - Graph Versioning & Forking

Complete GraphQL query and mutation examples for testing the version control system.

## Setup: Get Your Graph ID

First, get a list of available graphs:

```graphql
query ListGraphs {
  graphs {
    id
    name
    level
    created_at
  }
}
```

## Mutations

### 1. Create Manual Snapshot

Save the current state of a graph:

```graphql
mutation CreateSnapshot {
  createGraphSnapshot(
    graphId: "YOUR_GRAPH_ID_HERE"
    userId: "YOUR_USER_ID_HERE"
  ) {
    id
    graph_id
    version_number
    snapshot_metadata
    created_at
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "createGraphSnapshot": {
      "id": "uuid-of-version",
      "graph_id": "YOUR_GRAPH_ID_HERE",
      "version_number": 1,
      "snapshot_metadata": "{\"manual_snapshot\":true,\"snapshot_timestamp\":\"2025-10-10T12:34:56.789Z\"}",
      "created_at": "2025-10-10T12:34:56.789Z"
    }
  }
}
```

### 2. Fork Graph

Create a copy of a graph with parent link:

```graphql
mutation ForkMyGraph {
  forkGraph(
    graphId: "YOUR_GRAPH_ID_HERE"
    newName: "Alternative Investigation Path"
    userId: "YOUR_USER_ID_HERE"
    forkReason: "Exploring different hypothesis about climate data"
  ) {
    id
    name
    description
    level
    parent_graph_id
    fork_metadata
    nodes {
      id
      props
      weight
    }
    edges {
      id
      source_node_id
      target_node_id
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "forkGraph": {
      "id": "new-forked-graph-id",
      "name": "Alternative Investigation Path",
      "description": "Original description",
      "level": 1,
      "parent_graph_id": "YOUR_GRAPH_ID_HERE",
      "fork_metadata": "{\"forked_from\":\"YOUR_GRAPH_ID_HERE\",\"forked_at\":\"2025-10-10T12:35:00.000Z\",\"fork_reason\":\"Exploring different hypothesis about climate data\",\"original_name\":\"Original Investigation\"}",
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

### 3. Revert to Previous Version

Restore a graph to a specific version:

```graphql
mutation RevertToVersion3 {
  revertGraph(
    graphId: "YOUR_GRAPH_ID_HERE"
    versionNumber: 3
    userId: "YOUR_USER_ID_HERE"
  )
}
```

**Expected Response:**
```json
{
  "data": {
    "revertGraph": true
  }
}
```

**Note:** A backup snapshot is automatically created before reverting.

### 4. Delete Specific Version

Remove a version snapshot:

```graphql
mutation DeleteOldVersion {
  deleteGraphVersion(
    graphId: "YOUR_GRAPH_ID_HERE"
    versionNumber: 2
  )
}
```

**Expected Response:**
```json
{
  "data": {
    "deleteGraphVersion": true
  }
}
```

## Queries

### 1. Get Version History

List all versions of a graph:

```graphql
query GetVersionHistory {
  graphVersionHistory(graphId: "YOUR_GRAPH_ID_HERE") {
    version_id
    version_number
    created_at
    created_by
    snapshot_metadata
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "graphVersionHistory": [
      {
        "version_id": "version-5-uuid",
        "version_number": 5,
        "created_at": "2025-10-10T14:00:00.000Z",
        "created_by": "user-uuid",
        "snapshot_metadata": "{\"manual_snapshot\":true,\"snapshot_timestamp\":\"2025-10-10T14:00:00.000Z\"}"
      },
      {
        "version_id": "version-4-uuid",
        "version_number": 4,
        "created_at": "2025-10-10T12:00:00.000Z",
        "created_by": null,
        "snapshot_metadata": "{\"trigger_type\":\"UPDATE\",\"snapshot_timestamp\":\"2025-10-10T12:00:00.000Z\"}"
      },
      {
        "version_id": "version-3-uuid",
        "version_number": 3,
        "created_at": "2025-10-10T10:00:00.000Z",
        "created_by": null,
        "snapshot_metadata": "{\"trigger_type\":\"UPDATE\",\"snapshot_timestamp\":\"2025-10-10T10:00:00.000Z\"}"
      }
    ]
  }
}
```

### 2. Get All Forks

Find all child forks of a graph:

```graphql
query GetAllForks {
  graphForks(graphId: "YOUR_GRAPH_ID_HERE") {
    fork_id
    fork_name
    fork_description
    created_at
    created_by
    fork_metadata
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "graphForks": [
      {
        "fork_id": "fork-1-uuid",
        "fork_name": "Alternative Investigation Path",
        "fork_description": null,
        "created_at": "2025-10-10T12:35:00.000Z",
        "created_by": "user-uuid",
        "fork_metadata": "{\"forked_from\":\"YOUR_GRAPH_ID_HERE\",\"fork_reason\":\"Exploring different hypothesis\"}"
      },
      {
        "fork_id": "fork-2-uuid",
        "fork_name": "Secondary Analysis Branch",
        "fork_description": "Testing contradictory evidence",
        "created_at": "2025-10-10T13:00:00.000Z",
        "created_by": "another-user-uuid",
        "fork_metadata": "{\"forked_from\":\"YOUR_GRAPH_ID_HERE\",\"fork_reason\":\"Challenge to main theory\"}"
      }
    ]
  }
}
```

### 3. Get Fork Ancestry

Get the parent chain of a forked graph:

```graphql
query GetAncestry {
  graphAncestry(graphId: "FORKED_GRAPH_ID_HERE") {
    ancestor_id
    ancestor_name
    ancestor_level
    depth
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "graphAncestry": [
      {
        "ancestor_id": "FORKED_GRAPH_ID_HERE",
        "ancestor_name": "Current Fork",
        "ancestor_level": 1,
        "depth": 0
      },
      {
        "ancestor_id": "parent-graph-id",
        "ancestor_name": "Parent Investigation",
        "ancestor_level": 1,
        "depth": 1
      },
      {
        "ancestor_id": "grandparent-graph-id",
        "ancestor_name": "Original Investigation",
        "ancestor_level": 1,
        "depth": 2
      }
    ]
  }
}
```

### 4. Get Specific Version Snapshot

Retrieve a specific version with full snapshot data:

```graphql
query GetVersion {
  graphVersion(graphId: "YOUR_GRAPH_ID_HERE", versionNumber: 3) {
    id
    graph_id
    version_number
    snapshot_data
    snapshot_metadata
    created_at
    created_by {
      id
      username
      email
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "graphVersion": {
      "id": "version-uuid",
      "graph_id": "YOUR_GRAPH_ID_HERE",
      "version_number": 3,
      "snapshot_data": "{\"graph\":{\"id\":\"...\",\"name\":\"...\"},\"nodes\":[...],\"edges\":[...]}",
      "snapshot_metadata": "{\"trigger_type\":\"UPDATE\",\"snapshot_timestamp\":\"2025-10-10T10:00:00.000Z\"}",
      "created_at": "2025-10-10T10:00:00.000Z",
      "created_by": {
        "id": "user-uuid",
        "username": "researcher123",
        "email": "researcher@example.com"
      }
    }
  }
}
```

## Complex Workflows

### Workflow 1: Safe Experimentation

```graphql
# Step 1: Create a snapshot before making changes
mutation SaveCurrentState {
  createGraphSnapshot(
    graphId: "YOUR_GRAPH_ID_HERE"
    userId: "YOUR_USER_ID_HERE"
  ) {
    version_number
  }
}

# Step 2: Make your experimental changes via normal mutations
mutation AddExperimentalNode {
  createNode(input: {
    graphId: "YOUR_GRAPH_ID_HERE"
    props: "{\"label\": \"Experimental Hypothesis\"}"
  }) {
    id
  }
}

# Step 3: If experiment fails, revert
mutation UndoExperiment {
  revertGraph(
    graphId: "YOUR_GRAPH_ID_HERE"
    versionNumber: 5  # The version from step 1
    userId: "YOUR_USER_ID_HERE"
  )
}
```

### Workflow 2: Collaborative Branching

```graphql
# Team member 1: Fork the main investigation
mutation CreateTeamBranch {
  forkGraph(
    graphId: "MAIN_GRAPH_ID"
    newName: "Team A - Climate Impact Analysis"
    userId: "TEAM_MEMBER_1_ID"
    forkReason: "Parallel investigation of climate factors"
  ) {
    id  # Use this ID for team's work
    name
  }
}

# Team member 2: Create their own fork
mutation CreateAnotherBranch {
  forkGraph(
    graphId: "MAIN_GRAPH_ID"
    newName: "Team B - Economic Impact Analysis"
    userId: "TEAM_MEMBER_2_ID"
    forkReason: "Parallel investigation of economic factors"
  ) {
    id
    name
  }
}

# Later: View all parallel investigations
query SeeAllBranches {
  graphForks(graphId: "MAIN_GRAPH_ID") {
    fork_name
    created_at
    fork_metadata
  }
}
```

### Workflow 3: Version Comparison

```graphql
# Get current version number
query CurrentVersion {
  graphVersionHistory(graphId: "YOUR_GRAPH_ID_HERE") {
    version_number
    created_at
  }
}

# Get specific version data
query Version3Data {
  v3: graphVersion(graphId: "YOUR_GRAPH_ID_HERE", versionNumber: 3) {
    snapshot_data
  }
}

query Version5Data {
  v5: graphVersion(graphId: "YOUR_GRAPH_ID_HERE", versionNumber: 5) {
    snapshot_data
  }
}

# Frontend can then parse and compare the snapshot_data JSON
```

## Error Handling Examples

### Error: Level 0 Graph Protection

```graphql
mutation TryToForkLevel0 {
  forkGraph(
    graphId: "LEVEL_0_GRAPH_ID"
    newName: "This Should Fail"
    userId: "USER_ID"
  ) {
    id
  }
}
```

**Error Response:**
```json
{
  "errors": [
    {
      "message": "Cannot modify Level 0 (immutable) graphs",
      "path": ["forkGraph"]
    }
  ]
}
```

### Error: Version Not Found

```graphql
mutation RevertToNonExistentVersion {
  revertGraph(
    graphId: "YOUR_GRAPH_ID_HERE"
    versionNumber: 999
    userId: "USER_ID"
  )
}
```

**Error Response:**
```json
{
  "errors": [
    {
      "message": "Version 999 not found for graph YOUR_GRAPH_ID_HERE",
      "path": ["revertGraph"]
    }
  ]
}
```

## Testing Checklist

Use these queries to verify the installation:

### 1. Test Snapshot Creation
```graphql
mutation {
  createGraphSnapshot(graphId: "YOUR_GRAPH_ID", userId: "YOUR_USER_ID") {
    version_number
  }
}
```

### 2. Test Version History
```graphql
query {
  graphVersionHistory(graphId: "YOUR_GRAPH_ID") {
    version_number
  }
}
```

### 3. Test Fork Creation
```graphql
mutation {
  forkGraph(graphId: "YOUR_GRAPH_ID", newName: "Test Fork") {
    id
    parent_graph_id
  }
}
```

### 4. Test Fork List
```graphql
query {
  graphForks(graphId: "YOUR_GRAPH_ID") {
    fork_name
  }
}
```

### 5. Test Ancestry
```graphql
query {
  graphAncestry(graphId: "FORKED_GRAPH_ID") {
    ancestor_name
    depth
  }
}
```

## Performance Considerations

### Large Graphs

For graphs with 1000+ nodes, consider:

1. **Selective Snapshots**: Don't auto-snapshot on every update
2. **Version Retention**: Delete old versions after N days
3. **Differential Snapshots**: Future enhancement to store only changes

### Snapshot Size Example

```graphql
query CheckSnapshotSize {
  graphVersion(graphId: "LARGE_GRAPH_ID", versionNumber: 1) {
    snapshot_data  # May be large JSON string
  }
}
```

If this query is slow, the snapshot is very large. Consider:
- Archiving old versions
- Implementing compression
- Using differential snapshots

## Advanced Use Cases

### 1. Time-Travel Debugging

```graphql
# Get all versions
query AllVersions {
  graphVersionHistory(graphId: "YOUR_GRAPH_ID") {
    version_number
    created_at
  }
}

# Restore to version before bug
mutation FixBug {
  revertGraph(graphId: "YOUR_GRAPH_ID", versionNumber: 3)
}
```

### 2. A/B Testing

```graphql
# Create two forks for different approaches
mutation CreateVariantA {
  forkGraph(
    graphId: "BASE_GRAPH"
    newName: "Variant A - Conservative Estimates"
    forkReason: "Testing conservative approach"
  ) {
    id
  }
}

mutation CreateVariantB {
  forkGraph(
    graphId: "BASE_GRAPH"
    newName: "Variant B - Aggressive Estimates"
    forkReason: "Testing aggressive approach"
  ) {
    id
  }
}
```

### 3. Audit Trail

```graphql
query AuditTrail {
  graphVersionHistory(graphId: "AUDITED_GRAPH") {
    version_number
    created_at
    created_by
    snapshot_metadata
  }
}
```

## Troubleshooting

### Issue: Snapshots Not Auto-Creating

Check if trigger is enabled:

```sql
-- Run this in PostgreSQL directly
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_graph_version_snapshot';
```

### Issue: Fork Missing Nodes

Verify nodes were copied:

```graphql
query CheckForkNodes {
  original: graph(id: "ORIGINAL_ID") {
    nodes { id }
  }
  forked: graph(id: "FORKED_ID") {
    nodes { id }
  }
}
```

### Issue: Version Data Corrupted

Get raw snapshot data:

```graphql
query RawSnapshot {
  graphVersion(graphId: "YOUR_GRAPH_ID", versionNumber: 1) {
    snapshot_data
  }
}
```

Parse the JSON to verify integrity.

## Next Steps

1. Integrate these queries into frontend components
2. Add UI for version timeline visualization
3. Implement version comparison view
4. Create fork network diagram
5. Add automated version retention policies

See `011_FRONTEND_INTEGRATION.md` for React component examples.
