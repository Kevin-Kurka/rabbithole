# GraphTraversalService Documentation

## Overview

The `GraphTraversalService` provides optimized graph traversal operations for Project Rabbit Hole using PostgreSQL recursive Common Table Expressions (CTEs). All queries are designed for performance, safety, and scalability.

## Architecture

### Technology Stack
- **Database**: PostgreSQL with recursive CTE support
- **Cycle Detection**: Path array tracking (`NOT id = ANY(path)`)
- **Performance**: Prepared statement patterns for query plan caching
- **Safety**: Configurable depth limits and node count caps

### Key Design Principles
1. **Cycle Prevention**: All traversals track visited nodes to prevent infinite loops
2. **Veracity Filtering**: Weight thresholds ensure high-quality path finding
3. **Bounded Execution**: Depth and node limits prevent runaway queries
4. **Bidirectional Search**: Path finding uses BFS from both ends for O(b^(d/2)) complexity

## Available Operations

### 1. findPath - Shortest Path Between Nodes

**Purpose**: Find the shortest path between two nodes in the graph.

**Use Cases**:
- "How are these two claims connected?"
- "What's the evidence chain from A to B?"
- "Find trust path between entities"

**GraphQL Query**:
```graphql
query FindPath {
  findPath(
    sourceNodeId: "abc-123"
    targetNodeId: "def-456"
    maxDepth: 4
    minVeracity: 0.7
  ) {
    found
    pathLength
    totalWeight
    nodes {
      id
      props
      weight
      is_level_0
    }
    edges {
      id
      props
      weight
    }
  }
}
```

**Parameters**:
- `sourceNodeId` (required): Starting node UUID
- `targetNodeId` (required): Destination node UUID
- `maxDepth` (default: 6, max: 10): Maximum path length
- `minVeracity` (default: 0.5): Minimum edge weight threshold

**Algorithm**: Bidirectional BFS from both source and target, meeting in the middle

**Performance**: O(b^(d/2)) where b = branching factor, d = depth

**Returns**:
- `found`: Boolean indicating if path exists
- `pathLength`: Number of edges in path
- `totalWeight`: Accumulated veracity score (product of edge weights)
- `nodes`: Array of nodes in path order
- `edges`: Array of edges connecting path nodes

---

### 2. getSubgraph - Expand Node Neighborhood

**Purpose**: Extract a subgraph centered on a specific node, expanding outward to specified depth.

**Use Cases**:
- "Show me all evidence related to this claim"
- "Expand this node's context"
- "What's connected to this entity?"

**GraphQL Query**:
```graphql
query GetSubgraph {
  getSubgraph(
    nodeId: "abc-123"
    depth: 2
    direction: BOTH
    minVeracity: 0.6
    maxNodes: 100
  ) {
    centerNode {
      id
      props
      weight
    }
    nodes {
      id
      props
      weight
      is_level_0
    }
    edges {
      id
      from { id }
      to { id }
      props
      weight
    }
  }
}
```

**Parameters**:
- `nodeId` (required): Center node UUID
- `depth` (default: 2, max: 5): Expansion depth
- `direction` (default: "both"): "outgoing", "incoming", or "both"
- `minVeracity` (default: 0.5): Minimum edge weight
- `maxNodes` (default: 500, max: 1000): Maximum nodes to return

**Direction Options**:
- `outgoing`: Follow edges where center is source (forward exploration)
- `incoming`: Follow edges where center is target (backward/provenance)
- `both`: Bidirectional expansion (most common)

**Performance**: O(b^d) bounded by maxNodes limit

**Returns**:
- `centerNode`: The starting node
- `nodes`: All nodes in subgraph
- `edges`: All edges between subgraph nodes

---

### 3. findRelatedNodes - Type-Filtered Traversal

**Purpose**: Find nodes connected via specific edge types (e.g., SUPPORTS, CHALLENGES, DERIVED_FROM).

**Use Cases**:
- "Find all SUPPORTS edges from this claim"
- "What CHALLENGES this hypothesis?"
- "Show DERIVED_FROM lineage"

**GraphQL Query**:
```graphql
query FindRelatedNodes {
  findRelatedNodes(
    nodeId: "abc-123"
    edgeTypeId: "supports-edge-type-id"
    depth: 3
    minVeracity: 0.7
  ) {
    nodes {
      id
      props
      weight
    }
    edges {
      id
      props
      weight
    }
    paths {
      nodes  # Array of node IDs
      edges  # Array of edge IDs
      weight # Accumulated path weight
    }
  }
}
```

