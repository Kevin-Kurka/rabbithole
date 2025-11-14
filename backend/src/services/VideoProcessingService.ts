/**
 * VideoProcessingService
 *
 * Handles video file processing including:
 * - Frame extraction using fluent-ffmpeg
 * - Thumbnail generation (first, middle, key frames)
 * - Scene detection (major scene changes)
 * - OCR on extracted frames using Tesseract.js
 * - Metadata extraction (duration, resolution, codec, fps)
 *
 * Supported formats: mp4, mov, avi, webm, mkv
 */

import ffmpeg from 'fluent-ffmpeg';
import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// ============================================================================
// INTERFACES
// ============================================================================

export interface VideoMetadata {
  duration_seconds: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate?: number;
  file_format: string;
  size: number;
}

export interface VideoFrame {
  frame_number: number;
  timestamp_seconds: number;
  frame_type: 'thumbnail' | 'scene_change' | 'ocr_extracted' | 'key_frame';
  file_path: string;
  ocr_text?: string;
}

export interface VideoScene {
  scene_number: number;
  start_time: number;
  end_time: number;
  thumbnail_frame_number: number;
  description?: string;
}

export interface VideoProcessingOptions {
  extractFrames?: boolean;
  performOCR?: boolean;
  detectScenes?: boolean;
  generateThumbnails?: boolean;
  framesPerSecond?: number;
  sceneThreshold?: number; // 0-1, sensitivity for scene detection
}

export interface VideoProcessingResult {
  success: boolean;
  metadata: VideoMetadata;
  frames: VideoFrame[];
  scenes: VideoScene[];
  thumbnails: {
    first: string;
    middle: string;
    keyFrames: string[];
  };
  error?: string;
  processingTimeMs: number;
}

// ============================================================================
// VIDEO PROCESSING SERVICE
// ============================================================================

export class VideoProcessingService {
  private readonly SUPPORTED_FORMATS = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv', 'wmv'];
  private readonly TEMP_DIR: string;
  private tesseractWorker: Worker | null = null;

  constructor(tempDir?: string) {
    this.TEMP_DIR = tempDir || '/tmp/video-processing';
  }

  /**
   * Check if file format is supported
   */
  public isSupportedFormat(filename: string): boolean {
    const extension = path.extname(filename).toLowerCase().replace('.', '');
    return this.SUPPORTED_FORMATS.includes(extension);
  }

  /**
   * Initialize Tesseract worker
   */
  private async initializeTesseractWorker(): Promise<Worker> {
    if (!this.tesseractWorker) {
      this.tesseractWorker = await createWorker('eng');
    }
    return this.tesseractWorker;
  }

