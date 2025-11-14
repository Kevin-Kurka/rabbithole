# FactCheckingService Implementation Summary

## Files Created

### 1. Service Implementation
**File:** `/Users/kmk/rabbithole/backend/src/services/FactCheckingService.ts`

Comprehensive fact-checking service with the following capabilities:

#### Core Methods:
- `verifyClaim(pool, claimText, sourceNodeId?, graphId?, context?)` - Main verification method
- `findCorroboratingEvidence(pool, claim, graphId?, context?)` - Find supporting evidence
- `findConflictingEvidence(pool, claim, graphId?, context?)` - Find contradicting evidence
- `generateVerificationReport(pool, claim, sourceNodeId?, graphId?)` - Generate full report
- `updateVeracityScore(pool, nodeId, verificationResult, userId)` - Update node veracity
- `createInquiryFromVerification(pool, verificationResult, userId)` - Create formal inquiries
- `shouldCreateInquiry(supporting, conflicting, veracity)` - Inquiry decision logic

#### Private Helper Methods:
- `generateEmbedding(text)` - Create vector embeddings via Ollama
- `findSimilarNodes(pool, claimText, graphId?, limit)` - Semantic search using pgvector
- `categorizeEvidence(claim, evidenceContent, context?)` - AI classification of evidence
- `assessSourceReliability(node)` - Calculate source credibility
- `findRelationshipPath(pool, sourceNodeId, targetNodeId)` - Graph pathfinding
- `calculateVeracity(supporting, conflicting)` - Weighted veracity calculation
- `generateReasoning(claim, supporting, conflicting, neutral, veracity)` - AI explanation
- `generateInquiryQuestions(claim, supporting, conflicting)` - Suggested questions

### 2. GraphQL Resolver
**File:** `/Users/kmk/rabbithole/backend/src/resolvers/FactCheckingResolver.ts`

Exposes fact-checking via GraphQL API:

#### Queries:
- `verifyClaim(input: VerifyClaimInput)` - Verify single claim
- `findCorroboratingEvidence(input: FindEvidenceInput)` - Search supporting evidence
- `findConflictingEvidence(input: FindEvidenceInput)` - Search conflicting evidence
- `generateVerificationReport(input: VerifyClaimInput)` - Full verification report

#### Mutations:
- `updateVeracityFromVerification(input: UpdateVeracityFromVerificationInput)` - Update veracity score
- `createInquiriesFromVerification(input: CreateInquiriesFromVerificationInput)` - Create inquiries
- `verifyClaimWithActions(input: VerifyClaimInput)` - All-in-one: verify + update + inquiries

#### GraphQL Types:
- `EvidenceType` - Evidence piece with reliability and similarity scores
- `VerificationResultType` - Complete verification result
- `CreateInquiriesResponse` - Inquiry creation result

### 3. Test Suite
**File:** `/Users/kmk/rabbithole/backend/src/__tests__/FactCheckingService.test.ts`

Comprehensive test coverage:
- Embedding generation and similarity calculation
- Vector search functionality
- Source reliability assessment
- Evidence categorization (supporting/conflicting/neutral)
- Veracity score calculation
- Inquiry creation logic
- Integration testing of full verification flow
- Error handling and edge cases

### 4. Documentation
**Files:**
- `/Users/kmk/rabbithole/backend/src/services/FactCheckingService.README.md` - Full API documentation
- `/Users/kmk/rabbithole/backend/src/services/FACTCHECKING_IMPLEMENTATION.md` - This file

## Integration Points

### 1. Ollama AI Integration
- **Reasoning Model:** `deepseek-r1:1.5b` (configurable via `OLLAMA_MODEL`)
- **Embedding Model:** `nomic-embed-text` (configurable via `OLLAMA_EMBEDDING_MODEL`)
- **Endpoint:** `http://localhost:11434` (configurable via `OLLAMA_URL`)

Used for:
- Generating claim embeddings
- Categorizing evidence as supporting/conflicting/neutral
- Generating human-readable reasoning
- Suggesting inquiry questions

### 2. PostgreSQL + pgvector Integration
- Uses pgvector extension for semantic similarity search
- Cosine distance operator (`<=>`) for finding similar nodes
- Expects HNSW index on `ai` column for performance
- Recursive CTEs for relationship pathfinding

