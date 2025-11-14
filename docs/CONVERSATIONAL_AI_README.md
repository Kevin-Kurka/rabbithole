# Conversational AI Service - Implementation Summary

## Overview

A comprehensive ConversationalAIService has been created for the Rabbit Hole project, integrating Ollama's DeepSeek R1 1.5B model for conversational reasoning with PostgreSQL pgvector for semantic search.

## Files Created

### Core Service
- `/Users/kmk/rabbithole/backend/src/services/ConversationalAIService.ts`
  - Main service class with full conversational AI functionality
  - Integrates Ollama chat (deepseek-r1:1.5b) and embedding (nomic-embed-text) models
  - Semantic search using pgvector with cosine similarity
  - Conversation history management with context window
  - Automatic markdown link generation for node references
  - Comprehensive error handling and logging

### GraphQL API
- `/Users/kmk/rabbithole/backend/src/resolvers/ConversationalAIResolver.ts`
  - TypeGraphQL resolvers for all conversation operations
  - Mutations: `sendAIMessage`, `updateConversationTitle`, `deleteConversation`
  - Queries: `conversation`, `myConversations`, `conversationMessages`, `searchNodesSemantic`
  - Field resolvers for nested data (user, graph, messages)

### Database Schema
- `/Users/kmk/rabbithole/backend/migrations/017_conversational_ai_system.sql`
  - `Conversations` table for chat sessions
  - `ConversationMessages` table for message history
  - Automatic timestamp triggers
  - Utility views and functions
  - Sample data generation (commented out)

### Entities
- `/Users/kmk/rabbithole/backend/src/entities/Conversation.ts`
  - GraphQL type definitions for:
    - `Conversation`
    - `ConversationMessage`
    - `SearchableNode`
    - `ConversationalAIResponse`
    - `MessageRole` enum

### Tests
- `/Users/kmk/rabbithole/backend/src/__tests__/ConversationalAIService.test.ts`
  - Unit tests for all service methods
  - Integration test framework
  - Mocked database and Ollama API tests

### Documentation
- `/Users/kmk/rabbithole/docs/CONVERSATIONAL_AI_GUIDE.md`
  - Complete user guide with examples
  - GraphQL query/mutation documentation
  - Setup instructions
  - Troubleshooting guide
  - Frontend integration examples

## Configuration Updates

### Environment Variables Added

#### `.env` and `.env.example`
```env
OLLAMA_CHAT_MODEL=deepseek-r1:1.5b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
MAX_CONTEXT_MESSAGES=20
MAX_RELEVANT_NODES=5
SIMILARITY_THRESHOLD=0.7
```

### Code Integration

#### `index.ts` Updates
Added resolver imports and registration:
```typescript
import {
  ConversationalAIResolver,
  ConversationFieldResolver,
  ConversationMessageFieldResolver,
  ConversationalAIResponseFieldResolver
} from './resolvers/ConversationalAIResolver';
```

## Key Features Implemented

### 1. Conversational Reasoning
- Uses Ollama `deepseek-r1:1.5b` model for intelligent responses
- Maintains multi-turn conversation context
- Configurable context window (default 20 messages)
- System prompts with node context injection

### 2. Semantic Search
- PostgreSQL pgvector integration for vector similarity
- Cosine distance operator (`<=>`) for efficient search
- Configurable similarity threshold (default 0.7)
- Returns top N most relevant nodes (default 5)

### 3. Node Linking
- Automatic markdown link generation: `[Node Title](node:node-id)`
- Frontend-parseable protocol for clickable navigation
- Similarity scores displayed in response footer
- Prevents duplicate/nested link creation

### 4. Database Persistence
- All conversations and messages stored in PostgreSQL
- JSONB metadata for extensibility
- Automatic timestamp management via triggers
- Optional graph scoping for context-specific conversations

### 5. Context Management
- Intelligent history pruning to stay within model limits
- Relevant node injection into system prompts
- Conversation summary views
- User-specific conversation retrieval

## Usage Examples

### GraphQL Mutation
```graphql
mutation SendMessage {
  sendAIMessage(
    message: "What caused the JFK assassination?"
    conversationId: null
    graphId: null
  ) {
    conversationId
    response
    relevantNodes {
      id
      title
      similarity
    }
  }
}
```

### TypeScript/Node.js
```typescript
import { conversationalAIService } from './services/ConversationalAIService';

const result = await conversationalAIService.sendMessage(
  pool,
  userId,
  'Tell me about the JFK assassination',
  conversationId, // optional
  graphId // optional
);

console.log(result.response);
console.log(result.relevantNodes);
```

## Database Schema

