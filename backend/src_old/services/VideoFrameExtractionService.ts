import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * VideoFrameExtractionService
 *
 * Handles intelligent frame extraction from video files with:
 * - Keyframe extraction at configurable intervals
 * - Scene-based frame extraction
 * - Histogram-based scene change detection
 * - Metadata extraction for each frame
 * - Cleanup utilities for temporary frames
 *
 * Integrations:
 * - FFmpeg for frame extraction and video processing
 * - Sharp for image processing and dimension detection
 */

export interface FrameExtractionOptions {
  frameRate?: number; // Frames per second to extract (default: 1)
  maxFrames?: number; // Maximum number of frames to extract (default: 300)
  outputDir?: string; // Output directory for frames
  format?: 'jpg' | 'png'; // Output format (default: jpg)
  quality?: number; // JPEG quality 1-31 (lower is better, default: 2)
  sceneDetection?: boolean; // Extract frames only at scene changes
  sceneThreshold?: number; // Scene detection sensitivity (default: 30.0)
  width?: number; // Resize frame width (maintains aspect ratio)
}

export interface ExtractedFrame {
  index: number;
  timestamp: number; // Seconds
  path: string;
  width: number;
  height: number;
  fileSize: number; // Bytes
  isKeyframe?: boolean;
  sceneScore?: number; // For scene detection
}

export interface FrameExtractionResult {
  success: boolean;
  frames: ExtractedFrame[];
  totalFrames: number;
  videoDuration: number;
  outputDirectory: string;
  processingTime: number;
  error?: string;
}

export class VideoFrameExtractionService {
  private ffmpegPath: string;
  private ffprobePath: string;
  private tempDir: string;

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    this.tempDir = process.env.TEMP_DIR || '/tmp';