### 3. Existing Entity Integration
- **Node entity:** Reads veracity scores, embeddings, metadata
- **VeracityScore entity:** Creates/updates veracity scores
- **Inquiry entity:** Creates formal inquiries for uncertain claims
- **InquiryResolver:** Leverages existing inquiry system

### 4. Registration in Apollo Server
Added to resolver list in `/Users/kmk/rabbithole/backend/src/index.ts`:
```typescript
FactCheckingResolver
```

## Key Features

### 1. Semantic Evidence Search
- Converts claims to 384-dimensional vectors (nomic-embed-text default)
- Searches for semantically similar nodes using cosine similarity
- Configurable similarity threshold (default: 0.7)
- Searches up to 20 evidence pieces (configurable)

### 2. AI-Powered Evidence Classification
Each piece of evidence is analyzed by Ollama to determine:
- **Supporting:** Directly confirms or corroborates the claim
- **Conflicting:** Directly contradicts or refutes the claim
- **Neutral:** Related but neither confirms nor contradicts

### 3. Weighted Veracity Calculation
Veracity score formula:
```
supportWeight = Σ(sourceReliability × semanticSimilarity) for supporting evidence
conflictWeight = Σ(sourceReliability × semanticSimilarity) for conflicting evidence
veracity = supportWeight / (supportWeight + conflictWeight)
```

Source reliability factors:
- Existing veracity score (if available)
- Level 0 status (immutable truth layer = 0.9+ reliability)
- Temporal decay (evidence >1 year old gets reduced reliability)

### 4. Automatic Inquiry Generation
Creates formal inquiries when:
- Confidence < 50%
- Contradictory evidence exists (both supporting and conflicting)
- Veracity score in uncertain range (0.3-0.7)
- No evidence found

### 5. Relationship Path Discovery
- Finds shortest path between source node and evidence node
- Uses recursive CTE (Common Table Expression)
- Limited to 5 hops to prevent infinite loops
- Cycle detection to prevent circular paths

## Configuration

### Environment Variables
```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:1.5b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Database (must have pgvector extension)
DATABASE_URL=postgresql://user:pass@localhost:5432/rabbithole_db
```

### Configurable Thresholds
In `FactCheckingService` constructor:
```typescript
private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.7;  // Min similarity for evidence
private readonly HIGH_VERACITY_THRESHOLD = 0.8;       // High confidence
private readonly LOW_VERACITY_THRESHOLD = 0.4;        // Low confidence
private readonly EVIDENCE_SEARCH_LIMIT = 20;          // Max evidence pieces
```

## Example Usage

### Frontend GraphQL Query
```typescript
import { gql, useMutation } from '@apollo/client';

const VERIFY_CLAIM = gql`
  mutation VerifyClaim($input: VerifyClaimInput!) {
    verifyClaimWithActions(input: $input) {
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
      reasoning
      shouldCreateInquiry
      suggestedInquiryQuestions
    }
  }
`;

function FactChecker({ nodeId, claim }) {
  const [verify, { data, loading, error }] = useMutation(VERIFY_CLAIM);

  const handleVerify = () => {
    verify({
      variables: {
        input: {
          claimText: claim,
          sourceNodeId: nodeId,
        }
      }
    });
  };

  return (
    <div>
      <button onClick={handleVerify} disabled={loading}>
        Verify Claim
      </button>
      {data && (
        <div>
          <p>Veracity: {(data.verifyClaimWithActions.overallVeracity * 100).toFixed(1)}%</p>
          <p>Confidence: {(data.verifyClaimWithActions.confidence * 100).toFixed(1)}%</p>
          <p>Reasoning: {data.verifyClaimWithActions.reasoning}</p>
        </div>
      )}
    </div>
  );
}
```

### Backend Service Usage
```typescript
import { factCheckingService } from './services/FactCheckingService';

// Verify a claim
const result = await factCheckingService.verifyClaim(
  pool,
  "The Warren Commission concluded Oswald acted alone",
  sourceNodeId,
  graphId
);

console.log(`Veracity: ${result.overallVeracity * 100}%`);
console.log(`Supporting: ${result.supportingEvidence.length}`);
console.log(`Conflicting: ${result.conflictingEvidence.length}`);
console.log(`Reasoning: ${result.reasoning}`);

// Update veracity score
if (result.overallVeracity !== null) {
  await factCheckingService.updateVeracityScore(
    pool,
    sourceNodeId,
    result,
    userId
  );
}

// Create inquiries if needed
if (result.shouldCreateInquiry) {
  const inquiryIds = await factCheckingService.createInquiryFromVerification(
    pool,
    result,
    userId
  );
  console.log(`Created ${inquiryIds.length} inquiries`);
}
```

