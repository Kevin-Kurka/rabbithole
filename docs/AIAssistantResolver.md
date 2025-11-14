# AIAssistantResolver Documentation

## Overview

The `AIAssistantResolver` is a comprehensive GraphQL resolver that provides AI-powered features for the Rabbit Hole knowledge graph platform. It integrates conversational AI, evidence processing, claim extraction, and fact-checking capabilities.

**Location:** `/Users/kmk/rabbithole/backend/src/resolvers/AIAssistantResolver.ts`

## Features

### 1. Chat Mutations and Queries

#### `sendMessage`
Send a message to the AI assistant with optional file attachments and context.

**Type:** Mutation

**Input:**
```graphql
input SendMessageInput {
  message: String!
  conversationId: ID
  attachmentIds: [ID]
  graphId: ID  # Context for graph-specific conversation
  nodeId: ID   # Specific node context
}
```

**Returns:** `ChatResponse`

**Example:**
```graphql
mutation {
  sendMessage(input: {
    message: "Explain the methodology used in this graph"
    graphId: "graph-123"
  }) {
    success
    message {
      id
      content
      nodeLinks {
        nodeId
        title
        relevance
      }
    }
    conversationId
  }
}
```

**Features:**
- Automatic conversation ID generation
- Graph-aware context
- Node linking extraction
- Real-time subscription updates
- Audit logging

#### `getConversationHistory`
Retrieve past messages from a conversation.

**Type:** Query

**Parameters:**
- `conversationId: ID!` - Conversation identifier
- `limit: Int` - Maximum messages to return (default: 50)
- `offset: Int` - Pagination offset (default: 0)

**Returns:** `[ConversationMessage]`

**Example:**
```graphql
query {
  getConversationHistory(conversationId: "conv_user123_1234567890", limit: 20) {
    id
    role
    content
    timestamp
    nodeLinks {
      nodeId
      title
      nodeType
      relevance
    }
  }
}
```

#### `searchDatabaseNodes`
Semantic search across nodes with AI-powered ranking.

**Type:** Query

**Parameters:**
- `query: String!` - Search query
- `graphId: ID` - Filter by specific graph
- `types: [String]` - Filter by node types
- `limit: Int` - Maximum results (default: 20)

**Returns:** `SearchResult`

**Example:**
```graphql
query {
  searchDatabaseNodes(
    query: "JFK assassination evidence"
    types: ["Document", "Fact"]
    limit: 10
  ) {
    nodes {
      nodeId
      title
      nodeType
      relevance
    }
    totalResults
  }
}
```

### 2. Evidence Processing

#### `uploadEvidence`
Upload evidence files with automatic claim extraction.

**Type:** Mutation

**Input:**
```graphql
input UploadEvidenceInput {
  context: String
  articleId: ID
  nodeId: ID
  graphId: ID
  autoExtractClaims: Boolean  # Default: true
}
```

**Parameters:**
- `file: Upload!` - File to upload
- `input: UploadEvidenceInput!` - Configuration

**Returns:** `EvidenceUploadResult`

**Example:**
```graphql
mutation($file: Upload!) {
  uploadEvidence(
    file: $file
    input: {
      context: "Warren Commission Report excerpt"
      nodeId: "node-456"
      autoExtractClaims: true
    }
  ) {
    success
    fileId
    evidenceId
    processingStatus
  }
}
```

**Processing Pipeline:**
1. File upload and storage
2. Evidence record creation
3. Media queue enqueuing (document/audio/video processing)
4. Automatic claim extraction (if enabled)
5. Node matching

**Supported File Types:**
- Documents: PDF, DOCX, TXT, MD
- Audio: MP3, WAV, OGG
- Video: MP4, AVI, MOV
- Images: JPG, PNG, GIF

#### `processEvidenceWithClaims`
Manually trigger claim extraction from a processed evidence file.

**Type:** Mutation

**Parameters:**
- `fileId: ID!` - File to process

**Returns:** `ClaimExtractionResult`

**Example:**
```graphql
mutation {
  processEvidenceWithClaims(fileId: "file-789") {
    fileId
    claims {
      claimText
      context
      confidence
      category
    }
    matchedNodes {
      nodeId
      title
      similarity
      matchReason
    }
    primarySources {
      title
      url
      credibilityScore
    }
    totalClaims
    processingTimeMs
  }
}
```

**Claim Categories:**
- `fact` - Verifiable factual statement
- `opinion` - Subjective opinion
- `hypothesis` - Proposed explanation
- `prediction` - Future-oriented claim

#### `matchEvidenceToNodes`
Find relevant nodes that match evidence content.

**Type:** Query

**Parameters:**
- `fileId: ID!` - Evidence file
- `limit: Int` - Maximum matches (default: 10)

**Returns:** `[MatchedNode]`

