import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { videoFrameExtractionService, ExtractedFrame } from './VideoFrameExtractionService';
import { objectDetectionService, DetectedObject } from './ObjectDetectionService';

const execAsync = promisify(exec);

/**
 * VideoAnalysisService
 *
 * Comprehensive video file analysis and processing with:
 * - Frame extraction (regular intervals or scene-based)
 * - Scene change detection using histogram analysis
 * - Object detection using TensorFlow.js COCO-SSD
 * - Metadata extraction (duration, resolution, codec, bitrate)
 * - Thumbnail generation
 * - Audio track detection
 *
 * Integrations:
 * - FFmpeg for video processing and frame extraction
 * - TensorFlow.js for object detection
 * - VideoFrameExtractionService for intelligent frame sampling
 * - ObjectDetectionService for ML-based object recognition
 */

export interface VideoAnalysisResult {
  success: boolean;
  duration?: number;
  frameRate?: number;
  resolution?: { width: number; height: number };
  codec?: string;
  bitrate?: number;
  frames?: ExtractedFrame[];
  scenes?: SceneInfo[];
  detectedObjects?: VideoObjectDetection;
  thumbnail?: string; // Path or base64
  audioTrack?: boolean;
  processingTime: number;
  error?: string;
}

export interface SceneInfo {
  startTime: number;
  endTime: number;
  frameCount: number;
  keyFrame?: string;
  detectedObjects?: DetectedObject[];
}

export interface VideoObjectDetection {
  totalObjects: number;
  totalFrames: number;
  avgObjectsPerFrame: number;
  allClasses: string[];
  classFrequency: Map<string, number>;
  frameResults: Map<number, DetectedObject[]>; // frame index -> objects
}

export class VideoAnalysisService {
  private ffmpegPath: string;
  private ffprobePath: string;
  private enableObjectDetection: boolean;
  private enableVideoAnalysis: boolean;

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    this.enableObjectDetection = process.env.ENABLE_OBJECT_DETECTION === 'true';
    this.enableVideoAnalysis = process.env.ENABLE_VIDEO_ANALYSIS !== 'false'; // Default true

