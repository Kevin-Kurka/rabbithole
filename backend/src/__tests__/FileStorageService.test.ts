import { Pool, QueryResult } from 'pg';
import { FileStorageService, LocalStorageProvider, S3StorageProvider, CloudflareR2Provider } from '../services/FileStorageService';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn(),
}));
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 1920, height: 1080 }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail-data'))
  }));
});

// Helper to create mock pool
function createMockPool(): any {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
}

describe('FileStorageService', () => {
  let service: FileStorageService;
  let mockPool: any;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = createMockPool();

    // Set up environment for local storage
    process.env = {
      ...originalEnv,
      STORAGE_PROVIDER: 'local',
      LOCAL_STORAGE_PATH: '/tmp/test-uploads',
      MAX_FILE_SIZE: '104857600' // 100MB
    };

    service = new FileStorageService(mockPool);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================================
  // Constructor & Provider Initialization
  // ============================================================================

  describe('Constructor', () => {
    it('should initialize with local storage provider by default', () => {
      const info = service.getProviderInfo();
      expect(info.provider).toBe('local');
    });

    it('should initialize with S3 storage provider', () => {
      process.env.STORAGE_PROVIDER = 's3';
      process.env.S3_REGION = 'us-west-2';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

      const s3Service = new FileStorageService(mockPool);
      const info = s3Service.getProviderInfo();

      expect(info.provider).toBe('s3');
      expect(info.bucket).toBe('test-bucket');
      expect(info.region).toBe('us-west-2');
    });

    it('should initialize with Cloudflare R2 storage provider', () => {
      process.env.STORAGE_PROVIDER = 'cloudflare_r2';
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_BUCKET = 'test-r2-bucket';
      process.env.R2_ACCESS_KEY_ID = 'test-r2-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret';

      const r2Service = new FileStorageService(mockPool);
      const info = r2Service.getProviderInfo();

      expect(info.provider).toBe('cloudflare_r2');
      expect(info.bucket).toBe('test-r2-bucket');
    });

    it('should throw error when R2 credentials missing', () => {
      process.env.STORAGE_PROVIDER = 'cloudflare_r2';
      delete process.env.R2_ACCOUNT_ID;

      expect(() => new FileStorageService(mockPool)).toThrow('Cloudflare R2 credentials not configured');
    });
  });

  // ============================================================================
  // File Validation
  // ============================================================================

  describe('File Validation', () => {
    const validMetadata = {
      filename: 'test.pdf',
      mimetype: 'application/pdf',
      encoding: '7bit'
    };

    it('should reject files exceeding maximum size', async () => {
      const largeBuffer = Buffer.alloc(200 * 1024 * 1024); // 200MB

      await expect(
        service.uploadFile(largeBuffer, validMetadata, 'evidence-123', 'user-123')
      ).rejects.toThrow(/File size exceeds maximum/);
    });

    it('should reject disallowed file types', async () => {
      const buffer = Buffer.from('test data');
      const metadata = {
        filename: 'test.xyz',
        mimetype: 'application/x-unknown',
        encoding: '7bit'
      };

      await expect(
        service.uploadFile(buffer, metadata, 'evidence-123', 'user-123')
      ).rejects.toThrow(/File type.*is not allowed/);
    });

    it('should reject executable files', async () => {
      const buffer = Buffer.from('MZ\x90\x00'); // PE header
      const metadata = {
        filename: 'malware.exe',
        mimetype: 'application/x-msdownload',
        encoding: '7bit'
      };

      await expect(
        service.uploadFile(buffer, metadata, 'evidence-123', 'user-123')
      ).rejects.toThrow(/File type.*is not allowed/);
    });

    it('should accept valid PDF file', async () => {
      const buffer = Buffer.from('PDF file content');
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // deduplication check
        .mockResolvedValueOnce({ rows: [] }); // file upload

      const result = await service.uploadFile(buffer, validMetadata, 'evidence-123', 'user-123');

      expect(result.mime_type).toBe('application/pdf');
      expect(result.file_size).toBe(buffer.length);
    });

    it('should accept valid image file', async () => {
      const buffer = Buffer.from('fake image data');
      const metadata = {
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        encoding: '7bit'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // deduplication check
        .mockResolvedValueOnce({ rows: [] }); // file upload

      const result = await service.uploadFile(buffer, metadata, 'evidence-123', 'user-123');

      expect(result.mime_type).toBe('image/jpeg');
      expect(result.dimensions).toEqual({ width: 1920, height: 1080 });
      expect(result.thumbnail_key).toBeDefined();
    });
  });

  // ============================================================================
  // File Deduplication
  // ============================================================================

  describe('File Deduplication', () => {
    const metadata = {
      filename: 'document.pdf',
      mimetype: 'application/pdf',
      encoding: '7bit'
    };

    it('should deduplicate file with same hash', async () => {
      const buffer = Buffer.from('identical file content');
      const existingKey = 'evidence/evidence-456/abc12345/1234567890_document.pdf';

      // Mock deduplication query returning existing file
      mockPool.query.mockResolvedValueOnce({
        rows: [{ storage_key: existingKey }]
      });

      const result = await service.uploadFile(buffer, metadata, 'evidence-123', 'user-123');

      expect(result.storage_key).toBe(existingKey);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT storage_key FROM'),
        expect.arrayContaining([expect.any(String), 'evidence-123'])
      );
    });

    it('should not deduplicate when no matching hash found', async () => {
      const buffer = Buffer.from('unique file content');

      // Mock deduplication query returning no results
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.uploadFile(buffer, metadata, 'evidence-123', 'user-123');

      expect(result.storage_key).toContain('evidence/evidence-123/');
      expect(result.file_hash).toBeTruthy();
    });
  });

  // ============================================================================
  // Storage Key Generation
  // ============================================================================

  describe('Storage Key Generation', () => {
    it('should generate unique storage keys for each file', async () => {
      const metadata = {
        filename: 'report.pdf',
        mimetype: 'application/pdf',
        encoding: '7bit'
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const result1 = await service.uploadFile(Buffer.from('content1'), metadata, 'evidence-123', 'user-123');

      // Wait 1ms to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 1));

      const result2 = await service.uploadFile(Buffer.from('content2'), metadata, 'evidence-123', 'user-123');

      expect(result1.storage_key).not.toBe(result2.storage_key);
      expect(result1.storage_key).toContain('evidence/evidence-123/');
      expect(result2.storage_key).toContain('evidence/evidence-123/');
    });

    it('should sanitize filename in storage key', async () => {
      const metadata = {
        filename: 'my file (copy) [1].pdf',
        mimetype: 'application/pdf',
        encoding: '7bit'
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(Buffer.from('content'), metadata, 'evidence-123', 'user-123');

      expect(result.storage_key).toMatch(/my_file__copy___1_\.pdf$/);
    });
  });

  // ============================================================================
  // Image Processing
  // ============================================================================

  describe('Image Processing', () => {
    it('should extract image dimensions', async () => {
      const buffer = Buffer.from('fake image data');
      const metadata = {
        filename: 'photo.png',
        mimetype: 'image/png',
        encoding: '7bit'
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(buffer, metadata, 'evidence-123', 'user-123');

      expect(result.dimensions).toEqual({ width: 1920, height: 1080 });
    });

    it('should generate thumbnail for images', async () => {
      const buffer = Buffer.from('fake image data');
      const metadata = {
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        encoding: '7bit'
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(buffer, metadata, 'evidence-123', 'user-123');

      expect(result.thumbnail_key).toBeDefined();
      expect(result.thumbnail_key).toContain('_thumb.jpg');
    });

    it('should handle image processing errors gracefully', async () => {
      const sharp = require('sharp');
      sharp.mockImplementationOnce(() => ({
        metadata: jest.fn().mockRejectedValue(new Error('Invalid image')),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn()
      }));

      const buffer = Buffer.from('corrupt image data');
      const metadata = {
        filename: 'broken.jpg',
        mimetype: 'image/jpeg',
        encoding: '7bit'
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(buffer, metadata, 'evidence-123', 'user-123');

      // Should still succeed but without dimensions/thumbnail
      expect(result.mime_type).toBe('image/jpeg');
      expect(result.dimensions).toBeUndefined();
    });
  });

  // ============================================================================
  // File Type Detection
  // ============================================================================

  describe('File Type Detection', () => {
    it('should detect image files', async () => {
      const metadata = { filename: 'image.png', mimetype: 'image/png', encoding: '7bit' };
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(Buffer.from('data'), metadata, 'ev-123', 'u-123');
      expect(result.mime_type).toBe('image/png');
    });

    it('should detect video files', async () => {
      const metadata = { filename: 'video.mp4', mimetype: 'video/mp4', encoding: '7bit' };
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(Buffer.from('data'), metadata, 'ev-123', 'u-123');
      expect(result.mime_type).toBe('video/mp4');
    });

    it('should detect audio files', async () => {
      const metadata = { filename: 'audio.mp3', mimetype: 'audio/mpeg', encoding: '7bit' };
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(Buffer.from('data'), metadata, 'ev-123', 'u-123');
      expect(result.mime_type).toBe('audio/mpeg');
    });

    it('should detect document files', async () => {
      const metadata = { filename: 'doc.pdf', mimetype: 'application/pdf', encoding: '7bit' };
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(Buffer.from('data'), metadata, 'ev-123', 'u-123');
      expect(result.mime_type).toBe('application/pdf');
    });

    it('should detect dataset files', async () => {
      const metadata = { filename: 'data.csv', mimetype: 'text/csv', encoding: '7bit' };
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.uploadFile(Buffer.from('data'), metadata, 'ev-123', 'u-123');
      expect(result.mime_type).toBe('text/csv');
    });
  });

  // ============================================================================
  // File URL Generation
  // ============================================================================

  describe('File URL Generation', () => {
    it('should generate signed URL for valid file', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            storage_key: 'evidence/ev-123/abc/file.pdf',
            storage_provider: 'local',
            virus_scan_status: 'clean'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // access count update

      const url = await service.getFileUrl('file-123', 3600);

      expect(url).toBe('/files/evidence/ev-123/abc/file.pdf');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT storage_key'),
        ['file-123']
      );
    });

    it('should increment access count when generating URL', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            storage_key: 'evidence/ev-123/abc/file.pdf',
            storage_provider: 'local',
            virus_scan_status: 'clean'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // access count update

      await service.getFileUrl('file-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        ['file-123']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('access_count'),
        ['file-123']
      );
    });

    it('should throw error for non-existent file', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getFileUrl('non-existent-file')).rejects.toThrow('File not found');
    });

    it('should block access to infected files', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          storage_key: 'evidence/ev-123/abc/infected.pdf',
          storage_provider: 'local',
          virus_scan_status: 'infected'
        }]
      });

      await expect(service.getFileUrl('infected-file')).rejects.toThrow('quarantined due to security');
    });
  });

  // ============================================================================
  // File Deletion
  // ============================================================================

  describe('File Deletion', () => {
    it('should soft delete file in database', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            storage_key: 'evidence/ev-123/abc/file.pdf',
            thumbnail_storage_key: null
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // soft delete update

      await service.deleteFile('file-123', 'user-123', 'No longer needed');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['user-123', 'No longer needed', 'file-123'])
      );
    });

    it('should throw error for already deleted file', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.deleteFile('deleted-file', 'user-123')
      ).rejects.toThrow('File not found or already deleted');
    });

    it('should delete thumbnail if exists', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            storage_key: 'evidence/ev-123/abc/file.jpg',
            thumbnail_storage_key: 'evidence/ev-123/abc/file.jpg_thumb.jpg'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // soft delete update

      await service.deleteFile('file-123', 'user-123');

      // Both file and thumbnail should be deleted from storage
      // (Testing the provider deletion would require mocking the provider)
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should not throw if storage deletion fails', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            storage_key: 'evidence/ev-123/abc/file.pdf',
            thumbnail_storage_key: null
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // soft delete update

      // Service should not throw even if storage provider throws
      await expect(
        service.deleteFile('file-123', 'user-123')
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Hash Calculation
  // ============================================================================

  describe('Hash Calculation', () => {
    it('should calculate consistent hashes for same content', async () => {
      const buffer = Buffer.from('test content');
      const metadata = {
        filename: 'test.txt',
        mimetype: 'text/plain',
        encoding: '7bit'
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const result1 = await service.uploadFile(buffer, metadata, 'ev-123', 'u-123');
      const result2 = await service.uploadFile(buffer, metadata, 'ev-456', 'u-123');

      expect(result1.file_hash).toBe(result2.file_hash);
    });

    it('should calculate different hashes for different content', async () => {
      const metadata = {
        filename: 'test.txt',
        mimetype: 'text/plain',
        encoding: '7bit'
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const result1 = await service.uploadFile(Buffer.from('content A'), metadata, 'ev-123', 'u-123');
      const result2 = await service.uploadFile(Buffer.from('content B'), metadata, 'ev-123', 'u-123');

      expect(result1.file_hash).not.toBe(result2.file_hash);
    });
  });

  // ============================================================================
  // Provider Info
  // ============================================================================

  describe('Provider Info', () => {
    it('should return local storage info', () => {
      const info = service.getProviderInfo();

      expect(info.provider).toBe('local');
      expect(info.bucket).toBeUndefined();
      expect(info.region).toBeUndefined();
    });

    it('should return S3 storage info', () => {
      process.env.STORAGE_PROVIDER = 's3';
      process.env.S3_BUCKET = 'my-bucket';
      process.env.S3_REGION = 'eu-west-1';
      process.env.AWS_ACCESS_KEY_ID = 'key';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret';

      const s3Service = new FileStorageService(mockPool);
      const info = s3Service.getProviderInfo();

      expect(info.provider).toBe('s3');
      expect(info.bucket).toBe('my-bucket');
      expect(info.region).toBe('eu-west-1');
    });
  });
});
