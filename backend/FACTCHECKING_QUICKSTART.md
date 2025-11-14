# FactChecking Service - Quick Start Guide

## Prerequisites

1. **Ollama installed and running:**
```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama server
ollama serve

# Pull required models
ollama pull deepseek-r1:1.5b
ollama pull nomic-embed-text
```

2. **PostgreSQL with pgvector:**
```bash
# Install pgvector extension
psql -d rabbithole_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify installation
psql -d rabbithole_db -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

3. **Node embeddings generated:**
```bash
# Run vectorization worker to generate embeddings for existing nodes
cd backend
npm run worker:dev
```

## Quick Test

### 1. Start the backend server
```bash
cd backend
npm start
```

### 2. Open GraphQL Playground
Navigate to: http://localhost:4000/graphql

### 3. Run a test query

**Verify a simple claim:**
```graphql
mutation TestVerification {
  verifyClaim(input: {
    claimText: "The JFK assassination occurred in 1963"
  }) {
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
```

**Expected response:**
```json
{
  "data": {
    "verifyClaim": {
      "claimText": "The JFK assassination occurred in 1963",
      "overallVeracity": 0.95,
      "confidence": 0.85,
      "supportingEvidence": [
        {
          "nodeTitle": "Kennedy Assassination",
          "sourceReliability": 0.95,
          "semanticSimilarity": 0.92
        }
      ],
      "conflictingEvidence": [],
      "reasoning": "The claim is strongly supported by reliable historical records...",
      "shouldCreateInquiry": false,
      "suggestedInquiryQuestions": []
    }
  }
}
```

## GraphQL API Examples

### Find Supporting Evidence
```graphql
query FindSupport {
  findCorroboratingEvidence(input: {
    claim: "Warren Commission investigated JFK assassination"
    evidenceType: "supporting"
  }) {
    nodeId
    nodeTitle
    sourceReliability
    semanticSimilarity
    content
  }
}
```

### Find Conflicting Evidence
```graphql
query FindConflict {
  findConflictingEvidence(input: {
    claim: "Oswald acted completely alone"
    evidenceType: "conflicting"
  }) {
    nodeId
    nodeTitle
    sourceReliability
    semanticSimilarity
  }
}
```

### Verify and Update Veracity Score
```graphql
mutation VerifyAndUpdate {
  updateVeracityFromVerification(input: {
    nodeId: "your-node-id-here"
    claimText: "Your claim to verify"
  })
}
```

### Complete Verification Flow
```graphql
mutation CompleteVerification {
  verifyClaimWithActions(input: {
    claimText: "Your claim here"
    sourceNodeId: "your-node-id"
    graphId: "your-graph-id"
  }) {
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

## Frontend Integration

### React Component Example

```typescript
import { useMutation, gql } from '@apollo/client';

const VERIFY_CLAIM = gql`
  mutation VerifyClaim($input: VerifyClaimInput!) {
    verifyClaim(input: $input) {
      overallVeracity
      confidence
      reasoning
      supportingEvidence {
        nodeTitle
        sourceReliability
      }
      conflictingEvidence {
        nodeTitle
        sourceReliability
      }
    }
  }
`;

function FactCheckButton({ claim, nodeId }) {
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

  if (loading) return <div>Verifying...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={handleVerify}>Verify Claim</button>

      {data && (
        <div className="verification-result">
          <h3>Verification Result</h3>
          <p><strong>Veracity:</strong> {(data.verifyClaim.overallVeracity * 100).toFixed(1)}%</p>
          <p><strong>Confidence:</strong> {(data.verifyClaim.confidence * 100).toFixed(1)}%</p>
          <p><strong>Reasoning:</strong> {data.verifyClaim.reasoning}</p>

          {data.verifyClaim.supportingEvidence.length > 0 && (
            <div>
              <h4>Supporting Evidence ({data.verifyClaim.supportingEvidence.length})</h4>
              <ul>
                {data.verifyClaim.supportingEvidence.map((e, i) => (
                  <li key={i}>
                    {e.nodeTitle} (reliability: {(e.sourceReliability * 100).toFixed(0)}%)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.verifyClaim.conflictingEvidence.length > 0 && (
            <div>
              <h4>Conflicting Evidence ({data.verifyClaim.conflictingEvidence.length})</h4>
              <ul>
                {data.verifyClaim.conflictingEvidence.map((e, i) => (
                  <li key={i}>
                    {e.nodeTitle} (reliability: {(e.sourceReliability * 100).toFixed(0)}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Backend Service Usage

### Direct Service Call

```typescript
import { Pool } from 'pg';
import { factCheckingService } from './services/FactCheckingService';

async function verifyNodeClaim(
  pool: Pool,
  nodeId: string,
  claim: string,
  userId: string
) {
  try {
    // Verify the claim
    const result = await factCheckingService.verifyClaim(
      pool,
      claim,
      nodeId
    );

    console.log('Verification Result:');
    console.log(`- Veracity: ${(result.overallVeracity * 100).toFixed(1)}%`);
    console.log(`- Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`- Supporting: ${result.supportingEvidence.length}`);
    console.log(`- Conflicting: ${result.conflictingEvidence.length}`);
    console.log(`- Reasoning: ${result.reasoning}`);

    // Update veracity score
    await factCheckingService.updateVeracityScore(
      pool,
      nodeId,
      result,
      userId
    );

    // Create inquiries if needed
    if (result.shouldCreateInquiry) {
      const inquiryIds = await factCheckingService.createInquiryFromVerification(
        pool,
        result,
        userId
      );
      console.log(`Created ${inquiryIds.length} inquiries`);
    }

    return result;
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
}
```

### Batch Verification

```typescript
async function batchVerifyGraph(
  pool: Pool,
  graphId: string,
  userId: string
) {
  // Fetch all nodes in graph
  const nodesResult = await pool.query(
    `SELECT id, title, props FROM public."Nodes" WHERE graph_id = $1`,
    [graphId]
  );

  const results = [];

  for (const node of nodesResult.rows) {
    const props = JSON.parse(node.props);
    const claim = props.claim || props.description || node.title;

    // Verify each node's claim
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

    results.push({
      nodeId: node.id,
      claim,
      veracity: verification.overallVeracity,
      confidence: verification.confidence,
    });

    console.log(`Verified: ${node.title} - ${(verification.overallVeracity * 100).toFixed(1)}%`);
  }

  return results;
}
```

## Troubleshooting

### "Ollama is not running"

**Problem:** Service can't connect to Ollama API

**Solutions:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve

# Check models are installed
ollama list

# Pull models if missing
ollama pull deepseek-r1:1.5b
ollama pull nomic-embed-text
```

### "Failed to search for similar evidence"

**Problem:** pgvector extension not installed or no embeddings

**Solutions:**
```bash
# Install pgvector
psql -d rabbithole_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Generate embeddings for nodes
cd backend
npm run worker:dev

# Verify embeddings exist
psql -d rabbithole_db -c "SELECT COUNT(*) FROM public.\"Nodes\" WHERE ai IS NOT NULL;"
```

### Low Quality Results

**Problem:** Veracity scores seem incorrect or confidence is too low

**Solutions:**

1. **Ensure enough evidence exists:**
```sql
-- Check how many nodes have embeddings
SELECT COUNT(*) FROM public."Nodes" WHERE ai IS NOT NULL;

-- Should be > 10 for meaningful results
```

2. **Lower similarity threshold** (if too strict):
```typescript
// In FactCheckingService.ts
private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.6; // Was 0.7
```

3. **Check source veracity scores:**
```sql
-- Verify nodes have veracity scores
SELECT COUNT(*) FROM public."VeracityScores";

-- Add veracity scores to important nodes
INSERT INTO public."VeracityScores" (
  target_node_id, veracity_score, calculated_by
) VALUES (
  'node-id', 0.9, 'system'
);
```

4. **Increase evidence search limit:**
```typescript
// In FactCheckingService.ts
private readonly EVIDENCE_SEARCH_LIMIT = 30; // Was 20
```

### "Authentication required"

**Problem:** GraphQL mutations failing with auth error

**Solution:** Include authentication token in request headers:
```typescript
// Apollo Client setup
const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  headers: {
    Authorization: `Bearer ${yourJwtToken}`,
  },
});
```

## Performance Tips

### 1. Create HNSW Index
```sql
CREATE INDEX IF NOT EXISTS idx_nodes_ai_hnsw
ON public."Nodes"
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 2. Pre-generate Embeddings
```bash
# Run vectorization worker in background
npm run worker:dev &

# Or add to docker-compose.yml
```

### 3. Monitor Ollama Performance
```bash
# Check Ollama resource usage
ps aux | grep ollama

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:11434/api/embeddings
```

### 4. Consider Caching (Future Enhancement)
```typescript
// Pseudo-code for Redis caching
const cacheKey = `fact-check:${graphId}:${hashClaim(claimText)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await factCheckingService.verifyClaim(...);
await redis.setex(cacheKey, 3600, JSON.stringify(result)); // Cache for 1 hour
```

## Next Steps

1. **Test with real data:** Import JFK assassination data and verify claims
2. **Integrate frontend:** Add fact-checking UI to node detail pages
3. **Set up monitoring:** Track verification success rates and performance
4. **Configure rate limiting:** Prevent abuse of AI API
5. **Implement caching:** Reduce redundant verifications
6. **Add notifications:** Alert users when veracity scores change

## Resources

- **Full API Documentation:** `backend/src/services/FactCheckingService.README.md`
- **Implementation Details:** `backend/src/services/FACTCHECKING_IMPLEMENTATION.md`
- **Test Suite:** `backend/src/__tests__/FactCheckingService.test.ts`
- **Service Code:** `backend/src/services/FactCheckingService.ts`
- **GraphQL Resolver:** `backend/src/resolvers/FactCheckingResolver.ts`

## Support

For issues or questions:
1. Check error logs: `docker logs rabbithole-api-1`
2. Verify Ollama: `curl http://localhost:11434/api/tags`
3. Check database: `psql -d rabbithole_db -c "SELECT * FROM pg_extension WHERE extname = 'vector';"`
4. Review test suite for usage examples

---

**Happy Fact-Checking!** 🔍
