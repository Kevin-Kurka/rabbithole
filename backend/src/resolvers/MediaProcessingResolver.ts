import { Resolver, Query, Mutation, Subscription, Arg, Ctx, Int, Field, ObjectType, InputType, Root, PubSub, PubSubEngine } from 'type-graphql';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';
import type { FileUpload } from 'graphql-upload/processRequest.mjs';
import { mediaQueueService } from '../services/MediaQueueService';
import { audioTranscriptionService } from '../services/AudioTranscriptionService';
import { videoAnalysisService } from '../services/VideoAnalysisService';
import { JobStatusService } from '../services/JobStatusService';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * MediaProcessingResolver
 *
 * GraphQL resolver for media processing operations:
 * - Upload and queue audio/video files for processing
 * - Query processing status and results
 * - Retrieve transcriptions and video analysis data
 *
 * Integrations:
 * - MediaQueueService for async job management
 * - AudioTranscriptionService for direct transcription
 * - VideoAnalysisService for direct video analysis
 * - PostgreSQL for result storage
 */

@ObjectType()
class MediaProcessingJob {
  @Field()
  jobId: string;

  @Field()
  fileId: string;

  @Field()
  status: string; // 'queued', 'processing', 'completed', 'failed'

  @Field({ nullable: true })
  progress?: number; // 0-100

  @Field({ nullable: true })
  error?: string;

  @Field({ nullable: true })
  result?: string; // JSON-serialized result
}

@ObjectType()
class TranscriptionSegment {
  @Field()
  text: string;

  @Field()
  timestamp: number;

  @Field()
  duration: number;

  @Field({ nullable: true })
  speaker?: string;

  @Field({ nullable: true })
  confidence?: number;
}

@ObjectType()
class Speaker {
  @Field()
  id: string;

  @Field()
  label: string;

  @Field(() => [Int])
  segments: number[];
}

@ObjectType()
class AudioTranscriptionResult {
  @Field()
  success: boolean;

  @Field()
  fullText: string;

  @Field(() => [TranscriptionSegment])
  segments: TranscriptionSegment[];

  @Field(() => [Speaker], { nullable: true })
  speakers?: Speaker[];

  @Field({ nullable: true })
  language?: string;

  @Field({ nullable: true })
  duration?: number;

  @Field()
  processingTime: number;

  @Field({ nullable: true })
  error?: string;
}

@ObjectType()
class DetectedObject {
  @Field()
  class: string;

  @Field()
  confidence: number;

  @Field()
  x: number;

  @Field()
  y: number;

  @Field()
  width: number;

  @Field()
  height: number;
}

@ObjectType()
class ExtractedFrame {
  @Field()
  index: number;

  @Field()
  timestamp: number;

  @Field()
  path: string;

  @Field()
  width: number;

  @Field()
  height: number;

  @Field()
  fileSize: number;

  @Field({ nullable: true })
  isKeyframe?: boolean;

  @Field({ nullable: true })
  sceneScore?: number;
}

@ObjectType()
class VideoObjectDetectionSummary {
  @Field()
  totalObjects: number;

  @Field()
  totalFrames: number;

  @Field()
  avgObjectsPerFrame: number;

  @Field(() => [String])
  allClasses: string[];
}

@ObjectType()
class VideoAnalysisResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  duration?: number;

  @Field({ nullable: true })
  frameRate?: number;

  @Field({ nullable: true })
  width?: number;

  @Field({ nullable: true })
  height?: number;

  @Field({ nullable: true })
  codec?: string;

  @Field({ nullable: true })
  bitrate?: number;

  @Field(() => [ExtractedFrame], { nullable: true })
  frames?: ExtractedFrame[];

  @Field(() => VideoObjectDetectionSummary, { nullable: true })
  detectedObjects?: VideoObjectDetectionSummary;

  @Field({ nullable: true })
  thumbnail?: string;

  @Field({ nullable: true })
  audioTrack?: boolean;

  @Field()
  processingTime: number;

  @Field({ nullable: true })
  error?: string;
}

@InputType()
class AudioTranscriptionOptions {
  @Field({ nullable: true })
  language?: string;

  @Field({ nullable: true })
  speakerDiarization?: boolean;
}

@InputType()
class VideoAnalysisOptions {
  @Field({ nullable: true })
  extractFrames?: boolean;

  @Field({ nullable: true })
  frameRate?: number;

  @Field({ nullable: true })
  maxFrames?: number;

  @Field({ nullable: true })
  detectScenes?: boolean;

  @Field({ nullable: true })
  detectObjects?: boolean;

  @Field({ nullable: true })
  generateThumbnail?: boolean;
}

