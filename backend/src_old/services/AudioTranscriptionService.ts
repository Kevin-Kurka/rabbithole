import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * AudioTranscriptionService
 *
 * Handles audio file transcription and analysis with:
 * - OpenAI Whisper API integration
 * - Local Whisper models support
 * - Speaker diarization (using AssemblyAI or Pyannote)
 * - Timestamp-based segmentation
 * - Multi-language support
 *
 * Integrations:
 * - Whisper API: https://platform.openai.com/docs/guides/speech-to-text
 * - Local Whisper: https://github.com/openai/whisper
 * - AssemblyAI: https://www.assemblyai.com/
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
  private assemblyAIKey?: string;
  private useLocalWhisper: boolean;
  private enableDiarization: boolean;
  private maxFileSizeMB: number;

  constructor() {
    this.whisperApiKey = process.env.OPENAI_API_KEY;
    this.assemblyAIKey = process.env.ASSEMBLYAI_API_KEY;
    this.useLocalWhisper = process.env.USE_LOCAL_WHISPER === 'true';
    this.enableDiarization = process.env.ENABLE_SPEAKER_DIARIZATION === 'true';
    this.maxFileSizeMB = parseInt(process.env.MAX_AUDIO_FILE_SIZE_MB || '25', 10);

    if (this.whisperApiKey) {
      console.log('✓ AudioTranscriptionService initialized with OpenAI Whisper API');
      if (this.assemblyAIKey && this.enableDiarization) {
        console.log('✓ Speaker diarization enabled via AssemblyAI');
      }
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

      // Validate file size
      const fs = require('fs');
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      if (fileSizeMB > this.maxFileSizeMB) {
        throw new Error(`File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${this.maxFileSizeMB}MB)`);
      }

      // Get audio duration using ffprobe
      const duration = await this.getAudioDuration(filePath);

      // If speaker diarization is requested and AssemblyAI is available, use it
      if (options.speakerDiarization && this.assemblyAIKey) {
        return await this.transcribeWithAssemblyAI(filePath, options, duration, startTime);
      }

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
   * Transcribe with speaker diarization using AssemblyAI
   */
  private async transcribeWithAssemblyAI(
    filePath: string,
    options: any,
    duration: number,
    startTime: number
  ): Promise<AudioTranscriptionResult> {
    try {
      const fs = require('fs');

      // Step 1: Upload audio file to AssemblyAI
      console.log('Uploading audio to AssemblyAI...');
      const uploadResponse = await axios.post(
        'https://api.assemblyai.com/v2/upload',
        fs.createReadStream(filePath),
        {
          headers: {
            'authorization': this.assemblyAIKey!,
            'content-type': 'application/octet-stream',
          },
        }
      );

      const audioUrl = uploadResponse.data.upload_url;

      // Step 2: Request transcription with speaker diarization
      console.log('Requesting transcription with speaker diarization...');
      const transcriptResponse = await axios.post(
        'https://api.assemblyai.com/v2/transcript',
        {
          audio_url: audioUrl,
          speaker_labels: true,
          language_code: options.language || 'en',
        },
        {
          headers: {
            'authorization': this.assemblyAIKey!,
            'content-type': 'application/json',
          },
        }
      );

      const transcriptId = transcriptResponse.data.id;

      // Step 3: Poll for completion
      console.log('Waiting for transcription to complete...');
      let transcript: any;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5-second intervals

      while (attempts < maxAttempts) {
        const statusResponse = await axios.get(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
          {
            headers: {
              'authorization': this.assemblyAIKey!,
            },
          }
        );

        transcript = statusResponse.data;

        if (transcript.status === 'completed') {
          break;
        } else if (transcript.status === 'error') {
          throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
        }

        // Wait 5 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Transcription timeout: exceeded maximum wait time');
      }

      const processingTime = Date.now() - startTime;

      // Parse results with speaker diarization
      const speakersMap = new Map<string, SpeakerInfo>();
      const segments: AudioSegment[] = [];

      if (transcript.utterances) {
        transcript.utterances.forEach((utterance: any, index: number) => {
          const speakerId = `speaker_${utterance.speaker}`;

          // Add to speakers map
          if (!speakersMap.has(speakerId)) {
            speakersMap.set(speakerId, {
              id: speakerId,
              label: `Speaker ${utterance.speaker}`,
              segments: [],
            });
          }

          speakersMap.get(speakerId)!.segments.push(index);

          // Add segment
          segments.push({
            start: utterance.start / 1000, // Convert ms to seconds
            end: utterance.end / 1000,
            text: utterance.text,
            confidence: utterance.confidence,
            speaker: speakerId,
          });
        });
      }

      console.log(`✓ Audio transcribed with speaker diarization in ${processingTime}ms`);
      console.log(`  Found ${speakersMap.size} speakers, ${segments.length} utterances`);

      return {
        success: true,
        text: transcript.text,
        language: transcript.language_code,
        duration,
        segments,
        speakers: Array.from(speakersMap.values()),
        confidence: transcript.confidence,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      throw new Error(`AssemblyAI error: ${error.message}`);
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
