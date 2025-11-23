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
  constructor(
    private pool: Pool,
    private pubSub: PubSubEngine
  ) {}

  /**
   * Create a new job
   */
  async createJob(
    jobId: string,
    fileId: string,
    fileType: string,
    filePath: string,
    options: any = {}
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO public."MediaProcessingJobs"
        (job_id, file_id, file_type, file_path, status, progress, options, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [jobId, fileId, fileType, filePath, 'queued', 0, JSON.stringify(options)]
      );

      await this.publishUpdate({
        jobId,
        fileId,
        status: 'queued',
        progress: 0,
      });

      console.log(`✓ Job created: ${jobId}`);
    } catch (error: any) {
      console.error(`✗ Failed to create job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update job status
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
      const updates: string[] = ['status = $2', 'updated_at = NOW()'];
      const values: any[] = [jobId, status];
      let paramIndex = 3;

      if (options.progress !== undefined) {
        updates.push(`progress = $${paramIndex}`);
        values.push(options.progress);
        paramIndex++;
      }

      if (options.result !== undefined) {
        updates.push(`result = $${paramIndex}`);
        values.push(JSON.stringify(options.result));
        paramIndex++;
      }

      if (options.error !== undefined) {
        updates.push(`error = $${paramIndex}`);
        values.push(options.error);
        paramIndex++;
      }

      if (status === 'processing') {
        updates.push(`started_at = COALESCE(started_at, NOW())`);
      }

      if (status === 'completed' || status === 'failed') {
        updates.push(`completed_at = NOW()`);
      }

      const query = `UPDATE public."MediaProcessingJobs" SET ${updates.join(', ')} WHERE job_id = $1 RETURNING file_id`;
      const result = await this.pool.query(query, values);

      if (result.rows.length > 0) {
        const fileId = result.rows[0].file_id;

        await this.publishUpdate({
          jobId,
          fileId,
          status,
          progress: options.progress,
          result: options.result,
          error: options.error,
        });

        console.log(`✓ Job updated: ${jobId} - ${status} ${options.progress !== undefined ? `(${options.progress}%)` : ''}`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to update job status: ${error.message}`);
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

      console.log(`✓ Published update for job: ${status.jobId}`);
    } catch (error: any) {
      console.error(`✗ Failed to publish job update: ${error.message}`);
      // Don't throw - publishing failure shouldn't break job processing
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    try {
      const result = await this.pool.query(
        'SELECT job_id, file_id, status, progress, result, error FROM public."MediaProcessingJobs" WHERE job_id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        jobId: row.job_id,
        fileId: row.file_id,
        status: row.status,
        progress: row.progress,
        result: row.result,
        error: row.error,
      };
    } catch (error: any) {
      console.error(`✗ Failed to get job status: ${error.message}`);
      throw error;
    }
  }
}

// Note: Singleton instance should be created in index.ts with pool and pubSub
// export const jobStatusService = new JobStatusService(pool, pubSub);