**Example:**
```graphql
query {
  matchEvidenceToNodes(fileId: "file-789", limit: 5) {
    nodeId
    title
    nodeType
    similarity
    matchReason
  }
}
```

### 3. Verification

#### `verifyClaim`
Trigger fact-checking verification for a claim.

**Type:** Mutation

**Parameters:**
- `claimText: String!` - Claim to verify
- `sourceNodeId: ID` - Optional source node

**Returns:** `VerificationReport`

**Example:**
```graphql
mutation {
  verifyClaim(
    claimText: "Lee Harvey Oswald acted alone"
    sourceNodeId: "node-oswald"
  ) {
    claimId
    veracityScore
    conclusion
    supportingEvidence {
      evidenceId
      evidenceType
      content
      weight
      confidence
    }
    opposingEvidence {
      evidenceId
      evidenceType
      content
      weight
      confidence
    }
    totalEvidenceReviewed
    reasoning
    limitations
  }
}
```

**Conclusions:**
- `verified` - Strong supporting evidence (veracity > 0.7)
- `refuted` - Strong opposing evidence (veracity < 0.3)
- `mixed` - Conflicting evidence (0.3 ≤ veracity ≤ 0.7)
- `unverified` - Insufficient evidence

**Veracity Score:** 0.0 (refuted) to 1.0 (verified)

#### `generateInquiry`
Create a formal inquiry from a claim.

**Type:** Mutation

**Parameters:**
- `claimText: String!` - Source claim
- `context: String` - Additional context

**Returns:** `GeneratedInquiry`

**Example:**
```graphql
mutation {
  generateInquiry(
    claimText: "Multiple shooters were present at Dealey Plaza"
    context: "Based on acoustic evidence analysis"
  ) {
    inquiryId
    title
    question
    hypothesis
    suggestedResearchAreas
    keyTerms
  }
}
```

### 4. Subscriptions

#### `onMessageProcessed`
Real-time updates for AI message processing.

**Type:** Subscription

**Parameters:**
- `conversationId: ID!` - Conversation to monitor

**Example:**
```graphql
subscription {
  onMessageProcessed(conversationId: "conv_user123_1234567890") {
    conversationId
    message {
      content
      nodeLinks {
        nodeId
        title
      }
    }
    isComplete
    progress
  }
}
```

#### `onClaimExtracted`
Notify when claims are extracted from a file.

**Type:** Subscription

**Parameters:**
- `fileId: ID!` - File to monitor

**Example:**
```graphql
subscription {
  onClaimExtracted(fileId: "file-789") {
    fileId
    claims {
      claimText
      confidence
      category
    }
    isComplete
  }
}
```

#### `onVerificationComplete`
Notify when claim verification is complete.

**Type:** Subscription

**Parameters:**
- `claimId: ID!` - Claim to monitor

**Example:**
```graphql
subscription {
  onVerificationComplete(claimId: "claim-456") {
    claimId
    report {
      veracityScore
      conclusion
      reasoning
    }
  }
}
```

## Database Schema

