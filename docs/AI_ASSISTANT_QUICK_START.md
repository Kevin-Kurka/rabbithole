# AI Assistant Quick Start Guide

## Overview
The AIAssistantResolver provides conversational AI, evidence processing, and fact-checking capabilities.

## Quick Commands

### Setup
```bash
# Run database migration
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/017_ai_assistant_tables.sql

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Testing
```bash
# GraphQL Playground
open http://localhost:4000/graphql

# Check Ollama
curl http://localhost:11434/api/tags
```

## Common GraphQL Operations

### 1. Chat with AI
```graphql
mutation {
  sendMessage(input: {
    message: "Explain this graph"
    graphId: "your-graph-id"
  }) {
    success
    message {
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

### 2. Upload Evidence
```graphql
mutation($file: Upload!) {
  uploadEvidence(
    file: $file
    input: {
      context: "Document description"
      nodeId: "node-123"
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

### 3. Extract Claims
```graphql
mutation {
  processEvidenceWithClaims(fileId: "file-456") {
    claims {
      claimText
      confidence
      category
    }
    matchedNodes {
      nodeId
      title
      similarity
    }
    totalClaims
  }
}
```

### 4. Verify Claim
```graphql
mutation {
  verifyClaim(
    claimText: "Your claim here"
    sourceNodeId: "node-789"
  ) {
    veracityScore
    conclusion
    supportingEvidence {
      content
      weight
    }
    opposingEvidence {
      content
      weight
    }
    reasoning
  }
}
```

### 5. Search Nodes
```graphql
query {
  searchDatabaseNodes(
    query: "search term"
    types: ["Document", "Fact"]
    limit: 10
  ) {
    nodes {
      nodeId
      title
      relevance
    }
    totalResults
  }
}
```

### 6. Subscribe to Updates
```graphql
subscription {
  onMessageProcessed(conversationId: "conv-123") {
    message {
      content
    }
    isComplete
  }
}
```

## API Endpoints

| Operation | Type | Purpose |
|-----------|------|---------|
| `sendMessage` | Mutation | Chat with AI |
| `getConversationHistory` | Query | Get chat history |
| `searchDatabaseNodes` | Query | Search nodes |
| `uploadEvidence` | Mutation | Upload files |
| `processEvidenceWithClaims` | Mutation | Extract claims |
| `matchEvidenceToNodes` | Query | Find related nodes |
| `verifyClaim` | Mutation | Fact-check claim |
| `generateInquiry` | Mutation | Create inquiry |
| `onMessageProcessed` | Subscription | Chat updates |
| `onClaimExtracted` | Subscription | Extraction updates |
| `onVerificationComplete` | Subscription | Verification updates |

## Database Tables

| Table | Purpose |
|-------|---------|
| `ConversationMessages` | Chat history |
| `ExtractedClaims` | AI-extracted claims |
| `Claims` | User claims |
| `ClaimVerifications` | Verification results |
| `AuditLog` | Audit trail |

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://postgres:password@postgres:5432/rabbithole_db
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672

# Optional
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000
```

## Troubleshooting

### Check Services
```bash
# Database
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# Redis
docker exec -it rabbithole-redis-1 redis-cli ping

# RabbitMQ
curl http://localhost:15672/api/overview

# Ollama
curl http://localhost:11434/api/tags
```

### View Logs
```bash
# API logs
docker logs rabbithole-api-1 -f

# All services
docker-compose logs -f
```

### Common Errors

**"Authentication required"**
- Solution: Include Authorization header with JWT token

**"File not found"**
- Solution: Verify fileId exists in EvidenceFiles table

**"Ollama is not running"**
- Solution: Start Ollama service: `ollama serve`

**"No text content available"**
- Solution: Process document first with `processDocument` mutation

## Testing Workflow

1. **Upload Evidence**
   ```graphql
   mutation($file: Upload!) {
     uploadEvidence(file: $file, input: { autoExtractClaims: true })
   }
   ```

2. **Wait for Processing**
   - Check status via subscription or polling

3. **Extract Claims**
   ```graphql
   mutation {
     processEvidenceWithClaims(fileId: "file-id")
   }
   ```

4. **Verify Claims**
   ```graphql
   mutation {
     verifyClaim(claimText: "extracted claim")
   }
   ```

5. **Chat About Results**
   ```graphql
   mutation {
     sendMessage(input: { message: "Explain this claim" })
   }
   ```

## Performance Tips

- Use pagination for large result sets
- Enable caching in Redis
- Process large files asynchronously
- Monitor rate limits (10 AI requests/hour)
- Use subscriptions for real-time updates

## Security Notes

- All operations require authentication
- File uploads are validated (type, size)
- SQL injection prevented (parameterized queries)
- Audit logging enabled for all operations
- Rate limiting on AI operations

## Next Steps

1. Read full docs: `/docs/AIAssistantResolver.md`
2. Check implementation: `/backend/src/resolvers/AIAssistantResolver.ts`
3. Review migration: `/backend/migrations/017_ai_assistant_tables.sql`

## Support

For issues:
1. Check logs: `docker logs rabbithole-api-1 -f`
2. Verify database: `\dt public."Conversation*"`
3. Test services (see Troubleshooting above)
4. Review documentation

## Useful Queries

### Check Conversations
```sql
SELECT conversation_id, role, LEFT(content, 50) as preview, created_at
FROM public."ConversationMessages"
ORDER BY created_at DESC
LIMIT 10;
```

### Check Claims
```sql
SELECT claim_text, confidence, category, created_at
FROM public."ExtractedClaims"
ORDER BY confidence DESC
LIMIT 10;
```

### Check Verifications
```sql
SELECT c.claim_text, cv.veracity_score, cv.conclusion
FROM public."Claims" c
JOIN public."ClaimVerifications" cv ON c.id = cv.claim_id
ORDER BY cv.verified_at DESC
LIMIT 10;
```

### Check Audit Trail
```sql
SELECT user_id, action, entity_type, created_at
FROM public."AuditLog"
WHERE action LIKE 'ai_%'
ORDER BY created_at DESC
LIMIT 20;
```

---

**Version:** 1.0.0
**Last Updated:** 2025-01-13
**Status:** Production Ready
