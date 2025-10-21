# Graph Traversal Quick Reference

## GraphQL Queries

### findPath - Shortest Path Between Nodes

```graphql
query {
  findPath(
    sourceNodeId: "node-a"
    targetNodeId: "node-b"
    maxDepth: 6          # Optional, default: 6, max: 10
    minVeracity: 0.5     # Optional, default: 0.5
  ) {
    found              # Boolean
    pathLength         # Int
    totalWeight        # Float (accumulated veracity)
    nodes { id props weight }
    edges { id props weight }
  }
}
```

---

### getSubgraph - Expand Node Neighborhood

```graphql
query {
  getSubgraph(
    nodeId: "node-123"
    depth: 2             # Optional, default: 2, max: 5
    direction: "both"    # Optional, "outgoing" | "incoming" | "both"
    minVeracity: 0.5     # Optional, default: 0.5
    maxNodes: 500        # Optional, default: 500, max: 1000
  ) {
    centerNode { id props weight }
    nodes { id props weight }
    edges { id from { id } to { id } props weight }
  }
}
```

---

### findRelatedNodes - Type-Filtered Traversal

```graphql
query {
  findRelatedNodes(
    nodeId: "node-123"
    edgeTypeId: "edge-type-id"
    depth: 3             # Optional, default: 3, max: 5
    minVeracity: 0.5     # Optional, default: 0.5
  ) {
    nodes { id props weight }
    edges { id props weight }
    paths {
      nodes          # Array of node IDs
      edges          # Array of edge IDs
      weight         # Float (accumulated path weight)
    }
  }
}
```

---

### getNodeAncestors - Provenance Chain

```graphql
query {
  getNodeAncestors(
    nodeId: "node-123"
    maxDepth: 10         # Optional, default: 10, max: 20
  ) {
    nodes {
      id
      props
      weight
      is_level_0
      primary_source_id
    }
    chain {
      node { id props }
      depth            # 0 = starting node, increases toward root
    }
  }
}
```

---

### getHighVeracityRelatedNodes - Trusted Neighbors

```graphql
query {
  getHighVeracityRelatedNodes(
    nodeId: "node-123"
    limit: 20            # Optional, default: 20, max: 100
    minVeracity: 0.7     # Optional, default: 0.7
  ) {
    id
    props
    weight
    is_level_0
  }
}
```

---

### getNodeStatistics - Connectivity Metrics

```graphql
query {
  getNodeStatistics(nodeId: "node-123") {
    nodeId
    outgoingEdges        # Int
    incomingEdges        # Int
    totalDegree          # Int
    averageEdgeWeight    # Float
    connectedComponents  # Int
  }
}
```

---

## Common Patterns

### Pattern 1: Verify Claim Provenance

```graphql
query VerifyProvenance($nodeId: ID!) {
  ancestors: getNodeAncestors(nodeId: $nodeId) {
    chain {
      node { is_level_0 weight }
      depth
    }
  }
  support: findRelatedNodes(
    nodeId: $nodeId
    edgeTypeId: "supports-type-id"
    depth: 2
    minVeracity: 0.8
  ) {
    paths { weight }
  }
}
```

### Pattern 2: Context for AI Assistant

```graphql
query GatherContext($nodeId: ID!) {
  context: getSubgraph(nodeId: $nodeId, depth: 2, minVeracity: 0.6) {
    nodes { id props weight }
    edges { id props weight }
  }
  trusted: getHighVeracityRelatedNodes(nodeId: $nodeId, minVeracity: 0.9) {
    id props
  }
}
```

### Pattern 3: Find All Evidence

```graphql
query FindEvidence($nodeId: ID!) {
  findRelatedNodes(
    nodeId: $nodeId
    edgeTypeId: "supports-edge-type-id"
    depth: 2
    minVeracity: 0.7
  ) {
    nodes { id props weight }
    paths { nodes weight }
  }
}
```

---

## Performance Guidelines

| Query | Best Depth | Best Use Case |
|-------|-----------|---------------|
| findPath | ≤ 4 | Interactive exploration |
| getSubgraph | ≤ 2 | Context windows |
| findRelatedNodes | ≤ 3 | Relationship analysis |
| getNodeAncestors | ≤ 10 | Provenance chains |

### Tips

1. **Start shallow**: Use depth 1-2 for interactive queries
2. **Filter by veracity**: Set `minVeracity ≥ 0.7` for high-quality results
3. **Limit nodes**: Use `maxNodes` to cap result size
4. **Request only needed fields**: Don't fetch unused data
5. **Cache results**: Client-side caching for frequently accessed subgraphs

---

## Error Handling

```typescript
// Check if path exists
if (!result.data.findPath.found) {
  console.log("No connection found");
  console.log("Try increasing maxDepth or lowering minVeracity");
}

// Handle empty results
if (result.data.getSubgraph.nodes.length === 0) {
  console.log("Node is isolated or doesn't exist");
}

// Validate before querying
if (depth > 5) {
  throw new Error("Depth too large for getSubgraph (max: 5)");
}
```

---

## TypeScript Types

```typescript
interface PathResult {
  found: boolean;
  pathLength: number;
  totalWeight: number;
  nodes: Node[];
  edges: Edge[];
}

interface SubgraphResult {
  centerNode: Node | null;
  nodes: Node[];
  edges: Edge[];
}

interface RelatedNodesResult {
  nodes: Node[];
  edges: Edge[];
  paths: Array<{
    nodes: string[];
    edges: string[];
    weight: number;
  }>;
}

interface AncestorChainResult {
  nodes: Node[];
  chain: Array<{
    node: Node;
    depth: number;
  }>;
}
```

---

## Apollo Client Hooks

```typescript
import { useQuery, gql } from '@apollo/client';

// findPath hook
const FIND_PATH = gql`
  query FindPath($source: ID!, $target: ID!) {
    findPath(sourceNodeId: $source, targetNodeId: $target) {
      found pathLength nodes { id props }
    }
  }
`;

function PathFinder({ sourceId, targetId }) {
  const { data, loading, error } = useQuery(FIND_PATH, {
    variables: { source: sourceId, target: targetId }
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!data.findPath.found) return <NoConnection />;

  return <PathVisualization path={data.findPath} />;
}
```

---

## Database Indexes (Must Apply)

```bash
# Apply indexes for optimal performance
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/add-graph-traversal-indexes.sql
```

**Critical indexes**:
- `idx_edges_source_node` - Forward traversal
- `idx_edges_target_node` - Backward traversal
- `idx_nodes_primary_source` - Provenance chains

**Performance indexes**:
- `idx_edges_source_weight` - Veracity-sorted traversal
- `idx_edges_type_source` - Type-filtered queries
- `idx_nodes_high_veracity` - Level 0 queries

---

## Links

- **Full Documentation**: `/backend/src/services/GraphTraversalService.README.md`
- **Query Examples**: `/backend/examples/graph-traversal-examples.md`
- **Implementation Summary**: `/GRAPH_TRAVERSAL_IMPLEMENTATION.md`
- **SQL Templates**: `/backend/src/queries/graph-traversal.sql`

---

**Questions?** See full documentation or contact Backend Team