```sql
-- Conversations table
CREATE TABLE "Conversations" (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  graph_id UUID, -- Optional graph scope
  title TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- ConversationMessages table
CREATE TABLE "ConversationMessages" (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

## Setup & Deployment

### Prerequisites
1. **PostgreSQL with pgvector extension**
2. **Ollama** installed and running
3. **Required models pulled:**
   ```bash
   ollama pull deepseek-r1:1.5b
   ollama pull nomic-embed-text
   ```

### Installation Steps

1. **Run Database Migration:**
   ```bash
   psql -U postgres -d rabbithole_db < backend/migrations/017_conversational_ai_system.sql
   ```

2. **Update Environment Variables:**
   ```bash
   cd backend
   # Add to .env:
   OLLAMA_CHAT_MODEL=deepseek-r1:1.5b
   OLLAMA_EMBEDDING_MODEL=nomic-embed-text
   MAX_CONTEXT_MESSAGES=20
   MAX_RELEVANT_NODES=5
   SIMILARITY_THRESHOLD=0.7
   ```

3. **Start Services:**
   ```bash
   # Start Ollama
   ollama serve

   # Start backend
   cd backend
   npm start
   ```

4. **Verify Installation:**
   ```bash
   # Check GraphQL playground
   open http://localhost:4000/graphql

   # Test query
   query {
     searchNodesSemantic(query: "test") {
       id
       title
       similarity
     }
   }
   ```

## Performance Considerations

### Vector Search Optimization
- **HNSW Index** recommended for large graphs (>10k nodes):
  ```sql
  CREATE INDEX idx_nodes_ai_hnsw ON public."Nodes"
    USING hnsw (ai vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  ```

### Response Time Optimization
- Use smaller models for faster responses
- Reduce context window size
- Limit number of relevant nodes
- Implement embedding caching (see documentation)

## API Endpoints

### Mutations
- `sendAIMessage(message, conversationId?, graphId?)` - Send message to AI
- `updateConversationTitle(id, title)` - Update conversation title
- `deleteConversation(id)` - Delete conversation

### Queries
- `conversation(id)` - Get conversation by ID
- `myConversations(graphId?, limit, offset)` - Get user's conversations
- `conversationMessages(conversationId, limit, offset)` - Get messages
- `searchNodesSemantic(query, graphId?)` - Semantic node search

## Error Handling

The service handles:
- **Ollama not running**: Clear error message with instructions
- **Model not found**: Suggests `ollama pull` command
- **Empty embeddings**: Returns empty results gracefully
- **Database errors**: Logs and returns user-friendly messages
- **Authentication failures**: Requires valid user session

## Testing

### Unit Tests
```bash
cd backend
npm test -- ConversationalAIService.test.ts
```

### Integration Tests
```bash
INTEGRATION_TEST=true npm test -- ConversationalAIService.test.ts
```

## Monitoring

### Key Metrics
- Conversations created per day
- Messages per conversation
- Average response time
- Most searched topics
- Node reference frequency

### Database Queries
```sql
-- Conversation statistics
SELECT * FROM get_conversation_stats(NULL);

-- Recent activity
SELECT * FROM public."ConversationSummaries"
ORDER BY last_message_at DESC
LIMIT 10;

-- Cleanup old conversations
SELECT cleanup_old_conversations(90); -- Delete conversations older than 90 days
```

## Security

- **Authentication required** for all mutations and queries
- **User isolation**: Users can only access their own conversations
- **Input validation**: Message length limits, SQL injection prevention
- **No sensitive data logging**: Passwords, tokens excluded from logs

## Future Enhancements

Planned features:
- [ ] Streaming responses (real-time typing effect)
- [ ] Multi-modal support (images in conversations)
- [ ] Conversation branching
- [ ] Fine-tuned models on domain data
- [ ] RAG with document chunks
- [ ] Conversation summarization
- [ ] Suggested follow-up questions
- [ ] Export conversations as reports

## Troubleshooting

### Common Issues

**"Ollama is not running"**
```bash
ollama serve
```

**"Model not found"**
```bash
ollama pull deepseek-r1:1.5b
ollama pull nomic-embed-text
```

**"No nodes found in semantic search"**
- Verify nodes have embeddings: `SELECT COUNT(*) FROM "Nodes" WHERE ai IS NOT NULL`
- Run vectorization: `npm run worker:dev`

**"Authentication required"**
- Ensure JWT token is included in request headers

## Support & Documentation

- Full Guide: `docs/CONVERSATIONAL_AI_GUIDE.md`
- Migration File: `backend/migrations/017_conversational_ai_system.sql`
- Test File: `backend/src/__tests__/ConversationalAIService.test.ts`

## License

Part of the Rabbit Hole project. See main project LICENSE.

---

## Quick Start Checklist

- [ ] Ollama installed and running
- [ ] Models pulled (`deepseek-r1:1.5b`, `nomic-embed-text`)
- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Backend server started
- [ ] GraphQL playground accessible
- [ ] Test query executed successfully
- [ ] Nodes have embeddings (vectorization run)

## Credits

Implemented using:
- **Ollama** for local LLM inference
- **PostgreSQL pgvector** for semantic search
- **TypeGraphQL** for type-safe API
- **DeepSeek R1 1.5B** for conversational reasoning
- **nomic-embed-text** for text embeddings