@Resolver()
export class MediaProcessingResolver {
  /**
   * Upload and process audio file (async via queue)
   */
  @Mutation(() => MediaProcessingJob)
  async uploadAndTranscribeAudio(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Ctx() { pool, pubSub }: { pool: Pool; pubSub: PubSubEngine },
    @Arg('options', () => AudioTranscriptionOptions, { nullable: true }) options?: AudioTranscriptionOptions
  ): Promise<MediaProcessingJob> {
    try {
      const { createReadStream, filename, mimetype } = await file;

      // Validate file type
      const supportedFormats = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac', 'audio/ogg'];
      if (!supportedFormats.includes(mimetype)) {
        throw new Error(`Unsupported audio format: ${mimetype}. Supported formats: ${supportedFormats.join(', ')}`);
      }

      // Generate unique file ID
      const fileId = uuidv4();
      const jobId = uuidv4();
      const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, `${fileId}_${filename}`);

      // Save file to disk
      await new Promise<void>((resolve, reject) => {
        const stream = createReadStream();
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      // Create job status
      const jobStatusService = new JobStatusService(pool, pubSub);
      await jobStatusService.createJob(jobId, fileId, 'audio', filePath, {
        language: options?.language,
        speakerDiarization: options?.speakerDiarization,
      });

      // Queue for processing
      await mediaQueueService.enqueueMediaProcessing(
        fileId,
        'audio',
        {
          language: options?.language,
          speakerDiarization: options?.speakerDiarization,
        },
        5 // priority
      );

      console.log(`Audio file queued for transcription: ${jobId}`);

      return {
        jobId,
        fileId,
        status: 'queued',
        progress: 0,
      };
    } catch (error: any) {
      console.error('Failed to queue audio transcription:', error);
      throw new Error(`Failed to queue audio transcription: ${error.message}`);
    }
  }

  /**
   * Upload and analyze video file (async via queue)
   */
  @Mutation(() => MediaProcessingJob)
  async uploadAndAnalyzeVideo(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Ctx() { pool, pubSub }: { pool: Pool; pubSub: PubSubEngine },
    @Arg('options', () => VideoAnalysisOptions, { nullable: true }) options?: VideoAnalysisOptions
  ): Promise<MediaProcessingJob> {
    try {
      const { createReadStream, filename, mimetype } = await file;

      // Validate file type
      const supportedFormats = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!supportedFormats.includes(mimetype)) {
        throw new Error(`Unsupported video format: ${mimetype}. Supported formats: ${supportedFormats.join(', ')}`);
      }

      // Generate unique file ID
      const fileId = uuidv4();
      const jobId = uuidv4();
      const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, `${fileId}_${filename}`);

      // Save file to disk
      await new Promise<void>((resolve, reject) => {
        const stream = createReadStream();
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      // Create job status
      const jobStatusService = new JobStatusService(pool, pubSub);
      await jobStatusService.createJob(jobId, fileId, 'video', filePath, {
        extractFrames: options?.extractFrames,
        frameRate: options?.frameRate,
        maxFrames: options?.maxFrames,
        detectScenes: options?.detectScenes,
        detectObjects: options?.detectObjects,
        generateThumbnail: options?.generateThumbnail,
      });

      // Queue for processing
      await mediaQueueService.enqueueMediaProcessing(
        fileId,
        'video',
        {
          extractFrames: options?.extractFrames,
          frameRate: options?.frameRate,
          maxFrames: options?.maxFrames,
          detectScenes: options?.detectScenes,
          detectObjects: options?.detectObjects,
          generateThumbnail: options?.generateThumbnail,
        },
        5 // priority
      );

      console.log(`Video file queued for analysis: ${jobId}`);

      return {
        jobId,
        fileId,
        status: 'queued',
        progress: 0,
      };
    } catch (error: any) {
      console.error('Failed to queue video analysis:', error);
      throw new Error(`Failed to queue video analysis: ${error.message}`);
    }
  }

  /**
   * Transcribe audio file directly (synchronous, not via queue)
   */
  @Mutation(() => AudioTranscriptionResult)
  async transcribeAudio(
    @Arg('filePath') filePath: string,
    @Arg('options', () => AudioTranscriptionOptions, { nullable: true }) options?: AudioTranscriptionOptions
  ): Promise<AudioTranscriptionResult> {
    try {
      const result = await audioTranscriptionService.transcribeAudio(filePath, {
        language: options?.language,
        speakerDiarization: options?.speakerDiarization,
      });

      return {
        success: result.success,
        fullText: result.text || '',
        segments: (result.segments || []).map(s => ({
          text: s.text,
          timestamp: s.start,
          duration: s.end - s.start,
          speaker: s.speaker,
          confidence: s.confidence,
        })),
        speakers: result.speakers?.map(s => ({
          id: s.id,
          label: s.label,
          segments: s.segments,
        })),
        language: result.language,
        duration: result.duration,
        processingTime: result.processingTime,
        error: result.error,
      };
    } catch (error: any) {
      console.error('Failed to transcribe audio:', error);
      return {
        success: false,
        fullText: '',
        segments: [],
        processingTime: 0,
        error: error.message,
      };
    }
  }

  /**
   * Analyze video file directly (synchronous, not via queue)
   */
  @Mutation(() => VideoAnalysisResult)
  async analyzeVideo(
    @Arg('filePath') filePath: string,
    @Arg('options', () => VideoAnalysisOptions, { nullable: true }) options?: VideoAnalysisOptions
  ): Promise<VideoAnalysisResult> {
    try {
      const result = await videoAnalysisService.analyzeVideo(filePath, {
        extractFrames: options?.extractFrames,
        frameRate: options?.frameRate,
        maxFrames: options?.maxFrames,
        detectScenes: options?.detectScenes,
        detectObjects: options?.detectObjects,
        generateThumbnail: options?.generateThumbnail,
      });

      return {
        success: result.success,
        duration: result.duration,
        frameRate: result.frameRate,
        width: result.resolution?.width,
        height: result.resolution?.height,
        codec: result.codec,
        bitrate: result.bitrate,
        frames: result.frames?.map(f => ({
          index: f.index,
          timestamp: f.timestamp,
          path: f.path,
          width: f.width,
          height: f.height,
          fileSize: f.fileSize,
          isKeyframe: f.isKeyframe,
          sceneScore: f.sceneScore,
        })),
        detectedObjects: result.detectedObjects ? {
          totalObjects: result.detectedObjects.totalObjects,
          totalFrames: result.detectedObjects.totalFrames,
          avgObjectsPerFrame: result.detectedObjects.avgObjectsPerFrame,
          allClasses: result.detectedObjects.allClasses,
        } : undefined,
        thumbnail: result.thumbnail,
        audioTrack: result.audioTrack,
        processingTime: result.processingTime,
        error: result.error,
      };
    } catch (error: any) {
      console.error('Failed to analyze video:', error);
      return {
        success: false,
        processingTime: 0,
        error: error.message,
      };
    }
  }

  /**
   * Query job status
   */
  @Query(() => MediaProcessingJob)
  async mediaProcessingJob(
    @Arg('jobId') jobId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<MediaProcessingJob> {
    try {
      // Query job status from database
      const result = await pool.query(
        'SELECT * FROM public."MediaProcessingJobs" WHERE job_id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = result.rows[0];

      return {
        jobId: job.job_id,
        fileId: job.file_id,
        status: job.status,
        progress: job.progress,
        error: job.error,
        result: job.result ? JSON.stringify(job.result) : undefined,
      };
    } catch (error: any) {
      console.error('Failed to query job status:', error);
      throw new Error(`Failed to query job status: ${error.message}`);
    }
  }

  /**
   * Query all jobs for a file
   */
  @Query(() => [MediaProcessingJob])
  async mediaProcessingJobsForFile(
    @Arg('fileId') fileId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<MediaProcessingJob[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM public."MediaProcessingJobs" WHERE file_id = $1 ORDER BY created_at DESC',
        [fileId]
      );

      return result.rows.map(job => ({
        jobId: job.job_id,
        fileId: job.file_id,
        status: job.status,
        progress: job.progress,
        error: job.error,
        result: job.result ? JSON.stringify(job.result) : undefined,
      }));
    } catch (error: any) {
      console.error('Failed to query jobs for file:', error);
      throw new Error(`Failed to query jobs for file: ${error.message}`);
    }
  }

  /**
   * Subscribe to job status updates
   */
  @Subscription(() => MediaProcessingJob, {
    topics: ({ args }) => `MEDIA_JOB_UPDATE_${args.jobId}`,
  })
  mediaProcessingJobUpdates(
    @Arg('jobId') jobId: string,
    @Root() payload: MediaProcessingJob
  ): MediaProcessingJob {
    return payload;
  }

  /**
   * Subscribe to all jobs for a specific file
   */
  @Subscription(() => MediaProcessingJob, {
    topics: ({ args }) => `MEDIA_FILE_JOBS_${args.fileId}`,
  })
  mediaFileJobUpdates(
    @Arg('fileId') fileId: string,
    @Root() payload: MediaProcessingJob
  ): MediaProcessingJob {
    return payload;
  }
}
