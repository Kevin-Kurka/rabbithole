import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * AudioTranscriptionService
 *
 * Handles audio file transcription and analysis.
 * Currently a stub implementation that can be extended with:
 * - OpenAI Whisper API
 * - Local Whisper models
 * - Speaker diarization
 * - Audio feature extraction
 *
 * Future integrations:
 * - Whisper API: https://platform.openai.com/docs/guides/speech-to-text
 * - Local Whisper: https://github.com/openai/whisper
 * - Assembly AI: https://www.assemblyai.com/
 */

export interface AudioTranscriptionResult {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  segments?: AudioSegment[];
  speakers?: SpeakerInfo[];
  confidence?: number;
  processingTime: number;
  error?: string;
}

export interface AudioSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
  speaker?: string;
}

export interface SpeakerInfo {
  id: string;
  label: string;
  segments: number[];
}

export class AudioTranscriptionService {
  private whisperApiKey?: string;
  private useLocalWhisper: boolean;

  constructor() {
    this.whisperApiKey = process.env.OPENAI_API_KEY;
    this.useLocalWhisper = process.env.USE_LOCAL_WHISPER === 'true';

    if (this.whisperApiKey) {
      console.log('✓ AudioTranscriptionService initialized with OpenAI Whisper API');
    } else if (this.useLocalWhisper) {
      console.log('✓ AudioTranscriptionService initialized with local Whisper');
    } else {
      console.log('⚠ AudioTranscriptionService: No transcription backend configured');
    }
  }

  /**
   * Transcribe audio file
   *
   * @param filePath - Path to audio file
   * @param options - Transcription options
   * @returns Promise<AudioTranscriptionResult>
   */
  async transcribeAudio(
    filePath: string,
    options: {
      language?: string;
      speakerDiarization?: boolean;
      timestamps?: boolean;
    } = {}
  ): Promise<AudioTranscriptionResult> {
    const startTime = Date.now();

    try {
      console.log(`Transcribing audio: ${filePath}`);

      // Get audio duration using ffprobe
      const duration = await this.getAudioDuration(filePath);

      // Use OpenAI Whisper API if available
      if (this.whisperApiKey) {
        return await this.transcribeWithWhisperAPI(filePath, options, duration, startTime);
      }

      // Use local Whisper if configured
      if (this.useLocalWhisper) {
        return await this.transcribeWithLocalWhisper(filePath, options, duration, startTime);
      }

      // Fallback: Return stub result
      console.warn('No transcription backend configured. Returning stub result.');
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: 'No transcription service configured. Set OPENAI_API_KEY or USE_LOCAL_WHISPER=true',
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`✗ Audio transcription failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        processingTime,
      };
    }
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  private async transcribeWithWhisperAPI(
    filePath: string,
    options: any,
    duration: number,
    startTime: number
  ): Promise<AudioTranscriptionResult> {
    try {
      const FormData = require('form-data');
      const fs = require('fs');

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('model', 'whisper-1');

      if (options.language) {
        formData.append('language', options.language);
      }

      if (options.timestamps) {
        formData.append('response_format', 'verbose_json');
      }

      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${this.whisperApiKey}`,
          ...formData.getHeaders(),
        },
        timeout: 300000, // 5 minutes
      });

      const processingTime = Date.now() - startTime;

      // Parse response
      const text = response.data.text || response.data.transcript;
      const segments = response.data.segments?.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
        confidence: seg.confidence,
      }));

      console.log(`✓ Audio transcribed in ${processingTime}ms (duration: ${duration}s)`);

      return {
        success: true,
        text,
        language: response.data.language,
        duration,
        segments,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      throw new Error(`Whisper API error: ${error.message}`);
    }
  }

  /**
   * Transcribe using local Whisper installation
   */
  private async transcribeWithLocalWhisper(
    filePath: string,
    options: any,
    duration: number,
    startTime: number
  ): Promise<AudioTranscriptionResult> {
    try {
      // Run whisper command
      const languageFlag = options.language ? `--language ${options.language}` : '';
      const command = `whisper "${filePath}" --model base --output_format json ${languageFlag}`;

      const { stdout, stderr } = await execAsync(command);

      const processingTime = Date.now() - startTime;

      // Parse whisper output
      const outputPath = filePath.replace(/\.[^.]+$/, '.json');
      const fs = require('fs');
      const result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

      console.log(`✓ Audio transcribed with local Whisper in ${processingTime}ms`);

      return {
        success: true,
        text: result.text,
        language: result.language,
        duration,
        segments: result.segments?.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text,
        })),
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      throw new Error(`Local Whisper error: ${error.message}`);
    }
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
      const { stdout } = await execAsync(command);
      return parseFloat(stdout.trim());
    } catch (error: any) {
      console.warn(`Failed to get audio duration: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return [
      'mp3',
      'wav',
      'flac',
      'ogg',
      'm4a',
      'aac',
      'wma',
      'opus',
      'aiff',
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
   * Extract audio from video file
   */
  async extractAudioFromVideo(videoPath: string, outputPath: string): Promise<boolean> {
    try {
      console.log(`Extracting audio from video: ${videoPath}`);

      const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`;
      await execAsync(command);

      console.log(`✓ Audio extracted to: ${outputPath}`);
      return true;
    } catch (error: any) {
      console.error(`✗ Audio extraction failed: ${error.message}`);
      return false;
    }
  }
}

// Export singleton instance
export const audioTranscriptionService = new AudioTranscriptionService();
