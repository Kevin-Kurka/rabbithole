# Vectorization Pipeline

This directory contains the background worker services for the Rabbit Hole project's vectorization pipeline, which processes text content to generate vector embeddings for semantic search capabilities.

## Architecture Overview

The vectorization pipeline follows an asynchronous, queue-based architecture:

```
GraphQL Mutation → PostgreSQL → RabbitMQ → VectorizationWorker → OpenAI API → PostgreSQL
```

### Flow Diagram

1. **Event Creation**: When a Node, Edge, NodeType, or EdgeType is created/updated via GraphQL mutation
2. **Database Write**: The entity is written to PostgreSQL with an empty `ai` vector field
3. **Job Enqueueing**: A vectorization job is published to RabbitMQ queue
4. **Worker Processing**: VectorizationWorker consumes the job from the queue
5. **Text Extraction**: Worker fetches entity data and extracts text from props/meta fields
6. **Embedding Generation**: Text is sent to OpenAI's `text-embedding-3-large` API
7. **Vector Storage**: The resulting 1536-dimension vector is written back to PostgreSQL `ai` column

## Components

### 1. VectorizationWorker (`VectorizationWorker.ts`)

The main worker service that processes vectorization jobs.

**Features:**
- Consumes messages from RabbitMQ queue
- Fetches entity data from PostgreSQL
- Generates embeddings via OpenAI API
- Updates database with resulting vectors
- Automatic retry with exponential backoff
- Graceful shutdown handling
- Connection pooling for database and message queue

**Environment Variables:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rabbithole_db
RABBITMQ_URL=amqp://admin:admin@localhost:5672
OPENAI_API_KEY=sk-...
VECTORIZATION_QUEUE_NAME=vectorization_queue
RABBITMQ_MAX_RETRIES=10
RABBITMQ_RETRY_DELAY_MS=3000
```

### 2. EmbeddingService (`../services/EmbeddingService.ts`)

Service layer for OpenAI embedding generation.

**Features:**
- OpenAI API integration
- Automatic retry with exponential backoff
- Rate limiting protection
- Input validation and sanitization
- Batch processing support
- Detailed error handling and logging

**Configuration:**
```bash
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-large  # Default
OPENAI_MAX_RETRIES=3                          # Default
OPENAI_TIMEOUT=30000                          # 30 seconds
```

### 3. QueueService (`../services/QueueService.ts`)

RabbitMQ client service for publishing vectorization jobs.

**Features:**
- Singleton pattern for connection pooling
- Automatic reconnection on connection loss
- Persistent message delivery
- Batch job enqueueing
- Health check utilities

## Usage

### Starting the Worker

**Development:**
```bash
npm run worker:dev
```

**Production (Docker):**
The worker runs as a separate service in `docker-compose.yml`:
```bash
docker-compose up vectorization-worker
```

### Publishing Vectorization Jobs

From GraphQL resolvers or services:

```typescript
import { queueService } from '../services/QueueService';

// Single job
await queueService.enqueueVectorizationJob('node', nodeId);

// Batch jobs
await queueService.enqueueVectorizationJobs([
  { entityType: 'node', entityId: 'uuid-1' },
  { entityType: 'edge', entityId: 'uuid-2' },
]);
```

### Health Checks

**RabbitMQ Health Check:**
```bash
npm run rabbitmq:health
```

This script verifies:
- RabbitMQ connectivity
- Queue existence and status
- Message delivery

## Message Format

Vectorization jobs are published as JSON messages:

```json
{
  "entityType": "node",
  "entityId": "uuid-v4",
  "timestamp": "2025-10-09T22:00:00.000Z",
  "retryCount": 0
}
```

**Fields:**
- `entityType`: One of `'node'`, `'edge'`, `'nodeType'`, `'edgeType'`
- `entityId`: UUID of the entity to vectorize
- `timestamp`: ISO 8601 timestamp of job creation
- `retryCount`: Number of retry attempts (incremented on failure)

## Error Handling

### Retryable Errors

The worker automatically retries these errors:
- Network timeouts (`ETIMEDOUT`, `ECONNRESET`)
- OpenAI rate limit errors (HTTP 429)
- OpenAI server errors (HTTP 5xx)

**Retry Strategy:**
- Exponential backoff: `delay = min(1000 * 2^attempt, 10000)`
- Maximum retries: 10 (configurable)
- After max retries: Message is acknowledged and logged as failed

### Non-Retryable Errors

These errors cause immediate failure:
- Missing entity (not found in database)
- Empty text content (no text to embed)
- OpenAI authentication errors (HTTP 401)
- OpenAI client errors (HTTP 4xx except 429)

## Monitoring

### Worker Logs

The worker produces structured logs:

```
✓ Database connection established
✓ OpenAI API key configured
✓ Connected to RabbitMQ
✓ Listening for messages on queue: vectorization_queue

[2025-10-09T22:00:00.000Z] Processing node uuid-123 (retry: 0)
✓ Generated embedding in 450ms (150 tokens, model: text-embedding-3-large)
✓ Completed node uuid-123 in 500ms (150 tokens)
```

### Key Metrics

Monitor these metrics for production:
- **Processing time**: Time from job consumption to completion
- **OpenAI API latency**: Time for embedding generation
- **Token usage**: Cost tracking via OpenAI usage metrics
- **Queue depth**: Number of pending jobs in RabbitMQ
- **Error rate**: Failed jobs / total jobs
- **Retry rate**: Jobs requiring retries / total jobs

## Performance Considerations

### Throughput

- Worker processes jobs sequentially (prefetch = 1)
- To increase throughput, run multiple worker instances
- OpenAI rate limits: 3,000 requests/min (Tier 1)

### Cost Optimization

- **Model**: `text-embedding-3-large` costs $0.00013 per 1K tokens
- **Average cost**: ~$0.00002 per embedding (150 tokens)
- **Batch processing**: Use batch endpoints for bulk operations

### Database Optimization

- Vector index type: HNSW (Hierarchical Navigable Small Worlds)
- Index creation:
  ```sql
  CREATE INDEX ON "Nodes" USING hnsw (ai vector_cosine_ops);
  ```

## Troubleshooting

### Worker Won't Start

1. Check database connectivity:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. Check RabbitMQ connectivity:
   ```bash
   npm run rabbitmq:health
   ```

3. Verify OpenAI API key:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### Jobs Not Processing

1. Check queue status:
   ```bash
   npm run rabbitmq:health
   ```

2. Check worker logs for errors

3. Verify consumer count > 0 in RabbitMQ management UI:
   ```
   http://localhost:15672
   ```

### Slow Processing

1. Check OpenAI API latency
2. Check database query performance
3. Consider scaling workers horizontally
4. Review batch processing opportunities

## Future Enhancements

- [ ] Dead letter queue for failed messages
- [ ] Prometheus metrics export
- [ ] Batch embedding optimization
- [ ] Caching layer for duplicate content
- [ ] Worker auto-scaling based on queue depth
- [ ] Support for alternative embedding models (local LLMs)

## References

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials)
- [PRD Section 4.1: Vectorization Pipeline](/Users/kmk/rabbithole/prd.md)
