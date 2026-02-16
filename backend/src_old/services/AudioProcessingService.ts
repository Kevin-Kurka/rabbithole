import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import OpenAI from 'openai';

/**
 * AudioProcessingService
 *
 * Handles audio transcription using OpenAI Whisper API.
 * Provides high-quality speech-to-text conversion with timestamps.
 *
 * Supported formats: mp3, wav, m4a, webm, mp4, mpga, mpeg, flac, ogg
 *
 * Future enhancements:
 * - Speaker diarization via AssemblyAI integration
 * - Real-time streaming transcription
 * - Multi-language detection and translation
 *
 * OpenAI Whisper API: https://platform.openai.com/docs/guides/speech-to-text
 */

export interface TranscriptSegment {
  segmentOrder: number;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  speakerId?: number; // nullable, for future diarization
  confidence?: number; // nullable, when available
}

export interface AudioTranscription {
  transcriptText: string;
  transcriptJson: any; // Full Whisper API response
  language: string;
  durationSeconds: number;
  processingService: 'whisper' | 'assemblyai';
  processingTimeMs: number;
  wordCount: number;
  speakerCount?: number; // for future diarization
  segments: TranscriptSegment[];
}

export interface AudioProcessingResult extends AudioTranscription {
  success: boolean;
  error?: string;
}

