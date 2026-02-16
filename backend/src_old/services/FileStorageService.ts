import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { createReadStream, promises as fs, existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import sharp from 'sharp';
import { Readable } from 'stream';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FileMetadata {
  filename: string;
  mimetype: string;
  encoding: string;
  size?: number;
}

export interface UploadResult {
  storage_key: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  dimensions?: { width: number; height: number };
  duration_seconds?: number;
  thumbnail_key?: string;
}

export interface FileStorageProvider {
  upload(buffer: Buffer, key: string, metadata: FileMetadata): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  exists(key: string): Promise<boolean>;
}

// ============================================================================
// S3 STORAGE PROVIDER
// ============================================================================

export class S3StorageProvider implements FileStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(region: string, bucket: string, accessKeyId?: string, secretAccessKey?: string) {
    this.bucket = bucket;

    const config: any = { region };
    if (accessKeyId && secretAccessKey) {
      config.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.client = new S3Client(config);
  }

  async upload(buffer: Buffer, key: string, metadata: FileMetadata): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: metadata.mimetype,
      Metadata: {
        originalFilename: metadata.filename,
        encoding: metadata.encoding,
      },
    });

    await this.client.send(command);
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error('Empty response body');
    }

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}

// ============================================================================
// CLOUDFLARE R2 STORAGE PROVIDER
// ============================================================================

export class CloudflareR2Provider implements FileStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(accountId: string, bucket: string, accessKeyId: string, secretAccessKey: string) {
    this.bucket = bucket;

    // Cloudflare R2 uses S3-compatible API
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(buffer: Buffer, key: string, metadata: FileMetadata): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: metadata.mimetype,
      Metadata: {
        originalFilename: metadata.filename,
        encoding: metadata.encoding,
      },
    });

    await this.client.send(command);
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error('Empty response body');
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}

// ============================================================================
// LOCAL STORAGE PROVIDER
// ============================================================================

export class LocalStorageProvider implements FileStorageProvider {
  private basePath: string;

  constructor(basePath: string = './uploads') {
    this.basePath = path.resolve(basePath);

    // Ensure base directory exists
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  private getFullPath(key: string): string {
    // Prevent directory traversal attacks
    const safePath = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, safePath);
  }

