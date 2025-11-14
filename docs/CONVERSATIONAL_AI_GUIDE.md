# Conversational AI Service Guide

## Overview

The ConversationalAIService provides intelligent chat interactions with semantic knowledge graph search, powered by local Ollama models. This service enables users to have natural conversations while automatically linking relevant nodes from the knowledge graph.

## Features

### Core Capabilities

1. **Multi-turn Conversations**: Maintains context across multiple message exchanges
2. **Semantic Search**: Uses pgvector to find relevant nodes based on conversation context
3. **Automatic Node Linking**: Formats responses with clickable markdown links to graph nodes
4. **Context Management**: Intelligently manages conversation history to stay within model limits
5. **Graph Scoping**: Optional filtering to search within specific graph contexts
6. **Persistent Storage**: All conversations and messages stored in PostgreSQL

### Technical Stack

- **Chat Model**: Ollama `deepseek-r1:1.5b` (configurable)
- **Embedding Model**: Ollama `nomic-embed-text` (1536-dimensional vectors)
- **Vector Search**: PostgreSQL pgvector extension with cosine similarity
- **Database**: PostgreSQL with JSONB metadata storage
- **GraphQL API**: Type-safe TypeGraphQL resolvers

## Installation & Setup

### 1. Install Ollama Models

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull required models
ollama pull deepseek-r1:1.5b
ollama pull nomic-embed-text

# Verify models are available
ollama list
```

### 2. Database Migration

Run the migration to create conversation tables:

```bash
# Connect to your database
psql -U postgres -d rabbithole_db

# Run migration
\i backend/migrations/017_conversational_ai_system.sql

# Verify tables
\dt "Conversations"
\dt "ConversationMessages"
```

### 3. Environment Configuration

Add to `/backend/.env`:

```env
# Ollama Conversational AI Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=deepseek-r1:1.5b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
MAX_CONTEXT_MESSAGES=20
MAX_RELEVANT_NODES=5
SIMILARITY_THRESHOLD=0.7
```

### 4. Start Services

```bash
# Start Ollama server (if not running as service)
ollama serve

# Start backend server
cd backend
npm start

