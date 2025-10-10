# MessageQueueService

## Overview

The `MessageQueueService` provides a robust interface for managing RabbitMQ message queue operations for the vectorization pipeline. It handles connection management, automatic reconnection with exponential backoff, and provides methods for publishing and consuming vectorization jobs.

## Features

- **Automatic Connection Management**: Establishes and maintains connection to RabbitMQ
- **Exponential Backoff Retry**: Automatically reconnects with exponential backoff on connection loss
- **Graceful Shutdown**: Properly closes connections and channels
- **Error Handling**: Comprehensive error handling with detailed logging
- **Type Safety**: Full TypeScript support with well-defined interfaces
- **Message Persistence**: Jobs survive broker restarts
- **Fair Dispatch**: One message at a time per consumer for load balancing

## Installation

The service requires the `amqplib` package:

```bash
npm install amqplib @types/amqplib
```

## Configuration

Configuration is managed through environment variables (defined in `src/config/rabbitmq.ts`):

```bash
# Required
RABBITMQ_URL=amqp://localhost                # RabbitMQ connection URL
VECTORIZATION_QUEUE_NAME=vectorization_jobs  # Queue name

# Optional - Retry Configuration
RABBITMQ_MAX_RETRIES=10                      # Maximum retry attempts
RABBITMQ_RETRY_DELAY_MS=3000                 # Initial retry delay
RABBITMQ_MAX_RETRY_DELAY_MS=30000            # Maximum retry delay
```

Add these to your `.env` file.

## Usage

### Importing the Service

```typescript
import { messageQueueService } from './services/MessageQueueService';
import { VectorizationJob } from './types/vectorization';
```

### Publishing Jobs

```typescript
// Connect to RabbitMQ
await messageQueueService.connect();

// Publish a vectorization job for a node
await messageQueueService.publishVectorizationJob(
  'node',           // entity type: 'node' or 'edge'
  'node-123',       // entity ID
  'Content to vectorize'  // content
);

// Publish a vectorization job for an edge
await messageQueueService.publishVectorizationJob(
  'edge',
  'edge-456',
  'Edge relationship description'
);
```

### Subscribing to Jobs (Worker)

```typescript
// Connect to RabbitMQ
await messageQueueService.connect();

// Define job handler
async function handleVectorizationJob(job: VectorizationJob) {
  console.log(`Processing ${job.entityType} ${job.entityId}`);

  // Generate embedding
  const embedding = await generateEmbedding(job.content);

  // Store in database
  await storeEmbedding(job.entityType, job.entityId, embedding);

  console.log(`Successfully processed ${job.entityId}`);
}

// Subscribe to jobs
await messageQueueService.subscribeToVectorizationJobs(handleVectorizationJob);
```

### Connection Status

```typescript
// Check if connected
const isConnected = messageQueueService.isConnected();

// Get detailed status
const status = messageQueueService.getStatus();
console.log(status);
// {
//   connected: true,
//   connecting: false,
//   retryCount: 0,
//   shuttingDown: false
// }
```

### Graceful Shutdown

```typescript
// Disconnect gracefully
await messageQueueService.disconnect();
```

## Complete Worker Example

```typescript
import { messageQueueService } from '../services/MessageQueueService';
import { VectorizationJob } from '../types/vectorization';

async function processJob(job: VectorizationJob): Promise<void> {
  const startTime = Date.now();

  try {
    // Generate embedding using your preferred service
    const embedding = await generateEmbedding(job.content);

    // Store in database
    await db.query(
      'UPDATE nodes SET embedding = $1 WHERE id = $2',
      [embedding, job.entityId]
    );

    console.log(`Processed ${job.entityId} in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('Processing failed:', error);
    throw error; // Trigger message requeue
  }
}

