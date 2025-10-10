# Veracity System - Quick Start Guide

## What Was Built

A complete GraphQL API for the Veracity Score System that:
- Tracks evidence-based veracity scores for nodes and edges
- Manages sources and their credibility
- Provides score history and trending data
- Automatically calculates consensus from evidence
- Applies challenge penalties
- Tracks temporal decay for time-sensitive claims

## Files Created

### Entities (5 files)
- `backend/src/entities/VeracityScore.ts` - Core veracity scores
- `backend/src/entities/Evidence.ts` - Evidence records
- `backend/src/entities/Source.ts` - Information sources
- `backend/src/entities/SourceCredibility.ts` - Source reputation scores
- `backend/src/entities/VeracityScoreHistory.ts` - Score change tracking

### Resolvers (1 file, 540+ lines)
- `backend/src/resolvers/VeracityResolver.ts` - 24 methods including:
  - 8 queries
  - 4 mutations
  - 9 field resolvers

## Quick Test

### 1. Access GraphQL Playground
```
http://localhost:4000/graphql
```

### 2. Test Basic Query
```graphql
query {
  graphs {
    nodes {
      id
      veracity {
        veracity_score
      }
    }
  }
}
```

### 3. Create a Source
```graphql
mutation {
  createSource(
    sourceType: "academic_paper"
    title: "Climate Science Review"
    url: "https://example.com/paper.pdf"
  ) {
    id
    title
  }
}
```

### 4. Submit Evidence
```graphql
mutation {
  submitEvidence(
    nodeId: "YOUR_NODE_ID"
    sourceId: "SOURCE_ID_FROM_STEP_3"
    evidenceType: "supporting"
    content: "Strong evidence from peer review"
    weight: 0.9
    confidence: 0.85
    submittedBy: "YOUR_USER_ID"
  ) {
    id
  }
}
```

### 5. Calculate Veracity
```graphql
mutation {
  calculateVeracityScore(nodeId: "YOUR_NODE_ID") {
    veracity_score
    evidence_count
    consensus_score
  }
}
```

## Key Features

### Automatic Scoring
- Evidence changes trigger score recalculation
- Source credibility factors into evidence weight
- Temporal decay for time-sensitive claims
- Challenge penalties reduce scores

### Level 0 vs Level 1
- **Level 0** (immutable): Fixed veracity = 1.0
- **Level 1** (user-created): Calculated from evidence

### History Tracking
All score changes are logged with:
- Old vs new score
- Reason for change
- Triggering entity
- Timestamp

## Database Functions

The GraphQL resolvers use these PostgreSQL functions:
- `calculate_veracity_score()` - Main scoring algorithm
- `refresh_veracity_score()` - Update with history
- `calculate_evidence_weight()` - Weighted evidence
- `calculate_consensus_score()` - Agreement ratio
- `calculate_challenge_impact()` - Penalty calculation
- `update_source_credibility()` - Source reputation

## API Coverage

### Queries
- Get veracity score for node/edge
- Get score history
- Get evidence for node/edge
- List sources with credibility
- Find disputed claims (low scores)

### Mutations
- Calculate/recalculate scores
- Submit new evidence
- Create sources
- Update source credibility

## Documentation

Full details in:
- `VERACITY_INTEGRATION_REPORT.md` - Complete implementation report
- `backend/test-veracity-graphql.md` - All example queries
- Database schema: `backend/migrations/003_veracity_system.sql`

## Status

✅ GraphQL schema built successfully
✅ All resolvers registered
✅ Server running
✅ Database schema ready

Ready for testing and integration!
