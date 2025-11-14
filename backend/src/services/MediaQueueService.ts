import { connect, ChannelModel, Channel } from 'amqplib';
import { config } from '../config';
import Redis from 'ioredis';

/**
 * MediaQueueService
 *
 * Manages RabbitMQ connections and message publishing for the media processing pipeline.
 * This service is used by GraphQL resolvers to enqueue media processing jobs (document, audio, video)
 * when files are uploaded.
 *
 * Features:
 * - Singleton pattern for connection pooling
 * - Automatic reconnection on connection loss
 * - Persistent message delivery
 * - Redis status tracking
 * - Priority queuing support
 * - Error handling and logging
 */

export interface MediaProcessingJob {
  fileId: string;
  processingType: 'document' | 'audio' | 'video';
  options: {
    // Document options
    extractTables?: boolean;
    extractFigures?: boolean;
    extractSections?: boolean;
    outputFormat?: 'text' | 'markdown' | 'json';

    // Audio options
    transcribe?: boolean;
    language?: string;
    speakerDiarization?: boolean;

    // Video options
    extractFrames?: boolean;
    extractAudio?: boolean;
    detectScenes?: boolean;
    generateThumbnail?: boolean;
  };
  priority?: number; // 1-10, higher = more urgent
  timestamp: string;
  retryCount?: number;
}

export interface JobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  error?: string;
  startedAt?: string;
  completedAt?: string;
  processingTimeMs?: number;
}

export class MediaQueueService {
  private static instance: MediaQueueService;
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting: boolean = false;
  private queueName: string;
  private redis: Redis;

  private constructor() {
    this.queueName = process.env.MEDIA_QUEUE_NAME || 'media_processing_queue';

    // Initialize Redis for status tracking
    const redisUrl = config.redis.url || `redis://${config.redis.host}:${config.redis.port}`;
    this.redis = new Redis(redisUrl);

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error.message);
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MediaQueueService {
    if (!MediaQueueService.instance) {
      MediaQueueService.instance = new MediaQueueService();
    }
    return MediaQueueService.instance;
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
      console.log('Connecting to RabbitMQ (Media Queue)...');
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

      // Assert queue exists with priority support
      await this.channel.assertQueue(this.queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours
          'x-max-length': 10000,
          'x-max-priority': 10, // Enable priority queue
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
   * Enqueue a media processing job
   */
  async enqueueMediaProcessing(
    fileId: string,
    processingType: 'document' | 'audio' | 'video',
    options: MediaProcessingJob['options'] = {},
    priority: number = 5
  ): Promise<void> {
    // Ensure we're connected
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('Failed to establish RabbitMQ channel');
    }

    const job: MediaProcessingJob = {
      fileId,
      processingType,
      options,
      priority: Math.max(1, Math.min(10, priority)), // Clamp between 1-10
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    try {
      const message = Buffer.from(JSON.stringify(job));

      const sent = this.channel.sendToQueue(this.queueName, message, {
        persistent: true, // Message survives broker restart
        contentType: 'application/json',
        priority: job.priority,
      });

      if (sent) {
        console.log(`Enqueued ${processingType} processing job: ${fileId} (priority: ${job.priority})`);

        // Track job status in Redis
        await this.updateJobStatus(fileId, {
          status: 'queued',
          progress: 0,
        });
      } else {
        console.warn(`Queue full, message buffered: ${fileId}`);
      }
    } catch (error: any) {
      console.error(`Failed to enqueue media processing job:`, error.message);

      // Update status to failed
      await this.updateJobStatus(fileId, {
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Update job status in Redis
   */
  async updateJobStatus(fileId: string, status: Partial<JobStatus>): Promise<void> {
    try {
      const key = `media:job:${fileId}`;

      // Get existing status
      const existing = await this.redis.get(key);
      const currentStatus: JobStatus = existing
        ? JSON.parse(existing)
        : { status: 'queued' };

      // Merge with new status
      const updatedStatus: JobStatus = {
        ...currentStatus,
        ...status,
      };

      // Store with 24 hour expiry
      await this.redis.setex(key, 86400, JSON.stringify(updatedStatus));

      console.log(`Updated job status for ${fileId}: ${updatedStatus.status}`);
    } catch (error: any) {
      console.error(`Failed to update job status in Redis:`, error.message);
    }
  }

  /**
   * Get job status from Redis
   */
  async getJobStatus(fileId: string): Promise<JobStatus | null> {
    try {
      const key = `media:job:${fileId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error: any) {
      console.error(`Failed to get job status from Redis:`, error.message);
      return null;
    }
  }

  /**
   * Delete job status from Redis
   */
  async deleteJobStatus(fileId: string): Promise<void> {
    try {
      const key = `media:job:${fileId}`;
      await this.redis.del(key);
    } catch (error: any) {
      console.error(`Failed to delete job status from Redis:`, error.message);
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats(): Promise<{
    queueLength: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
  }> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('Failed to establish RabbitMQ channel');
      }

      const queueInfo = await this.channel.checkQueue(this.queueName);

      // Get counts from Redis
      const keys = await this.redis.keys('media:job:*');
      let processingCount = 0;
      let completedCount = 0;
      let failedCount = 0;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const status: JobStatus = JSON.parse(data);
          if (status.status === 'processing') processingCount++;
          if (status.status === 'completed') completedCount++;
          if (status.status === 'failed') failedCount++;
        }
      }

      return {
        queueLength: queueInfo.messageCount,
        processingCount,
        completedCount,
        failedCount,
      };
    } catch (error: any) {
      console.error('Failed to get queue stats:', error.message);
      return {
        queueLength: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
      };
    }
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

    await this.redis.quit();

    console.log('Media queue connection closed');
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
export const mediaQueueService = MediaQueueService.getInstance();
