import { Resolver, Query, Mutation, Arg, Ctx, ID, ObjectType, Field, Float, Int } from 'type-graphql';
import { Pool } from 'pg';
import { Annotation, DeceptionAnalysis } from '../entities/Annotation';
import { DeceptionDetectionService } from '../services/DeceptionDetectionService';

interface Context {
  pool: Pool;
  userId?: string;
}

@ObjectType()
class DeceptionMatch {
  @Field()
  text!: string;

  @Field(() => Int)
  startOffset!: number;

  @Field(() => Int)
  endOffset!: number;

  @Field()
  fallacyType!: string;

  @Field()
  fallacyName!: string;

  @Field()
  explanation!: string;

  @Field()
  severity!: string;

  @Field(() => Float)
  confidence!: number;

  @Field()
  surroundingContext!: string;

  @Field({ nullable: true })
  suggestedCorrection?: string;

  @Field({ nullable: true })
  contradictingSources?: string; // JSON string
}

@ObjectType()
class ArticleAnalysisResult {
  @Field(() => Float)
  overallScore!: number;

  @Field(() => Int)
  deceptionCount!: number;

  @Field(() => Int)
  fallacyCount!: number;

  @Field(() => [DeceptionMatch])
  deceptions!: DeceptionMatch[];

  @Field()
  summary!: string;

  @Field(() => [String])
  recommendations!: string[];

  @Field()
  aiModel!: string;

  @Field()
  analysisTimestamp!: string;
}

@Resolver()
export class DeceptionDetectionResolver {
  private deceptionService: DeceptionDetectionService;

  constructor() {
    this.deceptionService = new DeceptionDetectionService();
  }

  /**
   * Analyze an article for logical fallacies and deception
   */
  @Mutation(() => ArticleAnalysisResult)
  async analyzeArticleForDeception(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<ArticleAnalysisResult> {
    try {
      // Fetch the article content
      const result = await pool.query(
        `SELECT props->>'content' as content, props->>'title' as title
         FROM public."Nodes"
         WHERE id = $1`,
        [nodeId]
      );

      if (result.rows.length === 0) {
        throw new Error('Article not found');
      }

      const articleText = result.rows[0].content;
      if (!articleText) {
        throw new Error('Article has no content to analyze');
      }

      // Perform AI analysis
      const analysis = await this.deceptionService.analyzeArticle(pool, nodeId, articleText);

      // Save analysis to database
      await this.deceptionService.saveAnalysis(pool, nodeId, analysis);

      return analysis;
    } catch (error: any) {
      console.error('Error analyzing article:', error);
      throw new Error(error.message || 'Failed to analyze article');
    }
  }

  /**
   * Get all annotations for an article
   */
  @Query(() => [Annotation])
  async getAnnotations(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<Annotation[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM public."Annotations"
         WHERE target_node_id = $1
         ORDER BY start_offset ASC`,
        [nodeId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching annotations:', error);
      throw new Error('Failed to fetch annotations');
    }
  }

  /**
   * Get deception analysis for an annotation
   */
  @Query(() => DeceptionAnalysis, { nullable: true })
  async getDeceptionAnalysis(
    @Arg('annotationId', () => ID) annotationId: string,
    @Ctx() { pool }: Context
  ): Promise<DeceptionAnalysis | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM public."DeceptionAnalysis"
         WHERE annotation_id = $1`,
        [annotationId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching deception analysis:', error);
      throw new Error('Failed to fetch deception analysis');
    }
  }

  /**
   * Vote on an annotation (upvote/downvote)
   */
  @Mutation(() => Annotation)
  async voteOnAnnotation(
    @Arg('annotationId', () => ID) annotationId: string,
    @Arg('vote', () => Int) vote: number, // 1 for upvote, -1 for downvote
    @Ctx() { pool }: Context
  ): Promise<Annotation> {
    if (vote !== 1 && vote !== -1) {
      throw new Error('Vote must be 1 (upvote) or -1 (downvote)');
    }

    try {
      const result = await pool.query(
        `UPDATE public."Annotations"
         SET votes = votes + $1,
             updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [vote, annotationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Annotation not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error voting on annotation:', error);
      throw new Error('Failed to vote on annotation');
    }
  }

  /**
   * Dispute an AI-generated annotation
   */
  @Mutation(() => Annotation)
  async disputeAnnotation(
    @Arg('annotationId', () => ID) annotationId: string,
    @Arg('reason') reason: string,
    @Ctx() { pool, userId }: Context
  ): Promise<Annotation> {
    if (!userId) {
      throw new Error('You must be logged in to dispute an annotation');
    }

    try {
      const result = await pool.query(
        `UPDATE public."Annotations"
         SET status = 'disputed',
             user_notes = $1,
             updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [reason, annotationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Annotation not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error disputing annotation:', error);
      throw new Error('Failed to dispute annotation');
    }
  }

  /**
   * Create a manual annotation (user-created highlight/note)
   */
  @Mutation(() => Annotation)
  async createAnnotation(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('startOffset', () => Int) startOffset: number,
    @Arg('endOffset', () => Int) endOffset: number,
    @Arg('highlightedText') highlightedText: string,
    @Arg('annotationType') annotationType: string,
    @Arg('userNotes', { nullable: true }) userNotes?: string,
    @Arg('color', { nullable: true }) color?: string,
    @Ctx() { pool, userId }: Context
  ): Promise<Annotation> {
    if (!userId) {
      throw new Error('You must be logged in to create annotations');
    }

    try {
      const result = await pool.query(
        `INSERT INTO public."Annotations" (
          target_node_id, start_offset, end_offset, highlighted_text,
          annotation_type, user_notes, color, created_by, is_ai_generated,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, 'approved', now(), now())
        RETURNING *`,
        [nodeId, startOffset, endOffset, highlightedText, annotationType, userNotes, color || '#FFFF00', userId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating annotation:', error);
      throw new Error('Failed to create annotation');
    }
  }

  /**
   * Delete an annotation (only owner or admin can delete)
   */
  @Mutation(() => Boolean)
  async deleteAnnotation(
    @Arg('annotationId', () => ID) annotationId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('You must be logged in to delete annotations');
    }

    try {
      const result = await pool.query(
        `DELETE FROM public."Annotations"
         WHERE id = $1 AND created_by = $2`,
        [annotationId, userId]
      );

      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error deleting annotation:', error);
      throw new Error('Failed to delete annotation');
    }
  }

  /**
   * Get article trustworthiness score (based on deception annotations)
   */
  @Query(() => Float)
  async getArticleTrustworthinessScore(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) as total_annotations,
          COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
          COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
          AVG(confidence) as avg_confidence
         FROM public."Annotations"
         WHERE target_node_id = $1
           AND annotation_type = 'deception'
           AND status = 'approved'`,
        [nodeId]
      );

      const { total_annotations, high_severity, medium_severity, avg_confidence } = result.rows[0];

      if (total_annotations === 0) {
        return 1.0; // Perfect score if no deceptions detected
      }

      // Calculate penalty based on severity
      const penalty = (high_severity * 3 + medium_severity * 2 + (total_annotations - high_severity - medium_severity) * 1);
      const score = Math.max(0, 1 - (penalty * avg_confidence / (total_annotations * 3)));

      return Math.round(score * 100) / 100;
    } catch (error) {
      console.error('Error calculating trustworthiness score:', error);
      return 0.5; // Default neutral score on error
    }
  }
}