**Parameters**:
- `nodeId` (required): Starting node UUID
- `edgeTypeId` (required): Edge type UUID to filter by
- `depth` (default: 3, max: 5): Traversal depth
- `minVeracity` (default: 0.5): Minimum edge weight

**Returns**:
- `nodes`: All nodes reachable via specified edge type
- `edges`: All edges of specified type in traversal
- `paths`: Array of paths with accumulated weights (sorted by weight DESC)

**Example Use Case**:
```graphql
# Find all evidence supporting a claim
query SupportingEvidence {
  findRelatedNodes(
    nodeId: "claim-xyz"
    edgeTypeId: "edge-type-supports"
    depth: 2
    minVeracity: 0.8
  ) {
    nodes {
      id
      props
    }
    paths {
      nodes
      weight
    }
  }
}
```

---

### 4. getNodeAncestors - Provenance Chain

**Purpose**: Recursively follow `primary_source_id` to find the origin/root node.

**Use Cases**:
- "Where did this data originate?"
- "Show citation chain to Level 0"
- "Trace data lineage"

**GraphQL Query**:
```graphql
query GetAncestors {
  getNodeAncestors(
    nodeId: "abc-123"
    maxDepth: 10
  ) {
    nodes {
      id
      props
      weight
      is_level_0
      primary_source_id
    }
    chain {
      node {
        id
        props
      }
      depth  # 0 = starting node, increases toward root
    }
  }
}
```

**Parameters**:
- `nodeId` (required): Child node UUID
- `maxDepth` (default: 10, max: 20): Maximum ancestor levels

**Returns**:
- `nodes`: All ancestors from root to node
- `chain`: Ordered array from root (depth=N) to child (depth=0)

**Example Use Case**:
```graphql
# Verify Level 1 node derives from Level 0
query VerifyProvenance {
  getNodeAncestors(nodeId: "level1-node") {
    chain {
      node {
        is_level_0
        weight
      }
      depth
    }
  }
}
```

---

### 5. getHighVeracityRelatedNodes - Trusted Neighbors

**Purpose**: Get direct neighbors with high combined veracity scores.

**Use Cases**:
- "What are the most reliable connections?"
- "Show trusted neighbors"
- "Find Level 0 connections"

**GraphQL Query**:
```graphql
query HighQualityNeighbors {
  getHighVeracityRelatedNodes(
    nodeId: "abc-123"
    limit: 20
    minVeracity: 0.8
  ) {
    id
    props
    weight
    is_level_0
  }
}
```

**Parameters**:
- `nodeId` (required): Reference node UUID
- `limit` (default: 20, max: 100): Maximum results
- `minVeracity` (default: 0.7): Minimum weight threshold

**Scoring**: `combined_score = node.weight * edge.weight`

**Returns**: Array of nodes sorted by combined score DESC

---

### 6. getNodeStatistics - Graph Metrics

**Purpose**: Get connectivity metrics for a node.

**GraphQL Query**:
```graphql
query NodeStats {
  getNodeStatistics(nodeId: "abc-123") {
    nodeId
    outgoingEdges
    incomingEdges
    totalDegree
    averageEdgeWeight
    connectedComponents
  }
}
```

**Returns**:
- `outgoingEdges`: Count of edges where node is source
- `incomingEdges`: Count of edges where node is target
- `totalDegree`: Total edge count
- `averageEdgeWeight`: Mean edge weight
- `connectedComponents`: Number of distinct graphs node appears in

---

## Performance Characteristics

### Query Complexity

| Operation | Time Complexity | Space Complexity | Recommended Max Depth |
|-----------|----------------|-----------------|---------------------|
| findPath | O(b^(d/2)) | O(b^(d/2)) | 6 |
| getSubgraph | O(b^d) | O(b^d) | 3 |
| findRelatedNodes | O(b^d) | O(b^d) | 3 |
| getNodeAncestors | O(d) | O(d) | 10 |
| getHighVeracityRelatedNodes | O(1) | O(1) | N/A (direct only) |

Where:
- `b` = branching factor (average edges per node)
- `d` = depth

### Index Requirements

