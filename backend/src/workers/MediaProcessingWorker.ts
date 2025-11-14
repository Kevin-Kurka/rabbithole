import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { connect, ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { Pool } from 'pg';
import { config } from '../config';
import { doclingService } from '../services/DoclingProcessingService';
import { audioTranscriptionService } from '../services/AudioTranscriptionService';
import { videoAnalysisService } from '../services/VideoAnalysisService';
import { mediaQueueService, MediaProcessingJob } from '../services/MediaQueueService';

/**
 * MediaProcessingWorker
 *
 * A background worker service that processes media files from RabbitMQ.
 * This worker listens for messages containing file IDs and processing types,
 * routes them to the appropriate service (Docling, Audio, Video), and updates
 * the database with processing results.
 *
 * Architecture:
 * 1. Consumes messages from RabbitMQ queue (media_processing_queue)
 * 2. Fetches file data from PostgreSQL
 * 3. Routes to appropriate processing service based on type
 * 4. Writes processing results back to database
 * 5. Updates job status in Redis
 * 6. Acknowledges message or requeues on failure
 *
 * Features:
 * - Automatic reconnection to RabbitMQ and PostgreSQL
 * - Configurable retry logic with exponential backoff
 * - Graceful shutdown handling
 * - Comprehensive error logging
 * - Progress tracking via Redis
 * - Priority queue support
 */

export class MediaProcessingWorker {
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

    this.queueName = process.env.MEDIA_QUEUE_NAME || 'media_processing_queue';
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
    console.log('🚀 Starting Media Processing Worker...');

    // Verify database connection
    await this.verifyDatabaseConnection();

    // Verify processing services
    await this.verifyProcessingServices();

    // Connect to RabbitMQ
    await this.connectToRabbitMQ();

    // Start consuming messages
    await this.consumeMessages();

    console.log('✓ Media Processing Worker is running');
    console.log(`  Queue: ${this.queueName}`);
    console.log(`  Database: ${config.database.url.replace(/:([^@]+)@/, ':***@')}`);
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
   * Verify processing services are available
   */
  private async verifyProcessingServices(): Promise<void> {
    console.log('Checking processing services...');

    // Check Docling
    const doclingAvailable = await doclingService.healthCheck();
    if (doclingAvailable) {
      console.log('✓ Docling service available');
    } else {
      console.warn('⚠ Docling service unavailable - document processing will fail');
    }

    // Check FFmpeg (for audio/video)
    const ffmpegAvailable = await videoAnalysisService.healthCheck();
    if (ffmpegAvailable) {
      console.log('✓ FFmpeg available for audio/video processing');
    } else {
      console.warn('⚠ FFmpeg unavailable - audio/video processing will fail');
    }

    console.log('✓ Service verification complete');
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
          'x-max-priority': 10, // Priority queue support
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
   * Process a single media processing job message
   */
  private async processMessage(message: ConsumeMessage): Promise<void> {
    this.processingCount++;
    const startTime = Date.now();

    try {
      // Parse message content
      const job: MediaProcessingJob = JSON.parse(message.content.toString());
      const retryCount = job.retryCount || 0;

      console.log(
        `[${new Date().toISOString()}] Processing ${job.processingType} file ${job.fileId} ` +
        `(priority: ${job.priority}, retry: ${retryCount})`
      );

      // Update status to processing
      await mediaQueueService.updateJobStatus(job.fileId, {
        status: 'processing',
        progress: 0,
        startedAt: new Date().toISOString(),
      });

      // Fetch file data from database
      const fileData = await this.fetchFileData(job.fileId);

      // Get file path from storage
      const storagePath = process.env.LOCAL_STORAGE_PATH || './uploads';
      const filePath = `${storagePath}/${fileData.storage_key}`;

      // Route to appropriate processing service
      let result: any;
      switch (job.processingType) {
        case 'document':
          result = await this.processDocument(job, fileData, filePath);
          break;
        case 'audio':
          result = await this.processAudio(job, fileData, filePath);
          break;
        case 'video':
          result = await this.processVideo(job, fileData, filePath);
          break;
        default:
          throw new Error(`Unknown processing type: ${job.processingType}`);
      }

      // Update database with results
      await this.updateFileRecord(job.fileId, result);

      // Update status to completed
      const processingTimeMs = Date.now() - startTime;
      await mediaQueueService.updateJobStatus(job.fileId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
        processingTimeMs,
      });

      // Acknowledge successful processing
      this.channel?.ack(message);

      console.log(
        `✓ Completed ${job.processingType} processing for ${job.fileId} in ${processingTimeMs}ms`
      );

    } catch (error: any) {
      console.error(`✗ Failed to process message:`, error.message);

      // Update status to failed
      await mediaQueueService.updateJobStatus(
        JSON.parse(message.content.toString()).fileId,
        {
          status: 'failed',
          error: error.message,
          completedAt: new Date().toISOString(),
        }
      );

      // Determine if we should retry
      const job: MediaProcessingJob = JSON.parse(message.content.toString());
      const retryCount = (job.retryCount || 0) + 1;

      if (retryCount <= this.maxRetries && this.isRetryableError(error)) {
        console.log(`Requeuing message (retry ${retryCount}/${this.maxRetries})...`);

        // Republish message with incremented retry count
        job.retryCount = retryCount;

        if (this.channel) {
          await this.channel.sendToQueue(
            this.queueName,
            Buffer.from(JSON.stringify(job)),
            { persistent: true, priority: job.priority }
          );
        }

        // Acknowledge original message
        this.channel?.ack(message);
      } else {
        // Max retries exhausted or non-retryable error
        console.error(
          `Max retries exhausted for ${job.fileId}. Discarding message.`
        );

        // Acknowledge to prevent infinite requeue
        this.channel?.ack(message);
      }
    } finally {
      this.processingCount--;
    }
  }

  /**
   * Fetch file data from PostgreSQL
   */
  private async fetchFileData(fileId: string): Promise<any> {
    const query = `
      SELECT ef.*, e.id as evidence_id
      FROM public."EvidenceFiles" ef
      LEFT JOIN public."Evidence" e ON ef.evidence_id = e.id
      WHERE ef.id = $1 AND ef.deleted_at IS NULL
    `;

    const result = await this.pool.query(query, [fileId]);

    if (result.rows.length === 0) {
      throw new Error(`File with id ${fileId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Process document file
   */
  private async processDocument(job: MediaProcessingJob, fileData: any, filePath: string): Promise<any> {
    console.log(`Processing document: ${fileData.original_filename}`);

    const result = await doclingService.processDocument(filePath, {
      extractTables: job.options.extractTables !== false,
      extractFigures: job.options.extractFigures !== false,
      extractSections: job.options.extractSections !== false,
      outputFormat: job.options.outputFormat || 'markdown',
    });

    if (!result.success) {
      throw new Error(result.error || 'Document processing failed');
    }

    return {
      type: 'document',
      extracted_text: result.text,
      markdown_content: result.markdown,
      page_count: result.pageCount,
      tables: result.tables,
      figures: result.figures,
      sections: result.sections,
      metadata: result.metadata,
      processing_service: 'docling',
      processing_time_ms: result.processingTime,
    };
  }

  /**
   * Process audio file
   */
  private async processAudio(job: MediaProcessingJob, fileData: any, filePath: string): Promise<any> {
    console.log(`Processing audio: ${fileData.original_filename}`);

    const result = await audioTranscriptionService.transcribeAudio(filePath, {
      language: job.options.language,
      speakerDiarization: job.options.speakerDiarization,
      timestamps: true,
    });

    if (!result.success) {
      throw new Error(result.error || 'Audio transcription failed');
    }

    return {
      type: 'audio',
      extracted_text: result.text,
      transcript: result.text,
      language: result.language,
      duration_seconds: result.duration,
      segments: result.segments,
      speakers: result.speakers,
      confidence: result.confidence,
      processing_service: 'whisper',
      processing_time_ms: result.processingTime,
    };
  }

  /**
   * Process video file
   */
  private async processVideo(job: MediaProcessingJob, fileData: any, filePath: string): Promise<any> {
    console.log(`Processing video: ${fileData.original_filename}`);

    const result = await videoAnalysisService.analyzeVideo(filePath, {
      extractFrames: job.options.extractFrames,
      detectScenes: job.options.detectScenes,
      generateThumbnail: job.options.generateThumbnail !== false,
      extractAudio: job.options.extractAudio,
    });

    if (!result.success) {
      throw new Error(result.error || 'Video analysis failed');
    }

    return {
      type: 'video',
      duration_seconds: result.duration,
      frame_rate: result.frameRate,
      resolution: result.resolution,
      codec: result.codec,
      frames: result.frames,
      scenes: result.scenes,
      thumbnail: result.thumbnail,
      has_audio: result.audioTrack,
      processing_service: 'ffmpeg',
      processing_time_ms: result.processingTime,
    };
  }

  /**
   * Update file record with processing results
   */
  private async updateFileRecord(fileId: string, result: any): Promise<void> {
    let query: string;
    let params: any[];

    if (result.type === 'document') {
      query = `
        UPDATE public."EvidenceFiles"
        SET extracted_text = $2,
            markdown_content = $3,
            page_count = $4,
            processing_service = $5,
            processing_time_ms = $6,
            document_title = $7,
            document_author = $8,
            processed_at = NOW(),
            processing_status = 'completed',
            updated_at = NOW()
        WHERE id = $1
      `;
      params = [
        fileId,
        result.extracted_text,
        result.markdown_content,
        result.page_count,
        result.processing_service,
        result.processing_time_ms,
        result.metadata?.title,
        result.metadata?.author,
      ];
    } else if (result.type === 'audio') {
      query = `
        UPDATE public."EvidenceFiles"
        SET extracted_text = $2,
            duration_seconds = $3,
            processing_service = $4,
            processing_time_ms = $5,
            processed_at = NOW(),
            processing_status = 'completed',
            updated_at = NOW()
        WHERE id = $1
      `;
      params = [
        fileId,
        result.extracted_text,
        result.duration_seconds,
        result.processing_service,
        result.processing_time_ms,
      ];
    } else if (result.type === 'video') {
      query = `
        UPDATE public."EvidenceFiles"
        SET duration_seconds = $2,
            dimensions = $3,
            thumbnail_storage_key = $4,
            processing_service = $5,
            processing_time_ms = $6,
            processed_at = NOW(),
            processing_status = 'completed',
            updated_at = NOW()
        WHERE id = $1
      `;
      params = [
        fileId,
        result.duration_seconds,
        result.resolution ? JSON.stringify(result.resolution) : null,
        result.thumbnail,
        result.processing_service,
        result.processing_time_ms,
      ];
    } else {
      throw new Error(`Unknown result type: ${result.type}`);
    }

    await this.pool.query(query, params);
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Database connection errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Service timeout errors are retryable
    if (error.message && error.message.includes('timeout')) {
      return true;
    }

    // Service unavailable errors are retryable
    if (error.message && error.message.includes('503')) {
      return true;
    }

    // Missing file is not retryable
    if (error.message && error.message.includes('not found')) {
      return false;
    }

    // Unsupported format is not retryable
    if (error.message && error.message.includes('not supported')) {
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
  const worker = new MediaProcessingWorker();

  worker.start().catch((error) => {
    console.error('Fatal error starting worker:', error);
    process.exit(1);
  });
}

export default MediaProcessingWorker;
