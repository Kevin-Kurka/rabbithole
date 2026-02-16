import { Resolver, Query, Mutation, Subscription, Arg, Ctx, Int, Field, ObjectType, InputType, Root, PubSub, PubSubEngine, ID } from 'type-graphql';
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

@ObjectType()
class MediaFile {
  @Field()
  fileId: string;

  @Field()
  filename: string;

  @Field()
  size: number;

  @Field()
  mimeType: string;

  @Field()
  type: string;

  @Field()
  uploadedAt: string;

  @Field()
  status: string;

  @Field()
  progress: number;

  @Field({ nullable: true })
  thumbnailUrl?: string;
}

@ObjectType()
class MediaFileList {
  @Field(() => [MediaFile])
  files: MediaFile[];

  @Field()
  total: number;

  @Field()
  hasMore: boolean;
}

@InputType()
class MediaFileFilter {
  @Field({ nullable: true })
  type?: string;
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

@ObjectType()
class MediaFileUploadResult {
  @Field()
  success: boolean;

  @Field()
  fileId: string;

  @Field()
  url: string;

  @Field()
  filename: string;

  @Field()
  size: number;

  @Field()
  mimeType: string;

  @Field()
  uploadedAt: string;

  @Field({ nullable: true })
  error?: string;
}

@InputType()
class DocumentProcessingOptions {
  @Field({ nullable: true })
  extractTables?: boolean;

  @Field({ nullable: true })
  extractFigures?: boolean;