    console.log('✓ VideoAnalysisService initialized');
    console.log(`  Video analysis: ${this.enableVideoAnalysis ? 'enabled' : 'disabled'}`);
    console.log(`  Object detection: ${this.enableObjectDetection ? 'enabled' : 'disabled'}`);
  }

  /**
   * Analyze video file
   *
   * @param filePath - Path to video file
   * @param options - Analysis options
   * @returns Promise<VideoAnalysisResult>
   */
  async analyzeVideo(
    filePath: string,
    options: {
      extractFrames?: boolean;
      frameRate?: number; // Frames per second
      maxFrames?: number; // Maximum frames to extract
      detectScenes?: boolean;
      detectObjects?: boolean;
      generateThumbnail?: boolean;
      extractAudio?: boolean;
    } = {}
  ): Promise<VideoAnalysisResult> {
    const startTime = Date.now();

    try {
      console.log(`Analyzing video: ${filePath}`);

      if (!this.enableVideoAnalysis) {
        return {
          success: false,
          error: 'Video analysis is disabled (set ENABLE_VIDEO_ANALYSIS=true)',
          processingTime: Date.now() - startTime,
        };
      }

      // Get video metadata
      const metadata = await this.getVideoMetadata(filePath);

      const result: VideoAnalysisResult = {
        success: true,
        duration: metadata.duration,
        frameRate: metadata.frameRate,
        resolution: metadata.resolution,
        codec: metadata.codec,
        bitrate: metadata.bitrate,
        audioTrack: metadata.hasAudio,
        frames: [],
        scenes: [],
        processingTime: 0,
      };

      // Extract frames using VideoFrameExtractionService
      if (options.extractFrames) {
        const frameResult = await videoFrameExtractionService.extractFrames(filePath, {
          frameRate: options.frameRate || 1,
          maxFrames: options.maxFrames || 300,
          sceneDetection: options.detectScenes || false,
        });

        if (frameResult.success) {
          result.frames = frameResult.frames;
          console.log(`✓ Extracted ${frameResult.frames.length} frames`);

          // Perform object detection on extracted frames if enabled
          if (options.detectObjects && this.enableObjectDetection) {
            result.detectedObjects = await this.detectObjectsInFrames(frameResult.frames);
          }

          // Cleanup frames directory after analysis
          // (comment out if you want to keep frames)
          // await videoFrameExtractionService.cleanupFrames(frameResult.outputDirectory);
        }
      }

      // Generate thumbnail if requested
      if (options.generateThumbnail) {
        result.thumbnail = await this.generateThumbnail(filePath);
      }

      // Detect scenes if requested (and frames weren't already extracted with scene detection)
      if (options.detectScenes && !options.extractFrames) {
        result.scenes = await this.detectScenes(filePath);
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      console.log(
        `✓ Video analyzed in ${processingTime}ms ` +
        `(duration: ${metadata.duration}s, frames: ${result.frames?.length || 0})`
      );

      if (result.detectedObjects) {
        console.log(`  Detected ${result.detectedObjects.totalObjects} objects across ${result.detectedObjects.totalFrames} frames`);
        console.log(`  Classes: ${result.detectedObjects.allClasses.join(', ')}`);
      }

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`✗ Video analysis failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        processingTime,
      };
    }
  }

  /**
   * Detect objects in extracted video frames
   */
  private async detectObjectsInFrames(frames: ExtractedFrame[]): Promise<VideoObjectDetection> {
    console.log(`Running object detection on ${frames.length} frames...`);

    const frameResults = new Map<number, DetectedObject[]>();
    const allDetectionResults: any[] = [];

    for (const frame of frames) {
      const detection = await objectDetectionService.detectObjects(frame.path);

      if (detection.success) {
        frameResults.set(frame.index, detection.objects);
        allDetectionResults.push(detection);
      }
    }

    // Get summary statistics
    const summary = objectDetectionService.getDetectionSummary(allDetectionResults);

    return {
      totalObjects: summary.totalObjects,
      totalFrames: summary.totalFrames,
      avgObjectsPerFrame: summary.avgObjectsPerFrame,
      allClasses: summary.allClasses,
      classFrequency: summary.classFrequency,
      frameResults,
    };
  }

  /**
   * Get video metadata using ffprobe
   */
  private async getVideoMetadata(filePath: string): Promise<{
    duration: number;
    frameRate: number;
    resolution: { width: number; height: number };
    codec: string;
    bitrate: number;
    hasAudio: boolean;
  }> {
    try {
      const command = `${this.ffprobePath} -v error -select_streams v:0 -show_entries stream=width,height,codec_name,r_frame_rate,bit_rate -of json "${filePath}"`;
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);

      const videoStream = data.streams?.[0];
      if (!videoStream) {
        throw new Error('No video stream found');
      }

      // Get duration
      const durationCommand = `${this.ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
      const { stdout: durationOutput } = await execAsync(durationCommand);
      const duration = parseFloat(durationOutput.trim());

      // Parse frame rate
      const frameRateParts = videoStream.r_frame_rate.split('/');
      const frameRate = parseInt(frameRateParts[0]) / parseInt(frameRateParts[1]);

      // Check for audio
      const audioCommand = `${this.ffprobePath} -v error -select_streams a -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
      const { stdout: audioOutput } = await execAsync(audioCommand);
      const hasAudio = audioOutput.trim() === 'audio';

      return {
        duration,
        frameRate,
        resolution: {
          width: videoStream.width,
          height: videoStream.height,
        },
        codec: videoStream.codec_name,
        bitrate: parseInt(videoStream.bit_rate || '0'),
        hasAudio,
      };
    } catch (error: any) {
      console.error(`Failed to get video metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract frames from video at specified intervals
   */
  private async extractFrames(
    filePath: string,
    intervalSeconds: number
  ): Promise<ExtractedFrame[]> {
    try {
      const outputDir = path.join(path.dirname(filePath), 'frames');

      // Create frames directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPattern = path.join(outputDir, 'frame_%04d.jpg');

      // Extract frames using ffmpeg
      const command = `${this.ffmpegPath} -i "${filePath}" -vf fps=1/${intervalSeconds} "${outputPattern}"`;
      await execAsync(command);

      // Get list of extracted frames
      const files = fs.readdirSync(outputDir).filter(f => f.startsWith('frame_'));

      const frames: ExtractedFrame[] = files.map((file, index) => ({
        index,
        timestamp: index * intervalSeconds,
        path: path.join(outputDir, file),
        width: 0, // Would need to read image to get dimensions
        height: 0,
        fileSize: fs.statSync(path.join(outputDir, file)).size,
      }));

      console.log(`✓ Extracted ${frames.length} frames`);
      return frames;
    } catch (error: any) {
      console.error(`Failed to extract frames: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate thumbnail from video
   */
  private async generateThumbnail(filePath: string): Promise<string> {
    try {
      const outputPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');

      // Extract frame at 10% of video duration
      const command = `${this.ffmpegPath} -i "${filePath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}"`;
      await execAsync(command);

      console.log(`✓ Thumbnail generated: ${outputPath}`);
      return outputPath;
    } catch (error: any) {
      console.error(`Failed to generate thumbnail: ${error.message}`);
      return '';
    }
  }

  /**
   * Detect scene changes in video
   */
  private async detectScenes(filePath: string): Promise<SceneInfo[]> {
    try {
      // Use ffmpeg scene detection
      const command = `${this.ffmpegPath} -i "${filePath}" -filter:v "select='gt(scene,0.4)',showinfo" -f null - 2>&1 | grep showinfo`;
      const { stdout } = await execAsync(command);

      // Parse scene detection output (this is a simplified implementation)
      const scenes: SceneInfo[] = [];
      const lines = stdout.split('\n').filter(l => l.includes('pts_time'));

      for (let i = 0; i < lines.length - 1; i++) {
        const startMatch = lines[i].match(/pts_time:([\d.]+)/);
        const endMatch = lines[i + 1].match(/pts_time:([\d.]+)/);

        if (startMatch && endMatch) {
          scenes.push({
            startTime: parseFloat(startMatch[1]),
            endTime: parseFloat(endMatch[1]),
            frameCount: 0,
          });
        }
      }

      console.log(`✓ Detected ${scenes.length} scenes`);
      return scenes;
    } catch (error: any) {
      console.warn(`Scene detection not available: ${error.message}`);
      return [];
    }
  }

  /**
   * Get supported video formats
   */
  getSupportedFormats(): string[] {
    return [
      'mp4',
      'avi',
      'mov',
      'mkv',
      'wmv',
      'flv',
      'webm',
      'm4v',
      'mpg',
      'mpeg',
    ];
  }

  /**
   * Check if file format is supported
   */
  isSupportedFormat(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return this.getSupportedFormats().includes(ext);
  }

  /**
   * Health check to verify ffmpeg/ffprobe availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      await execAsync(`${this.ffmpegPath} -version`);
      await execAsync(`${this.ffprobePath} -version`);
      return true;
    } catch (error: any) {
      console.error(`FFmpeg/FFprobe not available: ${error.message}`);
      return false;
    }
  }
}

// Export singleton instance
export const videoAnalysisService = new VideoAnalysisService();
