import { Pool } from 'pg';
import sharp from 'sharp';
import * as imghash from 'imghash';
import ffmpeg from 'fluent-ffmpeg';
// @ts-ignore - minhash doesn't have types
import { MinHash } from 'minhash';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  FingerprintType,
  ContentType,
  FingerprintResult,
  ImageFingerprintResult,
  VideoFingerprintResult,
  AudioFingerprintResult,
  TextFingerprintResult,
  DuplicateDetectionResult,
  DuplicateMatch,
  FingerprintConfig,
  DEFAULT_FINGERPRINT_CONFIG,
  calculateHammingDistance,
  calculateSimilarity,
} from '../types/fingerprinting';
import { FileStorageService } from './FileStorageService';

// ============================================================================
// CONTENT ANALYSIS SERVICE
// ============================================================================

export class ContentAnalysisService {
  private pool: Pool;
  private fileStorage: FileStorageService;
  private config: FingerprintConfig;

  constructor(pool: Pool, fileStorage: FileStorageService, config?: Partial<FingerprintConfig>) {
    this.pool = pool;
    this.fileStorage = fileStorage;
    this.config = { ...DEFAULT_FINGERPRINT_CONFIG, ...config };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Analyze content and generate perceptual fingerprint
   */
  async analyzeContent(nodeId: string): Promise<FingerprintResult> {
    // Get node data with props
    const nodeResult = await this.pool.query(
      `SELECT id, props, node_type_id FROM public."Nodes" WHERE id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const node = nodeResult.rows[0];
    const props = node.props || {};

    // Determine content type from node props
    const contentType = this.determineContentType(props);

    // Get content buffer (from file storage or props)
    const contentBuffer = await this.getContentBuffer(nodeId, props);

    // Generate fingerprint based on content type
    let fingerprintResult: FingerprintResult;

    switch (contentType) {
      case ContentType.IMAGE:
        fingerprintResult = await this.fingerprintImage(contentBuffer);
        break;
      case ContentType.VIDEO:
        fingerprintResult = await this.fingerprintVideo(contentBuffer);
        break;
      case ContentType.AUDIO:
        fingerprintResult = await this.fingerprintAudio(contentBuffer);
        break;
      case ContentType.TEXT:
      case ContentType.DOCUMENT:
        fingerprintResult = await this.fingerprintText(contentBuffer.toString('utf-8'));
        break;
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Update node with content_hash
    await this.pool.query(
      `UPDATE public."Nodes" SET content_hash = $1, updated_at = NOW() WHERE id = $2`,
      [fingerprintResult.hash, nodeId]
    );

    console.log(`Content analyzed for node ${nodeId}: ${fingerprintResult.fingerprintType}`);

    return fingerprintResult;
  }

  /**
   * Find duplicate content by comparing fingerprints
   */
  async findDuplicates(nodeId: string, threshold?: number): Promise<DuplicateDetectionResult> {
    // Get node's content hash
    const nodeResult = await this.pool.query(
      `SELECT content_hash, props FROM public."Nodes" WHERE id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const { content_hash, props } = nodeResult.rows[0];

    if (!content_hash) {
      throw new Error(`Node ${nodeId} has not been analyzed. Run analyzeContent first.`);
    }

    const contentType = this.determineContentType(props);
    const similarityThreshold = threshold || this.getSimilarityThreshold(contentType);

    // Find similar content hashes in database
    const candidates = await this.pool.query(
      `SELECT id, content_hash, created_at
       FROM public."Nodes"
       WHERE id != $1
         AND content_hash IS NOT NULL
         AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [nodeId]
    );

    const matches: DuplicateMatch[] = [];
    let primarySourceId: string | undefined;

    // Compare fingerprints
    for (const candidate of candidates.rows) {
      const similarity = this.compareFingerprintHashes(
        content_hash,
        candidate.content_hash,
        contentType
      );

      if (similarity >= similarityThreshold) {
        const hammingDistance = this.calculateHashDistance(content_hash, candidate.content_hash);

        matches.push({
          nodeId: candidate.id,
          similarity,
          hammingDistance,
          fingerprintType: this.getFingerprintTypeForContent(contentType),
          contentHash: candidate.content_hash,
        });

        // First match (oldest) becomes primary source
        if (!primarySourceId) {
          primarySourceId = candidate.id;
        }
      }
    }

    // If duplicates found, update primary_source_id
    if (primarySourceId) {
      await this.pool.query(
        `UPDATE public."Nodes" SET primary_source_id = $1 WHERE id = $2`,
        [primarySourceId, nodeId]
      );
    }

    return {
      isDuplicate: matches.length > 0,
      matches,
      primarySourceId,
    };
  }

  /**
   * Batch analyze multiple nodes
   */
  async batchAnalyze(nodeIds: string[]): Promise<Map<string, FingerprintResult>> {
    const results = new Map<string, FingerprintResult>();

    for (const nodeId of nodeIds) {
      try {
        const result = await this.analyzeContent(nodeId);
        results.set(nodeId, result);
      } catch (error: any) {
        console.error(`Failed to analyze node ${nodeId}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Find all duplicates in a graph
   */
  async findAllDuplicatesInGraph(graphId: string): Promise<Map<string, DuplicateDetectionResult>> {
    const nodesResult = await this.pool.query(
      `SELECT id FROM public."Nodes" WHERE graph_id = $1 AND deleted_at IS NULL`,
      [graphId]
    );

    const duplicates = new Map<string, DuplicateDetectionResult>();

    for (const node of nodesResult.rows) {
      try {
        const result = await this.findDuplicates(node.id);
        if (result.isDuplicate) {
          duplicates.set(node.id, result);
        }
      } catch (error: any) {
        console.error(`Failed to check duplicates for node ${node.id}:`, error.message);
      }
    }

    return duplicates;
  }

  // ==========================================================================
  // IMAGE FINGERPRINTING
  // ==========================================================================

  private async fingerprintImage(buffer: Buffer): Promise<ImageFingerprintResult> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Generate perceptual hash (pHash)
    // Using imghash library which implements pHash algorithm
    const hash = await imghash.hash(buffer.toString('base64'), this.config.imageHashSize);

    return {
      contentType: ContentType.IMAGE,
      fingerprintType: FingerprintType.IMAGE_PHASH,
      hash,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      metadata: {
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
      },
    };
  }

  // ==========================================================================
  // VIDEO FINGERPRINTING
  // ==========================================================================

  private async fingerprintVideo(buffer: Buffer): Promise<VideoFingerprintResult> {
    // Save buffer to temporary file (ffmpeg requires file path)
    const tempFile = path.join(os.tmpdir(), `video_${Date.now()}.tmp`);
    await fs.writeFile(tempFile, buffer);

    try {
      // Get video metadata
      const metadata = await this.getVideoMetadata(tempFile);

      // Sample frames at regular intervals
      const frameHashes = await this.sampleVideoFrames(
        tempFile,
        metadata.duration,
        this.config.videoFrameSampleCount
      );

      // Combine frame hashes into single fingerprint
      const combinedHash = this.combineHashes(frameHashes);

      return {
        contentType: ContentType.VIDEO,
        fingerprintType: FingerprintType.VIDEO_FRAME,
        hash: combinedHash,
        frameHashes,
        durationSeconds: metadata.duration,
        fps: metadata.fps,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          codec: metadata.codec,
        },
      };
    } finally {
      // Cleanup temp file
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  private getVideoMetadata(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) return reject(new Error('No video stream found'));

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate || '0'), // e.g., "30/1" -> 30
          codec: videoStream.codec_name,
        });
      });
    });
  }

  private async sampleVideoFrames(filePath: string, duration: number, frameCount: number): Promise<string[]> {
    const frameHashes: string[] = [];
    const interval = duration / (frameCount + 1);

    for (let i = 1; i <= frameCount; i++) {
      const timestamp = interval * i;
      const frameBuffer = await this.extractVideoFrame(filePath, timestamp);
      const hash = await imghash.hash(frameBuffer.toString('base64'), this.config.imageHashSize);
      frameHashes.push(hash);
    }

    return frameHashes;
  }

  private extractVideoFrame(filePath: string, timestamp: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      ffmpeg(filePath)
        .seekInput(timestamp)
        .outputOptions(['-vframes 1', '-f image2pipe', '-vcodec png'])
        .on('error', reject)
        .pipe()
        .on('data', (chunk: Buffer) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });
  }

  // ==========================================================================
  // AUDIO FINGERPRINTING
  // ==========================================================================

  private async fingerprintAudio(buffer: Buffer): Promise<AudioFingerprintResult> {
    // Save buffer to temporary file
    const tempFile = path.join(os.tmpdir(), `audio_${Date.now()}.tmp`);
    await fs.writeFile(tempFile, buffer);

    try {
      // Get audio metadata
      const metadata = await this.getAudioMetadata(tempFile);

      // Extract audio fingerprint using spectral analysis
      // For simplicity, we'll hash the waveform data
      // In production, use chromaprint/acoustid for robust audio fingerprinting
      const waveformHash = await this.hashAudioWaveform(tempFile);

      return {
        contentType: ContentType.AUDIO,
        fingerprintType: FingerprintType.AUDIO_FINGERPRINT,
        hash: waveformHash,
        durationSeconds: metadata.duration,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        metadata: {
          codec: metadata.codec,
          bitrate: metadata.bitrate,
        },
      };
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  private getAudioMetadata(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);

        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
        if (!audioStream) return reject(new Error('No audio stream found'));

        resolve({
          duration: metadata.format.duration || 0,
          sampleRate: audioStream.sample_rate,
          channels: audioStream.channels,
          codec: audioStream.codec_name,
          bitrate: audioStream.bit_rate,
        });
      });
    });
  }

  private async hashAudioWaveform(filePath: string): Promise<string> {
    // Extract raw PCM data and hash it
    // This is a simplified approach; production should use chromaprint
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      ffmpeg(filePath)
        .audioFrequency(8000) // Downsample for consistent comparison
        .audioChannels(1) // Mono
        .duration(this.config.audioSampleDuration)
        .format('s16le') // Raw PCM
        .on('error', reject)
        .pipe()
        .on('data', (chunk: Buffer) => chunks.push(chunk))
        .on('end', () => {
          const pcmData = Buffer.concat(chunks);
          const hash = createHash('sha256').update(pcmData).digest('hex');
          resolve(hash);
        })
        .on('error', reject);
    });
  }

  // ==========================================================================
  // TEXT FINGERPRINTING (MinHash)
  // ==========================================================================

  private async fingerprintText(text: string): Promise<TextFingerprintResult> {
    // Normalize text
    const normalized = text.toLowerCase().trim();

    // Generate shingles (n-grams)
    const shingles = this.generateShingles(normalized, this.config.textShingleSize);

    // Create MinHash signature
    const minhash = new MinHash(this.config.textMinHashSize);
    shingles.forEach((shingle) => minhash.update(shingle));

    // Serialize MinHash signature to hex string
    const hashArray = Array.from(minhash.hashvalues as number[]);
    const hash = hashArray.map((v) => v.toString(16).padStart(8, '0')).join('');

    // Count words and characters
    const wordCount = normalized.split(/\s+/).filter((w) => w.length > 0).length;
    const characterCount = normalized.length;

    return {
      contentType: ContentType.TEXT,
      fingerprintType: FingerprintType.TEXT_MINHASH,
      hash,
      wordCount,
      characterCount,
      metadata: {
        shingleSize: this.config.textShingleSize,
        minhashSize: this.config.textMinHashSize,
      },
    };
  }

  private generateShingles(text: string, size: number): Set<string> {
    const shingles = new Set<string>();
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    for (let i = 0; i <= words.length - size; i++) {
      const shingle = words.slice(i, i + size).join(' ');
      shingles.add(shingle);
    }

    return shingles;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private determineContentType(props: any): ContentType {
    // Check for explicit content type in props
    if (props.contentType) {
      return props.contentType as ContentType;
    }

    // Infer from MIME type if available
    if (props.mimeType || props.mime_type) {
      const mimeType = props.mimeType || props.mime_type;
      if (mimeType.startsWith('image/')) return ContentType.IMAGE;
      if (mimeType.startsWith('video/')) return ContentType.VIDEO;
      if (mimeType.startsWith('audio/')) return ContentType.AUDIO;
      if (mimeType.startsWith('text/') || mimeType.includes('document')) {
        return ContentType.DOCUMENT;
      }
    }

    // Infer from file extension
    if (props.filename || props.original_filename) {
      const filename = props.filename || props.original_filename;
      const ext = path.extname(filename).toLowerCase();

      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
      const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];

      if (imageExts.includes(ext)) return ContentType.IMAGE;
      if (videoExts.includes(ext)) return ContentType.VIDEO;
      if (audioExts.includes(ext)) return ContentType.AUDIO;
    }

    // Check for text content in props
    if (props.text || props.content || props.description) {
      return ContentType.TEXT;
    }

    throw new Error('Unable to determine content type from node props');
  }

  private async getContentBuffer(nodeId: string, props: any): Promise<Buffer> {
    // If node has associated EvidenceFile, fetch from storage
    const fileResult = await this.pool.query(
      `SELECT ef.id, ef.storage_key, ef.mime_type
       FROM public."EvidenceFiles" ef
       JOIN public."Nodes" n ON n.id = ef.evidence_id
       WHERE n.id = $1 AND ef.deleted_at IS NULL
       LIMIT 1`,
      [nodeId]
    );

    if (fileResult.rows.length > 0) {
      const fileId = fileResult.rows[0].id;
      const storageKey = fileResult.rows[0].storage_key;

      // Download file from storage provider
      return await this.fileStorage['provider'].download(storageKey);
    }

    // Otherwise, extract text content from props
    const textContent = props.text || props.content || props.description || '';
    if (textContent) {
      return Buffer.from(textContent, 'utf-8');
    }

    throw new Error(`No content found for node ${nodeId}`);
  }

  private compareFingerprintHashes(hash1: string, hash2: string, contentType: ContentType): number {
    if (contentType === ContentType.TEXT) {
      // MinHash: Use Jaccard similarity
      return this.calculateMinHashSimilarity(hash1, hash2);
    } else {
      // Perceptual hashes: Use Hamming distance
      const maxDistance = hash1.length * 4; // 4 bits per hex char
      const distance = calculateHammingDistance(hash1, hash2);
      return calculateSimilarity(distance, maxDistance);
    }
  }

  private calculateMinHashSimilarity(hash1: string, hash2: string): number {
    // MinHash hashes are already signatures; compare them directly
    const sig1 = this.parseMinHashSignature(hash1);
    const sig2 = this.parseMinHashSignature(hash2);

    let matches = 0;
    for (let i = 0; i < sig1.length; i++) {
      if (sig1[i] === sig2[i]) matches++;
    }

    return matches / sig1.length;
  }

  private parseMinHashSignature(hash: string): number[] {
    const signature: number[] = [];
    for (let i = 0; i < hash.length; i += 8) {
      const value = parseInt(hash.substring(i, i + 8), 16);
      signature.push(value);
    }
    return signature;
  }

  private calculateHashDistance(hash1: string, hash2: string): number {
    try {
      return calculateHammingDistance(hash1, hash2);
    } catch {
      // If hashes have different lengths or format, return max distance
      return hash1.length * 4;
    }
  }

  private combineHashes(hashes: string[]): string {
    // Concatenate all hashes and hash the result
    const combined = hashes.join('');
    return createHash('sha256').update(combined).digest('hex');
  }

  private getSimilarityThreshold(contentType: ContentType): number {
    switch (contentType) {
      case ContentType.IMAGE:
        return this.config.imageSimilarityThreshold;
      case ContentType.VIDEO:
        return this.config.videoSimilarityThreshold;
      case ContentType.AUDIO:
        return this.config.audioSimilarityThreshold;
      case ContentType.TEXT:
      case ContentType.DOCUMENT:
        return this.config.textSimilarityThreshold;
      default:
        return 0.85;
    }
  }

  private getFingerprintTypeForContent(contentType: ContentType): FingerprintType {
    switch (contentType) {
      case ContentType.IMAGE:
        return FingerprintType.IMAGE_PHASH;
      case ContentType.VIDEO:
        return FingerprintType.VIDEO_FRAME;
      case ContentType.AUDIO:
        return FingerprintType.AUDIO_FINGERPRINT;
      case ContentType.TEXT:
      case ContentType.DOCUMENT:
        return FingerprintType.TEXT_MINHASH;
      default:
        return FingerprintType.IMAGE_PHASH;
    }
  }
}