**Critical Indexes** (should exist):
```sql
-- Primary keys (automatic)
CREATE INDEX ON public."Nodes"(id);
CREATE INDEX ON public."Edges"(id);

-- Traversal indexes
CREATE INDEX ON public."Edges"(source_node_id);
CREATE INDEX ON public."Edges"(target_node_id);

-- Provenance index
CREATE INDEX ON public."Nodes"(primary_source_id)
WHERE primary_source_id IS NOT NULL;
```

**Recommended Indexes** (for optimization):
```sql
-- Veracity-filtered traversal
CREATE INDEX ON public."Edges"(source_node_id, weight DESC);
CREATE INDEX ON public."Edges"(target_node_id, weight DESC);

-- Edge type filtering
CREATE INDEX ON public."Edges"(edge_type_id, source_node_id, target_node_id);

-- High-veracity queries
CREATE INDEX ON public."Nodes"(weight DESC) WHERE weight >= 0.7;
CREATE INDEX ON public."Edges"(weight DESC) WHERE weight >= 0.7;
```

### Performance Tuning

**PostgreSQL Configuration**:
```sql
-- Increase work_mem for complex CTEs
SET work_mem = '256MB';

-- Enable parallel workers for large graphs
SET max_parallel_workers_per_gather = 4;

-- Ensure statistics are up-to-date
ANALYZE public."Nodes";
ANALYZE public."Edges";
```

**Application-Level Optimization**:
1. **Use prepared statements** for repeated queries
2. **Cache results** in Redis with appropriate TTLs
3. **Implement pagination** for large result sets
4. **Monitor query execution time** and add indexes proactively

---

## Safety & Limits

### Rate Limiting

Recommended per-user rate limits:
- Interactive queries: 60 requests/minute
- Background jobs: 10 requests/minute
- System queries: Unlimited

### Query Timeouts

```typescript
// Set query timeout in pool config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 5000  // 5 seconds
});
```

### Depth Limits (Enforced in Resolver)

| Query | Default | Maximum | Rationale |
|-------|---------|---------|-----------|
| findPath | 6 | 10 | Bidirectional reduces effective depth |
| getSubgraph | 2 | 5 | Exponential growth of results |
| findRelatedNodes | 3 | 5 | Filtered traversal is more constrained |
| getNodeAncestors | 10 | 20 | Linear growth, provenance chains |

### Node Limits

- `getSubgraph`: Default 500, max 1000 nodes
- `getHighVeracityRelatedNodes`: Default 20, max 100 nodes

---

## Example Use Cases

### Case 1: Evidence Chain Verification

**Scenario**: Verify a Level 1 claim derives from Level 0 sources.

```graphql
query VerifyClaimProvenance {
  # Step 1: Get ancestor chain
  ancestors: getNodeAncestors(nodeId: "claim-123") {
    chain {
      node {
        id
        is_level_0
        weight
      }
      depth
    }
  }

  # Step 2: Get supporting evidence
  evidence: findRelatedNodes(
    nodeId: "claim-123"
    edgeTypeId: "supports-type-id"
    depth: 2
    minVeracity: 0.8
  ) {
    nodes {
      is_level_0
      weight
    }
  }
}
```

### Case 2: Challenge Impact Analysis

**Scenario**: Analyze how challenges affect a claim's veracity.

```graphql
query AnalyzeChallenges {
  # Find all challenges
  challenges: findRelatedNodes(
    nodeId: "claim-456"
    edgeTypeId: "challenges-type-id"
    depth: 1
  ) {
    nodes {
      id
      props
      weight
    }
  }

  # Find supporting evidence
  support: findRelatedNodes(
    nodeId: "claim-456"
    edgeTypeId: "supports-type-id"
    depth: 2
  ) {
    paths {
      weight
    }
  }
}
```

### Case 3: Context Window for AI Assistant

**Scenario**: Gather relevant context for GraphRAG query.

```graphql
query GatherContextForAI {
  # Expand around selected nodes
  context: getSubgraph(
    nodeId: "focus-node-789"
    depth: 2
    direction: BOTH
    minVeracity: 0.6
    maxNodes: 200
  ) {
    nodes {
      id
      props
      weight
    }
    edges {
      id
      from { id }
      to { id }
      props
    }
  }

  # Get high-quality direct connections
  trusted: getHighVeracityRelatedNodes(
    nodeId: "focus-node-789"
    minVeracity: 0.9
  ) {
    id
    props
  }
}
```