  /**
   * Cleanup Tesseract worker
   */
  public async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  /**
   * Extract video metadata using ffprobe
   */
  public async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(new Error(`Failed to extract metadata: ${err.message}`));
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          return reject(new Error('No video stream found'));
        }

        const duration = metadata.format.duration || 0;
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        const codec = videoStream.codec_name || 'unknown';
        const bitrate = metadata.format.bit_rate
          ? typeof metadata.format.bit_rate === 'string'
            ? parseInt(metadata.format.bit_rate)
            : metadata.format.bit_rate
          : undefined;
        const fileFormat = metadata.format.format_name || 'unknown';
        const size = metadata.format.size || 0;

        // Calculate FPS
        let fps = 0;
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          fps = den ? num / den : 0;
        }

        resolve({
          duration_seconds: duration,
          width,
          height,
          fps: Math.round(fps * 100) / 100,
          codec,
          bitrate,
          file_format: fileFormat,
          size,
        });
      });
    });
  }

  /**
   * Generate thumbnails (first frame, middle frame, key frames)
   */
  public async generateThumbnails(
    videoPath: string,
    metadata: VideoMetadata,
    outputDir: string
  ): Promise<{ first: string; middle: string; keyFrames: string[] }> {
    await fs.mkdir(outputDir, { recursive: true });

    const thumbnails = {
      first: '',
      middle: '',
      keyFrames: [] as string[],
    };

    // Generate first frame thumbnail
    thumbnails.first = await this.extractFrameAtTime(videoPath, 0, path.join(outputDir, 'thumb_first.jpg'));

    // Generate middle frame thumbnail
    const middleTime = metadata.duration_seconds / 2;
    thumbnails.middle = await this.extractFrameAtTime(
      videoPath,
      middleTime,
      path.join(outputDir, 'thumb_middle.jpg')
    );

    // Extract key frames (every 10% of video duration)
    const keyFrameCount = Math.min(10, Math.floor(metadata.duration_seconds / 10));
    for (let i = 0; i < keyFrameCount; i++) {
      const timestamp = (metadata.duration_seconds / keyFrameCount) * i;
      const keyFramePath = path.join(outputDir, `keyframe_${i}.jpg`);
      const extractedPath = await this.extractFrameAtTime(videoPath, timestamp, keyFramePath);
      thumbnails.keyFrames.push(extractedPath);
    }

    return thumbnails;
  }

  /**
   * Extract a single frame at specific timestamp
   */
  private async extractFrameAtTime(videoPath: string, timestamp: number, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(`Frame extraction failed: ${err.message}`)))
        .run();
    });
  }

  /**
   * Extract frames at regular intervals
   */
  public async extractFrames(
    videoPath: string,
    metadata: VideoMetadata,
    outputDir: string,
    framesPerSecond: number = 1
  ): Promise<VideoFrame[]> {
    await fs.mkdir(outputDir, { recursive: true });

    const frames: VideoFrame[] = [];
    const totalFrames = Math.floor(metadata.duration_seconds * framesPerSecond);

    return new Promise((resolve, reject) => {
      let frameCount = 0;

      ffmpeg(videoPath)
        .fps(framesPerSecond)
        .output(path.join(outputDir, 'frame_%04d.jpg'))
        .on('end', async () => {
          // Collect extracted frames
          const files = await fs.readdir(outputDir);
          const frameFiles = files.filter((f) => f.startsWith('frame_')).sort();

          for (let i = 0; i < frameFiles.length; i++) {
            const framePath = path.join(outputDir, frameFiles[i]);
            const timestamp = i / framesPerSecond;

            frames.push({
              frame_number: i + 1,
              timestamp_seconds: timestamp,
              frame_type: 'ocr_extracted',
              file_path: framePath,
            });
          }

          resolve(frames);
        })
        .on('error', (err) => reject(new Error(`Frame extraction failed: ${err.message}`)))
        .run();
    });
  }

  /**
   * Detect scene changes using ffmpeg scene filter
   */
  public async detectScenes(
    videoPath: string,
    metadata: VideoMetadata,
    threshold: number = 0.4
  ): Promise<VideoScene[]> {
    try {
      // Use ffmpeg scene detection filter
      const command = `ffmpeg -i "${videoPath}" -filter:v "select='gt(scene,${threshold})',showinfo" -f null - 2>&1 | grep "Parsed_showinfo"`;

      const { stdout, stderr } = await execAsync(command);
      const output = stdout + stderr;

      // Parse scene timestamps from output
      const sceneTimestamps: number[] = [0]; // Always start with scene 0
      const timestampRegex = /pts_time:([\d.]+)/g;
      let match;

      while ((match = timestampRegex.exec(output)) !== null) {
        const timestamp = parseFloat(match[1]);
        if (!isNaN(timestamp) && timestamp > 0) {
          sceneTimestamps.push(timestamp);
        }
      }

      // Ensure we have the end timestamp
      if (sceneTimestamps[sceneTimestamps.length - 1] < metadata.duration_seconds) {
        sceneTimestamps.push(metadata.duration_seconds);
      }

      // Create scene objects
      const scenes: VideoScene[] = [];
      for (let i = 0; i < sceneTimestamps.length - 1; i++) {
        const startTime = sceneTimestamps[i];
        const endTime = sceneTimestamps[i + 1];
        const midTime = (startTime + endTime) / 2;

        scenes.push({
          scene_number: i + 1,
          start_time: startTime,
          end_time: endTime,
          thumbnail_frame_number: Math.floor(midTime * metadata.fps),
        });
      }

      return scenes;
    } catch (error: any) {
      console.warn('Scene detection failed, returning single scene:', error.message);
      // Fallback: treat entire video as one scene
      return [
        {
          scene_number: 1,
          start_time: 0,
          end_time: metadata.duration_seconds,
          thumbnail_frame_number: Math.floor((metadata.duration_seconds / 2) * metadata.fps),
        },
      ];
    }
  }

  /**
   * Perform OCR on video frames
   */
  public async performOCROnFrames(frames: VideoFrame[]): Promise<VideoFrame[]> {
    const worker = await this.initializeTesseractWorker();

    const framesWithOCR: VideoFrame[] = [];

    for (const frame of frames) {
      try {
        const {
          data: { text },
        } = await worker.recognize(frame.file_path);

        // Only include frames with meaningful text (more than 10 characters)
        const cleanText = text.trim();
        if (cleanText.length > 10) {
          framesWithOCR.push({
            ...frame,
            ocr_text: cleanText,
          });
        }
      } catch (error: any) {
        console.warn(`OCR failed for frame ${frame.frame_number}:`, error.message);
        // Include frame without OCR text
        framesWithOCR.push(frame);
      }
    }

    return framesWithOCR;
  }

  /**
   * Process video file
   * Main entry point for video processing
   */
  public async processVideo(
    videoPath: string,
    options: VideoProcessingOptions = {}
  ): Promise<VideoProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate file exists
      await fs.access(videoPath);

      // Validate format
      if (!this.isSupportedFormat(videoPath)) {
        throw new Error(`Unsupported video format: ${path.extname(videoPath)}`);
      }

      // Extract metadata
      const metadata = await this.extractMetadata(videoPath);

      // Create temporary directory for this video
      const videoId = path.basename(videoPath, path.extname(videoPath));
      const workDir = path.join(this.TEMP_DIR, videoId);
      await fs.mkdir(workDir, { recursive: true });

      // Generate thumbnails
      let thumbnails = { first: '', middle: '', keyFrames: [] as string[] };
      if (options.generateThumbnails !== false) {
        const thumbDir = path.join(workDir, 'thumbnails');
        thumbnails = await this.generateThumbnails(videoPath, metadata, thumbDir);
      }

      // Detect scenes
      let scenes: VideoScene[] = [];
      if (options.detectScenes !== false) {
        const threshold = options.sceneThreshold || 0.4;
        scenes = await this.detectScenes(videoPath, metadata, threshold);
      }

      // Extract frames
      let frames: VideoFrame[] = [];
      if (options.extractFrames !== false) {
        const framesDir = path.join(workDir, 'frames');
        const fps = options.framesPerSecond || 1;
        frames = await this.extractFrames(videoPath, metadata, framesDir, fps);

        // Perform OCR on extracted frames
        if (options.performOCR !== false) {
          frames = await this.performOCROnFrames(frames);
        }
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        success: true,
        metadata,
        frames,
        scenes,
        thumbnails,
        processingTimeMs,
      };
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;

      return {
        success: false,
        metadata: {
          duration_seconds: 0,
          width: 0,
          height: 0,
          fps: 0,
          codec: 'unknown',
          file_format: 'unknown',
          size: 0,
        },
        frames: [],
        scenes: [],
        thumbnails: { first: '', middle: '', keyFrames: [] },
        error: error.message,
        processingTimeMs,
      };
    } finally {
      // Cleanup is optional - caller can decide when to cleanup temp files
    }
  }

  /**
   * Clean up temporary files for a video
   */
  public async cleanupTempFiles(videoId: string): Promise<void> {
    const workDir = path.join(this.TEMP_DIR, videoId);
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error: any) {
      console.warn(`Failed to cleanup temp files for ${videoId}:`, error.message);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const videoProcessingService = new VideoProcessingService();