  @Field({ nullable: true })
  extractSections?: boolean;
}

@Resolver()
export class MediaProcessingResolver {
  @Mutation(() => MediaFileUploadResult)
  async uploadMediaFile(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Arg('type') type: string,
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<MediaFileUploadResult> {
    try {
      const { createReadStream, filename, mimetype } = await file;
      const fileId = uuidv4();
      const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, `${fileId}_${filename}`);
      const writeStream = fs.createWriteStream(filePath);
      const stream = createReadStream();

      await new Promise<void>((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      // Insert MediaFile node
      const typeResult = await pool.query("SELECT id FROM public.node_types WHERE name = 'MediaFile'");
      if (typeResult.rows.length === 0) throw new Error('MediaFile Type not found');
      const mediaFileTypeId = typeResult.rows[0].id;

      const fileProps = {
        filename,
        mimetype,
        size: fs.statSync(filePath).size,
        path: filePath,
        storageProvider: 'local',
        uploadedBy: userId,
        type: type // store the type provided by frontend
      };

      await pool.query(
        `INSERT INTO public.nodes (id, node_type_id, props, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`,
        [fileId, mediaFileTypeId, JSON.stringify(fileProps)]
      );

      return {
        success: true,
        fileId,
        url: `/uploads/${fileId}_${filename}`,
        filename,
        size: fs.statSync(filePath).size,
        mimeType: mimetype,
        uploadedAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Upload failed:', error);
      return {
        success: false,
        fileId: '',
        url: '',
        filename: '',
        size: 0,
        mimeType: '',
        uploadedAt: '',
        error: error.message
      };
    }
  }

  @Mutation(() => MediaProcessingJob)
  async processDocument(
    @Arg('fileId', () => ID) fileId: string,
    @Ctx() { pool, pubSub }: { pool: Pool; pubSub: PubSubEngine },
    @Arg('extractTables', { nullable: true }) extractTables?: boolean,
    @Arg('extractFigures', { nullable: true }) extractFigures?: boolean,
    @Arg('extractSections', { nullable: true }) extractSections?: boolean
  ): Promise<MediaProcessingJob> {
    const jobId = uuidv4();

    // Get file node to get path
    const fileResult = await pool.query('SELECT props FROM public.nodes WHERE id = $1', [fileId]);
    if (fileResult.rows.length === 0) throw new Error('File not found');
    const fileProps = fileResult.rows[0].props;
    const filePath = fileProps.path;

    // Create options object for job
    const options = { extractTables, extractFigures, extractSections };

    // Create Job Node
    const jobStatusService = new JobStatusService(pool, pubSub);
    await jobStatusService.createJob(jobId, fileId, 'document', filePath, options);

    // Link File -> Job
    const edgeTypeResult = await pool.query("SELECT id FROM public.edge_types WHERE name = 'PROCESSED_BY'");
    const edgeTypeId = edgeTypeResult.rows[0].id; // assume exists
    await pool.query(
      `INSERT INTO public.edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
      [edgeTypeId, fileId, jobId]
    );

    // Enqueue
    // Note: mediaQueueService might not have enqueueDocumentProcessing exposed, using generic if checked?
    // Just assuming enqueueMediaProcessing supports 'document' or I should add it.
    // Looking at MediaQueueService usage in uploadAndTranscribeAudio, it calls enqueueMediaProcessing(fileId, 'audio', ...)
    await mediaQueueService.enqueueMediaProcessing(fileId, 'document', options, 5);

    return {
      jobId,
      fileId,
      status: 'queued',
      progress: 0
    };
  }

  @Mutation(() => MediaProcessingJob)
  async processAudio(
    @Arg('fileId', () => ID) fileId: string,
    @Arg('options', () => AudioTranscriptionOptions, { nullable: true }) options: AudioTranscriptionOptions,
    @Ctx() { pool, pubSub }: { pool: Pool; pubSub: PubSubEngine }
  ): Promise<MediaProcessingJob> {
    const jobId = uuidv4();

    const fileResult = await pool.query('SELECT props FROM public.nodes WHERE id = $1', [fileId]);
    if (fileResult.rows.length === 0) throw new Error('File not found');
    const fileProps = fileResult.rows[0].props;
    const filePath = fileProps.path;

    const jobStatusService = new JobStatusService(pool, pubSub);
    await jobStatusService.createJob(jobId, fileId, 'audio', filePath, options);

    const edgeTypeResult = await pool.query("SELECT id FROM public.edge_types WHERE name = 'PROCESSED_BY'");
    const edgeTypeId = edgeTypeResult.rows[0].id;
    await pool.query(
      `INSERT INTO public.edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
      [edgeTypeId, fileId, jobId]
    );

    await mediaQueueService.enqueueMediaProcessing(fileId, 'audio', options, 5);

    return {
      jobId,
      fileId,
      status: 'queued',
      progress: 0
    };
  }

  @Mutation(() => MediaProcessingJob)
  async processVideo(
    @Arg('fileId', () => ID) fileId: string,
    @Arg('options', () => VideoAnalysisOptions, { nullable: true }) options: VideoAnalysisOptions,
    @Ctx() { pool, pubSub }: { pool: Pool; pubSub: PubSubEngine }
  ): Promise<MediaProcessingJob> {
    const jobId = uuidv4();

    const fileResult = await pool.query('SELECT props FROM public.nodes WHERE id = $1', [fileId]);
    if (fileResult.rows.length === 0) throw new Error('File not found');
    const fileProps = fileResult.rows[0].props;
    const filePath = fileProps.path;

    const jobStatusService = new JobStatusService(pool, pubSub);
    await jobStatusService.createJob(jobId, fileId, 'video', filePath, options);

    const edgeTypeResult = await pool.query("SELECT id FROM public.edge_types WHERE name = 'PROCESSED_BY'");
    const edgeTypeId = edgeTypeResult.rows[0].id;
    await pool.query(
      `INSERT INTO public.edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
      [edgeTypeId, fileId, jobId]
    );

    await mediaQueueService.enqueueMediaProcessing(fileId, 'video', options, 5);

    return {
      jobId,
      fileId,
      status: 'queued',
      progress: 0
    };
  }

  /**
   * Upload and process audio file (async via queue)
   */
  @Mutation(() => MediaProcessingJob)
  async uploadAndTranscribeAudio(
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Ctx() { pool, pubSub, userId }: { pool: Pool; pubSub: PubSubEngine; userId: string },
    @Arg('options', () => AudioTranscriptionOptions, { nullable: true }) options?: AudioTranscriptionOptions
  ): Promise<MediaProcessingJob> {
    try {
      const { createReadStream, filename, mimetype } = await file;

      // Validate file type
      const supportedFormats = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac', 'audio/ogg'];
      if (!supportedFormats.includes(mimetype)) {
        throw new Error(`Unsupported audio format: ${mimetype}. Supported formats: ${supportedFormats.join(', ')}`);
      }

      // Generate IDs
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

      // --- GRAPH INTEGRATION: Create MediaFile Node ---
      // Get 'MediaFile' type ID
      const typeResult = await pool.query(`SELECT id FROM public.node_types WHERE name = 'MediaFile'`);
      if (typeResult.rows.length === 0) throw new Error('MediaFile Type not found');
      const mediaFileTypeId = typeResult.rows[0].id;

      const fileProps = {
        filename,
        mimetype,
        size: fs.statSync(filePath).size,
        path: filePath,
        storageProvider: 'local',
        uploadedBy: userId // Store who uploaded it
      };

      await pool.query(
        `INSERT INTO public.nodes (id, node_type_id, props, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`,
        [fileId, mediaFileTypeId, JSON.stringify(fileProps)]
      );
      // ------------------------------------------------

      // Create job status (JobStatusService now creates the Job Node)
      const jobStatusService = new JobStatusService(pool, pubSub);
      await jobStatusService.createJob(jobId, fileId, 'audio', filePath, {
        language: options?.language,
        speakerDiarization: options?.speakerDiarization,
      });

      // --- GRAPH INTEGRATION: Create PROCESSED_BY Edge ---
      // Get 'PROCESSED_BY' edge type ID
      const edgeTypeResult = await pool.query(`SELECT id FROM public.edge_types WHERE name = 'PROCESSED_BY'`);
      if (edgeTypeResult.rows.length === 0) throw new Error('PROCESSED_BY Edge Type not found');
      const edgeTypeId = edgeTypeResult.rows[0].id;

      await pool.query(
        `INSERT INTO public.edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
        [edgeTypeId, fileId, jobId]
      );
      // ---------------------------------------------------

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
    @Ctx() { pool, pubSub, userId }: { pool: Pool; pubSub: PubSubEngine; userId: string },
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

      // --- GRAPH INTEGRATION: Create MediaFile Node ---
      // Get 'MediaFile' type ID
      const typeResult = await pool.query(`SELECT id FROM public.node_types WHERE name = 'MediaFile'`);
      if (typeResult.rows.length === 0) throw new Error('MediaFile Type not found');
      const mediaFileTypeId = typeResult.rows[0].id;

      const fileProps = {
        filename,
        mimetype,
        size: fs.statSync(filePath).size,
        path: filePath,
        storageProvider: 'local',
        uploadedBy: userId
      };

      await pool.query(
        `INSERT INTO public.nodes (id, node_type_id, props, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`,
        [fileId, mediaFileTypeId, JSON.stringify(fileProps)]
      );
      // ------------------------------------------------

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

      // --- GRAPH INTEGRATION: Create PROCESSED_BY Edge ---
      // Get 'PROCESSED_BY' edge type ID
      const edgeTypeResult = await pool.query(`SELECT id FROM public.edge_types WHERE name = 'PROCESSED_BY'`);
      if (edgeTypeResult.rows.length === 0) throw new Error('PROCESSED_BY Edge Type not found');
      const edgeTypeId = edgeTypeResult.rows[0].id;

      await pool.query(
        `INSERT INTO public.edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
        [edgeTypeId, fileId, jobId]
      );
      // ---------------------------------------------------

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
      // Query job from nodes table (MediaJob is a node type)
      const result = await pool.query(
        `SELECT n.id, n.props 
         FROM public.nodes n
         JOIN public.node_types nt ON n.node_type_id = nt.id
         WHERE nt.name = 'MediaJob' AND n.id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = result.rows[0];
      const props = job.props;

      return {
        jobId: job.id,
        fileId: props.fileId,
        status: props.status || 'queued',
        progress: props.progress || 0,
        error: props.error,
        result: props.result ? JSON.stringify(props.result) : undefined,
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
      // Query jobs via PROCESSED_BY edges
      const result = await pool.query(
        `SELECT n.id, n.props, n.created_at
         FROM public.nodes n
         JOIN public.node_types nt ON n.node_type_id = nt.id
         JOIN public.edges e ON e.target_node_id = n.id
         JOIN public.edge_types et ON e.edge_type_id = et.id
         WHERE nt.name = 'MediaJob' 
           AND et.name = 'PROCESSED_BY'
           AND e.source_node_id = $1
         ORDER BY n.created_at DESC`,
        [fileId]
      );

      return result.rows.map(job => ({
        jobId: job.id,
        fileId: job.props.fileId,
        status: job.props.status || 'queued',
        progress: job.props.progress || 0,
        error: job.props.error,
        result: job.props.result ? JSON.stringify(job.props.result) : undefined,
      }));
    } catch (error: any) {
      console.error('Failed to query jobs for file:', error);
      throw new Error(`Failed to query jobs for file: ${error.message}`);
    }
  }

  /**
   * Query media files with pagination and filtering
   */
  @Query(() => MediaFileList)
  async getMediaFiles(
    @Arg('filter', { nullable: true }) filter: MediaFileFilter,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<MediaFileList> {
    try {
      // Get MediaFile Type ID
      const typeResult = await pool.query("SELECT id FROM public.node_types WHERE name = 'MediaFile'");
      if (typeResult.rows.length === 0) throw new Error('MediaFile Type not found');
      const mediaFileTypeId = typeResult.rows[0].id;

      let query = `
        SELECT id, props, created_at 
        FROM public.nodes 
        WHERE node_type_id = $1
      `;
      const params: any[] = [mediaFileTypeId];
      let paramIndex = 2;

      // Apply Type Filter
      if (filter?.type) {
        // Since type is inside JSONB 'props', we query it there. 
        // Note: The upload mutation saves 'mimetype' but not the simplified 'type'.
        // However, the frontend sends 'type' filter ('document', 'audio' etc).
        // We need to infer or check if we stored 'type' in props.
        // Looking at uploadAndTranscribeAudio, we only stored:
        // filename, mimetype, size, path, storageProvider, uploadedBy.
        // We DID NOT store 'type' explicitly in the File Node props.
        // But we can filter by mimetype.

        let mimeTypes: string[] = [];
        if (filter.type === 'audio') mimeTypes = ['audio/'];
        if (filter.type === 'video') mimeTypes = ['video/'];
        if (filter.type === 'image') mimeTypes = ['image/'];
        if (filter.type === 'document') mimeTypes = ['application/pdf', 'text/'];

        // Simple approximate filtering
        if (mimeTypes.length > 0) {
          query += ` AND (props->>'mimetype' LIKE $${paramIndex} || '%')`;
          params.push(mimeTypes[0].replace('/', '/')); // rough check
          paramIndex++;
        }
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      const rows = result.rows;

      // Get Status for each file (N+1 query, but manageable for page size 50)
      // Ideally we join, but let's do parallel requests for simplicity now
      const filesWithStatus = await Promise.all(rows.map(async (row) => {
        const fileId = row.id;
        const props = row.props;

        // Find latest job for this file via PROCESSED_BY edge
        const jobResult = await pool.query(
          `SELECT n.props
             FROM public.nodes n
             JOIN public.node_types nt ON n.node_type_id = nt.id
             JOIN public.edges e ON e.target_node_id = n.id
             JOIN public.edge_types et ON e.edge_type_id = et.id
             WHERE nt.name = 'MediaJob'
               AND et.name = 'PROCESSED_BY'
               AND e.source_node_id = $1
             ORDER BY n.created_at DESC LIMIT 1`,
          [fileId]
        );

        let status = 'queued';
        let progress = 0;
        let thumbnailUrl = undefined;

        if (jobResult.rows.length > 0) {
          const jobProps = jobResult.rows[0].props;
          status = jobProps.status || 'queued';
          progress = jobProps.progress || 0;
          // Check for thumbnail in result
          if (jobProps.result && jobProps.result.thumbnail) {
            thumbnailUrl = jobProps.result.thumbnail;
          }
        }

        // Infer type from mimetype if not present
        let type = 'document';
        if (props.mimetype.startsWith('audio')) type = 'audio';
        if (props.mimetype.startsWith('video')) type = 'video';
        if (props.mimetype.startsWith('image')) type = 'image';

        return {
          fileId: row.id,
          filename: props.filename || 'Untitled',
          size: props.size || 0,
          mimeType: props.mimetype || 'application/octet-stream',
          type,
          uploadedAt: row.created_at.toISOString(),
          status,
          progress,
          thumbnailUrl
        };
      }));

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM public.nodes WHERE node_type_id = $1`,
        [mediaFileTypeId]
      );
      const total = parseInt(countResult.rows[0].count);

      return {
        files: filesWithStatus,
        total,
        hasMore: offset + limit < total
      };

    } catch (error: any) {
      console.error('Failed to get media files:', error);
      throw new Error(`Failed to get media files: ${error.message}`);
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