  async upload(buffer: Buffer, key: string, metadata: FileMetadata): Promise<void> {
    const fullPath = this.getFullPath(key);
    const directory = path.dirname(fullPath);

    // Ensure directory exists
    if (!existsSync(directory)) {
      await fs.mkdir(directory, { recursive: true });
    }

    await fs.writeFile(fullPath, buffer);
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    return await fs.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);

    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // For local storage, return a simple file path or base64 encoded URL
    // In production, you'd want to implement a token-based system
    return `/files/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    return existsSync(fullPath);
  }
}

// ============================================================================
// FILE STORAGE SERVICE
// ============================================================================

export class FileStorageService {
  private provider: FileStorageProvider;
  private pool: Pool;
  private storageProviderName: string;
  private storageBucket?: string;
  private storageRegion?: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.storageProviderName = process.env.STORAGE_PROVIDER || 'local';

    // Initialize appropriate storage provider
    switch (this.storageProviderName) {
      case 's3':
        this.provider = new S3StorageProvider(
          process.env.S3_REGION || 'us-east-1',
          process.env.S3_BUCKET || 'rabbithole-evidence',
          process.env.AWS_ACCESS_KEY_ID,
          process.env.AWS_SECRET_ACCESS_KEY
        );
        this.storageBucket = process.env.S3_BUCKET;
        this.storageRegion = process.env.S3_REGION;
        break;

      case 'cloudflare_r2':
      case 'cloudflare-r2':
        if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
          throw new Error('Cloudflare R2 credentials not configured');
        }
        this.provider = new CloudflareR2Provider(
          process.env.R2_ACCOUNT_ID,
          process.env.R2_BUCKET || 'rabbithole-evidence',
          process.env.R2_ACCESS_KEY_ID,
          process.env.R2_SECRET_ACCESS_KEY
        );
        this.storageBucket = process.env.R2_BUCKET;
        break;

      case 'local':
      default:
        this.provider = new LocalStorageProvider(process.env.LOCAL_STORAGE_PATH || './uploads');
        break;
    }
  }

  /**
   * Calculate SHA256 hash of buffer
   */
  private calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate unique storage key for a file
   */
  private generateStorageKey(evidenceId: string, filename: string, hash: string): string {
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    // Structure: evidence/{evidenceId}/{hash}/{timestamp}_{filename}
    return `evidence/${evidenceId}/${hash.substring(0, 8)}/${timestamp}_${sanitizedName}${ext}`;
  }

  /**
   * Check if file with same hash already exists for deduplication
   */
  async deduplicateFile(hash: string, evidenceId: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT storage_key FROM public."EvidenceFiles"
       WHERE file_hash = $1
       AND evidence_id != $2
       AND deleted_at IS NULL
       LIMIT 1`,
      [hash, evidenceId]
    );

    if (result.rows.length > 0) {
      console.log(`File deduplication: Found existing file with hash ${hash}`);
      return result.rows[0].storage_key;
    }

    return null;
  }

  /**
   * Extract metadata from image file
   */
  private async extractImageMetadata(buffer: Buffer): Promise<{ dimensions?: { width: number; height: number }; thumbnail?: Buffer }> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      const dimensions = metadata.width && metadata.height
        ? { width: metadata.width, height: metadata.height }
        : undefined;

      // Generate thumbnail (max 300x300)
      const thumbnail = await image
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      return { dimensions, thumbnail };
    } catch (error) {
      console.error('Error extracting image metadata:', error);
      return {};
    }
  }

  /**
   * Validate file type and size
   */
  private validateFile(mimetype: string, size: number): void {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB default

    if (size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
    }

    // Allowed MIME types
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Videos
      'video/mp4',
      'video/webm',
      'video/quicktime',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      // Data
      'application/json',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(mimetype)) {
      throw new Error(`File type ${mimetype} is not allowed`);
    }

    // Reject executable files
    const dangerousTypes = [
      'application/x-msdownload',
      'application/x-executable',
      'application/x-sh',
      'application/x-bat',
    ];

    if (dangerousTypes.includes(mimetype)) {
      throw new Error('Executable files are not allowed');
    }
  }

  /**
   * Determine file type from MIME type
   */
  private determineFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
    if (mimetype.includes('json') || mimetype.includes('csv') || mimetype.includes('spreadsheet')) return 'dataset';
    return 'other';
  }

  /**
   * Perform virus scanning (placeholder - integrate with ClamAV)
   */
  private async scanForViruses(buffer: Buffer): Promise<{ status: string; result?: any }> {
    // TODO: Integrate with ClamAV or cloud-based virus scanning service
    // For now, return clean status

    // Example integration with ClamAV would look like:
    // const NodeClam = require('clamscan');
    // const clamscan = await new NodeClam().init();
    // const { is_infected, viruses } = await clamscan.scan_stream(buffer);

    console.log('Virus scan: Skipping (not configured)');

    return {
      status: 'clean',
      result: {
        scanned_at: new Date().toISOString(),
        scanner: 'placeholder',
      },
    };
  }

  /**
   * Upload file to evidence
   */
  async uploadFile(
    buffer: Buffer,
    metadata: FileMetadata,
    evidenceId: string,
    userId: string
  ): Promise<UploadResult> {
    // Validate file
    const fileSize = buffer.length;
    this.validateFile(metadata.mimetype, fileSize);

    // Calculate hash for deduplication
    const fileHash = this.calculateHash(buffer);

    // Check for existing file with same hash (deduplication)
    const existingKey = await this.deduplicateFile(fileHash, evidenceId);
    if (existingKey) {
      console.log(`Using deduplicated file: ${existingKey}`);

      // Still create a new database entry, but reference the same storage
      return {
        storage_key: existingKey,
        file_hash: fileHash,
        file_size: fileSize,
        mime_type: metadata.mimetype,
      };
    }

    // Virus scan
    const virusScanResult = await this.scanForViruses(buffer);
    if (virusScanResult.status === 'infected') {
      throw new Error('File failed virus scan');
    }

    // Generate storage key
    const storageKey = this.generateStorageKey(evidenceId, metadata.filename, fileHash);

    // Extract metadata based on file type
    let dimensions: { width: number; height: number } | undefined;
    let thumbnailKey: string | undefined;

    const fileType = this.determineFileType(metadata.mimetype);

    if (fileType === 'image') {
      const imageData = await this.extractImageMetadata(buffer);
      dimensions = imageData.dimensions;

      if (imageData.thumbnail) {
        thumbnailKey = `${storageKey}_thumb.jpg`;
        await this.provider.upload(imageData.thumbnail, thumbnailKey, {
          filename: `${metadata.filename}_thumb`,
          mimetype: 'image/jpeg',
          encoding: 'binary',
        });
      }
    }

    // Upload to storage provider
    await this.provider.upload(buffer, storageKey, metadata);

    console.log(`File uploaded successfully: ${storageKey} (${fileSize} bytes)`);

    return {
      storage_key: storageKey,
      file_hash: fileHash,
      file_size: fileSize,
      mime_type: metadata.mimetype,
      dimensions,
      thumbnail_key: thumbnailKey,
    };
  }

  /**
   * Get signed URL for file download
   */
  async getFileUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
    const result = await this.pool.query(
      `SELECT storage_key, storage_provider, virus_scan_status
       FROM public."EvidenceFiles"
       WHERE id = $1 AND deleted_at IS NULL`,
      [fileId]
    );

    if (result.rows.length === 0) {
      throw new Error('File not found');
    }

    const file = result.rows[0];

    // Security check: Don't allow download of infected files
    if (file.virus_scan_status === 'infected') {
      throw new Error('File is quarantined due to security concerns');
    }

    // Update access count
    await this.pool.query(
      `UPDATE public."EvidenceFiles"
       SET access_count = access_count + 1, last_accessed_at = NOW()
       WHERE id = $1`,
      [fileId]
    );

    return await this.provider.getSignedUrl(file.storage_key, expiresIn);
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(fileId: string, userId: string, reason?: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT storage_key, thumbnail_storage_key
       FROM public."EvidenceFiles"
       WHERE id = $1 AND deleted_at IS NULL`,
      [fileId]
    );

    if (result.rows.length === 0) {
      throw new Error('File not found or already deleted');
    }

    const file = result.rows[0];

    // Soft delete in database
    await this.pool.query(
      `UPDATE public."EvidenceFiles"
       SET deleted_at = NOW(), deleted_by = $1, deletion_reason = $2
       WHERE id = $3`,
      [userId, reason, fileId]
    );

    // Delete from storage provider (can be made async/background job)
    try {
      await this.provider.delete(file.storage_key);

      if (file.thumbnail_storage_key) {
        await this.provider.delete(file.thumbnail_storage_key);
      }

      console.log(`File deleted: ${file.storage_key}`);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Don't throw - soft delete in DB is more important
    }
  }

  /**
   * Get storage provider info
   */
  getProviderInfo(): { provider: string; bucket?: string; region?: string } {
    return {
      provider: this.storageProviderName,
      bucket: this.storageBucket,
      region: this.storageRegion,
    };
  }
}
