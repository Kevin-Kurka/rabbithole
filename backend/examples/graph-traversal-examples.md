# Graph Traversal Query Examples

This document provides practical examples for using the GraphTraversal queries in Project Rabbit Hole.

## Table of Contents

1. [Basic Path Finding](#basic-path-finding)
2. [Evidence Chain Verification](#evidence-chain-verification)
3. [Context Expansion for AI](#context-expansion-for-ai)
4. [Challenge Impact Analysis](#challenge-impact-analysis)
5. [Provenance Tracking](#provenance-tracking)
6. [High-Quality Recommendations](#high-quality-recommendations)
7. [Advanced Patterns](#advanced-patterns)

---

## Basic Path Finding

### Example 1: Simple Path Between Two Claims

**Scenario**: User wants to know if two claims are connected.

```graphql
query FindConnectionBetweenClaims {
  findPath(
    sourceNodeId: "claim-abc-123"
    targetNodeId: "claim-def-456"
    maxDepth: 4
    minVeracity: 0.6
  ) {
    found
    pathLength
    totalWeight
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
  }
}
```

**Response**:
```json
{
  "data": {
    "findPath": {
      "found": true,
      "pathLength": 3,
      "totalWeight": 0.648,
      "nodes": [
        {
          "id": "claim-abc-123",
          "props": "{\"title\":\"COVID vaccines reduce transmission\"}",
          "weight": 0.92
        },
        {
          "id": "evidence-xyz-789",
          "props": "{\"title\":\"CDC Study 2021\"}",
          "weight": 0.95
        },
        {
          "id": "study-meta-001",
          "props": "{\"title\":\"Vaccine effectiveness meta-analysis\"}",
          "weight": 0.88
        },
        {
          "id": "claim-def-456",
          "props": "{\"title\":\"Vaccines reduce hospitalization\"}",
          "weight": 0.90
        }
      ],
      "edges": [
        {"id": "edge-1", "props": "{\"type\":\"SUPPORTS\"}", "weight": 0.9},
        {"id": "edge-2", "props": "{\"type\":\"CITES\"}", "weight": 0.85},
        {"id": "edge-3", "props": "{\"type\":\"SUPPORTS\"}", "weight": 0.8}
      ]
    }
  }
}
```

---

## Evidence Chain Verification

### Example 2: Verify Claim Derives from Level 0

**Scenario**: Curator needs to verify a Level 1 claim has proper Level 0 provenance.

```graphql
query VerifyClaimProvenance {
  # Get ancestor chain
  ancestors: getNodeAncestors(nodeId: "claim-level1-abc") {
    nodes {
      id
      weight
      is_level_0
      props
    }
    chain {
      node {
        id
        is_level_0
      }
      depth
    }
  }

  # Get supporting evidence
  supportingEvidence: findRelatedNodes(
    nodeId: "claim-level1-abc"
    edgeTypeId: "edge-type-supports-id"
    depth: 2
    minVeracity: 0.8
  ) {
    nodes {
      id
      is_level_0
      weight
    }
    paths {
      nodes
      weight
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "ancestors": {
      "nodes": [
        {
          "id": "level0-root-001",
          "weight": 1.0,
          "is_level_0": true,
          "props": "{\"source\":\"WHO Official Statement\"}"
        },
        {
          "id": "claim-level1-abc",
          "weight": 0.87,
          "is_level_0": false,
          "props": "{\"title\":\"User interpretation of WHO data\"}"
        }
      ],
      "chain": [
        {"node": {"id": "level0-root-001", "is_level_0": true}, "depth": 1},
        {"node": {"id": "claim-level1-abc", "is_level_0": false}, "depth": 0}
      ]
    },
    "supportingEvidence": {
      "nodes": [
        {"id": "evidence-1", "is_level_0": true, "weight": 1.0},
        {"id": "evidence-2", "is_level_0": true, "weight": 0.98}
      ],
      "paths": [
        {"nodes": ["claim-level1-abc", "evidence-1"], "weight": 0.87},
        {"nodes": ["claim-level1-abc", "evidence-2"], "weight": 0.85}
      ]
    }
  }
}
```

---

## Context Expansion for AI

### Example 3: Gather Context for GraphRAG Query

**Scenario**: AI assistant needs context around user-selected nodes.

```graphql
query GatherAIContext {
  # Expand immediate neighborhood
  localContext: getSubgraph(
    nodeId: "focus-node-123"
    depth: 2
    direction: "both"
    minVeracity: 0.6
    maxNodes: 200
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

  # Get high-quality direct connections for trust signals
  trustedConnections: getHighVeracityRelatedNodes(
    nodeId: "focus-node-123"
    limit: 10
    minVeracity: 0.9
  ) {
    id
    props
    weight
    is_level_0
  }

  # Get statistics for context
  stats: getNodeStatistics(nodeId: "focus-node-123") {
    totalDegree
    averageEdgeWeight
    outgoingEdges
    incomingEdges
  }
}
```

**Use Case**: Feed this context into LLM prompt for intelligent insights.

---

## Challenge Impact Analysis

### Example 4: Analyze Challenges and Rebuttals

**Scenario**: User wants to see all challenges against a claim and their strength.

```graphql
query AnalyzeClaimChallenges {
  # Find all direct challenges
  challenges: findRelatedNodes(
    nodeId: "claim-abc-123"
    edgeTypeId: "edge-type-challenges-id"
    depth: 1
    minVeracity: 0.5
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
  }

  # Find supporting evidence for comparison
  support: findRelatedNodes(
    nodeId: "claim-abc-123"
    edgeTypeId: "edge-type-supports-id"
    depth: 2
    minVeracity: 0.5
  ) {
    paths {
      nodes
      weight
    }
  }

  # Get claim's full neighborhood
  neighborhood: getSubgraph(
    nodeId: "claim-abc-123"
    depth: 1
    direction: "both"
    minVeracity: 0.5
    maxNodes: 100
  ) {
    nodes {
      id
      weight
    }
  }
}
```

**Analysis**:
```typescript
// Client-side processing
function analyzeClaimStrength(data) {
  const challengeWeight = data.challenges.nodes.reduce(
    (sum, n) => sum + n.weight, 0
  ) / data.challenges.nodes.length;

  const supportWeight = data.support.paths.reduce(
    (sum, p) => sum + p.weight, 0
  ) / data.support.paths.length;

  const netStrength = supportWeight - challengeWeight;

  return {
    challengeCount: data.challenges.nodes.length,
    supportCount: data.support.paths.length,
    avgChallengeWeight: challengeWeight,
    avgSupportWeight: supportWeight,
    netStrength,
    recommendation: netStrength > 0.2 ? "promote" : "review"
  };
}
```

---

## Provenance Tracking

### Example 5: Full Citation Chain to Original Source

**Scenario**: Trace a claim back to its original Level 0 source.

```graphql
query TraceCitationChain {
  getNodeAncestors(
    nodeId: "derived-claim-xyz"
    maxDepth: 10
  ) {
    nodes {
      id
      props
      weight
      is_level_0
      created_at
    }
    chain {
      node {
        id
        props
      }
      depth
    }
  }
}
```

**Visualization**:
```typescript
// Render provenance chain
function renderProvenanceChain(data) {
  return data.chain.map((item, idx) => {
    const node = data.nodes.find(n => n.id === item.node.id);
    const props = JSON.parse(node.props);

    return {
      level: item.depth,
      title: props.title,
      verified: node.is_level_0,
      veracity: node.weight,
      date: new Date(node.created_at).toLocaleDateString()
    };
  }).reverse(); // Root first
}
```

---

## High-Quality Recommendations

### Example 6: Find Trusted Related Claims

**Scenario**: Recommend high-veracity related nodes to explore.

```graphql
query GetTrustedRecommendations {
  highQuality: getHighVeracityRelatedNodes(
    nodeId: "current-node-123"
    limit: 20
    minVeracity: 0.85
  ) {
    id
    props
    weight
    is_level_0
  }

  # Also get paths to see relationships
  relationships: findPath(
    sourceNodeId: "current-node-123"
    targetNodeId: "recommendation-1-id"
    maxDepth: 3
    minVeracity: 0.85
  ) {
    pathLength
    totalWeight
    edges {
      props
    }
  }
}
```

---

## Advanced Patterns

### Example 7: Multi-Query Pattern for Complex Analysis

**Scenario**: Comprehensive analysis combining multiple traversal queries.

```graphql
query ComprehensiveNodeAnalysis($nodeId: ID!) {
  # 1. Node details
  node: getSubgraph(
    nodeId: $nodeId
    depth: 0
    minVeracity: 0.0
    maxNodes: 1
  ) {
    centerNode {
      id
      props
      weight
      is_level_0
    }
  }

  # 2. Immediate context
  context: getSubgraph(
    nodeId: $nodeId
    depth: 2
    direction: "both"
    minVeracity: 0.6
    maxNodes: 100
  ) {
    nodes { id weight }
    edges { id weight }
  }

  # 3. Provenance
  ancestry: getNodeAncestors(nodeId: $nodeId) {
    chain {
      node { is_level_0 }
      depth
    }
  }

  # 4. Support evidence
  support: findRelatedNodes(
    nodeId: $nodeId
    edgeTypeId: "supports-type-id"
    depth: 2
    minVeracity: 0.7
  ) {
    paths { weight }
  }

  # 5. Challenges
  challenges: findRelatedNodes(
    nodeId: $nodeId
    edgeTypeId: "challenges-type-id"
    depth: 1
    minVeracity: 0.5
  ) {
    nodes { id weight }
  }

  # 6. Statistics
  stats: getNodeStatistics(nodeId: $nodeId) {
    totalDegree
    averageEdgeWeight
  }

  # 7. Trusted neighbors
  trusted: getHighVeracityRelatedNodes(
    nodeId: $nodeId
    limit: 10
    minVeracity: 0.9
  ) {
    id
    weight
  }
}
```

**Variables**:
```json
{
  "nodeId": "abc-123"
}
```

---

### Example 8: Batch Path Finding

**Scenario**: Find paths between multiple node pairs efficiently.

```graphql
query BatchPathFinding {
  path1: findPath(
    sourceNodeId: "node-a"
    targetNodeId: "node-b"
    maxDepth: 4
  ) {
    found
    pathLength
  }

  path2: findPath(
    sourceNodeId: "node-a"
    targetNodeId: "node-c"
    maxDepth: 4
  ) {
    found
    pathLength
  }

  path3: findPath(
    sourceNodeId: "node-b"
    targetNodeId: "node-c"
    maxDepth: 4
  ) {
    found
    pathLength
  }
}
```

---

### Example 9: Progressive Subgraph Expansion

**Scenario**: Start shallow, expand deeper based on results.

```graphql
# First query: depth 1
query InitialExpansion {
  getSubgraph(nodeId: "start-123", depth: 1) {
    nodes { id }
  }
}

# If interesting nodes found, expand further
query DeeperExpansion {
  getSubgraph(nodeId: "start-123", depth: 2) {
    nodes { id props }
    edges { id props }
  }
}

# For specific branch, go even deeper
query FocusedDeepDive {
  getSubgraph(
    nodeId: "interesting-node-456"
    depth: 3
    direction: "outgoing"
    minVeracity: 0.8
  ) {
    nodes { id props weight }
  }
}
```

---

## Performance Tips

### 1. Use Appropriate Depth Limits

```graphql
# Good: Shallow depth for interactive queries
query Interactive {
  getSubgraph(nodeId: "node-123", depth: 2) { ... }
}

# Good: Deeper for background analysis
query BackgroundAnalysis {
  getNodeAncestors(nodeId: "node-123", maxDepth: 10) { ... }
}

# Bad: Too deep for interactive use
query Slow {
  getSubgraph(nodeId: "node-123", depth: 5) { ... }  # Will timeout
}
```

### 2. Filter by Veracity

```graphql
# High minVeracity reduces result set dramatically
query HighQuality {
  getSubgraph(
    nodeId: "node-123"
    depth: 3
    minVeracity: 0.85  # Only high-quality paths
  ) { ... }
}
```

### 3. Limit Result Size

```graphql
query Bounded {
  getSubgraph(
    nodeId: "node-123"
    depth: 2
    maxNodes: 50  # Hard limit
  ) { ... }
}
```

### 4. Request Only Needed Fields

```graphql
# Good: Minimal fields
query Efficient {
  getSubgraph(nodeId: "node-123", depth: 2) {
    nodes { id weight }
  }
}

# Bad: Fetching unused data
query Wasteful {
  getSubgraph(nodeId: "node-123", depth: 2) {
    nodes {
      id
      props
      meta
      weight
      is_level_0
      created_at
      updated_at
      # ... many fields not used
    }
  }
}
```

---

## Error Handling

### Example 10: Handling No Path Found

```graphql
query SafePathFinding {
  findPath(
    sourceNodeId: "node-a"
    targetNodeId: "node-b"
    maxDepth: 4
  ) {
    found  # Always check this field
    pathLength
    nodes {
      id
      props
    }
  }
}
```

**Client handling**:
```typescript
function handlePathResult(result) {
  if (!result.data.findPath.found) {
    return {
      message: "No connection found within 4 steps",
      suggestion: "Try increasing maxDepth or lowering minVeracity"
    };
  }

  return {
    message: `Found path with ${result.data.findPath.pathLength} steps`,
    nodes: result.data.findPath.nodes
  };
}
```

---

## Integration with Frontend

### React Hook Example

```typescript
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_SUBGRAPH = gql`
  query GetSubgraph($nodeId: ID!, $depth: Int!) {
    getSubgraph(nodeId: $nodeId, depth: $depth) {
      centerNode { id props }
      nodes { id props weight }
      edges { id from { id } to { id } weight }
    }
  }
`;

function NodeExplorer({ nodeId }) {
  const { data, loading, error } = useQuery(GET_SUBGRAPH, {
    variables: { nodeId, depth: 2 }
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <GraphVisualization
      nodes={data.getSubgraph.nodes}
      edges={data.getSubgraph.edges}
      center={data.getSubgraph.centerNode}
    />
  );
}
```

---

## Conclusion

These examples demonstrate the power and flexibility of the GraphTraversal queries. Start with simple queries and progressively build more complex analyses as needed. Always consider performance implications and use appropriate limits.

For API documentation, see: `/backend/src/services/GraphTraversalService.README.md`
