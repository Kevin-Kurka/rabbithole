import { Pool } from 'pg';
import { EmbeddingService } from './EmbeddingService';

/**
 * Interface representing a potential duplicate inquiry match
 */
export interface InquiryMatch {
  existingInquiryId: string;
  title: string;
  description: string;
  similarity: number; // 0.0 to 1.0
  mergeRecommended: boolean; // true if similarity > 0.85
  createdBy: string;
  createdAt: Date;
}

/**
 * Similarity calculation components
 */
interface SimilarityFactors {
  semanticSimilarity: number; // From embedding cosine similarity
  titleSimilarity: number; // From Levenshtein distance
  descriptionOverlap: number; // From text overlap analysis
  finalScore: number; // Weighted combination
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseProps(props: any): Record<string, any> {
  if (!props) return {};
  if (typeof props === 'string') {
    try {
      return JSON.parse(props);
    } catch {
      return {};
    }
  }
  return props;
}

/**
 * InquiryDeduplicationService
 *
 * Prevents gaming the credibility system by detecting and merging duplicate or
 * near-duplicate inquiries using fuzzy matching algorithms.
 *
 * Key Features:
 * - Embedding-based semantic similarity (60% weight)
 * - Title Levenshtein similarity (25% weight)
 * - Description text overlap (15% weight)
 * - Merge threshold: 0.85 similarity
 * - Prevents creation of similar inquiries to manipulate scores
 *
 * ARCHITECTURE: Uses strict 4-table graph database (node_types, edge_types, nodes, edges)
 * All data stored in JSONB props field - no standalone tables.
 */
export class InquiryDeduplicationService {
  // Cache for node type IDs
  private nodeTypeCache: Map<string, string> = new Map();
  private edgeTypeCache: Map<string, string> = new Map();

  constructor(
    private pool: Pool,
    private embeddingService: EmbeddingService
  ) {}