# GraphQL Playground will be available at:
# http://localhost:4000/graphql
```

## GraphQL API Usage

### Mutations

#### Send AI Message

Send a message to the AI assistant and receive a response with relevant node links.

```graphql
mutation SendAIMessage {
  sendAIMessage(
    message: "What was the JFK assassination?"
    conversationId: "optional-conversation-id"
    graphId: "optional-graph-id"
  ) {
    conversationId
    messageId
    response
    relevantNodes {
      id
      title
      similarity
      nodeType
      weight
      props
    }
    conversation {
      id
      title
      updatedAt
    }
  }
}
```

**Response Format:**

```json
{
  "data": {
    "sendAIMessage": {
      "conversationId": "550e8400-e29b-41d4-a716-446655440000",
      "messageId": "660e8400-e29b-41d4-a716-446655440001",
      "response": "The [JFK Assassination](node:123e4567...) was the assassination of President [John F. Kennedy](node:223e4567...) on November 22, 1963...\n\n---\n**Related Nodes:**\n- [JFK Assassination](node:123e4567...) (similarity: 0.92)\n- [John F. Kennedy](node:223e4567...) (similarity: 0.85)",
      "relevantNodes": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "title": "JFK Assassination",
          "similarity": 0.92,
          "nodeType": "event",
          "weight": 0.95
        }
      ]
    }
  }
}
```

#### Update Conversation Title

```graphql
mutation UpdateConversationTitle {
  updateConversationTitle(
    id: "550e8400-e29b-41d4-a716-446655440000"
    title: "JFK Assassination Discussion"
  ) {
    id
    title
    updatedAt
  }
}
```

#### Delete Conversation

```graphql
mutation DeleteConversation {
  deleteConversation(id: "550e8400-e29b-41d4-a716-446655440000")
}
```

### Queries

#### Get Conversation by ID

```graphql
query GetConversation {
  conversation(id: "550e8400-e29b-41d4-a716-446655440000") {
    id
    title
    graphId
    createdAt
    updatedAt
    user {
      id
      username
    }
    messageCount
  }
}
```

#### Get User's Conversations

```graphql
query MyConversations {
  myConversations(limit: 20, offset: 0, graphId: null) {
    id
    title
    graphId
    updatedAt
    messageCount
    graph {
      id
      name
    }
  }
}
```

#### Get Conversation Messages

```graphql
query ConversationMessages {
  conversationMessages(
    conversationId: "550e8400-e29b-41d4-a716-446655440000"
    limit: 50
    offset: 0
  ) {
    id
    role
    content
    createdAt
    metadata
    user {
      username
    }
  }
}
```

#### Semantic Node Search

Search for nodes without starting a conversation:

```graphql
query SearchNodes {
  searchNodesSemantic(query: "assassination", graphId: null) {
    id
    title
    similarity
    nodeType
    weight
    props
  }
}
```

## Service Architecture

### Database Schema

```sql
-- Conversations table
CREATE TABLE "Conversations" (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  graph_id UUID,
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

### Workflow Diagram

```
User Message
    ↓
[1] Create/Get Conversation
    ↓
[2] Save User Message
    ↓
[3] Generate Embedding (Ollama nomic-embed-text)
    ↓
[4] Semantic Search (pgvector cosine similarity)
    ↓
[5] Get Conversation History (last N messages)
    ↓
[6] Build Context (system prompt + nodes + history)
    ↓
[7] Generate Response (Ollama deepseek-r1:1.5b)
    ↓
[8] Format Response with Node Links
    ↓
[9] Save Assistant Message
    ↓
[10] Return Response to User
```

### Context Management

The service automatically manages conversation context to stay within model limits:

- **Conversation History**: Last 20 messages (configurable via `MAX_CONTEXT_MESSAGES`)
- **Relevant Nodes**: Top 5 nodes by similarity (configurable via `MAX_RELEVANT_NODES`)
- **Similarity Threshold**: Only nodes with similarity ≥ 0.7 (configurable via `SIMILARITY_THRESHOLD`)

### Response Formatting

The service automatically converts node references to markdown links:

**Input:**
```
"The JFK Assassination was a significant event."
```

**Output:**
```
"The [JFK Assassination](node:123e4567...) was a significant event."
```

Frontend can parse `node:` protocol links to create clickable navigation.

## Performance Optimization

### Vector Search Performance

1. **HNSW Index**: Ensure nodes have HNSW index on `ai` column:

```sql
CREATE INDEX idx_nodes_ai_hnsw ON public."Nodes"
  USING hnsw (ai vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

2. **Query Optimization**: Vector searches use cosine distance operator (`<=>`):

```sql
ORDER BY n.ai <=> $1::vector
LIMIT 5
```

3. **Similarity Threshold**: Pre-filter by similarity to reduce result set:

```sql
WHERE (1 - (n.ai <=> $1::vector)) >= 0.7
```

### Embedding Cache

Consider caching embeddings for common queries:

```typescript
// Simple in-memory cache (add to service)
private embeddingCache = new Map<string, number[]>();

async generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = text.toLowerCase().trim();
  if (this.embeddingCache.has(cacheKey)) {
    return this.embeddingCache.get(cacheKey)!;
  }

  const embedding = await this.callOllamaEmbedding(text);
  this.embeddingCache.set(cacheKey, embedding);
  return embedding;
}
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_CHAT_MODEL` | `deepseek-r1:1.5b` | Chat completion model |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Text embedding model |
| `MAX_CONTEXT_MESSAGES` | `20` | Max conversation history |
| `MAX_RELEVANT_NODES` | `5` | Max semantic search results |
| `SIMILARITY_THRESHOLD` | `0.7` | Minimum cosine similarity |

### Model Selection

You can use different Ollama models based on your needs:

**Chat Models:**
- `deepseek-r1:1.5b` - Fast, reasoning-focused (recommended)
- `llama3.2` - General purpose, good quality
- `mistral` - Balanced speed and quality
- `qwen2.5:7b` - Larger model, better quality

**Embedding Models:**
- `nomic-embed-text` - 1536 dims, optimized for retrieval
- `mxbai-embed-large` - 1024 dims, faster
- `all-minilm` - 384 dims, very fast but lower quality

Change in `.env`:
```env
OLLAMA_CHAT_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
```

## Error Handling

### Common Errors

#### 1. Ollama Not Running

```json
{
  "errors": [
    {
      "message": "Ollama is not running. Please start Ollama with: ollama serve"
    }
  ]
}
```

**Solution:**
```bash
ollama serve
```

#### 2. Model Not Found

```json
{
  "errors": [
    {
      "message": "Chat model \"deepseek-r1:1.5b\" not found. Pull it with: ollama pull deepseek-r1:1.5b"
    }
  ]
}
```

**Solution:**
```bash
ollama pull deepseek-r1:1.5b
```

#### 3. Authentication Required

```json
{
  "errors": [
    {
      "message": "Authentication required to use AI assistant"
    }
  ]
}
```

**Solution:** Include authentication token in request headers.

#### 4. Empty Embeddings

If nodes don't have embeddings (`ai` column is NULL), semantic search won't work.

**Solution:** Run vectorization pipeline to generate embeddings:

```bash
cd backend
npm run worker:dev
```

## Testing

### Unit Tests

```bash
cd backend
npm test -- ConversationalAIService.test.ts
```

### Integration Tests

Requires running PostgreSQL and Ollama:

```bash
INTEGRATION_TEST=true npm test -- ConversationalAIService.test.ts
```

### Manual Testing (GraphQL Playground)

1. Open http://localhost:4000/graphql
2. Set authentication header:
   ```json
   {
     "Authorization": "Bearer YOUR_JWT_TOKEN"
   }
   ```
3. Run test mutation:
   ```graphql
   mutation Test {
     sendAIMessage(message: "Hello") {
       response
     }
   }
   ```

## Frontend Integration

### Example React Component

```typescript
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const SEND_AI_MESSAGE = gql`
  mutation SendAIMessage($message: String!, $conversationId: ID) {
    sendAIMessage(message: $message, conversationId: $conversationId) {
      conversationId
      response
      relevantNodes {
        id
        title
        similarity
      }
    }
  }
`;

