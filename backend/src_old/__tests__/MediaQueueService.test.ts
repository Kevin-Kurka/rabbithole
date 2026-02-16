import { MediaQueueService, MediaProcessingJob, JobStatus } from '../services/MediaQueueService';

// Mock amqplib - need to define mocks inline to avoid reference errors
jest.mock('amqplib', () => {
  const mockChannel = {
    assertQueue: jest.fn().mockResolvedValue({}),
    sendToQueue: jest.fn().mockReturnValue(true),
    checkQueue: jest.fn().mockResolvedValue({ messageCount: 5 }),
    close: jest.fn().mockResolvedValue(undefined)
  };

  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  };

  return {
    connect: jest.fn().mockResolvedValue(mockConnection),
    __mockChannel: mockChannel,
    __mockConnection: mockConnection
  };
});

// Mock ioredis - need to define inline
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null), // Default: no existing status
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK')
  };

  const RedisMock = jest.fn().mockImplementation(() => mockRedis);
  (RedisMock as any).__mockRedis = mockRedis;
  return RedisMock;
});

// Mock config
jest.mock('../config', () => ({
  config: {
    rabbitmq: {
      url: 'amqp://localhost:5672'
    },
    redis: {
      host: 'localhost',
      port: 6379,
      url: 'redis://localhost:6379'
    }
  }
}));

