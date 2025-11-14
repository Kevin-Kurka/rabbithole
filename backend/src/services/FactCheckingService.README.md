# FactCheckingService

Comprehensive fact-checking service that leverages AI and semantic search to verify claims against the Rabbit Hole knowledge graph.

## Overview

The FactCheckingService provides automated claim verification by:

1. **Semantic Evidence Search** - Uses pgvector embeddings to find relevant nodes
2. **AI-Powered Categorization** - Ollama reasoning model classifies evidence as supporting/conflicting/neutral
3. **Veracity Calculation** - Weighted scoring based on source reliability and semantic similarity
4. **Automatic Inquiry Generation** - Creates formal inquiries for uncertain or disputed claims
5. **Veracity Score Updates** - Updates node veracity scores based on verification results

## Key Features

### 1. Claim Verification

```typescript
const result = await factCheckingService.verifyClaim(
  pool,
  "The JFK assassination was investigated by the Warren Commission",
  sourceNodeId,
  graphId
);

console.log(`Veracity: ${result.overallVeracity * 100}%`);
console.log(`Confidence: ${result.confidence * 100}%`);
console.log(`Supporting evidence: ${result.supportingEvidence.length}`);
console.log(`Conflicting evidence: ${result.conflictingEvidence.length}`);
```

### 2. Evidence Discovery

Find supporting or conflicting evidence for any claim:

```typescript
// Find corroborating evidence
const supporting = await factCheckingService.findCorroboratingEvidence(
  pool,
  "Warren Commission concluded Oswald acted alone",
  graphId
);

// Find conflicting evidence
const conflicting = await factCheckingService.findConflictingEvidence(
  pool,
  "Warren Commission concluded Oswald acted alone",
  graphId
);
```

### 3. Automatic Veracity Updates

```typescript
const verification = await factCheckingService.verifyClaim(
  pool,
  claimText,
  nodeId,
  graphId
);

await factCheckingService.updateVeracityScore(
  pool,
  nodeId,
  verification,
  userId
);
```

### 4. Inquiry Generation

Automatically creates formal inquiries for uncertain claims:

```typescript
const inquiryIds = await factCheckingService.createInquiryFromVerification(
  pool,
  verificationResult,
  userId
);

console.log(`Created ${inquiryIds.length} inquiries`);
```

## GraphQL API

### Queries

#### `verifyClaim`

Verify a claim against the knowledge graph.

```graphql
query VerifyClaim($input: VerifyClaimInput!) {
  verifyClaim(input: $input) {
    claimText
    overallVeracity
    confidence
    supportingEvidence {
      nodeId
      nodeTitle
      nodeType
      sourceReliability
      semanticSimilarity
      evidenceType
    }
    conflictingEvidence {
      nodeId
      nodeTitle
      sourceReliability
      evidenceType
    }
    reasoning
    shouldCreateInquiry
    suggestedInquiryQuestions
  }
}
```

**Variables:**
```json
{
  "input": {
    "claimText": "The Warren Commission concluded Oswald acted alone",
    "sourceNodeId": "uuid-node-id",
    "graphId": "uuid-graph-id",
    "context": "JFK assassination investigation"
  }
}
```

#### `findCorroboratingEvidence`

Find evidence that supports a claim.

```graphql
query FindSupporting($input: FindEvidenceInput!) {
  findCorroboratingEvidence(input: $input) {
    nodeId
    nodeTitle
    nodeType
    content
    veracity
    sourceReliability
    semanticSimilarity
  }
}
```

#### `findConflictingEvidence`

Find evidence that contradicts a claim.

```graphql
query FindConflicting($input: FindEvidenceInput!) {
  findConflictingEvidence(input: $input) {
    nodeId
    nodeTitle
    nodeType
    sourceReliability
    semanticSimilarity
  }
}
```

#### `generateVerificationReport`

Generate comprehensive verification report.

```graphql
query GenerateReport($input: VerifyClaimInput!) {
  generateVerificationReport(input: $input) {
    claimText
    overallVeracity
    confidence
    supportingEvidence {
      nodeTitle
      sourceReliability
      semanticSimilarity
    }
    conflictingEvidence {
      nodeTitle
      sourceReliability
    }
    neutralEvidence {
      nodeTitle
    }
    reasoning
    shouldCreateInquiry
    suggestedInquiryQuestions
    generatedAt
  }
}
```

