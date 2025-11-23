import { Resolver, Query, Mutation, Arg, Ctx, ID, Float, Int, FieldResolver, Root } from 'type-graphql';
import { Pool } from 'pg';
import { Node } from '../entities/Node';
import { Edge } from '../entities/Edge';
import { User } from '../entities/User';

/**
 * VeracityResolver - Refactored to use node-based evidence storage
 *
 * Evidence is now stored as edges with evidenceType in props
 * Sources are stored as nodes with type "Reference" or "Document"
 * Veracity scores are stored in node/edge props
 */

// ========================================================================
// TYPE DEFINITIONS (Mapped to JSONB props)
// ========================================================================

class VeracityScore {
  id: string;
  targetNodeId?: string;
  targetEdgeId?: string;
  veracityScore: number;
  confidence: number;
  evidenceCount: number;
  supportingCount: number;
  refutingCount: number;
  neutralCount: number;
  clarifyingCount: number;
  lastUpdated: Date;
  calculationMethod?: string;

  // Extracted from props
  static fromNode(node: any): VeracityScore {
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
    return {
      id: node.id,
      targetNodeId: node.id,
      targetEdgeId: undefined,
      veracityScore: props.veracityScore || 0.5,
      confidence: props.confidence || 0.5,
      evidenceCount: props.evidenceCount || 0,
      supportingCount: props.supportingCount || 0,
      refutingCount: props.refutingCount || 0,
      neutralCount: props.neutralCount || 0,
      clarifyingCount: props.clarifyingCount || 0,
      lastUpdated: node.updated_at || node.created_at,
      calculationMethod: props.calculationMethod || 'weighted_average'
    };
  }

  static fromEdge(edge: any): VeracityScore {
    const props = typeof edge.props === 'string' ? JSON.parse(edge.props) : edge.props;
    return {
      id: edge.id,
      targetNodeId: undefined,
      targetEdgeId: edge.id,
      veracityScore: props.veracityScore || 0.5,
      confidence: props.confidence || 0.5,
      evidenceCount: props.evidenceCount || 0,
      supportingCount: props.supportingCount || 0,
      refutingCount: props.refutingCount || 0,
      neutralCount: props.neutralCount || 0,
      clarifyingCount: props.clarifyingCount || 0,
      lastUpdated: edge.updated_at || edge.created_at,
      calculationMethod: props.calculationMethod || 'weighted_average'
    };
  }
}

class Evidence {
  id: string;
  targetNodeId?: string;
  targetEdgeId?: string;
  sourceNodeId?: string;
  evidenceType: string;
  weight: number;
  confidence: number;
  content: string;
  submittedBy: string;
  createdAt: Date;

  // Extracted from edge props
  static fromEdge(edge: any): Evidence {
    const props = typeof edge.props === 'string' ? JSON.parse(edge.props) : edge.props;
    return {
      id: edge.id,
      targetNodeId: edge.target_node_id,
      targetEdgeId: props.targetEdgeId,
      sourceNodeId: edge.source_node_id,
      evidenceType: props.evidenceType || 'neutral',
      weight: props.weight || 1.0,
      confidence: props.confidence || 0.5,
      content: props.content || props.description || '',
      submittedBy: props.createdBy || '',
      createdAt: edge.created_at
    };
  }
}

class Source {
  id: string;
  sourceType: string;
  title: string;
  url?: string;
  authors?: string[];
  publicationDate?: Date;
  publisher?: string;
  abstract?: string;
  credibilityScore?: number;
  submittedBy?: string;
  createdAt: Date;

  // Extracted from node props
  static fromNode(node: any): Source {
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
    return {
      id: node.id,
      sourceType: props.sourceType || 'other',
      title: props.title || '',
      url: props.url,
      authors: props.authors,
      publicationDate: props.publicationDate ? new Date(props.publicationDate) : undefined,
      publisher: props.publisher,
      abstract: props.abstract || props.description,
      credibilityScore: props.credibilityScore || 0.5,
      submittedBy: props.createdBy,
      createdAt: node.created_at
    };
  }
}

// ========================================================================
// VERACITY RESOLVER
// ========================================================================