describe('MediaQueueService', () => {
  let service: MediaQueueService;
  let mockChannel: any;
  let mockConnection: any;
  let mockRedis: any;

  beforeEach(() => {
    // Get mock references
    const amqplib = require('amqplib');
    mockChannel = amqplib.__mockChannel;
    mockConnection = amqplib.__mockConnection;

    const Redis = require('ioredis');
    mockRedis = (Redis as any).__mockRedis;

    // Clear singleton instance
    (MediaQueueService as any).instance = null;

    // Get fresh instance
    service = MediaQueueService.getInstance();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Close connections
    try {
      await service.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // ============================================================================
  // getInstance() - Singleton pattern
  // ============================================================================

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const instance1 = MediaQueueService.getInstance();
      const instance2 = MediaQueueService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create only one instance', () => {
      const instance1 = MediaQueueService.getInstance();
      const instance2 = MediaQueueService.getInstance();
      const instance3 = MediaQueueService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  // ============================================================================
  // connect() - Initialize RabbitMQ connection
  // ============================================================================

  describe('connect()', () => {
    it('should connect to RabbitMQ successfully', async () => {
      await service.connect();

      const { connect } = require('amqplib');
      expect(connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'media_processing_queue',
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-max-priority': 10
          })
        })
      );
    });

    it('should not reconnect if already connected', async () => {
      await service.connect();
      const { connect } = require('amqplib');
      const callCount = connect.mock.calls.length;

      await service.connect();

      expect(connect).toHaveBeenCalledTimes(callCount); // Should not increase
    });

    it('should register connection error handlers', async () => {
      await service.connect();

      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should throw error on connection failure', async () => {
      const { connect } = require('amqplib');
      connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(service.connect()).rejects.toThrow('Connection failed');
    });
  });

  // ============================================================================
  // enqueueMediaProcessing() - Enqueue jobs
  // ============================================================================

  describe('enqueueMediaProcessing()', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should enqueue document processing job', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await service.enqueueMediaProcessing(
        'file-123',
        'document',
        { extractTables: true, outputFormat: 'markdown' },
        7
      );

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'media_processing_queue',
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          contentType: 'application/json',
          priority: 7
        })
      );

      // Check message content
      const buffer = mockChannel.sendToQueue.mock.calls[0][1];
      const job: MediaProcessingJob = JSON.parse(buffer.toString());
      expect(job.fileId).toBe('file-123');
      expect(job.processingType).toBe('document');
      expect(job.options.extractTables).toBe(true);
      expect(job.priority).toBe(7);
    });

    it('should enqueue audio processing job with transcription', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await service.enqueueMediaProcessing(
        'audio-456',
        'audio',
        { transcribe: true, language: 'en', speakerDiarization: true },
        9
      );

      const buffer = mockChannel.sendToQueue.mock.calls[0][1];
      const job: MediaProcessingJob = JSON.parse(buffer.toString());
      expect(job.processingType).toBe('audio');
      expect(job.options.transcribe).toBe(true);
      expect(job.options.speakerDiarization).toBe(true);
      expect(job.priority).toBe(9);
    });

    it('should enqueue video processing job', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await service.enqueueMediaProcessing(
        'video-789',
        'video',
        { extractFrames: true, detectObjects: true, frameRate: 1, maxFrames: 300 },
        5
      );

      const buffer = mockChannel.sendToQueue.mock.calls[0][1];
      const job: MediaProcessingJob = JSON.parse(buffer.toString());
      expect(job.processingType).toBe('video');
      expect(job.options.extractFrames).toBe(true);
      expect(job.options.detectObjects).toBe(true);
    });

    it('should clamp priority to 1-10 range', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      // Test upper bound
      await service.enqueueMediaProcessing('file-1', 'document', {}, 15);
      let buffer = mockChannel.sendToQueue.mock.calls[0][1];
      let job = JSON.parse(buffer.toString());
      expect(job.priority).toBe(10);

      // Test lower bound
      await service.enqueueMediaProcessing('file-2', 'document', {}, -5);
      buffer = mockChannel.sendToQueue.mock.calls[1][1];
      job = JSON.parse(buffer.toString());
      expect(job.priority).toBe(1);
    });

    it('should update job status to queued in Redis', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await service.enqueueMediaProcessing('file-123', 'document', {}, 5);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'media:job:file-123',
        86400,
        expect.stringContaining('"status":"queued"')
      );
    });

    it('should connect before enqueueing if not connected', async () => {
      // Create new service instance without connecting
      (MediaQueueService as any).instance = null;
      const newService = MediaQueueService.getInstance();

      mockRedis.get.mockResolvedValueOnce(null);

      await newService.enqueueMediaProcessing('file-123', 'document', {}, 5);

      const { connect } = require('amqplib');
      expect(connect).toHaveBeenCalled();
      expect(mockChannel.sendToQueue).toHaveBeenCalled();
    });

    it('should handle queue full scenario', async () => {
      mockChannel.sendToQueue.mockReturnValueOnce(false); // Queue full
      mockRedis.get.mockResolvedValueOnce(null);

      // Should not throw, just log warning
      await service.enqueueMediaProcessing('file-123', 'document', {}, 5);

      expect(mockChannel.sendToQueue).toHaveBeenCalled();
    });

    it('should mark job as failed on enqueue error', async () => {
      mockChannel.sendToQueue.mockImplementationOnce(() => {
        throw new Error('Send failed');
      });
      mockRedis.get.mockResolvedValueOnce(null);

      await expect(
        service.enqueueMediaProcessing('file-123', 'document', {}, 5)
      ).rejects.toThrow('Send failed');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'media:job:file-123',
        86400,
        expect.stringContaining('"status":"failed"')
      );
    });
  });

  // ============================================================================
  // updateJobStatus() - Update status in Redis
  // ============================================================================

  describe('updateJobStatus()', () => {
    it('should create new job status', async () => {
      mockRedis.get.mockResolvedValueOnce(null); // No existing status

      await service.updateJobStatus('file-123', {
        status: 'processing',
        progress: 25
      });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'media:job:file-123',
        86400,
        expect.stringContaining('"status":"processing"')
      );

      const savedData = JSON.parse(mockRedis.setex.mock.calls[0][2]);
      expect(savedData.status).toBe('processing');
      expect(savedData.progress).toBe(25);
    });

    it('should merge with existing job status', async () => {
      const existingStatus = JSON.stringify({
        status: 'processing',
        progress: 50,
        startedAt: '2025-01-01T00:00:00Z'
      });

      // Override default mock for this specific test
      mockRedis.get
        .mockReset() // Clear previous implementation
        .mockResolvedValueOnce(existingStatus); // Set new value

      await service.updateJobStatus('file-123', {
        progress: 75
      });

      // Check the result
      const calls = mockRedis.setex.mock.calls.filter((call: any[]) =>
        call[0] === 'media:job:file-123'
      );
      expect(calls.length).toBeGreaterThan(0);
      const savedData = JSON.parse(calls[calls.length - 1][2]);
      expect(savedData.status).toBe('processing'); // Preserved
      expect(savedData.progress).toBe(75); // Updated
      expect(savedData.startedAt).toBe('2025-01-01T00:00:00Z'); // Preserved
    });

    it('should update status to completed with timing', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ status: 'processing' }));

      await service.updateJobStatus('file-123', {
        status: 'completed',
        progress: 100,
        completedAt: '2025-01-01T00:05:00Z',
        processingTimeMs: 300000
      });

      const savedData = JSON.parse(mockRedis.setex.mock.calls[0][2]);
      expect(savedData.status).toBe('completed');
      expect(savedData.processingTimeMs).toBe(300000);
    });

    it('should update status to failed with error', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      await service.updateJobStatus('file-123', {
        status: 'failed',
        error: 'File not found'
      });

      const savedData = JSON.parse(mockRedis.setex.mock.calls[0][2]);
      expect(savedData.status).toBe('failed');
      expect(savedData.error).toBe('File not found');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw
      await expect(
        service.updateJobStatus('file-123', { status: 'processing' })
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // getJobStatus() - Get status from Redis
  // ============================================================================

  describe('getJobStatus()', () => {
    it('should get job status from Redis', async () => {
      const mockStatus: JobStatus = {
        status: 'processing',
        progress: 60,
        startedAt: '2025-01-01T00:00:00Z'
      };
      mockRedis.get.mockReset().mockResolvedValue(JSON.stringify(mockStatus));

      const result = await service.getJobStatus('file-123');

      expect(result).toEqual(mockStatus);
      expect(mockRedis.get).toHaveBeenCalledWith('media:job:file-123');
    });

    it('should return null when status not found', async () => {
      mockRedis.get.mockReset().mockResolvedValue(null);

      const result = await service.getJobStatus('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle Redis errors and return null', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.getJobStatus('file-123');

      expect(result).toBeNull();
    });

    it('should parse JSON status correctly', async () => {
      const complexStatus: JobStatus = {
        status: 'completed',
        progress: 100,
        startedAt: '2025-01-01T00:00:00Z',
        completedAt: '2025-01-01T00:05:00Z',
        processingTimeMs: 300000
      };
      mockRedis.get.mockReset().mockResolvedValue(JSON.stringify(complexStatus));

      const result = await service.getJobStatus('file-123');

      expect(result).toEqual(complexStatus);
      expect(result?.processingTimeMs).toBe(300000);
    });
  });

  // ============================================================================
  // deleteJobStatus() - Delete status from Redis
  // ============================================================================

  describe('deleteJobStatus()', () => {
    it('should delete job status from Redis', async () => {
      await service.deleteJobStatus('file-123');

      expect(mockRedis.del).toHaveBeenCalledWith('media:job:file-123');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw
      await expect(
        service.deleteJobStatus('file-123')
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // getQueueStats() - Get queue statistics
  // ============================================================================

  describe('getQueueStats()', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should get queue stats from RabbitMQ and Redis', async () => {
      mockChannel.checkQueue.mockResolvedValueOnce({ messageCount: 8 });

      mockRedis.keys.mockResolvedValueOnce([
        'media:job:file-1',
        'media:job:file-2',
        'media:job:file-3',
        'media:job:file-4'
      ]);

      mockRedis.get.mockReset();
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({ status: 'processing' }))
        .mockResolvedValueOnce(JSON.stringify({ status: 'completed' }))
        .mockResolvedValueOnce(JSON.stringify({ status: 'failed' }))
        .mockResolvedValueOnce(JSON.stringify({ status: 'processing' }));

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        queueLength: 8,
        processingCount: 2,
        completedCount: 1,
        failedCount: 1
      });
    });

    it('should return zero stats on error', async () => {
      mockChannel.checkQueue.mockRejectedValueOnce(new Error('Channel error'));

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        queueLength: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0
      });
    });

    it('should handle empty queue', async () => {
      mockChannel.checkQueue.mockResolvedValueOnce({ messageCount: 0 });
      mockRedis.keys.mockResolvedValueOnce([]);

      const stats = await service.getQueueStats();

      expect(stats.queueLength).toBe(0);
      expect(stats.processingCount).toBe(0);
    });

    it('should connect before getting stats if not connected', async () => {
      // Create new service instance without connecting
      (MediaQueueService as any).instance = null;
      const newService = MediaQueueService.getInstance();

      mockChannel.checkQueue.mockResolvedValueOnce({ messageCount: 5 });
      mockRedis.keys.mockResolvedValueOnce([]);

      await newService.getQueueStats();

      const { connect } = require('amqplib');
      expect(connect).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // isConnected() - Check connection status
  // ============================================================================

  describe('isConnected()', () => {
    it('should return false when not connected', () => {
      const result = service.isConnected();

      expect(result).toBe(false);
    });

    it('should return true after successful connection', async () => {
      await service.connect();

      const result = service.isConnected();

      expect(result).toBe(true);
    });

    it('should return false after close', async () => {
      await service.connect();
      await service.close();

      const result = service.isConnected();

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // close() - Graceful shutdown
  // ============================================================================

  describe('close()', () => {
    it('should close channel and connection', async () => {
      await service.connect();
      await service.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle close when not connected', async () => {
      // Should not throw
      await expect(service.close()).resolves.not.toThrow();
    });

    it('should set connection and channel to null', async () => {
      await service.connect();
      await service.close();

      expect(service.isConnected()).toBe(false);
    });
  });
});