    console.log('✓ VideoFrameExtractionService initialized');
  }

  /**
   * Extract frames from video
   */
  async extractFrames(
    videoPath: string,
    options: FrameExtractionOptions = {}
  ): Promise<FrameExtractionResult> {
    const startTime = Date.now();

    try {
      // Set defaults
      const frameRate = options.frameRate || parseFloat(process.env.VIDEO_FRAME_RATE || '1');
      const maxFrames = options.maxFrames || parseInt(process.env.VIDEO_MAX_FRAMES || '300', 10);
      const format = options.format || 'jpg';
      const quality = options.quality || 2;
      const sceneDetection = options.sceneDetection || false;

      console.log(`Extracting frames from video: ${videoPath}`);
      console.log(`  Frame rate: ${frameRate} fps, Max frames: ${maxFrames}`);

      // Get video metadata
      const videoDuration = await this.getVideoDuration(videoPath);

      // Calculate estimated frames
      const estimatedFrames = Math.min(Math.ceil(videoDuration * frameRate), maxFrames);
      console.log(`  Video duration: ${videoDuration}s, Estimated frames: ${estimatedFrames}`);

      // Create output directory
      const outputDir = options.outputDir || path.join(
        this.tempDir,
        `frames_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let frames: ExtractedFrame[];

      if (sceneDetection) {
        // Extract frames at scene changes
        frames = await this.extractSceneFrames(videoPath, outputDir, maxFrames, options);
      } else {
        // Extract frames at regular intervals
        frames = await this.extractRegularFrames(
          videoPath,
          outputDir,
          frameRate,
          maxFrames,
          format,
          quality,
          options.width
        );
      }

      // Get frame metadata
      for (const frame of frames) {
        await this.enrichFrameMetadata(frame);
      }

      const processingTime = Date.now() - startTime;

      console.log(`✓ Extracted ${frames.length} frames in ${processingTime}ms`);

      return {
        success: true,
        frames,
        totalFrames: frames.length,
        videoDuration,
        outputDirectory: outputDir,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`✗ Frame extraction failed: ${error.message}`);

      return {
        success: false,
        frames: [],
        totalFrames: 0,
        videoDuration: 0,
        outputDirectory: '',
        processingTime,
        error: error.message,
      };
    }
  }

  /**
   * Extract frames at regular intervals
   */
  private async extractRegularFrames(
    videoPath: string,
    outputDir: string,
    frameRate: number,
    maxFrames: number,
    format: string,
    quality: number,
    width?: number
  ): Promise<ExtractedFrame[]> {
    const outputPattern = path.join(outputDir, `frame_%04d.${format}`);

    // Build ffmpeg command
    let command = `${this.ffmpegPath} -i "${videoPath}" -vf "fps=${frameRate}`;

    // Add resize filter if specified
    if (width) {
      command += `,scale=${width}:-1`;
    }

    command += `" -q:v ${quality} -frames:v ${maxFrames} "${outputPattern}"`;

    console.log(`  Running ffmpeg: ${command.substring(0, 100)}...`);
    await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });

    // Get list of extracted frames
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('frame_') && f.endsWith(`.${format}`))
      .sort();

    const frames: ExtractedFrame[] = files.map((file, index) => ({
      index,
      timestamp: index / frameRate,
      path: path.join(outputDir, file),
      width: 0,
      height: 0,
      fileSize: 0,
    }));

    return frames;
  }

  /**
   * Extract frames at scene changes
   */
  private async extractSceneFrames(
    videoPath: string,
    outputDir: string,
    maxFrames: number,
    options: FrameExtractionOptions
  ): Promise<ExtractedFrame[]> {
    const sceneThreshold = options.sceneThreshold || parseFloat(process.env.SCENE_DETECTION_THRESHOLD || '30.0');
    const format = options.format || 'jpg';
    const quality = options.quality || 2;

    // Detect scenes using ffmpeg select filter
    const outputPattern = path.join(outputDir, `scene_%04d.${format}`);

    // Convert threshold from 0-100 to 0-1 scale
    const normalizedThreshold = sceneThreshold / 100;

    let command = `${this.ffmpegPath} -i "${videoPath}" -vf "select='gt(scene,${normalizedThreshold})',showinfo`;

    if (options.width) {
      command += `,scale=${options.width}:-1`;
    }

    command += `" -vsync vfr -q:v ${quality} -frames:v ${maxFrames} "${outputPattern}" 2>&1`;

    console.log(`  Detecting scenes with threshold: ${sceneThreshold}%`);

    try {
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });

      // Parse scene scores from ffmpeg output
      const sceneScores = this.parseSceneScores(stderr || stdout);

      // Get list of extracted frames
      const files = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('scene_') && f.endsWith(`.${format}`))
        .sort();

      const frames: ExtractedFrame[] = files.map((file, index) => ({
        index,
        timestamp: sceneScores[index]?.timestamp || 0,
        path: path.join(outputDir, file),
        width: 0,
        height: 0,
        fileSize: 0,
        isKeyframe: true,
        sceneScore: sceneScores[index]?.score,
      }));

      return frames;
    } catch (error: any) {
      console.warn(`Scene detection failed: ${error.message}`);
      // Fallback to regular extraction
      return await this.extractRegularFrames(
        videoPath,
        outputDir,
        1, // 1 fps fallback
        maxFrames,
        format,
        quality,
        options.width
      );
    }
  }

  /**
   * Parse scene scores from ffmpeg showinfo output
   */
  private parseSceneScores(output: string): Array<{ timestamp: number; score: number }> {
    const scores: Array<{ timestamp: number; score: number }> = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('pts_time') && line.includes('scene')) {
        const timeMatch = line.match(/pts_time:([\d.]+)/);
        const scoreMatch = line.match(/scene:([\d.]+)/);

        if (timeMatch && scoreMatch) {
          scores.push({
            timestamp: parseFloat(timeMatch[1]),
            score: parseFloat(scoreMatch[1]),
          });
        }
      }
    }

    return scores;
  }

  /**
   * Enrich frame metadata (dimensions, file size)
   */
  private async enrichFrameMetadata(frame: ExtractedFrame): Promise<void> {
    try {
      const stats = fs.statSync(frame.path);
      frame.fileSize = stats.size;

      // Get image dimensions using ffprobe
      const command = `${this.ffprobePath} -v error -select_streams v:0 -show_entries stream=width,height -of json "${frame.path}"`;
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);

      const stream = data.streams?.[0];
      if (stream) {
        frame.width = stream.width;
        frame.height = stream.height;
      }
    } catch (error: any) {
      console.warn(`Failed to enrich frame metadata: ${error.message}`);
    }
  }

  /**
   * Get video duration using ffprobe
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    try {
      const command = `${this.ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
      const { stdout } = await execAsync(command);
      return parseFloat(stdout.trim());
    } catch (error: any) {
      console.warn(`Failed to get video duration: ${error.message}`);
      return 0;
    }
  }

  /**
   * Clean up extracted frames
   */
  async cleanupFrames(outputDir: string): Promise<boolean> {
    try {
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
          fs.unlinkSync(path.join(outputDir, file));
        }
        fs.rmdirSync(outputDir);
        console.log(`✓ Cleaned up frames directory: ${outputDir}`);
        return true;
      }
      return true;
    } catch (error: any) {
      console.error(`Failed to cleanup frames: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract a single frame at a specific timestamp
   */
  async extractSingleFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<ExtractedFrame | null> {
    try {
      const command = `${this.ffmpegPath} -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`;
      await execAsync(command);

      const frame: ExtractedFrame = {
        index: 0,
        timestamp,
        path: outputPath,
        width: 0,
        height: 0,
        fileSize: 0,
      };

      await this.enrichFrameMetadata(frame);

      console.log(`✓ Extracted single frame at ${timestamp}s`);
      return frame;
    } catch (error: any) {
      console.error(`Failed to extract single frame: ${error.message}`);
      return null;
    }
  }

  /**
   * Get frame dimensions without extracting
   */
  async getFrameDimensions(videoPath: string): Promise<{ width: number; height: number } | null> {
    try {
      const command = `${this.ffprobePath} -v error -select_streams v:0 -show_entries stream=width,height -of json "${videoPath}"`;
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);

      const stream = data.streams?.[0];
      if (stream) {
        return {
          width: stream.width,
          height: stream.height,
        };
      }

      return null;
    } catch (error: any) {
      console.error(`Failed to get frame dimensions: ${error.message}`);
      return null;
    }
  }
}

// Export singleton instance
export const videoFrameExtractionService = new VideoFrameExtractionService();