### ConversationMessages
```sql
CREATE TABLE public."ConversationMessages" (
  id UUID PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments TEXT[],
  node_links JSONB,
  graph_id UUID,
  node_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### ExtractedClaims
```sql
CREATE TABLE public."ExtractedClaims" (
  id UUID PRIMARY KEY,
  file_id UUID NOT NULL,
  claim_text TEXT NOT NULL,
  context TEXT,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  category VARCHAR(100) NOT NULL,
  start_position INTEGER,
  end_position INTEGER,
  extracted_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Claims
```sql
CREATE TABLE public."Claims" (
  id UUID PRIMARY KEY,
  claim_text TEXT NOT NULL,
  source_node_id UUID,
  veracity_score FLOAT CHECK (veracity_score >= 0 AND veracity_score <= 1),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  submitted_by UUID NOT NULL,
  verified_at TIMESTAMP,
  verified_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### ClaimVerifications
```sql
CREATE TABLE public."ClaimVerifications" (
  id UUID PRIMARY KEY,
  claim_id UUID NOT NULL,
  veracity_score FLOAT NOT NULL,
  conclusion VARCHAR(50) NOT NULL,
  reasoning TEXT,
  supporting_evidence_ids UUID[],
  opposing_evidence_ids UUID[],
  total_evidence_reviewed INTEGER NOT NULL DEFAULT 0,
  limitations TEXT[],
  verified_by UUID,
  verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Service Integration

### AIAssistantService
Handles conversational AI interactions using Ollama.

**Methods Used:**
- `askAIAssistant(pool, graphId, question, userId)` - Graph-aware chat
- `detectInconsistencies(pool, graphId)` - Graph validation
- `suggestEvidence(pool, nodeId)` - Evidence recommendations

### SearchService
Provides hybrid search (full-text + semantic).

**Methods Used:**
- `search(pool, query, options)` - Multi-modal search
- `autocomplete(pool, query, limit)` - Query suggestions

### MediaQueueService
Manages asynchronous media processing.

**Methods Used:**
- `enqueueMediaProcessing(fileId, type, options, priority)` - Queue jobs
- `getJobStatus(fileId)` - Check processing status
- `updateJobStatus(fileId, status)` - Update progress

## Authentication & Authorization

All mutations and queries require authentication:

```typescript
if (!userId) {
  throw new Error('Authentication required');
}
```

User ID is extracted from JWT token or session context.

## Error Handling

### Common Errors

**Authentication:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**File Not Found:**
```json
{
  "success": false,
  "error": "File not found"
}
```

**Processing Errors:**
```json
{
  "success": false,
  "error": "No text content available. Please process the document first."
}
```

### Error Logging

All errors are logged with context:
```typescript
console.error('Error in sendMessage:', error);
```

Audit trail is maintained in `AuditLog` table.

## Performance Considerations

### Rate Limiting
AIAssistantService implements rate limiting (10 requests/hour per user).

### Caching
- Conversation history cached in Redis
- Search results cached for common queries

### Pagination
- `getConversationHistory`: Default 50 messages
- `searchDatabaseNodes`: Default 20 results
- `matchEvidenceToNodes`: Default 10 matches

### Database Indexes

**Full-Text Search:**
```sql
CREATE INDEX idx_extracted_claims_text_search ON public."ExtractedClaims"
  USING gin(to_tsvector('english', claim_text || ' ' || COALESCE(context, '')));

CREATE INDEX idx_claims_text_search ON public."Claims"
  USING gin(to_tsvector('english', claim_text));
```

**Foreign Keys:**
```sql
CREATE INDEX idx_conversation_messages_conversation_id ON public."ConversationMessages"(conversation_id);
CREATE INDEX idx_extracted_claims_file_id ON public."ExtractedClaims"(file_id);
CREATE INDEX idx_claims_source_node_id ON public."Claims"(source_node_id);
```

## Future Enhancements

### Planned Service Integrations

1. **ConversationalAIService** (TODO)
   - Multi-turn conversation management
   - Context-aware responses
   - Memory persistence

2. **ClaimExtractionService** (TODO)
   - Advanced NLP claim detection
   - Entity linking
   - Citation extraction

3. **FactCheckingService** (TODO)
   - External fact-checking API integration
   - Cross-reference validation
   - Source credibility scoring

### Stub Implementation Status

Current implementation includes basic stubs for:
- `extractClaimsFromText()` - Simple sentence splitting
- `matchClaimsToNodes()` - Full-text search matching
- `performFactCheck()` - Evidence aggregation
- `generateInquiryFromClaim()` - Template-based generation

These stubs provide functional placeholders that can be replaced with sophisticated ML models and external APIs.

## Testing

### Unit Tests
Located in: `/Users/kmk/rabbithole/backend/src/__tests__/AIAssistantResolver.test.ts`

**Test Coverage:**
- Authentication checks
- Message flow
- Evidence upload pipeline
- Claim extraction
- Verification logic
- Subscription events

### Integration Tests
Test against live database with test data.

**Example:**
```typescript
describe('AIAssistantResolver', () => {
  it('should send message and return response', async () => {
    const result = await sendMessage({
      input: {
        message: 'Test message',
        graphId: testGraphId
      }
    }, testContext);

    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });
});
```

### Manual Testing with GraphQL Playground

1. Start backend: `npm start`
2. Navigate to: http://localhost:4000/graphql
3. Use example queries from this document

## Deployment

### Migration

Run migration script:
```bash
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/017_ai_assistant_tables.sql
```

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis for subscriptions
- `RABBITMQ_URL` - Message queue for media processing
- `OLLAMA_URL` - AI service endpoint (default: http://localhost:11434)

Optional:
- `OLLAMA_MODEL` - AI model name (default: llama3.2)
- `AI_TEMPERATURE` - Response creativity (default: 0.7)
- `AI_MAX_TOKENS` - Max response length (default: 1000)
- `LOCAL_STORAGE_PATH` - File storage path (default: ./uploads)

### Docker Compose

Ensure services are running:
```yaml
services:
  postgres:
    image: postgres:14
  redis:
    image: redis:alpine
  rabbitmq:
    image: rabbitmq:3-management
  ollama:
    image: ollama/ollama
```

## Support

For issues or questions:
1. Check error logs: `docker logs rabbithole-api-1`
2. Review database tables: `\dt public."Conversation*"`
3. Test AI service: `curl http://localhost:11434/api/tags`
4. Monitor message queue: RabbitMQ Management UI (port 15672)

## References

- [TypeGraphQL Documentation](https://typegraphql.com/)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [GraphQL Subscriptions](https://www.apollographql.com/docs/apollo-server/data/subscriptions/)