@Resolver(() => Node)
export class VeracityResolver {

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Get veracity score for a node
   */
  @Query(() => Float)
  async getNodeVeracityScore(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID) nodeId: string
  ): Promise<number> {
    const result = await pool.query(
      'SELECT props FROM public."Nodes" WHERE id = $1',
      [nodeId]
    );

    if (!result.rows[0]) return 0.5;

    const props = typeof result.rows[0].props === 'string'
      ? JSON.parse(result.rows[0].props)
      : result.rows[0].props;

    return props.veracityScore || props.weight || 0.5;
  }

  /**
   * Get veracity score for an edge
   */
  @Query(() => Float)
  async getEdgeVeracityScore(
    @Ctx() { pool }: { pool: Pool },
    @Arg('edgeId', () => ID) edgeId: string
  ): Promise<number> {
    const result = await pool.query(
      'SELECT props FROM public."Edges" WHERE id = $1',
      [edgeId]
    );

    if (!result.rows[0]) return 0.5;

    const props = typeof result.rows[0].props === 'string'
      ? JSON.parse(result.rows[0].props)
      : result.rows[0].props;

    return props.veracityScore || props.weight || 0.5;
  }

  /**
   * Get evidence edges for a node (edges pointing TO the node with evidenceType in props)
   */
  @Query(() => [Edge])
  async getEvidenceForNode(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID) nodeId: string
  ): Promise<Edge[]> {
    const result = await pool.query(
      `SELECT e.* FROM public."Edges" e
       WHERE e.target_node_id = $1
       AND e.props ? 'evidenceType'
       ORDER BY e.created_at DESC`,
      [nodeId]
    );
    return result.rows;
  }

  /**
   * Get evidence for an edge (edges pointing to edges not supported, return empty)
   */
  @Query(() => [Edge])
  async getEvidenceForEdge(
    @Ctx() { pool }: { pool: Pool },
    @Arg('edgeId', () => ID) edgeId: string
  ): Promise<Edge[]> {
    // Edges pointing to edges would require storing targetEdgeId in props
    // For now, return empty array
    return [];
  }

  /**
   * Get all source nodes (Reference/Document types)
   */
  @Query(() => [Node])
  async getSources(
    @Ctx() { pool }: { pool: Pool },
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number = 50
  ): Promise<Node[]> {
    const result = await pool.query(
      `SELECT n.* FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name IN ('Reference', 'Document', 'Citation')
       ORDER BY n.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get a specific source node
   */
  @Query(() => Node, { nullable: true })
  async getSource(
    @Ctx() { pool }: { pool: Pool },
    @Arg('sourceId', () => ID) sourceId: string
  ): Promise<Node | null> {
    const result = await pool.query(
      'SELECT * FROM public."Nodes" WHERE id = $1',
      [sourceId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get nodes with low veracity scores
   */
  @Query(() => [Node])
  async getLowVeracityNodes(
    @Ctx() { pool }: { pool: Pool },
    @Arg('threshold', () => Float, { nullable: true, defaultValue: 0.5 }) threshold: number = 0.5,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number = 50
  ): Promise<Node[]> {
    const result = await pool.query(
      `SELECT n.* FROM public."Nodes" n
       WHERE (n.props->>'veracityScore')::float < $1
       OR ((n.props->>'weight')::float < $1 AND n.props->>'veracityScore' IS NULL)
       ORDER BY COALESCE((n.props->>'veracityScore')::float, (n.props->>'weight')::float, 0.5) ASC
       LIMIT $2`,
      [threshold, limit]
    );
    return result.rows;
  }

  // ========================================================================
  // MUTATIONS
  // ========================================================================

  /**
   * Calculate or recalculate veracity score for a node or edge
   * Uses evidence edges to compute weighted average
   */
  @Mutation(() => Float)
  async calculateVeracityScore(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID, { nullable: true }) nodeId?: string,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId?: string,
    @Arg('changeReason', { nullable: true, defaultValue: 'manual_recalculation' })
    changeReason: string = 'manual_recalculation'
  ): Promise<number> {
    if (!nodeId && !edgeId) {
      throw new Error('Must provide either nodeId or edgeId');
    }

    if (nodeId && edgeId) {
      throw new Error('Cannot provide both nodeId and edgeId');
    }

    const targetId = nodeId || edgeId;
    const targetTable = nodeId ? 'Nodes' : 'Edges';

    try {
      // Get all evidence edges for this target
      const evidenceResult = await pool.query(
        `SELECT e.props FROM public."Edges" e
         WHERE e.target_node_id = $1
         AND e.props ? 'evidenceType'`,
        [targetId]
      );

      // Calculate weighted average based on evidence
      let supportingWeight = 0;
      let refutingWeight = 0;
      let totalWeight = 0;
      let counts = { supporting: 0, refuting: 0, neutral: 0, clarifying: 0 };

      for (const row of evidenceResult.rows) {
        const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
        const evidenceType = props.evidenceType || 'neutral';
        const weight = props.weight || 1.0;
        const confidence = props.confidence || 0.5;
        const effectiveWeight = weight * confidence;

        counts[evidenceType as keyof typeof counts] = (counts[evidenceType as keyof typeof counts] || 0) + 1;

        if (evidenceType === 'supporting') {
          supportingWeight += effectiveWeight;
          totalWeight += effectiveWeight;
        } else if (evidenceType === 'refuting') {
          refutingWeight += effectiveWeight;
          totalWeight += effectiveWeight;
        }
      }

      // Calculate veracity score (0 = false, 1 = true)
      let veracityScore = 0.5; // Default neutral
      let calculatedConfidence = 0.3; // Low confidence by default

      if (totalWeight > 0) {
        veracityScore = supportingWeight / totalWeight;
        calculatedConfidence = Math.min(0.9, totalWeight / 10); // Cap at 0.9
      }

      const evidenceCount = evidenceResult.rows.length;

      // Update the target with new veracity score
      const updateResult = await pool.query(
        `UPDATE public."${targetTable}"
         SET props = props || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2
         RETURNING props`,
        [
          JSON.stringify({
            veracityScore,
            confidence: calculatedConfidence,
            evidenceCount,
            supportingCount: counts.supporting,
            refutingCount: counts.refuting,
            neutralCount: counts.neutral,
            clarifyingCount: counts.clarifying,
            lastVeracityUpdate: new Date().toISOString(),
            calculationMethod: 'weighted_evidence'
          }),
          targetId
        ]
      );

      return veracityScore;
    } catch (error) {
      console.error('Error calculating veracity score:', error);
      throw new Error(`Failed to calculate veracity score: ${error}`);
    }
  }

  /**
   * Submit new evidence for a node or edge
   * Creates an edge with evidenceType in props
   */
  @Mutation(() => Edge)
  async submitEvidence(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID, { nullable: true }) nodeId?: string,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId?: string,
    @Arg('sourceNodeId', () => ID) sourceNodeId?: string,
    @Arg('evidenceType', () => String) evidenceType?: string,
    @Arg('content', () => String) content?: string,
    @Arg('weight', () => Float, { nullable: true, defaultValue: 1.0 }) weight: number = 1.0,
    @Arg('confidence', () => Float, { nullable: true, defaultValue: 0.5 }) confidence: number = 0.5,
    @Arg('submittedBy', () => ID) submittedBy?: string
  ): Promise<Edge> {
    if (!nodeId && !edgeId) {
      throw new Error('Must provide either nodeId or edgeId');
    }

    if (nodeId && edgeId) {
      throw new Error('Cannot provide both nodeId and edgeId');
    }

    if (!sourceNodeId || !evidenceType || !content || !submittedBy) {
      throw new Error('sourceNodeId, evidenceType, content, and submittedBy are required');
    }

    // Validate evidence type
    const validTypes = ['supporting', 'refuting', 'neutral', 'clarifying'];
    if (!validTypes.includes(evidenceType)) {
      throw new Error(`Invalid evidence type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Check if target has high credibility (weight >= 0.90 = immutable)
    if (nodeId) {
      const nodeCheck = await pool.query(
        'SELECT props FROM public."Nodes" WHERE id = $1',
        [nodeId]
      );
      const nodeProps = typeof nodeCheck.rows[0]?.props === 'string'
        ? JSON.parse(nodeCheck.rows[0].props)
        : nodeCheck.rows[0]?.props;
      const nodeWeight = nodeProps?.weight || 0.5;
      if (nodeWeight >= 0.90) {
        throw new Error('Cannot submit evidence for high credibility (weight >= 0.90) nodes');
      }
    }

    if (edgeId) {
      const edgeCheck = await pool.query(
        'SELECT props FROM public."Edges" WHERE id = $1',
        [edgeId]
      );
      const edgeProps = typeof edgeCheck.rows[0]?.props === 'string'
        ? JSON.parse(edgeCheck.rows[0].props)
        : edgeCheck.rows[0]?.props;
      const edgeWeight = edgeProps?.weight || 0.5;
      if (edgeWeight >= 0.90) {
        throw new Error('Cannot submit evidence for high credibility (weight >= 0.90) edges');
      }
    }

    // Get the "references" edge type
    const edgeTypeResult = await pool.query(
      'SELECT id FROM public."EdgeTypes" WHERE name = $1',
      ['references']
    );

    if (!edgeTypeResult.rows[0]) {
      throw new Error('Edge type "references" not found');
    }

    const edgeTypeId = edgeTypeResult.rows[0].id;

    // Get graphId from source node
    const sourceResult = await pool.query(
      'SELECT props FROM public."Nodes" WHERE id = $1',
      [sourceNodeId]
    );
    const sourceProps = typeof sourceResult.rows[0]?.props === 'string'
      ? JSON.parse(sourceResult.rows[0].props)
      : sourceResult.rows[0]?.props;
    const graphId = sourceProps?.graphId;

    // Insert evidence as an edge
    const result = await pool.query(
      `INSERT INTO public."Edges" (
        edge_type_id,
        source_node_id,
        target_node_id,
        props,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *`,
      [
        edgeTypeId,
        sourceNodeId,
        nodeId,
        JSON.stringify({
          graphId,
          evidenceType,
          weight,
          confidence,
          content,
          createdBy: submittedBy,
          targetEdgeId: edgeId // Store if evidence is for an edge
        })
      ]
    );

    // Recalculate veracity score
    await this.calculateVeracityScore({ pool }, nodeId, edgeId, 'new_evidence_submitted');

    return result.rows[0];
  }

  /**
   * Create a new source node
   */
  @Mutation(() => Node)
  async createSource(
    @Ctx() { pool }: { pool: Pool },
    @Arg('graphId', () => ID) graphId: string,
    @Arg('sourceType', () => String) sourceType: string,
    @Arg('title', () => String) title: string,
    @Arg('url', () => String, { nullable: true }) url?: string,
    @Arg('authors', () => [String], { nullable: true }) authors?: string[],
    @Arg('publicationDate', () => Date, { nullable: true }) publicationDate?: Date,
    @Arg('publisher', () => String, { nullable: true }) publisher?: string,
    @Arg('abstract', () => String, { nullable: true }) abstract?: string,
    @Arg('submittedBy', () => ID, { nullable: true }) submittedBy?: string
  ): Promise<Node> {
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

    // Get the "Reference" node type
    const nodeTypeResult = await pool.query(
      'SELECT id FROM public."NodeTypes" WHERE name = $1',
      ['Reference']
    );

    if (!nodeTypeResult.rows[0]) {
      throw new Error('Node type "Reference" not found');
    }

    const nodeTypeId = nodeTypeResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO public."Nodes" (
        node_type_id,
        props,
        created_at,
        updated_at
      ) VALUES ($1, $2, NOW(), NOW())
      RETURNING *`,
      [
        nodeTypeId,
        JSON.stringify({
          graphId,
          title,
          sourceType,
          url,
          authors,
          publicationDate: publicationDate?.toISOString(),
          publisher,
          abstract,
          credibilityScore: 0.5, // Default credibility
          weight: 0.5,
          createdBy: submittedBy
        })
      ]
    );

    return result.rows[0];
  }

  /**
   * Update source credibility score
   */
  @Mutation(() => Float)
  async updateSourceCredibility(
    @Ctx() { pool }: { pool: Pool },
    @Arg('sourceId', () => ID) sourceId: string,
    @Arg('credibilityScore', () => Float) credibilityScore: number
  ): Promise<number> {
    if (credibilityScore < 0 || credibilityScore > 1) {
      throw new Error('Credibility score must be between 0 and 1');
    }

    await pool.query(
      `UPDATE public."Nodes"
       SET props = props || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [
        JSON.stringify({ credibilityScore }),
        sourceId
      ]
    );

    return credibilityScore;
  }
}
