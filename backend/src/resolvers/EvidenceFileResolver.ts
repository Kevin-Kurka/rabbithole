import { Resolver, Query, Mutation, Arg, Ctx, ID, Int, Float } from 'type-graphql';
import { Pool } from 'pg';
import { EvidenceFile } from '../entities/EvidenceFile';
import { EvidenceMetadata } from '../entities/EvidenceMetadata';
import { EvidenceReview } from '../entities/EvidenceReview';
import { Evidence } from '../entities/Evidence';
import { FileStorageService } from '../services/FileStorageService';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';

// FileUpload type definition
interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => NodeJS.ReadableStream;
}

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

interface Context {
  pool: Pool;
  userId?: string;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

import { InputType, Field } from 'type-graphql';

@InputType()
class AttachLinkInput {
  @Field(() => ID, { nullable: true })
  nodeId?: string;

  @Field(() => ID, { nullable: true })
  edgeId?: string;

  @Field()
  url!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;
}

@InputType()
class ReviewEvidenceInput {
  @Field(() => ID)
  evidenceId!: string;

  @Field(() => Int, { nullable: true })
  overallRating?: number; // 1-5

  @Field(() => Float, { nullable: true })
  qualityScore?: number; // 0-1

  @Field(() => Float, { nullable: true })
  credibilityScore?: number; // 0-1

  @Field(() => Float, { nullable: true })
  relevanceScore?: number; // 0-1

  @Field({ nullable: true })
  reviewText?: string;

  @Field({ nullable: true })
  strengths?: string;

  @Field({ nullable: true })
  weaknesses?: string;

  @Field({ nullable: true })
  recommendation?: string;

  @Field(() => [String], { nullable: true })
  flags?: string[];

  @Field({ nullable: true })
  expertiseLevel?: string;
}

@InputType()
class UpdateEvidenceMetadataInput {
  @Field(() => ID)
  evidenceId!: string;

  @Field(() => [String], { nullable: true })
  authors?: string[];

  @Field({ nullable: true })
  publicationDate?: Date;

  @Field(() => [String], { nullable: true })
  keywords?: string[];

  @Field({ nullable: true })
  abstract?: string;

  @Field({ nullable: true })
  doi?: string;

  @Field({ nullable: true })
  journal?: string;

  @Field({ nullable: true })
  methodology?: string;

  @Field(() => Int, { nullable: true })
  sampleSize?: number;
}

// ============================================================================
// RESOLVER
// ============================================================================

@Resolver()
export class EvidenceFileResolver {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get all files for a specific evidence
   */
  @Query(() => [EvidenceFile])
  async getEvidenceFiles(
    @Arg('evidenceId', () => ID) evidenceId: string,
    @Ctx() { pool }: Context
  ): Promise<EvidenceFile[]> {
    const result = await pool.query(
      `SELECT
        ef.*,
        CASE
          WHEN ef.dimensions IS NOT NULL THEN
            json_build_object('width', (ef.dimensions->>'width')::int, 'height', (ef.dimensions->>'height')::int)
          ELSE NULL
        END as parsed_dimensions,
        CASE
          WHEN ef.access_policy IS NOT NULL THEN
            json_build_object('require_auth', (ef.access_policy->>'require_auth')::boolean)
          ELSE NULL
        END as parsed_access_policy
       FROM public."EvidenceFiles" ef
       WHERE ef.evidence_id = $1
       AND ef.deleted_at IS NULL
       ORDER BY ef.is_primary DESC, ef.created_at DESC`,
      [evidenceId]
    );

    return result.rows.map((row) => ({
      ...row,
      dimensions: row.parsed_dimensions,
      access_policy: row.parsed_access_policy,
    }));
  }

  /**
   * Get signed download URL for a file (expires in 1 hour)
   */
  @Query(() => String)
  async getFileDownloadUrl(
    @Arg('fileId', () => ID) fileId: string,
    @Arg('expiresIn', () => Int, { nullable: true, defaultValue: 3600 }) expiresIn: number,
    @Ctx() { pool }: Context
  ): Promise<string> {
    const storageService = new FileStorageService(pool);
    return await storageService.getFileUrl(fileId, expiresIn);
  }

  /**
   * Get reviews for a specific evidence
   */
  @Query(() => [EvidenceReview])
  async getEvidenceReviews(
    @Arg('evidenceId', () => ID) evidenceId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool }: Context
  ): Promise<EvidenceReview[]> {
    const result = await pool.query(
      `SELECT
        er.*,
        CASE WHEN er.verified_claims IS NOT NULL THEN er.verified_claims::text ELSE NULL END as verified_claims_str,
        CASE WHEN er.disputed_claims IS NOT NULL THEN er.disputed_claims::text ELSE NULL END as disputed_claims_str
       FROM public."EvidenceReviews" er
       WHERE er.evidence_id = $1
       AND er.status = 'active'
       ORDER BY er.helpful_count DESC, er.created_at DESC
       LIMIT $2 OFFSET $3`,
      [evidenceId, limit, offset]
    );

    return result.rows.map((row) => ({
      ...row,
      verified_claims: row.verified_claims_str,
      disputed_claims: row.disputed_claims_str,
    }));
  }