function ChatInterface() {
  const [sendMessage, { loading, error, data }] = useMutation(SEND_AI_MESSAGE);
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);

  const handleSend = async () => {
    const result = await sendMessage({
      variables: { message, conversationId }
    });

    if (result.data) {
      setConversationId(result.data.sendAIMessage.conversationId);
      // Render response with node links
      const response = result.data.sendAIMessage.response;
      // Parse markdown links: [Node Title](node:node-id)
    }
  };

  return (
    <div>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button onClick={handleSend} disabled={loading}>Send</button>
      {error && <div>Error: {error.message}</div>}
      {data && <div>{data.sendAIMessage.response}</div>}
    </div>
  );
}
```

### Parsing Node Links

```typescript
function parseNodeLinks(markdown: string): React.ReactNode {
  // Regex to match [Text](node:id) format
  const nodeRegex = /\[([^\]]+)\]\(node:([^\)]+)\)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = nodeRegex.exec(markdown)) !== null) {
    // Add text before link
    parts.push(markdown.substring(lastIndex, match.index));

    // Add clickable node link
    const [, title, nodeId] = match;
    parts.push(
      <Link key={nodeId} to={`/nodes/${nodeId}`}>
        {title}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  parts.push(markdown.substring(lastIndex));

  return parts;
}
```

## Monitoring & Analytics

### Database Views

```sql
-- Conversation statistics
SELECT * FROM get_conversation_stats(NULL);

-- Recent conversations with activity
SELECT * FROM public."ConversationSummaries"
ORDER BY last_message_at DESC
LIMIT 10;
```

### Metrics to Track

- **Conversations per day**
- **Messages per conversation**
- **Average response time**
- **Most searched topics** (from semantic search queries)
- **Node reference frequency** (which nodes are linked most)

### Logging

The service logs key events:

```typescript
console.log(`Semantic search found ${nodes.length} relevant nodes`);
console.log(`AI Response generated: ${tokens} tokens in ${duration}s`);
```

## Troubleshooting

### Slow Response Times

**Problem:** Responses take >10 seconds

**Solutions:**
1. Use smaller chat model: `OLLAMA_CHAT_MODEL=llama3.2:3b`
2. Reduce context: `MAX_CONTEXT_MESSAGES=10`
3. Limit node search: `MAX_RELEVANT_NODES=3`
4. Add HNSW index on `ai` column

### Poor Search Results

**Problem:** Semantic search returns irrelevant nodes

**Solutions:**
1. Lower similarity threshold: `SIMILARITY_THRESHOLD=0.6`
2. Verify nodes have embeddings: `SELECT COUNT(*) FROM "Nodes" WHERE ai IS NOT NULL`
3. Re-vectorize nodes with updated model
4. Check embedding quality with test queries

### Memory Issues

**Problem:** Service crashes with out-of-memory errors

**Solutions:**
1. Reduce `MAX_CONTEXT_MESSAGES`
2. Clear embedding cache periodically
3. Use smaller models
4. Implement conversation archiving

## Roadmap

Future enhancements planned:

- [ ] Streaming responses (real-time typing effect)
- [ ] Multi-modal support (images, PDFs in conversations)
- [ ] Conversation branching (explore alternative responses)
- [ ] Fine-tuned models on domain-specific data
- [ ] RAG (Retrieval-Augmented Generation) with document chunks
- [ ] Conversation summarization for long threads
- [ ] Suggested follow-up questions
- [ ] Export conversations as reports

## Support

For issues or questions:

1. Check logs: `docker logs rabbithole-api-1`
2. Verify Ollama: `ollama list`
3. Test database: `psql -d rabbithole_db -c "SELECT COUNT(*) FROM \"Conversations\""`
4. Review GraphQL errors in browser console

## License

This service is part of the Rabbit Hole project. See main project LICENSE.
