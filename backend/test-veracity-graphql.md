# Veracity System GraphQL Tests

## Test the integration at: http://localhost:4000/graphql

### Query 1: Get nodes with veracity scores

```graphql
query GetNodesWithVeracity {
  graphs {
    id
    name
    nodes {
      id
      props
      is_level_0
      veracity {
        veracity_score
        evidence_count
        consensus_score
        challenge_count
        calculated_at
      }
    }
  }
}
```

### Query 2: Get specific veracity score

```graphql
query GetVeracityScore($nodeId: ID) {
  getVeracityScore(nodeId: $nodeId) {
    id
    veracity_score
    evidence_count
    supporting_evidence_weight
    refuting_evidence_weight
    consensus_score
    challenge_count
    open_challenge_count
    temporal_decay_factor
    calculated_at
  }
}
```

Variables:
```json
{
  "nodeId": "YOUR_NODE_ID_HERE"
}
```

### Query 3: Get evidence for a node

```graphql
query GetEvidenceForNode($nodeId: ID!) {
  getEvidenceForNode(nodeId: $nodeId) {
    id
    evidence_type
    weight
    confidence
    content
    source {
      id
      title
      source_type
      credibility {
        credibility_score
      }
    }
    created_at
  }
}
```

### Query 4: Get all sources

```graphql
query GetSources {
  getSources(limit: 10) {
    id
    source_type
    title
    url
    is_verified
    credibility {
      credibility_score
      total_evidence_count
      challenge_ratio
    }
  }
}
```

### Query 5: Get disputed claims

```graphql
query GetDisputedClaims {
  getDisputedClaims(threshold: 0.5, limit: 10) {
    id
    target_node_id
    veracity_score
    evidence_count
    challenge_count
    consensus_score
    calculated_at
  }
}
```

### Mutation 1: Create a source

```graphql
mutation CreateSource {
  createSource(
    sourceType: "academic_paper"
    title: "Sample Research Paper on Climate Science"
    url: "https://example.com/paper.pdf"
    authors: ["Dr. Jane Smith", "Dr. John Doe"]
    publicationDate: "2024-01-15"
    publisher: "Journal of Science"
    abstract: "This paper discusses climate patterns..."
  ) {
    id
    title
    source_type
    credibility {
      credibility_score
    }
  }
}
```

### Mutation 2: Submit evidence

```graphql
mutation SubmitEvidence($nodeId: ID!, $sourceId: ID!, $submittedBy: ID!) {
  submitEvidence(
    nodeId: $nodeId
    sourceId: $sourceId
    evidenceType: "supporting"
    content: "This evidence supports the claim based on peer-reviewed research."
    weight: 0.9
    confidence: 0.85
    submittedBy: $submittedBy
  ) {
    id
    evidence_type
    weight
    confidence
    content
    created_at
  }
}
```

### Mutation 3: Calculate veracity score

```graphql
mutation CalculateVeracity($nodeId: ID) {
  calculateVeracityScore(
    nodeId: $nodeId
    changeReason: "manual_recalculation"
  ) {
    id
    veracity_score
    evidence_count
    consensus_score
    challenge_count
    calculated_at
  }
}
```

### Query 6: Get veracity history

```graphql
query GetVeracityHistory($nodeId: ID) {
  getVeracityHistory(nodeId: $nodeId, limit: 20) {
    id
    old_score
    new_score
    score_delta
    change_reason
    changed_at
  }
}
```

### Query 7: Test with edges

```graphql
query GetEdgesWithVeracity {
  graph(id: "YOUR_GRAPH_ID") {
    edges {
      id
      from {
        id
        props
      }
      to {
        id
        props
      }
      is_level_0
      veracity {
        veracity_score
        evidence_count
        consensus_score
      }
    }
  }
}
```

## Expected Results

### For Level 0 Nodes/Edges
- `veracity_score`: 1.0 (fixed)
- `evidence_count`: 0
- `calculation_method`: "level_0_fixed"

### For Level 1 Nodes/Edges (user-created)
- `veracity_score`: 0.0 to 1.0 (calculated)
- `evidence_count`: varies
- `consensus_score`: based on evidence
- `challenge_count`: number of open challenges

## Testing Workflow

1. **Start**: Query existing nodes with veracity
2. **Create**: Add a new source
3. **Submit**: Add evidence to a node
4. **Calculate**: Trigger veracity score calculation
5. **Verify**: Check updated scores
6. **History**: View score changes over time

## Database Functions Available

The following PostgreSQL functions are available and automatically triggered:

- `calculate_veracity_score(target_type, target_id)` - Calculate score
- `refresh_veracity_score(target_type, target_id, reason)` - Recalculate and log
- `calculate_evidence_weight(evidence_id)` - Weight with credibility
- `calculate_consensus_score(target_type, target_id)` - Agreement ratio
- `calculate_challenge_impact(target_type, target_id)` - Challenge penalty
- `update_source_credibility(source_id)` - Recalculate source reputation

## Triggers

Automatic updates occur when:
- Evidence is added/updated/deleted
- Challenges are created/resolved
- Source credibility changes