### Mutations

#### `updateVeracityFromVerification`

Verify claim and update node's veracity score.

```graphql
mutation UpdateVeracity($input: UpdateVeracityFromVerificationInput!) {
  updateVeracityFromVerification(input: $input)
}
```

**Variables:**
```json
{
  "input": {
    "nodeId": "uuid-node-id",
    "claimText": "Warren Commission report released in 1964",
    "graphId": "uuid-graph-id"
  }
}
```

#### `createInquiriesFromVerification`

Verify claim and create formal inquiries if needed.

```graphql
mutation CreateInquiries($input: CreateInquiriesFromVerificationInput!) {
  createInquiriesFromVerification(input: $input) {
    inquiryIds
    count
    message
  }
}
```

#### `verifyClaimWithActions`

All-in-one mutation: verify claim, update veracity, and create inquiries.

```graphql
mutation VerifyWithActions($input: VerifyClaimInput!) {
  verifyClaimWithActions(input: $input) {
    claimText
    overallVeracity
    confidence
    supportingEvidence {
      nodeTitle
      sourceReliability
    }
    conflictingEvidence {
      nodeTitle
      sourceReliability
    }
    reasoning
    shouldCreateInquiry
    suggestedInquiryQuestions
  }
}
```

## How It Works

### 1. Embedding Generation

Claims are converted to vector embeddings using Ollama's embedding model:

```typescript
const embedding = await generateEmbedding(claimText);
// Returns 384-dimensional vector (nomic-embed-text default)
```

### 2. Semantic Search

Uses PostgreSQL pgvector to find semantically similar nodes:

```sql
SELECT *
FROM public."Nodes" n
WHERE n.ai IS NOT NULL
ORDER BY n.ai <=> $embedding::vector
LIMIT 20
```

### 3. Evidence Categorization

AI analyzes each piece of evidence to determine its relationship to the claim:

```typescript
const category = await categorizeEvidence(claim, evidenceContent);
// Returns: 'supporting' | 'conflicting' | 'neutral'
```

### 4. Veracity Calculation

Weighted scoring based on:
- Source reliability (veracity score, Level 0 status, temporal decay)
- Semantic similarity (cosine similarity from vector search)
- Evidence type (supporting vs conflicting)

```typescript
const supportWeight = supportingEvidence.reduce(
  (sum, e) => sum + e.sourceReliability * e.semanticSimilarity,
  0
);

const conflictWeight = conflictingEvidence.reduce(
  (sum, e) => sum + e.sourceReliability * e.semanticSimilarity,
  0
);

const veracity = supportWeight / (supportWeight + conflictWeight);
```

### 5. Confidence Assessment

Based on:
- Total amount of evidence
- Balance between supporting and conflicting evidence
- Source reliability

```typescript
const totalEvidence = supporting.length + conflicting.length;
const confidence = Math.min(0.95, 0.3 + (totalEvidence * 0.1));
```

### 6. Inquiry Decision

Creates formal inquiries when:
- Confidence < 50%
- Contradictory evidence exists
- Veracity in uncertain range (0.3-0.7)
- No evidence found

## Configuration

### Environment Variables

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:1.5b           # Reasoning model
OLLAMA_EMBEDDING_MODEL=nomic-embed-text  # Embedding model

# Database (must have pgvector extension)
DATABASE_URL=postgresql://user:pass@localhost:5432/rabbithole_db
```

### Thresholds

Configurable in service constructor:

```typescript
private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.7;  // Min similarity for evidence
private readonly HIGH_VERACITY_THRESHOLD = 0.8;       // High confidence threshold
private readonly LOW_VERACITY_THRESHOLD = 0.4;        // Low confidence threshold
private readonly EVIDENCE_SEARCH_LIMIT = 20;          // Max evidence pieces
```

## Integration Examples

### Frontend: Verify Node Content

```typescript
import { useMutation } from '@apollo/client';
import { VERIFY_CLAIM_WITH_ACTIONS } from '@/graphql/mutations';