---

## Monitoring & Debugging

### Query Execution Analysis

```sql
-- Explain query plan
EXPLAIN ANALYZE
WITH RECURSIVE graph_traversal AS (
  -- ... your CTE query
)
SELECT * FROM graph_traversal;
```

### Key Metrics to Track

1. **Query Latency**:
   - p50, p95, p99 percentiles
   - Target: <500ms for depth 3 queries

2. **Result Set Size**:
   - Nodes/edges returned per query
   - Flag queries returning >1000 nodes

3. **Index Hit Ratio**:
   ```sql
   SELECT schemaname, tablename,
          idx_scan, seq_scan,
          idx_scan::float / (idx_scan + seq_scan) as idx_ratio
   FROM pg_stat_user_tables
   WHERE tablename IN ('Nodes', 'Edges');
   ```

4. **Temp Space Usage**:
   ```sql
   SELECT query, temp_blks_written
   FROM pg_stat_statements
   WHERE query LIKE '%WITH RECURSIVE%'
   ORDER BY temp_blks_written DESC;
   ```

---

## Best Practices

### 1. Choose the Right Query

- **Direct neighbors**: Use `getHighVeracityRelatedNodes`
- **Specific relationships**: Use `findRelatedNodes`
- **General exploration**: Use `getSubgraph`
- **Connection discovery**: Use `findPath`
- **Provenance tracking**: Use `getNodeAncestors`

### 2. Set Appropriate Limits

- Start with shallow depths (2-3) and increase if needed
- Use `minVeracity >= 0.7` for high-confidence paths
- Set conservative `maxNodes` limits for untrusted queries

### 3. Leverage Caching

```typescript
// Example caching strategy
const cacheKey = `subgraph:${nodeId}:${depth}:${direction}:${minVeracity}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await service.getSubgraph(...);
await redis.setex(cacheKey, 300, JSON.stringify(result));  // 5 min TTL
```

### 4. Handle Large Results

```typescript
// Paginate large subgraphs
const allNodes = await service.getSubgraph(nodeId, depth);
const paginated = allNodes.nodes.slice(offset, offset + limit);
```

---

## Troubleshooting

### Problem: Query Timeout

**Symptoms**: Queries taking >5 seconds

**Solutions**:
1. Check if indexes exist: `\d+ "Edges"` in psql
2. Reduce depth or increase `minVeracity`
3. Run `VACUUM ANALYZE` on tables
4. Check for missing statistics: `pg_stats`

### Problem: High Memory Usage

**Symptoms**: Out of memory errors, temp file writes

**Solutions**:
1. Reduce `maxNodes` limit
2. Increase PostgreSQL `work_mem`
3. Add `LIMIT` clause to CTEs
4. Consider materialized paths for deep traversals

### Problem: Incorrect Results

**Symptoms**: Missing nodes, broken paths

**Solutions**:
1. Verify edge directionality is correct
2. Check `minVeracity` isn't too restrictive
3. Confirm nodes are in same graph
4. Look for soft-deleted nodes/edges

---

## Future Enhancements

### Planned Improvements

1. **Weighted Path Finding**: Dijkstra's algorithm for shortest weighted paths
2. **Multi-source Traversal**: Start from multiple nodes simultaneously
3. **Temporal Queries**: Filter by created_at/updated_at ranges
4. **Approximate Queries**: Probabilistic algorithms for very large graphs
5. **GraphML Export**: Serialize subgraphs for external analysis tools

### Performance Roadmap

- [ ] Implement graph partitioning for multi-tenant isolation
- [ ] Add bloom filters for cycle detection in deep traversals
- [ ] Cache common traversal patterns in materialized views
- [ ] Parallel traversal execution for independent paths
- [ ] GPU-accelerated graph algorithms for Level 0

---

## References

- PostgreSQL Recursive CTE Documentation: https://www.postgresql.org/docs/current/queries-with.html
- Graph Traversal Algorithms (Cormen et al.): Chapter 22
- Project Rabbit Hole GraphRAG Architecture: `/backend/docs/graphrag-architecture.md`
- Database Schema: `/init.sql`

---

**Last Updated**: 2025-10-10
**Maintainer**: Backend Team
**Related Services**: AIAssistantResolver, GraphResolver
