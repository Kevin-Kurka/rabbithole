import { Pool } from 'pg';
import { PubSubEngine } from 'type-graphql';

/**
 * JobStatusService
 *
 * Manages media processing job status with real-time updates via PubSub.
 * Handles job creation, progress tracking, and completion/failure updates.
 *
 * Features:
 * - Job status tracking in PostgreSQL
 * - Real-time updates via Redis PubSub
 * - Progress tracking (0-100%)
 * - Error handling and logging
 */

export interface JobStatus {
  jobId: string;
  fileId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
}

export class JobStatusService {
  private mediaJobTypeId: string | null = null;
  private mediaFileTypeId: string | null = null;

  constructor(
    private pool: Pool,
    private pubSub: PubSubEngine
  ) { }

  /**
   * Helper to get Node Type ID
   */
  private async getMediaTypeIds(): Promise<{ jobTypeId: string; fileTypeId: string }> {
    if (this.mediaJobTypeId && this.mediaFileTypeId) {
      return { jobTypeId: this.mediaJobTypeId, fileTypeId: this.mediaFileTypeId };
    }

    const result = await this.pool.query(
      `SELECT id, name FROM public.node_types WHERE name IN ('MediaJob', 'MediaFile')`
    );

    const jobType = result.rows.find(r => r.name === 'MediaJob');
    const fileType = result.rows.find(r => r.name === 'MediaFile');

    if (!jobType || !fileType) {
      throw new Error('Media Node Types not found. Please run migration 015.');
    }

    this.mediaJobTypeId = jobType.id;
    this.mediaFileTypeId = fileType.id;

    return { jobTypeId: this.mediaJobTypeId, fileTypeId: this.mediaFileTypeId };
  }

  /**
   * Create a new job node
   */
  async createJob(
    jobId: string, // This will be the Node ID
    fileId: string,
    fileType: string,
    filePath: string,
    options: any = {}
  ): Promise<void> {
    try {
      const { jobTypeId } = await this.getMediaTypeIds();

      const props = {
        jobId, // Store strictly in props as well for redundancy/search
        fileId,
        type: fileType, // 'audio', 'video'
        status: 'queued',
        progress: 0,
        options,
        filePath // Store path in props for worker access
      };

      await this.pool.query(
        `INSERT INTO public.nodes
        (id, node_type_id, props, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())`,
        [jobId, jobTypeId, JSON.stringify(props)]
      );

      // Create PROCESSED_BY edge from File to Job
      // Note: This presumes the File Node already exists. If not, the resolver handles it.
      // But strictly speaking, the job service shouldn't assume edge existence constraints here.
      // We will handle edge creation in the resolver to keep this service focused on the Job Node.

      await this.publishUpdate({
        jobId,
        fileId,
        status: 'queued',
        progress: 0,
      });

      console.log(`✓ MediaJob Node created: ${jobId}`);
    } catch (error: any) {
      console.error(`✗ Failed to create media job node: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update job status (updates Node props)
   */
  async updateJobStatus(
    jobId: string,
    status: 'queued' | 'processing' | 'completed' | 'failed',
    options: {
      progress?: number;
      result?: any;
      error?: string;
    } = {}
  ): Promise<void> {
    try {
      // Fetch current props to merge safely (or use jsonb_set)
      // We'll use a jsonb merge update
      const updates: any = { status };

      if (options.progress !== undefined) updates.progress = options.progress;
      if (options.result !== undefined) updates.result = options.result;
      if (options.error !== undefined) updates.error = options.error;

      if (status === 'processing') updates.startedAt = new Date().toISOString();
      if (status === 'completed' || status === 'failed') updates.completedAt = new Date().toISOString();

      const query = `
        UPDATE public.nodes
        SET props = props || $1::jsonb, updated_at = NOW()
        WHERE id = $2
        RETURNING props
      `;

      const result = await this.pool.query(query, [JSON.stringify(updates), jobId]);

      if (result.rows.length > 0) {
        const updatedProps = result.rows[0].props;
        const fileId = updatedProps.fileId; // Retrieve fileId from props

        await this.publishUpdate({
          jobId,
          fileId,
          status,
          progress: options.progress,
          result: options.result,
          error: options.error,
        });

        console.log(`✓ Job Node updated: ${jobId} - ${status}`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to update job node: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark job as processing
   */
  async startProcessing(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, 'processing', { progress: 0 });
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    await this.updateJobStatus(jobId, 'processing', { progress });
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, result: any): Promise<void> {
    await this.updateJobStatus(jobId, 'completed', { progress: 100, result });
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<void> {
    await this.updateJobStatus(jobId, 'failed', { error });
  }

  /**
   * Publish job update to PubSub subscribers
   */
  private async publishUpdate(status: JobStatus): Promise<void> {
    try {
      // Publish to job-specific topic
      await this.pubSub.publish(`MEDIA_JOB_UPDATE_${status.jobId}`, status);

      // Publish to file-specific topic
      await this.pubSub.publish(`MEDIA_FILE_JOBS_${status.fileId}`, status);
    } catch (error: any) {
      console.error(`✗ Failed to publish job update: ${error.message}`);
    }
  }

  /**
   * Get job status from Node
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    try {
      const result = await this.pool.query(
        `SELECT props FROM public.nodes WHERE id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const props = result.rows[0].props;
      return {
        jobId: props.jobId || jobId,
        fileId: props.fileId,
        status: props.status,
        progress: props.progress,
        result: props.result,
        error: props.error,
      };
    } catch (error: any) {
      console.error(`✗ Failed to get job status: ${error.message}`);
      throw error;
    }
  }
}

// export const jobStatusService = new JobStatusService(pool, pubSub);
