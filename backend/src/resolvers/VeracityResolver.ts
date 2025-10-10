import { Resolver, Query, Mutation, Arg, Ctx, FieldResolver, Root, ID, Int, Float } from 'type-graphql';
import { Pool } from 'pg';
import { VeracityScore } from '../entities/VeracityScore';
import { VeracityScoreHistory } from '../entities/VeracityScoreHistory';
import { Evidence } from '../entities/Evidence';
import { Source } from '../entities/Source';
import { SourceCredibility } from '../entities/SourceCredibility';
import { Node } from '../entities/Node';
import { Edge } from '../entities/Edge';
import { User } from '../entities/User';

@Resolver(() => VeracityScore)
export class VeracityScoreResolver {
  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Get the current veracity score for a node or edge
   */
  @Query(() => VeracityScore, { nullable: true })
  async getVeracityScore(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID, { nullable: true }) nodeId?: string,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId?: string
  ): Promise<VeracityScore | null> {
    if (!nodeId && !edgeId) {
      throw new Error('Must provide either nodeId or edgeId');
    }

    if (nodeId && edgeId) {
      throw new Error('Cannot provide both nodeId and edgeId');
    }

    // Check if target is Level 0 - they have fixed veracity = 1.0
    if (nodeId) {
      const nodeCheck = await pool.query(
        'SELECT is_level_0 FROM public."Nodes" WHERE id = $1',
        [nodeId]
      );
      if (nodeCheck.rows[0]?.is_level_0) {
        // Return a synthetic VeracityScore for Level 0 nodes
        return {
          id: nodeId,
          target_node_id: nodeId,
          target_edge_id: undefined,
          veracity_score: 1.0,
          evidence_weight_sum: 0,
          evidence_count: 0,
          supporting_evidence_weight: 0,
          refuting_evidence_weight: 0,
          consensus_score: 1.0,
          source_count: 0,
          source_agreement_ratio: 1.0,
          challenge_count: 0,
          open_challenge_count: 0,
          challenge_impact: 0,
          temporal_decay_factor: 1.0,
          calculation_method: 'level_0_fixed',
          calculated_at: new Date(),
          calculated_by: 'system',
          updated_at: new Date(),
        };
      }

      const result = await pool.query(
        'SELECT * FROM public."VeracityScores" WHERE target_node_id = $1',
        [nodeId]
      );
      return result.rows[0] || null;
    }

    if (edgeId) {
      const edgeCheck = await pool.query(
        'SELECT is_level_0 FROM public."Edges" WHERE id = $1',
        [edgeId]
      );
      if (edgeCheck.rows[0]?.is_level_0) {
        // Return a synthetic VeracityScore for Level 0 edges
        return {
          id: edgeId,
          target_node_id: undefined,
          target_edge_id: edgeId,
          veracity_score: 1.0,
          evidence_weight_sum: 0,
          evidence_count: 0,
          supporting_evidence_weight: 0,
          refuting_evidence_weight: 0,
          consensus_score: 1.0,
          source_count: 0,
          source_agreement_ratio: 1.0,
          challenge_count: 0,
          open_challenge_count: 0,
          challenge_impact: 0,
          temporal_decay_factor: 1.0,
          calculation_method: 'level_0_fixed',
          calculated_at: new Date(),
          calculated_by: 'system',
          updated_at: new Date(),
        };
      }

      const result = await pool.query(
        'SELECT * FROM public."VeracityScores" WHERE target_edge_id = $1',
        [edgeId]
      );
      return result.rows[0] || null;
    }

    return null;
  }

  /**
   * Get veracity score history for a node or edge
   */
  @Query(() => [VeracityScoreHistory])
  async getVeracityHistory(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID, { nullable: true }) nodeId?: string,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId?: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number = 50
  ): Promise<VeracityScoreHistory[]> {
    if (!nodeId && !edgeId) {
      throw new Error('Must provide either nodeId or edgeId');
    }

    if (nodeId && edgeId) {
      throw new Error('Cannot provide both nodeId and edgeId');
    }

    let query: string;
    let params: any[];

    if (nodeId) {
      query = `
        SELECT h.*
        FROM public."VeracityScoreHistory" h
        JOIN public."VeracityScores" vs ON h.veracity_score_id = vs.id
        WHERE vs.target_node_id = $1
        ORDER BY h.changed_at DESC
        LIMIT $2
      `;
      params = [nodeId, limit];
    } else {
      query = `
        SELECT h.*
        FROM public."VeracityScoreHistory" h
        JOIN public."VeracityScores" vs ON h.veracity_score_id = vs.id
        WHERE vs.target_edge_id = $1
        ORDER BY h.changed_at DESC
        LIMIT $2
      `;
      params = [edgeId, limit];
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get all evidence for a specific node
   */
  @Query(() => [Evidence])
  async getEvidenceForNode(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID) nodeId: string
  ): Promise<Evidence[]> {
    const result = await pool.query(
      `SELECT e.* FROM public."Evidence" e WHERE e.target_node_id = $1 ORDER BY e.created_at DESC`,
      [nodeId]
    );
    return result.rows;
  }

  /**
   * Get all evidence for a specific edge
   */
  @Query(() => [Evidence])
  async getEvidenceForEdge(
    @Ctx() { pool }: { pool: Pool },
    @Arg('edgeId', () => ID) edgeId: string
  ): Promise<Evidence[]> {
    const result = await pool.query(
      `SELECT e.* FROM public."Evidence" e WHERE e.target_edge_id = $1 ORDER BY e.created_at DESC`,
      [edgeId]
    );
    return result.rows;
  }

  /**
   * Get all sources with their credibility scores
   */
  @Query(() => [Source])
  async getSources(
    @Ctx() { pool }: { pool: Pool },
    @Arg('limit', () => Int, { nullable: true, defaultValue: 100 }) limit: number = 100
  ): Promise<Source[]> {
    const result = await pool.query(
      `SELECT s.* FROM public."Sources" s ORDER BY s.created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get a single source by ID
   */
  @Query(() => Source, { nullable: true })
  async getSource(
    @Ctx() { pool }: { pool: Pool },
    @Arg('id', () => ID) id: string
  ): Promise<Source | null> {
    const result = await pool.query(
      `SELECT * FROM public."Sources" WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get source credibility for a specific source
   */
  @Query(() => SourceCredibility, { nullable: true })
  async getSourceCredibility(
    @Ctx() { pool }: { pool: Pool },
    @Arg('sourceId', () => ID) sourceId: string
  ): Promise<SourceCredibility | null> {
    const result = await pool.query(
      `SELECT * FROM public."SourceCredibility" WHERE source_id = $1`,
      [sourceId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all veracity scores with low confidence (disputed claims)
   */
  @Query(() => [VeracityScore])
  async getDisputedClaims(
    @Ctx() { pool }: { pool: Pool },
    @Arg('threshold', () => Float, { nullable: true, defaultValue: 0.5 }) threshold: number = 0.5,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number = 50
  ): Promise<VeracityScore[]> {
    const result = await pool.query(
      `
      SELECT * FROM public."VeracityScores"
      WHERE veracity_score < $1 AND evidence_count >= 3
      ORDER BY veracity_score ASC
      LIMIT $2
      `,
      [threshold, limit]
    );
    return result.rows;
  }

  // ========================================================================
  // MUTATIONS
  // ========================================================================

  /**
   * Calculate or recalculate veracity score for a node or edge
   * Uses the database function refresh_veracity_score
   */
  @Mutation(() => VeracityScore, { nullable: true })
  async calculateVeracityScore(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID, { nullable: true }) nodeId?: string,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId?: string,
    @Arg('changeReason', { nullable: true, defaultValue: 'manual_recalculation' })
    changeReason: string = 'manual_recalculation'
  ): Promise<VeracityScore | null> {
    if (!nodeId && !edgeId) {
      throw new Error('Must provide either nodeId or edgeId');
    }

    if (nodeId && edgeId) {
      throw new Error('Cannot provide both nodeId and edgeId');
    }

    const targetType = nodeId ? 'node' : 'edge';
    const targetId = nodeId || edgeId;

    try {
      // Call the database function to refresh the score
      await pool.query(
        `SELECT refresh_veracity_score($1, $2, $3)`,
        [targetType, targetId, changeReason]
      );

      // Retrieve the updated score
      if (nodeId) {
        const result = await pool.query(
          'SELECT * FROM public."VeracityScores" WHERE target_node_id = $1',
          [nodeId]
        );
        return result.rows[0] || null;
      } else {
        const result = await pool.query(
          'SELECT * FROM public."VeracityScores" WHERE target_edge_id = $1',
          [edgeId]
        );
        return result.rows[0] || null;
      }
    } catch (error) {
      console.error('Error calculating veracity score:', error);
      throw new Error(`Failed to calculate veracity score: ${error}`);
    }
  }

  /**
   * Submit new evidence for a node or edge
   */
  @Mutation(() => Evidence)
  async submitEvidence(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID, { nullable: true }) nodeId?: string,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId?: string,
    @Arg('sourceId', () => ID) sourceId?: string,
    @Arg('evidenceType', () => String) evidenceType?: string,
    @Arg('content', () => String) content?: string,
    @Arg('weight', () => Float, { nullable: true, defaultValue: 1.0 }) weight: number = 1.0,
    @Arg('confidence', () => Float, { nullable: true, defaultValue: 0.5 }) confidence: number = 0.5,
    @Arg('submittedBy', () => ID) submittedBy?: string
  ): Promise<Evidence> {
    if (!nodeId && !edgeId) {
      throw new Error('Must provide either nodeId or edgeId');
    }

    if (nodeId && edgeId) {
      throw new Error('Cannot provide both nodeId and edgeId');
    }

    if (!sourceId || !evidenceType || !content || !submittedBy) {
      throw new Error('sourceId, evidenceType, content, and submittedBy are required');
    }

    // Validate evidence type
    const validTypes = ['supporting', 'refuting', 'neutral', 'clarifying'];
    if (!validTypes.includes(evidenceType)) {
      throw new Error(`Invalid evidence type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Check if target is Level 0 (not allowed)
    if (nodeId) {
      const nodeCheck = await pool.query(
        'SELECT is_level_0 FROM public."Nodes" WHERE id = $1',
        [nodeId]
      );
      if (nodeCheck.rows[0]?.is_level_0) {
        throw new Error('Cannot submit evidence for Level 0 (immutable) nodes');
      }
    }

    if (edgeId) {
      const edgeCheck = await pool.query(
        'SELECT is_level_0 FROM public."Edges" WHERE id = $1',
        [edgeId]
      );
      if (edgeCheck.rows[0]?.is_level_0) {
        throw new Error('Cannot submit evidence for Level 0 (immutable) edges');
      }
    }

    // Insert evidence
    const result = await pool.query(
      `
      INSERT INTO public."Evidence" (
        target_node_id,
        target_edge_id,
        source_id,
        evidence_type,
        weight,
        confidence,
        content,
        submitted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [nodeId, edgeId, sourceId, evidenceType, weight, confidence, content, submittedBy]
    );

    return result.rows[0];
  }

  /**
   * Create a new source
   */
  @Mutation(() => Source)
  async createSource(
    @Ctx() { pool }: { pool: Pool },
    @Arg('sourceType', () => String) sourceType: string,
    @Arg('title', () => String) title: string,
    @Arg('url', () => String, { nullable: true }) url?: string,
    @Arg('authors', () => [String], { nullable: true }) authors?: string[],
    @Arg('publicationDate', () => Date, { nullable: true }) publicationDate?: Date,
    @Arg('publisher', () => String, { nullable: true }) publisher?: string,
    @Arg('abstract', () => String, { nullable: true }) abstract?: string,
    @Arg('submittedBy', () => ID, { nullable: true }) submittedBy?: string
  ): Promise<Source> {
    // Validate source type
    const validTypes = [
      'academic_paper',
      'news_article',
      'government_report',
      'dataset',
      'expert_testimony',
      'book',
      'website',
      'video',
      'image',
      'other',
    ];

    if (!validTypes.includes(sourceType)) {
      throw new Error(`Invalid source type. Must be one of: ${validTypes.join(', ')}`);
    }

    const result = await pool.query(
      `
      INSERT INTO public."Sources" (
        source_type,
        title,
        url,
        authors,
        publication_date,
        publisher,
        abstract,
        submitted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [sourceType, title, url, authors, publicationDate, publisher, abstract, submittedBy]
    );

    return result.rows[0];
  }

  /**
   * Update source credibility (triggers recalculation)
   */
  @Mutation(() => SourceCredibility, { nullable: true })
  async updateSourceCredibility(
    @Ctx() { pool }: { pool: Pool },
    @Arg('sourceId', () => ID) sourceId: string
  ): Promise<SourceCredibility | null> {
    try {
      // Call the database function to update source credibility
      await pool.query(`SELECT update_source_credibility($1)`, [sourceId]);

      // Retrieve the updated credibility
      const result = await pool.query(
        `SELECT * FROM public."SourceCredibility" WHERE source_id = $1`,
        [sourceId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating source credibility:', error);
      throw new Error(`Failed to update source credibility: ${error}`);
    }
  }

  // ========================================================================
  // FIELD RESOLVERS
  // ========================================================================

  @FieldResolver(() => Node, { nullable: true })
  async node(@Root() veracityScore: VeracityScore, @Ctx() { pool }: { pool: Pool }): Promise<Node | null> {
    if (!veracityScore.target_node_id) return null;

    const result = await pool.query('SELECT * FROM public."Nodes" WHERE id = $1', [
      veracityScore.target_node_id,
    ]);
    return result.rows[0] || null;
  }

  @FieldResolver(() => Edge, { nullable: true })
  async edge(@Root() veracityScore: VeracityScore, @Ctx() { pool }: { pool: Pool }): Promise<Edge | null> {
    if (!veracityScore.target_edge_id) return null;

    const result = await pool.query('SELECT * FROM public."Edges" WHERE id = $1', [
      veracityScore.target_edge_id,
    ]);
    return result.rows[0] || null;
  }
}

// ========================================================================
// EVIDENCE RESOLVER
// ========================================================================

@Resolver(() => Evidence)
export class EvidenceResolver {
  @FieldResolver(() => Node, { nullable: true })
  async node(@Root() evidence: Evidence, @Ctx() { pool }: { pool: Pool }): Promise<Node | null> {
    if (!evidence.target_node_id) return null;

    const result = await pool.query('SELECT * FROM public."Nodes" WHERE id = $1', [evidence.target_node_id]);
    return result.rows[0] || null;
  }

  @FieldResolver(() => Edge, { nullable: true })
  async edge(@Root() evidence: Evidence, @Ctx() { pool }: { pool: Pool }): Promise<Edge | null> {
    if (!evidence.target_edge_id) return null;

    const result = await pool.query('SELECT * FROM public."Edges" WHERE id = $1', [evidence.target_edge_id]);
    return result.rows[0] || null;
  }

  @FieldResolver(() => Source)
  async source(@Root() evidence: Evidence, @Ctx() { pool }: { pool: Pool }): Promise<Source> {
    const result = await pool.query('SELECT * FROM public."Sources" WHERE id = $1', [evidence.source_id]);
    return result.rows[0];
  }

  @FieldResolver(() => User)
  async submitter(@Root() evidence: Evidence, @Ctx() { pool }: { pool: Pool }): Promise<User> {
    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [evidence.submitted_by]);
    return result.rows[0];
  }
}

// ========================================================================
// SOURCE RESOLVER
// ========================================================================

@Resolver(() => Source)
export class SourceResolver {
  @FieldResolver(() => User, { nullable: true })
  async submitter(@Root() source: Source, @Ctx() { pool }: { pool: Pool }): Promise<User | null> {
    if (!source.submitted_by) return null;

    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [source.submitted_by]);
    return result.rows[0] || null;
  }

  @FieldResolver(() => SourceCredibility, { nullable: true })
  async credibility(@Root() source: Source, @Ctx() { pool }: { pool: Pool }): Promise<SourceCredibility | null> {
    const result = await pool.query('SELECT * FROM public."SourceCredibility" WHERE source_id = $1', [source.id]);
    return result.rows[0] || null;
  }
}

// ========================================================================
// VERACITY SCORE HISTORY RESOLVER
// ========================================================================

@Resolver(() => VeracityScoreHistory)
export class VeracityScoreHistoryResolver {
  @FieldResolver(() => VeracityScore, { nullable: true })
  async veracity_score(
    @Root() history: VeracityScoreHistory,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<VeracityScore | null> {
    const result = await pool.query('SELECT * FROM public."VeracityScores" WHERE id = $1', [
      history.veracity_score_id,
    ]);
    return result.rows[0] || null;
  }
}