export class AudioProcessingService {
  private openai: OpenAI;
  private whisperModel: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'sk-your-api-key-here') {
      throw new Error(
        'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file'
      );
    }

    this.openai = new OpenAI({ apiKey });
    this.whisperModel = process.env.WHISPER_MODEL || 'whisper-1';
    this.maxRetries = parseInt(process.env.WHISPER_MAX_RETRIES || '3', 10);
    this.retryDelay = parseInt(process.env.WHISPER_RETRY_DELAY || '1000', 10);

    console.log(`✓ AudioProcessingService initialized with model: ${this.whisperModel}`);
  }

  /**
   * Transcribe audio file using OpenAI Whisper API
   *
   * @param filePath - Path to the audio file
   * @param options - Processing options
   * @returns Promise<AudioProcessingResult>
   */
  async transcribeAudio(
    filePath: string,
    options: {
      language?: string; // ISO-639-1 language code (e.g., 'en', 'es')
      prompt?: string; // Optional prompt to guide transcription
      temperature?: number; // 0-1, controls randomness
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    } = {}
  ): Promise<AudioProcessingResult> {
    const startTime = Date.now();

    try {
      console.log(`Transcribing audio file with Whisper: ${filePath}`);

      // Validate file format
      if (!this.isSupportedFormat(filePath)) {
        throw new Error(`Unsupported audio format: ${filePath}`);
      }

      // Read file and create File object for OpenAI API
      const fileBuffer = await readFile(filePath);
      const filename = filePath.split('/').pop() || 'audio.mp3';
      const mimeType = this.getMimeType(filePath);

      // Use Blob constructor which is compatible with OpenAI SDK
      const blob = new Blob([fileBuffer], { type: mimeType });
      const file = new File([blob], filename, { type: mimeType });

      // Transcribe with verbose_json to get timestamps
      const transcription = await this.transcribeWithRetry(file, {
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature || 0,
        response_format: 'verbose_json', // Always use verbose for timestamps
      });

      const processingTime = Date.now() - startTime;

      // Parse segments from verbose response
      const segments = this.parseSegments(transcription);

      // Calculate word count
      const wordCount = transcription.text.split(/\s+/).filter(word => word.length > 0).length;

      // Detect language (Whisper provides this)
      const language = transcription.language || options.language || 'en';

      // Calculate duration from segments
      const durationSeconds = segments.length > 0
        ? Math.max(...segments.map(s => s.endTime))
        : transcription.duration || 0;

      const result: AudioProcessingResult = {
        success: true,
        transcriptText: transcription.text,
        transcriptJson: transcription,
        language,
        durationSeconds,
        processingService: 'whisper',
        processingTimeMs: processingTime,
        wordCount,
        segments,
      };

      console.log(
        `✓ Audio transcribed in ${processingTime}ms ` +
        `(duration: ${durationSeconds.toFixed(1)}s, words: ${wordCount}, language: ${language})`
      );

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      console.error(`✗ Whisper transcription failed: ${error.message}`);

      return {
        success: false,
        transcriptText: '',
        transcriptJson: null,
        language: 'unknown',
        durationSeconds: 0,
        processingService: 'whisper',
        processingTimeMs: processingTime,
        wordCount: 0,
        segments: [],
        error: this.formatError(error),
      };
    }
  }

  /**
   * Transcribe with exponential backoff retry logic
   * Handles rate limits and transient errors
   */
  private async transcribeWithRetry(
    file: File,
    options: {
      language?: string;
      prompt?: string;
      temperature?: number;
      response_format?: string;
    }
  ): Promise<any> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const transcription = await this.openai.audio.transcriptions.create({
          file,
          model: this.whisperModel,
          language: options.language,
          prompt: options.prompt,
          temperature: options.temperature,
          response_format: options.response_format as any,
        });

        return transcription;
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (400-499) except 429 (rate limit)
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(
            `Whisper API attempt ${attempt} failed: ${error.message}. ` +
            `Retrying in ${delay}ms...`
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Parse segments from Whisper verbose_json response
   */
  private parseSegments(transcription: any): TranscriptSegment[] {
    if (!transcription.segments || !Array.isArray(transcription.segments)) {
      // If no segments available, create single segment from full text
      return [
        {
          segmentOrder: 1,
          startTime: 0,
          endTime: transcription.duration || 0,
          text: transcription.text,
        },
      ];
    }

    return transcription.segments.map((segment: any, index: number) => ({
      segmentOrder: index + 1,
      startTime: segment.start || 0,
      endTime: segment.end || 0,
      text: segment.text || '',
      confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : undefined,
    }));
  }

  /**
   * Format error message for user-friendly display
   */
  private formatError(error: any): string {
    if (error.status === 413) {
      return 'Audio file too large. Maximum size is 25MB.';
    }

    if (error.status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    }

    if (error.status === 401) {
      return 'Invalid OpenAI API key. Please check configuration.';
    }

    if (error.response) {
      return `Whisper API error: ${error.status} - ${error.response.data?.error?.message || error.message}`;
    }

    return `Transcription failed: ${error.message}`;
  }

  /**
   * Get MIME type from file path
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      webm: 'audio/webm',
      mp4: 'audio/mp4',
      mpga: 'audio/mpeg',
      mpeg: 'audio/mpeg',
      flac: 'audio/flac',
      ogg: 'audio/ogg',
    };

    return mimeTypes[ext] || 'audio/mpeg';
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['mp3', 'wav', 'm4a', 'webm', 'mp4', 'mpga', 'mpeg', 'flac', 'ogg'];
  }

  /**
   * Check if file format is supported
   */
  isSupportedFormat(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return this.getSupportedFormats().includes(ext);
  }

  /**
   * Estimate processing time based on audio duration
   * Whisper typically processes audio at 10x real-time speed
   */
  estimateProcessingTime(durationSeconds: number): number {
    return Math.ceil((durationSeconds / 10) * 1000); // milliseconds
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check to verify OpenAI API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Verify API key is valid by listing models
      await this.openai.models.list();
      return true;
    } catch (error: any) {
      console.error(`Whisper health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current model information
   */
  getModelInfo(): { model: string; maxFileSize: number; maxRetries: number } {
    return {
      model: this.whisperModel,
      maxFileSize: 25 * 1024 * 1024, // 25MB (Whisper API limit)
      maxRetries: this.maxRetries,
    };
  }
}

// Export singleton instance
export const audioService = new AudioProcessingService();

/**
 * NOTE: Future Enhancement - Speaker Diarization
 *
 * AssemblyAI provides superior speaker diarization capabilities:
 *
 * To integrate AssemblyAI:
 * 1. Install: npm install assemblyai
 * 2. Add ASSEMBLYAI_API_KEY to .env
 * 3. Implement AssemblyAIDiarizationService
 * 4. Update processingService field to 'assemblyai'
 * 5. Populate speaker_id in TranscriptSegments table
 *
 * Example AssemblyAI usage:
 *
 * import { AssemblyAI } from 'assemblyai';
 *
 * const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
 * const transcript = await client.transcripts.create({
 *   audio_url: fileUrl,
 *   speaker_labels: true,
 * });
 *
 * // Parse speakers from transcript.utterances
 * segments = transcript.utterances.map(u => ({
 *   text: u.text,
 *   startTime: u.start / 1000,
 *   endTime: u.end / 1000,
 *   speakerId: u.speaker,
 *   confidence: u.confidence,
 * }));
 */