  /**
   * Get metadata for a specific evidence
   */
  @Query(() => EvidenceMetadata, { nullable: true })
  async getEvidenceMetadata(
    @Arg('evidenceId', () => ID) evidenceId: string,
    @Ctx() { pool }: Context
  ): Promise<EvidenceMetadata | null> {
    const result = await pool.query(
      `SELECT
        em.*,
        CASE
          WHEN em.geolocation IS NOT NULL THEN
            json_build_object(
              'lat', (em.geolocation->>'lat')::float,
              'lon', (em.geolocation->>'lon')::float,
              'name', em.geolocation->>'name'
            )
          ELSE NULL
        END as parsed_geolocation,
        CASE WHEN em.custom_metadata IS NOT NULL THEN em.custom_metadata::text ELSE NULL END as custom_metadata_str
       FROM public."EvidenceMetadata" em
       WHERE em.evidence_id = $1`,
      [evidenceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      geolocation: row.parsed_geolocation,
      custom_metadata: row.custom_metadata_str,
    };
  }

  /**
   * Get quality statistics for evidence
   */
  @Query(() => EvidenceQualityStats)
  async getEvidenceQualityStats(
    @Arg('evidenceId', () => ID) evidenceId: string,
    @Ctx() { pool }: Context
  ): Promise<EvidenceQualityStats> {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT ef.id) FILTER (WHERE ef.deleted_at IS NULL) as file_count,
        SUM(ef.file_size) FILTER (WHERE ef.deleted_at IS NULL) as total_file_size,
        COUNT(DISTINCT er.id) FILTER (WHERE er.status = 'active') as review_count,
        AVG(er.quality_score) as avg_quality_score,
        AVG(er.credibility_score) as avg_credibility_score,
        AVG(er.relevance_score) as avg_relevance_score,
        AVG(er.overall_rating) as avg_rating,
        calculate_evidence_quality_score($1) as calculated_quality_score
       FROM public."Evidence" e
       LEFT JOIN public."EvidenceFiles" ef ON e.id = ef.evidence_id
       LEFT JOIN public."EvidenceReviews" er ON e.id = er.evidence_id
       WHERE e.id = $1
       GROUP BY e.id`,
      [evidenceId]
    );

    if (result.rows.length === 0) {
      return {
        file_count: 0,
        total_file_size: 0,
        review_count: 0,
        avg_quality_score: undefined,
        avg_credibility_score: undefined,
        avg_relevance_score: undefined,
        avg_rating: undefined,
        calculated_quality_score: undefined,
      };
    }

    return result.rows[0];
  }

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  /**
   * Upload file to evidence
   */
  @Mutation(() => EvidenceFile)
  async uploadEvidenceFile(
    @Arg('evidenceId', () => ID) evidenceId: string,
    @Arg('file', () => GraphQLUpload) file: FileUpload,
    @Arg('isPrimary', { nullable: true, defaultValue: false }) isPrimary: boolean,
    @Ctx() { pool, userId }: Context
  ): Promise<EvidenceFile> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Verify evidence exists
    const evidenceCheck = await pool.query(
      `SELECT id FROM public."Evidence" WHERE id = $1`,
      [evidenceId]
    );

    if (evidenceCheck.rows.length === 0) {
      throw new Error('Evidence not found');
    }

    // Read file upload
    const { createReadStream, filename, mimetype, encoding } = await file;
    const stream = createReadStream();

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Upload file using storage service
    const storageService = new FileStorageService(pool);
    const uploadResult = await storageService.uploadFile(
      buffer,
      { filename, mimetype, encoding },
      evidenceId,
      userId
    );

    // Determine file type
    const fileType = storageService['determineFileType'](mimetype);
    const fileExtension = filename.split('.').pop() || '';

    // Get storage provider info
    const providerInfo = storageService.getProviderInfo();

    // Create database record
    const result = await pool.query(
      `INSERT INTO public."EvidenceFiles" (
        evidence_id, file_type, is_primary, storage_provider, storage_key,
        storage_bucket, storage_region, file_hash, file_size, mime_type,
        original_filename, file_extension, encoding, dimensions,
        thumbnail_storage_key, has_preview, processing_status,
        virus_scan_status, virus_scan_date, uploaded_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), $19
      ) RETURNING *`,
      [
        evidenceId,
        fileType,
        isPrimary,
        providerInfo.provider,
        uploadResult.storage_key,
        providerInfo.bucket,
        providerInfo.region,
        uploadResult.file_hash,
        uploadResult.file_size,
        uploadResult.mime_type,
        filename,
        fileExtension,
        encoding,
        uploadResult.dimensions ? JSON.stringify(uploadResult.dimensions) : null,
        uploadResult.thumbnail_key,
        !!uploadResult.thumbnail_key,
        'completed',
        'clean', // Virus scan status
        userId,
      ]
    );

    // Log audit event
    await pool.query(
      `SELECT log_evidence_audit($1, 'file_uploaded', $2, $3, $4)`,
      [
        evidenceId,
        userId,
        JSON.stringify({
          file_id: result.rows[0].id,
          filename: filename,
          size: uploadResult.file_size,
        }),
        `File uploaded: ${filename}`,
      ]
    );

    return {
      ...result.rows[0],
      dimensions: uploadResult.dimensions,
    };
  }

  /**
   * Attach link/URL as evidence
   */
  @Mutation(() => Evidence)
  async attachLinkEvidence(
    @Arg('input') input: AttachLinkInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Evidence> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    if (!input.nodeId && !input.edgeId) {
      throw new Error('Either nodeId or edgeId must be provided');
    }

    if (input.nodeId && input.edgeId) {
      throw new Error('Cannot attach to both node and edge');
    }

    // Create source for the link
    const sourceResult = await pool.query(
      `INSERT INTO public."Sources" (
        source_type, title, url, description, credibility_score
      ) VALUES (
        'web_article', $1, $2, $3, 0.5
      ) RETURNING id`,
      [input.title, input.url, input.description]
    );

    const sourceId = sourceResult.rows[0].id;

    // Create evidence
    const evidenceResult = await pool.query(
      `INSERT INTO public."Evidence" (
        target_node_id, target_edge_id, source_id, evidence_type,
        weight, confidence, content, temporal_relevance, decay_rate,
        is_verified, peer_review_status, peer_review_count, submitted_by
      ) VALUES (
        $1, $2, $3, 'supporting', 1.0, 0.5, $4, 1.0, 0.0, false, 'pending', 0, $5
      ) RETURNING *`,
      [input.nodeId, input.edgeId, sourceId, input.description || input.title, userId]
    );

    // Create evidence metadata
    await pool.query(
      `INSERT INTO public."EvidenceMetadata" (
        evidence_id, access_date, language, preprint, paywall, citation_count
      ) VALUES (
        $1, NOW(), 'en', false, false, 0
      )`,
      [evidenceResult.rows[0].id]
    );

    return evidenceResult.rows[0];
  }

  /**
   * Submit review for evidence
   */
  @Mutation(() => EvidenceReview)
  async reviewEvidence(
    @Arg('input') input: ReviewEvidenceInput,
    @Ctx() { pool, userId }: Context
  ): Promise<EvidenceReview> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check if user already reviewed this evidence
    const existingReview = await pool.query(
      `SELECT id FROM public."EvidenceReviews"
       WHERE evidence_id = $1 AND reviewer_id = $2`,
      [input.evidenceId, userId]
    );

    if (existingReview.rows.length > 0) {
      throw new Error('You have already reviewed this evidence');
    }

    // Validate scores
    if (input.qualityScore && (input.qualityScore < 0 || input.qualityScore > 1)) {
      throw new Error('Quality score must be between 0 and 1');
    }
    if (input.credibilityScore && (input.credibilityScore < 0 || input.credibilityScore > 1)) {
      throw new Error('Credibility score must be between 0 and 1');
    }
    if (input.relevanceScore && (input.relevanceScore < 0 || input.relevanceScore > 1)) {
      throw new Error('Relevance score must be between 0 and 1');
    }
    if (input.overallRating && (input.overallRating < 1 || input.overallRating > 5)) {
      throw new Error('Overall rating must be between 1 and 5');
    }

    // Insert review
    const result = await pool.query(
      `INSERT INTO public."EvidenceReviews" (
        evidence_id, reviewer_id, quality_score, credibility_score,
        relevance_score, overall_rating, review_text, strengths,
        weaknesses, recommendation, flags, reviewer_expertise_level,
        helpful_count, not_helpful_count, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, 0, 'active'
      ) RETURNING *`,
      [
        input.evidenceId,
        userId,
        input.qualityScore,
        input.credibilityScore,
        input.relevanceScore,
        input.overallRating,
        input.reviewText,
        input.strengths,
        input.weaknesses,
        input.recommendation,
        input.flags,
        input.expertiseLevel,
      ]
    );

    // Log audit event
    await pool.query(
      `SELECT log_evidence_audit($1, 'reviewed', $2, $3, $4)`,
      [
        input.evidenceId,
        userId,
        JSON.stringify({
          review_id: result.rows[0].id,
          overall_rating: input.overallRating,
        }),
        'Evidence reviewed',
      ]
    );

    return result.rows[0];
  }

  /**
   * Update evidence metadata
   */
  @Mutation(() => EvidenceMetadata)
  async updateEvidenceMetadata(
    @Arg('input') input: UpdateEvidenceMetadataInput,
    @Ctx() { pool, userId }: Context
  ): Promise<EvidenceMetadata> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check if metadata exists
    const existing = await pool.query(
      `SELECT id FROM public."EvidenceMetadata" WHERE evidence_id = $1`,
      [input.evidenceId]
    );

    if (existing.rows.length === 0) {
      // Create new metadata record
      const result = await pool.query(
        `INSERT INTO public."EvidenceMetadata" (
          evidence_id, authors, publication_date, keywords, abstract,
          doi, journal, methodology, sample_size, language, preprint,
          paywall, citation_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'en', false, false, 0
        ) RETURNING *`,
        [
          input.evidenceId,
          input.authors,
          input.publicationDate,
          input.keywords,
          input.abstract,
          input.doi,
          input.journal,
          input.methodology,
          input.sampleSize,
        ]
      );

      return result.rows[0];
    } else {
      // Update existing metadata
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (input.authors !== undefined) {
        updateFields.push(`authors = $${paramIndex++}`);
        updateValues.push(input.authors);
      }
      if (input.publicationDate !== undefined) {
        updateFields.push(`publication_date = $${paramIndex++}`);
        updateValues.push(input.publicationDate);
      }
      if (input.keywords !== undefined) {
        updateFields.push(`keywords = $${paramIndex++}`);
        updateValues.push(input.keywords);
      }
      if (input.abstract !== undefined) {
        updateFields.push(`abstract = $${paramIndex++}`);
        updateValues.push(input.abstract);
      }
      if (input.doi !== undefined) {
        updateFields.push(`doi = $${paramIndex++}`);
        updateValues.push(input.doi);
      }
      if (input.journal !== undefined) {
        updateFields.push(`journal = $${paramIndex++}`);
        updateValues.push(input.journal);
      }
      if (input.methodology !== undefined) {
        updateFields.push(`methodology = $${paramIndex++}`);
        updateValues.push(input.methodology);
      }
      if (input.sampleSize !== undefined) {
        updateFields.push(`sample_size = $${paramIndex++}`);
        updateValues.push(input.sampleSize);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(input.evidenceId);

      const result = await pool.query(
        `UPDATE public."EvidenceMetadata"
         SET ${updateFields.join(', ')}
         WHERE evidence_id = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      // Log audit event
      await pool.query(
        `SELECT log_evidence_audit($1, 'metadata_updated', $2, $3, $4)`,
        [input.evidenceId, userId, null, 'Evidence metadata updated']
      );

