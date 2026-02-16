import { connect, ChannelModel, Channel } from 'amqplib';
import { config } from '../config';

/**
 * QueueService
 *
 * Manages RabbitMQ connections and message publishing for the vectorization pipeline.
 * This service is used by GraphQL resolvers to enqueue vectorization jobs when
 * nodes or edges are created/updated.
 *
 * Features:
 * - Singleton pattern for connection pooling
 * - Automatic reconnection on connection loss
 * - Persistent message delivery
 * - Error handling and logging
 */

interface VectorizationJob {
  entityType: 'node' | 'edge' | 'nodeType' | 'edgeType';
  entityId: string;
  timestamp: string;
  retryCount?: number;
}

export class QueueService {
  private static instance: QueueService;
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting: boolean = false;
  private queueName: string;

  private constructor() {
    this.queueName = config.rabbitmq.queueName;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Initialize connection to RabbitMQ
   */
  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return; // Already connected
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      await this.waitForConnection();
      return;
    }

    this.isConnecting = true;

    try {
      console.log('Connecting to RabbitMQ...');
      this.connection = await connect(config.rabbitmq.url);

      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err.message);
        this.reconnect();
      });

      this.connection.on('close', () => {
        console.warn('RabbitMQ connection closed. Reconnecting...');
        this.reconnect();
      });

      // Create channel
      this.channel = await this.connection.createChannel();

      // Assert queue exists
      await this.channel.assertQueue(this.queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours
          'x-max-length': 10000,
        },
      });

      console.log(`✓ Connected to RabbitMQ (queue: ${this.queueName})`);
    } catch (error: any) {
      console.error('Failed to connect to RabbitMQ:', error.message);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Reconnect to RabbitMQ after connection loss
   */
  private async reconnect(): Promise<void> {
    this.connection = null;
    this.channel = null;

    // Wait before reconnecting
    await this.sleep(5000);

    try {
      await this.connect();
    } catch (error: any) {
      console.error('Reconnection failed:', error.message);
      setTimeout(() => this.reconnect(), 10000);
    }
  }

  /**
   * Wait for ongoing connection attempt to complete
   */
  private async waitForConnection(maxWait: number = 10000): Promise<void> {
    const startTime = Date.now();
    while (this.isConnecting && Date.now() - startTime < maxWait) {
      await this.sleep(100);
    }
  }

  /**
   * Publish a vectorization job to the queue
   */
  async enqueueVectorizationJob(
    entityType: 'node' | 'edge' | 'nodeType' | 'edgeType',
    entityId: string
  ): Promise<void> {
    // Ensure we're connected
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('Failed to establish RabbitMQ channel');
    }

    const job: VectorizationJob = {
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    try {
      const message = Buffer.from(JSON.stringify(job));

      const sent = this.channel.sendToQueue(this.queueName, message, {
        persistent: true, // Message survives broker restart
        contentType: 'application/json',
      });

      if (sent) {
        console.log(`Enqueued vectorization job: ${entityType} ${entityId}`);
      } else {
        console.warn(`Queue full, message buffered: ${entityType} ${entityId}`);
      }
    } catch (error: any) {
      console.error(`Failed to enqueue vectorization job:`, error.message);
      throw error;
    }
  }

  /**
   * Publish multiple vectorization jobs in batch
   */
  async enqueueVectorizationJobs(
    jobs: Array<{ entityType: 'node' | 'edge' | 'nodeType' | 'edgeType'; entityId: string }>
  ): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('Failed to establish RabbitMQ channel');
    }

    console.log(`Enqueuing ${jobs.length} vectorization jobs...`);

    for (const job of jobs) {
      try {
        await this.enqueueVectorizationJob(job.entityType, job.entityId);
      } catch (error: any) {
        console.error(`Failed to enqueue job for ${job.entityType} ${job.entityId}:`, error.message);
        // Continue with next job
      }
    }

    console.log(`✓ Enqueued ${jobs.length} jobs`);
  }

  /**
   * Close connection (for graceful shutdown)
   */
  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }

    console.log('RabbitMQ connection closed');
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const queueService = QueueService.getInstance();