## Performance Considerations

### Vector Search Optimization
Ensure HNSW index exists:
```sql
CREATE INDEX IF NOT EXISTS idx_nodes_ai_hnsw
ON public."Nodes"
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Ollama Performance
- First request may be slow (model loading)
- Subsequent requests are faster
- Consider running Ollama on dedicated GPU for production
- Embedding generation: ~100-500ms per claim
- Evidence categorization: ~200-800ms per piece

### Database Queries
- Vector search: O(log n) with HNSW index
- Relationship path: Limited to 5 hops for performance
- No caching implemented - each verification is fresh

## Error Handling

### Common Errors

#### "Ollama is not running"
**Solution:**
```bash
ollama serve
ollama pull deepseek-r1:1.5b
ollama pull nomic-embed-text
```

#### "Failed to search for similar evidence"
**Solution:** Check pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### "Authentication required"
**Solution:** All mutations require authenticated user (userId in context)

### Graceful Degradation
- If Ollama unavailable, throws clear error (no silent failures)
- If no evidence found, returns low confidence result
- If categorization fails, defaults to 'neutral' evidence type
- If relationship path not found, evidence still included (without path)

## Testing

### Run Tests
```bash
cd backend
npm test FactCheckingService
```

### Test Coverage
- Unit tests for all public methods
- Integration tests for full verification flow
- Mock-based tests (no external dependencies)
- Edge case testing (no evidence, contradictory evidence, etc.)

## Future Enhancements

### Planned Features
- [ ] Caching layer (Redis) for frequently verified claims
- [ ] Rate limiting per user
- [ ] Multi-language support for claims
- [ ] Temporal analysis (evidence recency weighting)
- [ ] Source authority scoring (expert vs general sources)
- [ ] Batch verification API
- [ ] Real-time verification subscriptions
- [ ] Automated re-verification on graph updates
- [ ] Evidence quality scoring beyond reliability
- [ ] Cross-graph verification

### Integration Opportunities
- **SearchService:** Combine full-text and semantic search
- **GraphTraversalService:** Enhanced pathfinding for evidence chains
- **NotificationService:** Alert users when veracity changes
- **GamificationService:** Reward users for accurate fact-checking

## Dependencies

### NPM Packages
- `axios` - HTTP client for Ollama API
- `pg` (Pool) - PostgreSQL connection
- `type-graphql` - GraphQL schema generation

### External Services
- **Ollama** - Local AI inference (reasoning + embeddings)
- **PostgreSQL + pgvector** - Vector similarity search

### Project Dependencies
- InquiryResolver and Inquiry entity
- Node and Edge entities
- VeracityScore entity
- Context type definition

## Security Considerations

- All mutations require authentication (`userId` in context)
- Input validation via TypeGraphQL decorators
- Parameterized SQL queries (no injection risk)
- Rate limiting recommended for production
- No sensitive data in logs (claim text is logged for debugging)

## Deployment Notes

### Requirements
1. PostgreSQL with pgvector extension
2. Ollama running with required models
3. Node embeddings pre-generated (run vectorization worker)
4. HNSW index on `ai` column

### Environment Setup
```bash
# Install Ollama models
ollama pull deepseek-r1:1.5b
ollama pull nomic-embed-text

# Verify pgvector
psql -d rabbithole_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Check index
psql -d rabbithole_db -c "SELECT indexname FROM pg_indexes WHERE tablename = 'Nodes';"
```

### Health Check
```typescript
// Test Ollama connection
const healthCheck = async () => {
  try {
    const embedding = await factCheckingService.generateEmbedding("test");
    console.log("Ollama is healthy");
  } catch (error) {
    console.error("Ollama health check failed:", error);
  }
};
```

## License
Part of Project Rabbit Hole - Evidence-based collaborative investigation platform.