      return result.rows[0];
    }
  }

  /**
   * Delete evidence file
   */
  @Mutation(() => Boolean)
  async deleteEvidenceFile(
    @Arg('fileId', () => ID) fileId: string,
    @Arg('reason', { nullable: true }) reason: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const storageService = new FileStorageService(pool);
    await storageService.deleteFile(fileId, userId, reason);

    return true;
  }

  /**
   * Vote on review helpfulness
   */
  @Mutation(() => Boolean)
  async voteOnReview(
    @Arg('reviewId', () => ID) reviewId: string,
    @Arg('isHelpful') isHelpful: boolean,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const voteType = isHelpful ? 'helpful' : 'not_helpful';

    // Insert or update vote
    await pool.query(
      `INSERT INTO public."EvidenceReviewVotes" (review_id, user_id, vote_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id, user_id)
       DO UPDATE SET vote_type = EXCLUDED.vote_type`,
      [reviewId, userId, voteType]
    );

    return true;
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

import { ObjectType } from 'type-graphql';

@ObjectType()
class EvidenceQualityStats {
  @Field(() => Int)
  file_count!: number;

  @Field(() => Int)
  total_file_size!: number;

  @Field(() => Int)
  review_count!: number;

  @Field(() => Float, { nullable: true })
  avg_quality_score?: number;

  @Field(() => Float, { nullable: true })
  avg_credibility_score?: number;

  @Field(() => Float, { nullable: true })
  avg_relevance_score?: number;

  @Field(() => Float, { nullable: true })
  avg_rating?: number;

  @Field(() => Float, { nullable: true })
  calculated_quality_score?: number;
}