function FactCheckButton({ nodeId, claimText }) {
  const [verify, { data, loading }] = useMutation(VERIFY_CLAIM_WITH_ACTIONS);

  const handleVerify = async () => {
    const result = await verify({
      variables: {
        input: {
          claimText,
          sourceNodeId: nodeId,
        }
      }
    });

    console.log('Veracity:', result.data.verifyClaimWithActions.overallVeracity);
  };

  return (
    <button onClick={handleVerify} disabled={loading}>
      {loading ? 'Verifying...' : 'Verify Claim'}
    </button>
  );
}
```

### Backend: Batch Verification

```typescript
async function verifyAllNodesInGraph(pool: Pool, graphId: string, userId: string) {
  // Fetch all nodes
  const nodes = await pool.query(
    `SELECT id, title, props FROM public."Nodes" WHERE graph_id = $1`,
    [graphId]
  );

  for (const node of nodes.rows) {
    const props = JSON.parse(node.props);
    const claim = props.claim || props.description || node.title;

    // Verify claim
    const verification = await factCheckingService.verifyClaim(
      pool,
      claim,
      node.id,
      graphId
    );

    // Update veracity score
    await factCheckingService.updateVeracityScore(
      pool,
      node.id,
      verification,
      userId
    );

    // Create inquiries if needed
    if (verification.shouldCreateInquiry) {
      await factCheckingService.createInquiryFromVerification(
        pool,
        verification,
        userId
      );
    }
  }
}
```

## Performance Considerations

### Vector Search Optimization

Ensure HNSW index exists on the `ai` column:

```sql
CREATE INDEX IF NOT EXISTS idx_nodes_ai_hnsw
ON public."Nodes"
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Caching

Service does NOT cache results - each verification is fresh. Consider implementing Redis caching for frequently verified claims:

```typescript
const cacheKey = `fact-check:${graphId}:${hashClaim(claimText)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await factCheckingService.verifyClaim(...);
await redis.setex(cacheKey, 3600, JSON.stringify(result));
```

### Rate Limiting

No built-in rate limiting. Implement at resolver level:

```typescript
@Query(() => VerificationResultType)
async verifyClaim(@Ctx() { userId }: Context) {
  const rateLimit = await checkRateLimit(userId, 'fact-check', 10, 3600);
  if (!rateLimit.allowed) {
    throw new Error('Rate limit exceeded. Try again later.');
  }
  // ... verification logic
}
```

## Testing

Run tests:

```bash
cd backend
npm test FactCheckingService
```

Test coverage:

```bash
npm run test:coverage -- FactCheckingService
```

## Troubleshooting

### "Ollama is not running"

Start Ollama:

```bash
ollama serve
```

Pull required models:

```bash
ollama pull deepseek-r1:1.5b
ollama pull nomic-embed-text
```

### "Failed to search for similar evidence"

Check pgvector extension:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

Install if missing:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Low confidence results

- Ensure nodes have embeddings (run vectorization worker)
- Increase `EVIDENCE_SEARCH_LIMIT` for more evidence
- Lower `SEMANTIC_SIMILARITY_THRESHOLD` to include more nodes
- Check veracity scores are set on existing nodes

### No inquiries created

Inquiries are only created when:
- `shouldCreateInquiry` is true (low confidence or conflicting evidence)
- Source node ID is provided
- User is authenticated

## Roadmap

- [ ] Multi-language support for claims
- [ ] Temporal analysis (evidence freshness)
- [ ] Source authority weighting (expert sources > general sources)
- [ ] Fact-check history tracking
- [ ] Automated re-verification on graph updates
- [ ] Batch verification API
- [ ] Real-time verification subscriptions
- [ ] Evidence quality scoring
- [ ] Cross-graph verification

## Related Services

- **AIAssistantService** - General AI assistance and methodology guidance
- **SearchService** - Full-text and semantic search
- **GraphTraversalService** - Graph pathfinding and relationship analysis
- **NotificationService** - User notifications for inquiries and veracity updates

## License

Part of Project Rabbit Hole - Evidence-based collaborative investigation platform.
