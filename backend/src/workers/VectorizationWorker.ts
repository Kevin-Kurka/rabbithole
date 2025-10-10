import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { connect, ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { Pool } from 'pg';
import { config } from '../config';
import { embeddingService, EmbeddingService } from '../services/EmbeddingService';

/**
 * VectorizationWorker
 *
 * A background worker service that processes vectorization jobs from RabbitMQ.
 * This worker listens for messages containing entity IDs (nodes/edges), retrieves
 * their content from PostgreSQL, generates embeddings using OpenAI's API, and
 * writes the resulting vectors back to the database.
 *
 * Architecture:
 * 1. Consumes messages from RabbitMQ queue (vectorization_queue)
 * 2. Fetches entity data from PostgreSQL
 * 3. Generates 1536-dimension embeddings via OpenAI API
 * 4. Updates PostgreSQL 'ai' column with vector
 * 5. Acknowledges message or requeues on failure
 *
 * Features:
 * - Automatic reconnection to RabbitMQ and PostgreSQL
 * - Configurable retry logic with exponential backoff
 * - Graceful shutdown handling
 * - Comprehensive error logging
 * - Health monitoring
 */

interface VectorizationJob {
  entityType: 'node' | 'edge' | 'nodeType' | 'edgeType';
  entityId: string;
  timestamp: string;
  retryCount?: number;
}

interface EntityData {
  id: string;
  name?: string;
  description?: string;
  props?: any;
  meta?: any;
}

export class VectorizationWorker {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private pool: Pool;
  private queueName: string;
  private isShuttingDown: boolean = false;
  private processingCount: number = 0;
  private maxRetries: number;
  private retryDelay: number;
  private maxRetryDelay: number;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      max: 10, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.queueName = config.rabbitmq.queueName;
    this.maxRetries = parseInt(process.env.RABBITMQ_MAX_RETRIES || '10', 10);
    this.retryDelay = parseInt(process.env.RABBITMQ_RETRY_DELAY_MS || '3000', 10);
    this.maxRetryDelay = parseInt(process.env.RABBITMQ_MAX_RETRY_DELAY_MS || '30000', 10);

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  /**
   * Initialize worker and start processing jobs
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Vectorization Worker...');

    // Verify database connection
    await this.verifyDatabaseConnection();

    // Verify OpenAI API configuration
    await this.verifyOpenAIConnection();

    // Connect to RabbitMQ
    await this.connectToRabbitMQ();

    // Start consuming messages
    await this.consumeMessages();

    console.log('✓ Vectorization Worker is running');
    console.log(`  Queue: ${this.queueName}`);
    console.log(`  Database: ${config.database.url.replace(/:([^@]+)@/, ':***@')}`);
    console.log(`  OpenAI Model: ${config.openai.embeddingModel}`);
  }

  /**
   * Verify PostgreSQL database connection
   */
  private async verifyDatabaseConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('✓ Database connection established');
    } catch (error: any) {
      console.error('✗ Database connection failed:', error.message);
      throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
    }
  }

  /**
   * Verify OpenAI API connection
   */
  private async verifyOpenAIConnection(): Promise<void> {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }

    console.log('✓ OpenAI API key configured');
  }

  /**
   * Connect to RabbitMQ with retry logic
   */
  private async connectToRabbitMQ(retryCount: number = 0): Promise<void> {
    try {
      this.connection = await connect(config.rabbitmq.url);

      // Handle connection errors
      this.connection.on('error', (err) => {
        if (!this.isShuttingDown) {
          console.error('RabbitMQ connection error:', err.message);
          this.reconnectToRabbitMQ();
        }
      });

      this.connection.on('close', () => {
        if (!this.isShuttingDown) {
          console.warn('RabbitMQ connection closed. Reconnecting...');
          this.reconnectToRabbitMQ();
        }
      });

      // Create channel
      this.channel = await this.connection.createChannel();

      // Assert queue exists
      await this.channel.assertQueue(this.queueName, {
        durable: true, // Queue survives broker restarts
        arguments: {
          'x-message-ttl': 86400000, // Messages expire after 24 hours
          'x-max-length': 10000, // Max queue length
        },
      });

      // Set prefetch to control how many messages to process concurrently
      await this.channel.prefetch(1);

      console.log('✓ Connected to RabbitMQ');
    } catch (error: any) {
      console.error(`✗ Failed to connect to RabbitMQ (attempt ${retryCount + 1}):`, error.message);

      if (retryCount < this.maxRetries) {
        const delay = Math.min(this.retryDelay * Math.pow(2, retryCount), this.maxRetryDelay);
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.connectToRabbitMQ(retryCount + 1);
      } else {
        throw new Error(`Failed to connect to RabbitMQ after ${retryCount + 1} attempts`);
      }
    }
  }

  /**
   * Reconnect to RabbitMQ after connection loss
   */
  private async reconnectToRabbitMQ(): Promise<void> {
    this.connection = null;
    this.channel = null;

    // Wait before reconnecting
    await this.sleep(5000);

    try {
      await this.connectToRabbitMQ();
      await this.consumeMessages();
    } catch (error: any) {
      console.error('Failed to reconnect to RabbitMQ:', error.message);
      setTimeout(() => this.reconnectToRabbitMQ(), 10000);
    }
  }

  /**
   * Start consuming messages from the queue
   */
  private async consumeMessages(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.consume(
      this.queueName,
      async (message) => {
        if (message) {
          await this.processMessage(message);
        }
      },
      { noAck: false } // Manual acknowledgment
    );

    console.log(`✓ Listening for messages on queue: ${this.queueName}`);
  }

  /**
   * Process a single vectorization job message
   */
  private async processMessage(message: ConsumeMessage): Promise<void> {
    this.processingCount++;
    const startTime = Date.now();

    try {
      // Parse message content
      const job: VectorizationJob = JSON.parse(message.content.toString());
      const retryCount = job.retryCount || 0;

      console.log(
        `[${new Date().toISOString()}] Processing ${job.entityType} ${job.entityId} ` +
        `(retry: ${retryCount})`
      );

      // Fetch entity data from database
      const entityData = await this.fetchEntityData(job.entityType, job.entityId);

      // Extract text for embedding
      const text = EmbeddingService.extractTextForEmbedding(entityData);

      // Generate embedding
      const result = await embeddingService.generateEmbedding(text);

      // Update database with vector
      await this.updateEntityVector(job.entityType, job.entityId, result.vector);

      // Acknowledge successful processing
      this.channel?.ack(message);

      const duration = Date.now() - startTime;
      console.log(
        `✓ Completed ${job.entityType} ${job.entityId} in ${duration}ms ` +
        `(${result.usage.promptTokens} tokens)`
      );

    } catch (error: any) {
      console.error(`✗ Failed to process message:`, error.message);

      // Determine if we should retry
      const job: VectorizationJob = JSON.parse(message.content.toString());
      const retryCount = (job.retryCount || 0) + 1;

      if (retryCount <= this.maxRetries && this.isRetryableError(error)) {
        console.log(`Requeuing message (retry ${retryCount}/${this.maxRetries})...`);

        // Republish message with incremented retry count
        job.retryCount = retryCount;

        // Add delay before retry by using a delay queue (if configured) or simply requeue
        if (this.channel) {
          await this.channel.sendToQueue(
            this.queueName,
            Buffer.from(JSON.stringify(job)),
            { persistent: true }
          );
        }

        // Acknowledge original message
        this.channel?.ack(message);
      } else {
        // Max retries exhausted or non-retryable error - move to dead letter queue
        console.error(
          `Max retries exhausted for ${job.entityType} ${job.entityId}. ` +
          `Discarding message.`
        );

        // TODO: Implement dead letter queue for failed messages
        // For now, acknowledge to prevent infinite requeue
        this.channel?.ack(message);
      }
    } finally {
      this.processingCount--;
    }
  }

  /**
   * Fetch entity data from PostgreSQL
   */
  private async fetchEntityData(entityType: string, entityId: string): Promise<EntityData> {
    let tableName: string;

    switch (entityType) {
      case 'node':
        tableName = 'Nodes';
        break;
      case 'edge':
        tableName = 'Edges';
        break;
      case 'nodeType':
        tableName = 'NodeTypes';
        break;
      case 'edgeType':
        tableName = 'EdgeTypes';
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    const query = `
      SELECT id, name, description, props, meta
      FROM public."${tableName}"
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [entityId]);

    if (result.rows.length === 0) {
      throw new Error(`${entityType} with id ${entityId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Update entity's ai vector column in PostgreSQL
   */
  private async updateEntityVector(
    entityType: string,
    entityId: string,
    vector: number[]
  ): Promise<void> {
    let tableName: string;

    switch (entityType) {
      case 'node':
        tableName = 'Nodes';
        break;
      case 'edge':
        tableName = 'Edges';
        break;
      case 'nodeType':
        tableName = 'NodeTypes';
        break;
      case 'edgeType':
        tableName = 'EdgeTypes';
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    // Format vector for PostgreSQL vector type
    const vectorString = `[${vector.join(',')}]`;

    const query = `
      UPDATE public."${tableName}"
      SET ai = $1::vector,
          updated_at = NOW()
      WHERE id = $2
    `;

    await this.pool.query(query, [vectorString, entityId]);
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Database connection errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // OpenAI rate limit errors are retryable
    if (error.message && error.message.includes('rate limit')) {
      return true;
    }

    // OpenAI server errors are retryable
    if (error.status && error.status >= 500) {
      return true;
    }

    // Missing entity is not retryable
    if (error.message && error.message.includes('not found')) {
      return false;
    }

    // Empty text is not retryable
    if (error.message && error.message.includes('No text content found')) {
      return false;
    }

    // Default to retryable
    return true;
  }

  /**
   * Graceful shutdown handler
   */
  private async shutdown(signal: string): Promise<void> {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    this.isShuttingDown = true;

    // Stop accepting new messages
    if (this.channel) {
      try {
        await this.channel.cancel(this.queueName);
      } catch (error: any) {
        console.error('Error cancelling consumer:', error.message);
      }
    }

    // Wait for in-flight messages to complete
    console.log(`Waiting for ${this.processingCount} in-flight jobs to complete...`);
    const maxWaitTime = 30000; // 30 seconds
    const startWait = Date.now();

    while (this.processingCount > 0 && Date.now() - startWait < maxWaitTime) {
      await this.sleep(100);
    }

    if (this.processingCount > 0) {
      console.warn(`Forced shutdown with ${this.processingCount} jobs still processing`);
    }

    // Close RabbitMQ connection
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }

    // Close database pool
    await this.pool.end();

    console.log('✓ Shutdown complete');
    process.exit(0);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start worker if this file is executed directly
if (require.main === module) {
  const worker = new VectorizationWorker();

  worker.start().catch((error) => {
    console.error('Fatal error starting worker:', error);
    process.exit(1);
  });
}

export default VectorizationWorker;
