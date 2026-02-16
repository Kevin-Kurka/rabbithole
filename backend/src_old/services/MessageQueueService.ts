/**
 * MessageQueueService
 *
 * Manages RabbitMQ connection and provides methods for publishing and consuming
 * vectorization jobs. Implements robust error handling, automatic reconnection,
 * and graceful shutdown.
 */

import { connect, ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { VectorizationJob } from '../types/vectorization';
import {
  RABBITMQ_URL,
  VECTORIZATION_QUEUE_NAME,
  RABBITMQ_RETRY_CONFIG,
  QUEUE_OPTIONS,
  CONSUMER_OPTIONS,
} from '../config/rabbitmq';

/**
 * Service for managing message queue operations for vectorization pipeline
 */
export class MessageQueueService {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;
  private retryCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  /**
   * Establishes connection to RabbitMQ and creates a channel
   *
   * @throws Error if connection fails after maximum retries
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      console.log('Connection attempt already in progress...');
      return;
    }

    if (this.connection && this.channel) {
      console.log('Already connected to RabbitMQ');
      return;
    }

    this.isConnecting = true;

    try {
      console.log(`Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
      this.connection = await connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Assert queue exists with proper configuration
      await this.channel.assertQueue(VECTORIZATION_QUEUE_NAME, QUEUE_OPTIONS);

      // Set prefetch count for fair dispatch
      await this.channel.prefetch(CONSUMER_OPTIONS.prefetch);

      console.log(`Successfully connected to RabbitMQ and queue: ${VECTORIZATION_QUEUE_NAME}`);

      // Reset retry count on successful connection
      this.retryCount = 0;

      // Setup connection error handlers
      this.setupConnectionHandlers();
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      this.connection = null;
      this.channel = null;

      if (this.retryCount < RABBITMQ_RETRY_CONFIG.maxRetries && !this.isShuttingDown) {
        await this.scheduleReconnect();
      } else {
        throw new Error(
          `Failed to connect to RabbitMQ after ${RABBITMQ_RETRY_CONFIG.maxRetries} attempts`
        );
      }
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Setup handlers for connection errors and close events
   */
  private setupConnectionHandlers(): void {
    if (this.connection) {
      this.connection.on('error', (error) => {
        console.error('RabbitMQ connection error:', error);
        if (!this.isShuttingDown) {
          this.handleConnectionLoss();
        }
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
        if (!this.isShuttingDown) {
          this.handleConnectionLoss();
        }
      });
    }

    if (this.channel) {
      this.channel.on('error', (error) => {
        console.error('RabbitMQ channel error:', error);
      });

      this.channel.on('close', () => {
        console.log('RabbitMQ channel closed');
      });
    }
  }

  /**
   * Handle connection loss and trigger reconnection
   */
  private handleConnectionLoss(): void {
    this.connection = null;
    this.channel = null;

    if (!this.isShuttingDown && this.retryCount < RABBITMQ_RETRY_CONFIG.maxRetries) {
      console.log('Connection lost, attempting to reconnect...');
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectTimer) {
      return; // Reconnection already scheduled
    }

    this.retryCount++;
    const delay = Math.min(
      RABBITMQ_RETRY_CONFIG.retryDelayMs * Math.pow(2, this.retryCount - 1),
      RABBITMQ_RETRY_CONFIG.maxRetryDelayMs
    );

    console.log(`Scheduling reconnection attempt ${this.retryCount} in ${delay}ms...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
      }
    }, delay);
  }

  /**
   * Publishes a vectorization job to the queue
   *
   * @param entityType - Type of entity ('node' or 'edge')
   * @param entityId - Unique identifier of the entity
   * @param content - Content to be vectorized
   * @throws Error if not connected or publishing fails
   */
  async publishVectorizationJob(
    entityType: 'node' | 'edge',
    entityId: string,
    content: string
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ. Call connect() first.');
    }

    const job: VectorizationJob = {
      entityType,
      entityId,
      content,
      timestamp: Date.now(),
    };

    try {
      const message = Buffer.from(JSON.stringify(job));
      const published = this.channel.sendToQueue(
        VECTORIZATION_QUEUE_NAME,
        message,
        {
          persistent: true, // Survive broker restart
          contentType: 'application/json',
        }
      );

      if (!published) {
        console.warn('Message queue is full, waiting for drain...');
        await new Promise<void>((resolve) => {
          this.channel!.once('drain', () => resolve());
        });
      }

      console.log(
        `Published vectorization job for ${entityType} ${entityId} (${content.length} chars)`
      );
    } catch (error) {
      console.error('Failed to publish vectorization job:', error);
      throw new Error(`Failed to publish vectorization job: ${error}`);
    }
  }

  /**
   * Subscribes to vectorization jobs and processes them with the provided handler
   *
   * @param handler - Async function to process each job
   * @throws Error if not connected or subscription fails
   */
  async subscribeToVectorizationJobs(
    handler: (job: VectorizationJob) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ. Call connect() first.');
    }

    try {
      console.log(`Subscribing to queue: ${VECTORIZATION_QUEUE_NAME}`);

      await this.channel.consume(
        VECTORIZATION_QUEUE_NAME,
        async (message: ConsumeMessage | null) => {
          if (!message) {
            console.log('Consumer cancelled by server');
            return;
          }

          let job: VectorizationJob;

          try {
            // Parse job from message
            job = JSON.parse(message.content.toString());
            console.log(
              `Processing vectorization job for ${job.entityType} ${job.entityId}`
            );

            // Process job with provided handler
            await handler(job);

            // Acknowledge successful processing
            this.channel?.ack(message);
            console.log(
              `Successfully processed and acknowledged job for ${job.entityType} ${job.entityId}`
            );
          } catch (error) {
            console.error('Error processing vectorization job:', error);

            // Reject and requeue the message if processing fails
            // Set requeue to false if you want to move to dead letter queue after retries
            this.channel?.nack(message, false, true);
            console.log('Message rejected and requeued for retry');
          }
        },
        {
          noAck: CONSUMER_OPTIONS.noAck,
        }
      );

      console.log('Successfully subscribed to vectorization jobs');
    } catch (error) {
      console.error('Failed to subscribe to vectorization jobs:', error);
      throw new Error(`Failed to subscribe to vectorization jobs: ${error}`);
    }
  }

  /**
   * Gracefully closes the connection to RabbitMQ
   */
  async disconnect(): Promise<void> {
    this.isShuttingDown = true;

    // Clear any pending reconnection timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      console.log('Closing RabbitMQ connection...');

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      console.log('RabbitMQ connection closed successfully');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
      // Force cleanup even if close fails
      this.channel = null;
      this.connection = null;
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Checks if the service is currently connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  /**
   * Gets the current connection status
   */
  getStatus(): {
    connected: boolean;
    connecting: boolean;
    retryCount: number;
    shuttingDown: boolean;
  } {
    return {
      connected: this.isConnected(),
      connecting: this.isConnecting,
      retryCount: this.retryCount,
      shuttingDown: this.isShuttingDown,
    };
  }
}

// Export singleton instance
export const messageQueueService = new MessageQueueService();
