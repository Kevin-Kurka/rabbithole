# Vectorization Pipeline Integration Guide

This guide shows how to integrate the vectorization pipeline into your GraphQL resolvers and services.

## Quick Start

### 1. Import the QueueService

```typescript
import { queueService } from '../services/QueueService';
```

### 2. Enqueue Jobs After Entity Creation

**Example: Node Creation Resolver**

```typescript
import { Mutation, Arg, Ctx } from 'type-graphql';
import { queueService } from '../services/QueueService';

@Resolver()
export class NodeResolver {
  @Mutation(() => Node)
  async createNode(
    @Arg('input') input: CreateNodeInput,
    @Ctx() { pool }: Context
  ): Promise<Node> {
    // 1. Create the node in PostgreSQL
    const result = await pool.query(
      `INSERT INTO "Nodes" (id, graph_id, node_type_id, props, meta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuid(), input.graphId, input.nodeTypeId, input.props, input.meta]
    );

    const node = result.rows[0];

    // 2. Enqueue vectorization job (fire-and-forget)
    try {
      await queueService.enqueueVectorizationJob('node', node.id);
    } catch (error) {
      // Log but don't fail the mutation
      console.error('Failed to enqueue vectorization job:', error);
    }

    return node;
  }
}
```

**Example: Batch Node Creation**

```typescript
@Mutation(() => [Node])
async createNodes(
  @Arg('inputs', () => [CreateNodeInput]) inputs: CreateNodeInput[],
  @Ctx() { pool }: Context
): Promise<Node[]> {
  const nodes: Node[] = [];

  // 1. Create all nodes in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const input of inputs) {
      const result = await client.query(
        `INSERT INTO "Nodes" (id, graph_id, node_type_id, props, meta)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [uuid(), input.graphId, input.nodeTypeId, input.props, input.meta]
      );
      nodes.push(result.rows[0]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // 2. Enqueue batch vectorization jobs
  try {
    await queueService.enqueueVectorizationJobs(
      nodes.map(node => ({ entityType: 'node', entityId: node.id }))
    );
  } catch (error) {
    console.error('Failed to enqueue batch vectorization jobs:', error);
  }

  return nodes;
}
```

### 3. Handle Updates

**When should you re-vectorize?**

Re-vectorize when text content changes:

```typescript
@Mutation(() => Node)
async updateNode(
  @Arg('id') id: string,
  @Arg('input') input: UpdateNodeInput,
  @Ctx() { pool }: Context
): Promise<Node> {
  // Check if props or meta changed (text content)
  const shouldReVectorize =
    input.props !== undefined ||
    input.meta !== undefined;

  // Update the node
  const result = await pool.query(
    `UPDATE "Nodes"
     SET props = COALESCE($1, props),
         meta = COALESCE($2, meta),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [input.props, input.meta, id]
  );

  const node = result.rows[0];

  // Re-vectorize if text content changed
  if (shouldReVectorize) {
    try {
      await queueService.enqueueVectorizationJob('node', node.id);
    } catch (error) {
      console.error('Failed to enqueue vectorization job:', error);
    }
  }

  return node;
}
```

## Advanced Patterns

### Pattern 1: Deferred Vectorization

For bulk operations, defer vectorization until all database operations complete:

```typescript
async bulkImportNodes(nodes: NodeData[]): Promise<void> {
  const client = await pool.connect();
  const createdIds: string[] = [];

  try {
    await client.query('BEGIN');

    // Import all nodes
    for (const nodeData of nodes) {
      const result = await client.query(
        `INSERT INTO "Nodes" (...) VALUES (...) RETURNING id`,
        [...]
      );
      createdIds.push(result.rows[0].id);
    }

    await client.query('COMMIT');

    // Now enqueue all vectorization jobs
    await queueService.enqueueVectorizationJobs(
      createdIds.map(id => ({ entityType: 'node', entityId: id }))
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Pattern 2: Conditional Vectorization

Only vectorize entities that have sufficient text content:

```typescript
async createNode(input: CreateNodeInput): Promise<Node> {
  const node = await this.nodeRepository.create(input);

  // Only vectorize if there's meaningful text content
  const hasTextContent =
    (input.props && Object.keys(input.props).length > 0) ||
    (input.meta && Object.keys(input.meta).length > 0);

  if (hasTextContent) {
    await queueService.enqueueVectorizationJob('node', node.id);
  }

  return node;
}
```

### Pattern 3: Priority Queuing

For future implementation with priority queues:

```typescript
// High-priority entities (e.g., Level 0 candidates)
await queueService.enqueueVectorizationJob('node', nodeId, { priority: 'high' });

// Normal priority (default)
await queueService.enqueueVectorizationJob('node', nodeId);

// Low priority (background processing)
await queueService.enqueueVectorizationJob('node', nodeId, { priority: 'low' });
```

## Error Handling

### Best Practices

1. **Never fail mutations due to vectorization errors**
   - Vectorization is an async background process
   - Log errors but continue with the primary operation

2. **Monitor failed jobs**
   - Implement dead letter queue
   - Set up alerts for high failure rates

3. **Handle connection failures gracefully**
   ```typescript
   try {
     await queueService.enqueueVectorizationJob('node', nodeId);
   } catch (error) {
     console.error('Vectorization enqueue failed:', error);
     // Optionally: Store failed jobs in a retry table
     await this.storeFailedVectorizationJob('node', nodeId);
   }
   ```

### Recovery Strategies

**Strategy 1: Retry Table**

Store failed jobs in PostgreSQL for later retry:

```sql
CREATE TABLE "FailedVectorizationJobs" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0
);
```

**Strategy 2: Scheduled Re-vectorization**

Periodically find entities with missing vectors:

```typescript
async findUnvectorizedEntities(): Promise<string[]> {
  const result = await pool.query(
    `SELECT id FROM "Nodes" WHERE ai IS NULL LIMIT 100`
  );
  return result.rows.map(row => row.id);
}

// Cron job or scheduled task
async reVectorizeOrphanedEntities(): Promise<void> {
  const ids = await this.findUnvectorizedEntities();
  await queueService.enqueueVectorizationJobs(
    ids.map(id => ({ entityType: 'node', entityId: id }))
  );
}
```

## Testing

### Unit Testing with Mocks

```typescript
import { queueService } from '../services/QueueService';

// Mock the queue service
jest.mock('../services/QueueService', () => ({
  queueService: {
    enqueueVectorizationJob: jest.fn(),
    enqueueVectorizationJobs: jest.fn(),
  },
}));

describe('NodeResolver', () => {
  it('should enqueue vectorization job on node creation', async () => {
    const resolver = new NodeResolver();
    const node = await resolver.createNode(mockInput, mockContext);

    expect(queueService.enqueueVectorizationJob).toHaveBeenCalledWith(
      'node',
      node.id
    );
  });
});
```

### Integration Testing

```typescript
describe('Vectorization Integration', () => {
  beforeAll(async () => {
    // Ensure RabbitMQ is running
    await queueService.connect();
  });

  it('should process vectorization job end-to-end', async () => {
    // Create node
    const node = await createTestNode();

    // Enqueue job
    await queueService.enqueueVectorizationJob('node', node.id);

    // Wait for processing (in test environment)
    await sleep(2000);

    // Verify vector was written
    const result = await pool.query(
      `SELECT ai FROM "Nodes" WHERE id = $1`,
      [node.id]
    );

    expect(result.rows[0].ai).not.toBeNull();
    expect(result.rows[0].ai).toHaveLength(1536);
  });
});
```

## Monitoring & Observability

### Logging

Add structured logging to track vectorization lifecycle:

```typescript
// In resolver
console.log(`[Vectorization] Enqueued job for node ${nodeId}`);

// In worker (already implemented)
// Logs include:
// - Job start/completion
// - Processing duration
// - Token usage
// - Errors and retries
```

### Metrics to Track

1. **Queue Depth**: Monitor RabbitMQ queue length
2. **Processing Time**: Average time per job
3. **Success Rate**: Successful jobs / total jobs
4. **Token Usage**: Track OpenAI API costs
5. **Error Rate**: Failed jobs by error type

### Health Checks

```typescript
// Check queue service health
const isHealthy = queueService.isConnected();

// Check worker health (via RabbitMQ management API)
const queueStats = await getQueueStats();
const hasActiveWorkers = queueStats.consumers > 0;
```

## Production Checklist

- [ ] Set `OPENAI_API_KEY` environment variable
- [ ] Configure RabbitMQ with appropriate credentials
- [ ] Set up monitoring and alerting
- [ ] Implement dead letter queue for failed jobs
- [ ] Configure worker auto-scaling based on queue depth
- [ ] Set up log aggregation (e.g., ELK stack)
- [ ] Review and adjust retry configuration
- [ ] Test graceful shutdown behavior
- [ ] Document operational procedures
- [ ] Set up cost monitoring for OpenAI API usage

## Troubleshooting

**Jobs not being processed:**
1. Check worker is running: `docker-compose ps vectorization-worker`
2. Check RabbitMQ queue: `npm run rabbitmq:health`
3. Check worker logs: `docker-compose logs vectorization-worker`

**High error rate:**
1. Check OpenAI API key validity
2. Review worker error logs for patterns
3. Check database connectivity
4. Verify queue configuration

**Slow processing:**
1. Check OpenAI API rate limits
2. Consider horizontal scaling (more workers)
3. Review batch size configuration
4. Check database query performance

## References

- [Worker README](./README.md)
- [QueueService Documentation](../services/QueueService.ts)
- [EmbeddingService Documentation](../services/EmbeddingService.ts)
- [PRD: Vectorization Pipeline](/Users/kmk/rabbithole/prd.md#41-vectorization-pipeline)