async function main() {
  // Connect to queue
  await messageQueueService.connect();

  // Start consuming jobs
  await messageQueueService.subscribeToVectorizationJobs(processJob);

  console.log('Worker ready');

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    await messageQueueService.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Job Structure

### VectorizationJob

```typescript
interface VectorizationJob {
  entityType: 'node' | 'edge';  // Type of entity
  entityId: string;              // Unique identifier
  content: string;               // Content to vectorize
  timestamp: number;             // Job creation timestamp
  metadata?: {                   // Optional metadata
    graphId?: string;
    userId?: string;
    priority?: 'low' | 'normal' | 'high';
  };
}
```

### VectorizationResult

```typescript
interface VectorizationResult {
  entityType: 'node' | 'edge';
  entityId: string;
  embedding: number[];           // Generated embedding vector
  timestamp: number;             // Completion timestamp
  success: boolean;              // Success status
  error?: string;                // Error message if failed
  metadata?: {
    model?: string;
    dimensions?: number;
    processingTimeMs?: number;
  };
}
```

## Error Handling

The service implements comprehensive error handling:

### Connection Errors

- Automatic reconnection with exponential backoff
- Configurable maximum retry attempts
- Detailed logging of connection state changes

### Publishing Errors

```typescript
try {
  await messageQueueService.publishVectorizationJob('node', 'id', 'content');
} catch (error) {
  console.error('Failed to publish job:', error);
  // Handle error (e.g., store in database for retry)
}
```

### Processing Errors

When a job handler throws an error:
- Message is **rejected** and **requeued** automatically
- Job will be retried by another consumer
- Implement dead letter queues for failed jobs after max retries

```typescript
async function processJob(job: VectorizationJob): Promise<void> {
  try {
    // Process job
    await generateEmbedding(job.content);
  } catch (error) {
    console.error('Processing failed:', error);
    throw error; // This triggers message requeue
  }
}
```

## Integration with GraphQL Resolvers

```typescript
// In your Node/Edge mutation resolver
import { messageQueueService } from '../services/MessageQueueService';

@Mutation(() => Node)
async createNode(
  @Arg('input') input: CreateNodeInput,
  @Ctx() { pool }: Context
): Promise<Node> {
  // Create node in database
  const node = await createNodeInDB(input);

  // Publish vectorization job
  try {
    await messageQueueService.publishVectorizationJob(
      'node',
      node.id,
      node.content
    );
  } catch (error) {
    console.error('Failed to queue vectorization:', error);
    // Node is still created, vectorization can be retried later
  }

  return node;
}
```

## Running the Worker

Add a script to `package.json`:

```json
{
  "scripts": {
    "worker:dev": "ts-node src/workers/VectorizationWorker.ts",
    "worker:start": "node dist/workers/VectorizationWorker.js"
  }
}
```

Run the worker:

```bash
# Development
npm run worker:dev

# Production (after building)
npm run build
npm run worker:start
```

## Testing

Run the tests:

```bash
npm test -- MessageQueueService.test.ts
```

**Note**: Tests require a running RabbitMQ instance. Start RabbitMQ with Docker:

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

## Docker Integration

Update `docker-compose.yml` to include RabbitMQ:

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  backend:
    environment:
      - RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672

  worker:
    build: ./backend
    command: npm run worker:start
    environment:
      - RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
    depends_on:
      - rabbitmq
      - postgres

volumes:
  rabbitmq_data:
```

## Monitoring

Access RabbitMQ Management UI:
- URL: http://localhost:15672
- Default credentials: guest/guest (or custom from docker-compose)

Monitor:
- Queue depth
- Message rates
- Consumer count
- Connection status

## Best Practices

1. **Connection Management**: Always call `connect()` before publishing/subscribing
2. **Error Handling**: Wrap publish operations in try-catch blocks
3. **Graceful Shutdown**: Always call `disconnect()` on application shutdown
4. **Worker Scaling**: Run multiple worker instances for parallel processing
5. **Message Persistence**: Jobs survive broker restarts (enabled by default)
6. **Dead Letter Queues**: Configure for jobs that fail repeatedly
7. **Monitoring**: Use RabbitMQ management UI to monitor queue health

## Troubleshooting

### Connection Refused
- Ensure RabbitMQ is running: `docker ps`
- Check RABBITMQ_URL in `.env`
- Verify network connectivity

### Jobs Not Being Processed
- Check worker is running and connected
- Verify queue name matches in publisher and consumer
- Check RabbitMQ management UI for queue status

### Memory Issues
- Implement prefetch limits (already configured)
- Batch process large embeddings
- Monitor queue depth and add more workers if needed

## Related Files

- `/src/services/MessageQueueService.ts` - Main service implementation
- `/src/types/vectorization.ts` - TypeScript type definitions
- `/src/config/rabbitmq.ts` - Configuration constants
- `/src/workers/VectorizationWorker.example.ts` - Example worker implementation
- `/src/__tests__/MessageQueueService.test.ts` - Unit tests