  /**
   * Get node type ID by name (cached)
   */
  private async getNodeTypeId(name: string): Promise<string | null> {
    if (this.nodeTypeCache.has(name)) {
      return this.nodeTypeCache.get(name)!;
    }
    const result = await this.pool.query(
      `SELECT id FROM node_types WHERE name = $1`,
      [name]
    );
    if (result.rows.length === 0) return null;
    this.nodeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

  /**
   * Get edge type ID by name (cached)
   */
  private async getEdgeTypeId(name: string): Promise<string | null> {
    if (this.edgeTypeCache.has(name)) {
      return this.edgeTypeCache.get(name)!;
    }
    const result = await this.pool.query(
      `SELECT id FROM edge_types WHERE name = $1`,
      [name]
    );
    if (result.rows.length === 0) return null;
    this.edgeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

  /**
   * Check for duplicate inquiries on the same node
   * Uses Inquiry NodeType from nodes table
   *
   * @param title - Inquiry title
   * @param description - Inquiry description
   * @param nodeId - Target node ID
   * @param inquiryType - Type of inquiry (optional, for better matching)
   * @returns Array of matching inquiries sorted by similarity (highest first)
   */
  async checkForDuplicates(
    title: string,
    description: string,
    nodeId: string,
    inquiryType?: string
  ): Promise<InquiryMatch[]> {
    try {
      const inquiryTypeId = await this.getNodeTypeId('Inquiry');
      if (!inquiryTypeId) {
        console.warn('Inquiry node type not found');
        return [];
      }

      // 1. Generate embedding for new inquiry
      const combinedText = `${title} ${description}`;
      const newEmbedding = await this.embeddingService.generateEmbedding(combinedText);

      // 2. Find similar inquiries on same node using pgvector
      // Cosine distance < 0.15 means similarity > 0.85
      const query = inquiryType
        ? `
          SELECT
            i.id,
            i.props,
            i.created_at,
            i.ai <=> $1::vector AS distance,
            1 - (i.ai <=> $1::vector) AS semantic_similarity
          FROM nodes i
          WHERE i.node_type_id = $2
            AND i.props->>'nodeId' = $3
            AND i.props->>'inquiryType' = $4
            AND i.props->>'status' != 'merged'
            AND i.ai IS NOT NULL
            AND (i.ai <=> $1::vector) < 0.15
          ORDER BY distance ASC
          LIMIT 10
        `
        : `
          SELECT
            i.id,
            i.props,
            i.created_at,
            i.ai <=> $1::vector AS distance,
            1 - (i.ai <=> $1::vector) AS semantic_similarity
          FROM nodes i
          WHERE i.node_type_id = $2
            AND i.props->>'nodeId' = $3
            AND i.props->>'status' != 'merged'
            AND i.ai IS NOT NULL
            AND (i.ai <=> $1::vector) < 0.15
          ORDER BY distance ASC
          LIMIT 10
        `;

      const params = inquiryType
        ? [JSON.stringify(newEmbedding), inquiryTypeId, nodeId, inquiryType]
        : [JSON.stringify(newEmbedding), inquiryTypeId, nodeId];

      const result = await this.pool.query(query, params);

      // 3. Calculate multi-factor similarity for each match
      const matches: InquiryMatch[] = result.rows.map(row => {
        const props = parseProps(row.props);
        const factors = this.calculateMultiFactorSimilarity(
          {
            semanticSimilarity: parseFloat(row.semantic_similarity),
            title: props.title || '',
            description: props.description || ''
          },
          title,
          description
        );

        return {
          existingInquiryId: row.id,
          title: props.title || '',
          description: props.description || '',
          similarity: factors.finalScore,
          mergeRecommended: factors.finalScore > 0.85,
          createdBy: props.createdByUserId || props.createdBy || '',
          createdAt: new Date(row.created_at)
        };
      });

      // Sort by similarity (highest first)
      matches.sort((a, b) => b.similarity - a.similarity);

      return matches;
    } catch (error) {
      console.error('Error checking for duplicate inquiries:', error);
      throw new Error('Failed to check for duplicate inquiries');
    }
  }

  /**
   * Calculate multi-factor similarity score
   *
   * Weighted formula:
   * - Semantic embedding similarity: 60% (captures meaning)
   * - Title Levenshtein similarity: 25% (catches typos and variations)
   * - Description text overlap: 15% (finds common phrases)
   *
   * @private
   */
  private calculateMultiFactorSimilarity(
    existing: {
      semanticSimilarity: number;
      title: string;
      description: string;
    },
    newTitle: string,
    newDescription: string
  ): SimilarityFactors {
    // Component 1: Semantic similarity from embeddings (already calculated)
    const semanticSimilarity = existing.semanticSimilarity;

    // Component 2: Title Levenshtein similarity
    const titleSimilarity = this.levenshteinSimilarity(
      existing.title.toLowerCase(),
      newTitle.toLowerCase()
    );

    // Component 3: Description text overlap
    const descOverlap = this.textOverlap(
      existing.description.toLowerCase(),
      newDescription.toLowerCase()
    );

    // Weighted final score
    const finalScore = (
      semanticSimilarity * 0.60 +
      titleSimilarity * 0.25 +
      descOverlap * 0.15
    );

    return {
      semanticSimilarity,
      titleSimilarity,
      descriptionOverlap: descOverlap,
      finalScore: Math.min(1.0, Math.max(0.0, finalScore)) // Clamp to [0, 1]
    };
  }

  /**
   * Calculate Levenshtein similarity (normalized to 0-1)
   *
   * Uses edit distance to measure string similarity.
   * 1.0 = identical, 0.0 = completely different
   *
   * @private
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 1.0;

    return 1.0 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance (edit distance)
   *
   * @private
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create 2D array for dynamic programming
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill the DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // Deletion
            dp[i][j - 1],     // Insertion
            dp[i - 1][j - 1]  // Substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate text overlap similarity using Jaccard index
   *
   * Measures how many words are shared between two texts.
   * Uses word-level n-grams (bigrams) for better phrase matching.
   *
   * @private
   */
  private textOverlap(text1: string, text2: string): number {
    // Tokenize into words (remove punctuation, split on whitespace)
    const words1 = text1
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2); // Ignore short words

    const words2 = text2
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) {
      return 0.0;
    }

    // Create bigrams (2-word sequences)
    const bigrams1 = this.createBigrams(words1);
    const bigrams2 = this.createBigrams(words2);

    // Calculate Jaccard index: |intersection| / |union|
    const set1 = new Set(bigrams1);
    const set2 = new Set(bigrams2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0.0;

    return intersection.size / union.size;
  }

  /**
   * Create bigrams from word array
   *
   * @private
   */
  private createBigrams(words: string[]): string[] {
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
    return bigrams;
  }

  /**
   * Merge an inquiry into another (mark as merged)
   * Uses Inquiry and Position NodeTypes from nodes table
   *
   * @param sourceInquiryId - Inquiry to be merged (will be marked as merged)
   * @param targetInquiryId - Inquiry to merge into (will remain active)
   * @param justification - Explanation for why these inquiries are duplicates
   * @param userId - User performing the merge
   */
  async mergeInquiries(
    sourceInquiryId: string,
    targetInquiryId: string,
    justification: string,
    userId: string
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const inquiryTypeId = await this.getNodeTypeId('Inquiry');
      const positionTypeId = await this.getNodeTypeId('Position');
      const hasPositionEdgeTypeId = await this.getEdgeTypeId('HAS_POSITION');

      if (!inquiryTypeId) {
        throw new Error('Inquiry node type not found. Run migrations.');
      }

      // Update source inquiry to merged status in props
      await client.query(
        `
        UPDATE nodes
        SET
          props = props || $1::jsonb,
          updated_at = NOW()
        WHERE id = $2 AND node_type_id = $3
        `,
        [
          JSON.stringify({
            status: 'merged',
            mergedIntoId: targetInquiryId,
            mergeJustification: justification,
            isMerged: true
          }),
          sourceInquiryId,
          inquiryTypeId
        ]
      );

      // Transfer positions from source to target inquiry
      // Update HAS_POSITION edges to point to target inquiry
      if (hasPositionEdgeTypeId) {
        await client.query(
          `
          UPDATE edges
          SET source_node_id = $1, updated_at = NOW()
          WHERE source_node_id = $2 AND edge_type_id = $3
          `,
          [targetInquiryId, sourceInquiryId, hasPositionEdgeTypeId]
        );
      }

      // Also update inquiryId in position node props
      if (positionTypeId) {
        await client.query(
          `
          UPDATE nodes
          SET props = props || jsonb_build_object('inquiryId', $1::text), updated_at = NOW()
          WHERE node_type_id = $2
            AND props->>'inquiryId' = $3
          `,
          [targetInquiryId, positionTypeId, sourceInquiryId]
        );
      }

      await client.query('COMMIT');

      console.log(`Merged inquiry ${sourceInquiryId} into ${targetInquiryId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error merging inquiries:', error);
      throw new Error('Failed to merge inquiries');
    } finally {
      client.release();
    }
  }

  /**
   * Check if user can bypass duplicate detection
   *
   * Users can create similar inquiries if they provide valid justification
   * explaining why their inquiry is distinct.
   *
   * @param title - New inquiry title
   * @param description - New inquiry description
   * @param justification - User's explanation of why inquiry is not a duplicate
   * @returns True if justification is sufficient
   */
  async validateDistinctionJustification(
    title: string,
    description: string,
    justification: string
  ): Promise<boolean> {
    // Justification must be substantive (at least 100 characters)
    if (!justification || justification.trim().length < 100) {
      return false;
    }

    // Use AI to validate justification quality
    // This could be enhanced with OpenAI/Ollama in future
    const words = justification.trim().split(/\s+/);
    const hasSubstance = words.length >= 20; // At least 20 words

    return hasSubstance;
  }
}
