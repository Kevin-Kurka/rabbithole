/**
 * Vectorization Worker Example
 *
 * This is an example worker that demonstrates how to use the MessageQueueService
 * to subscribe to and process vectorization jobs. In a production environment,
 * this worker would call an actual embedding service (OpenAI, Ollama, etc.).
 */

import { messageQueueService } from '../services/MessageQueueService';
import { VectorizationJob } from '../types/vectorization';

/**
 * Mock vectorization function - replace with actual embedding service
 */
async function generateEmbedding(content: string): Promise<number[]> {
  // TODO: Replace with actual embedding service call
  // Example: OpenAI, Ollama, or other embedding model
  console.log(`Generating embedding for content: ${content.substring(0, 50)}...`);

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock embedding vector (1536 dimensions for OpenAI ada-002)
  return Array(1536).fill(0).map(() => Math.random());
}

/**
 * Process a single vectorization job
 */
async function processVectorizationJob(job: VectorizationJob): Promise<void> {
  console.log(`\n=== Processing Job ===`);
  console.log(`Entity Type: ${job.entityType}`);
  console.log(`Entity ID: ${job.entityId}`);
  console.log(`Content Length: ${job.content.length} characters`);
  console.log(`Timestamp: ${new Date(job.timestamp).toISOString()}`);

  try {
    const startTime = Date.now();

    // Generate embedding
    const embedding = await generateEmbedding(job.content);

    const processingTime = Date.now() - startTime;

    console.log(`Embedding generated: ${embedding.length} dimensions`);
    console.log(`Processing time: ${processingTime}ms`);

    // TODO: Store embedding in database
    // await storeEmbedding(job.entityType, job.entityId, embedding);

    console.log(`✓ Successfully processed ${job.entityType} ${job.entityId}`);
  } catch (error) {
    console.error(`✗ Failed to process job:`, error);
    throw error; // Re-throw to trigger message requeue
  }
}

/**
 * Main worker function
 */
async function main() {
  console.log('Starting Vectorization Worker...');

  try {
    // Connect to RabbitMQ
    await messageQueueService.connect();

    // Subscribe to vectorization jobs
    await messageQueueService.subscribeToVectorizationJobs(processVectorizationJob);

    console.log('Worker is ready and listening for jobs...\n');

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down worker...');
      await messageQueueService.disconnect();
      console.log('Worker shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Run the worker
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
