import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * VideoAnalysisService
 *
 * Handles video file analysis and processing.
 * Currently a stub implementation that can be extended with:
 * - Frame extraction
 * - Scene detection
 * - Object detection
 * - OCR on video frames
 * - Audio extraction
 *
 * Future integrations:
 * - FFmpeg for video processing
 * - OpenCV for frame analysis
 * - TensorFlow/PyTorch for ML-based analysis
 * - Cloud Vision APIs (Google, AWS Rekognition)
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
  thumbnail?: string; // Path or base64
  audioTrack?: boolean;
  processingTime: number;
  error?: string;
}

export interface ExtractedFrame {
  timestamp: number;
  framePath: string;
  width: number;
  height: number;
}

export interface SceneInfo {
  startTime: number;
  endTime: number;
  frameCount: number;
  keyFrame?: string;
}

export class VideoAnalysisService {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

    console.log('✓ VideoAnalysisService initialized');
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
      frameInterval?: number; // seconds
      detectScenes?: boolean;
      generateThumbnail?: boolean;
      extractAudio?: boolean;
    } = {}
  ): Promise<VideoAnalysisResult> {
    const startTime = Date.now();

    try {
      console.log(`Analyzing video: ${filePath}`);

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

      // Extract frames if requested
      if (options.extractFrames) {
        result.frames = await this.extractFrames(
          filePath,
          options.frameInterval || 10
        );
      }

      // Generate thumbnail if requested
      if (options.generateThumbnail) {
        result.thumbnail = await this.generateThumbnail(filePath);
      }

      // Detect scenes if requested
      if (options.detectScenes) {
        result.scenes = await this.detectScenes(filePath);
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      console.log(
        `✓ Video analyzed in ${processingTime}ms ` +
        `(duration: ${metadata.duration}s, frames: ${result.frames?.length || 0})`
      );

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
        timestamp: index * intervalSeconds,
        framePath: path.join(outputDir, file),
        width: 0, // Would need to read image to get dimensions
        height: 0,
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
