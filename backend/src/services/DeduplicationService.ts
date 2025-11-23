/**
 * DeduplicationService - Content Deduplication & Merging
 *
 * Prevents duplicate evidence from cluttering the knowledge graph.
 * Uses multiple detection methods:
 * 1. Exact hash matching (SHA256)
 * 2. Perceptual hashing (for images/videos)
 * 3. Semantic similarity (vector embeddings)
 *
 * Provides intelligent merging recommendations.
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import { ContentAnalysisService } from './ContentAnalysisService';
import { FileStorageService } from './FileStorageService';

export interface DuplicateCandidate {
  nodeId: string;
  similarity: number;
  matchType: 'exact' | 'perceptual' | 'semantic';
  props: any;
  weight: number;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'near' | 'semantic' | 'none';
  canonicalNodeId?: string;
  similarityScore: number;
  duplicateCandidates: DuplicateCandidate[];
  recommendation: 'merge' | 'link' | 'separate';
  reasoning: string;
}

export interface MergeStrategy {
  keepCanonical: boolean;
  combineMetadata: boolean;
  consolidateEvidence: boolean;
  redirectReferences: boolean;
}

export class DeduplicationService {
  private pool: Pool;
  private contentAnalysis: ContentAnalysisService;

  // Thresholds for duplicate detection
  private readonly EXACT_HASH_THRESHOLD = 1.0;
  private readonly PERCEPTUAL_HASH_THRESHOLD = 0.95;
  private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.90;

  constructor(pool: Pool, fileStorage: FileStorageService) {
    this.pool = pool;
    this.contentAnalysis = new ContentAnalysisService(pool, fileStorage);
  }

  /**
   * Check if content is a duplicate
   */
  async checkDuplicate(
    content: string,
    contentType: 'text' | 'image' | 'video' | 'audio',
    graphId?: string
  ): Promise<DeduplicationResult> {
    const candidates: DuplicateCandidate[] = [];

    // 1. Exact hash match
    const contentHash = this.generateContentHash(content);
    const exactMatches = await this.findByExactHash(contentHash, graphId);
    candidates.push(...exactMatches.map(m => ({ ...m, matchType: 'exact' as const })));

    // 2. Perceptual hash match (for media)
    if (contentType !== 'text') {
      const perceptualHash = await this.generatePerceptualHash(content, contentType);
      if (perceptualHash) {
        const perceptualMatches = await this.findByPerceptualHash(perceptualHash, graphId);
        candidates.push(...perceptualMatches.map(m => ({ ...m, matchType: 'perceptual' as const })));
      }
    }

    // 3. Semantic similarity (vector search)
    const semanticMatches = await this.findBySemanticSimilarity(content, graphId);
    candidates.push(...semanticMatches.map(m => ({ ...m, matchType: 'semantic' as const })));

    // Deduplicate candidates and sort by similarity
    const uniqueCandidates = this.deduplicateCandidates(candidates);
    uniqueCandidates.sort((a, b) => b.similarity - a.similarity);

    // Determine result
    if (uniqueCandidates.length === 0) {
      return {
        isDuplicate: false,
        duplicateType: 'none',
        similarityScore: 0,
        duplicateCandidates: [],
        recommendation: 'separate',
        reasoning: 'No duplicate content found.',
      };
    }

    const topMatch = uniqueCandidates[0];
    const duplicateType = this.determineDuplicateType(topMatch);
    const recommendation = this.determineRecommendation(topMatch, uniqueCandidates);

    return {
      isDuplicate: topMatch.similarity >= this.SEMANTIC_SIMILARITY_THRESHOLD,
      duplicateType,
      canonicalNodeId: topMatch.nodeId,
      similarityScore: topMatch.similarity,
      duplicateCandidates: uniqueCandidates.slice(0, 5), // Top 5
      recommendation,
      reasoning: this.generateReasoning(topMatch, recommendation),
    };
  }

  /**
   * Merge duplicate nodes
   */
  async mergeDuplicates(
    duplicateNodeIds: string[],
    canonicalNodeId: string,
    strategy: MergeStrategy
  ): Promise<{ success: boolean; mergedNodeId: string }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get all nodes
      const nodesResult = await client.query(
        `SELECT * FROM public."Nodes" WHERE id = ANY($1)`,
        [duplicateNodeIds]
      );
      const nodes = nodesResult.rows;
      const canonical = nodes.find(n => n.id === canonicalNodeId);

      if (!canonical) {
        throw new Error('Canonical node not found');
      }

      // Combine metadata
      if (strategy.combineMetadata) {
        const combinedMeta = this.combineMetadata(nodes);
        await client.query(
          `UPDATE public."Nodes" SET props = jsonb_set(props, '{meta}', $1) WHERE id = $2`,
          [JSON.stringify(combinedMeta), canonicalNodeId]
        );
      }

      // Consolidate evidence (move evidence from duplicates to canonical)
      if (strategy.consolidateEvidence) {
        for (const node of nodes) {
          if (node.id !== canonicalNodeId) {
            await client.query(
              `UPDATE public."Evidence"
               SET node_id = $1
               WHERE node_id = $2`,
              [canonicalNodeId, node.id]
            );
          }
        }
      }

      // Redirect references (update edges to point to canonical)
      if (strategy.redirectReferences) {
        const duplicateIds = duplicateNodeIds.filter(id => id !== canonicalNodeId);

        // Update edges where duplicates are source
        await client.query(
          `UPDATE public."Edges"
           SET source_node_id = $1
           WHERE source_node_id = ANY($2)`,
          [canonicalNodeId, duplicateIds]
        );

        // Update edges where duplicates are target
        await client.query(
          `UPDATE public."Edges"
           SET target_node_id = $1
           WHERE target_node_id = ANY($2)`,
          [canonicalNodeId, duplicateIds]
        );

        // Remove duplicate self-loops
        await client.query(
          `DELETE FROM public."Edges"
           WHERE source_node_id = $1 AND target_node_id = $1`,
          [canonicalNodeId]
        );
      }

      // Mark duplicates as merged (soft delete)
      const duplicateIds = duplicateNodeIds.filter(id => id !== canonicalNodeId);
      if (duplicateIds.length > 0) {
        await client.query(
          `UPDATE public."Nodes"
           SET canonical_node_id = $1,
               props = jsonb_set(
                 COALESCE(props, '{}'::jsonb),
                 '{meta,merged}',
                 'true'::jsonb
               )
           WHERE id = ANY($2)`,
          [canonicalNodeId, duplicateIds]
        );
      }

      // Log merge operation
      await client.query(
        `INSERT INTO public."MergeHistory"
         (canonical_node_id, merged_node_ids, strategy, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [canonicalNodeId, duplicateIds, JSON.stringify(strategy)]
      );

      await client.query('COMMIT');

      return { success: true, mergedNodeId: canonicalNodeId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find duplicates by exact content hash
   */
  private async findByExactHash(
    contentHash: string,
    graphId?: string
  ): Promise<DuplicateCandidate[]> {
    const query = graphId
      ? `SELECT id, props, weight FROM public."Nodes"
         WHERE content_hash = $1 AND props->>'graphId' = $2 AND canonical_node_id IS NULL
         LIMIT 10`
      : `SELECT id, props, weight FROM public."Nodes"
         WHERE content_hash = $1 AND canonical_node_id IS NULL
         LIMIT 10`;

    const params = graphId ? [contentHash, graphId] : [contentHash];
    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      nodeId: row.id,
      similarity: 1.0, // Exact match
      matchType: 'exact' as const,
      props: row.props,
      weight: row.weight,
    }));
  }

  /**
   * Find duplicates by perceptual hash
   */
  private async findByPerceptualHash(
    perceptualHash: string,
    graphId?: string
  ): Promise<DuplicateCandidate[]> {
    // Query nodes with similar perceptual hashes
    const query = graphId
      ? `SELECT n.id, n.props, n.weight,
                hamming_distance(n.perceptual_hash, $1) AS distance
         FROM public."Nodes" n
         WHERE n.perceptual_hash IS NOT NULL
           AND n.props->>'graphId' = $2
           AND n.canonical_node_id IS NULL
           AND hamming_distance(n.perceptual_hash, $1) < 10
         ORDER BY distance
         LIMIT 10`
      : `SELECT n.id, n.props, n.weight,
                hamming_distance(n.perceptual_hash, $1) AS distance
         FROM public."Nodes" n
         WHERE n.perceptual_hash IS NOT NULL
           AND n.canonical_node_id IS NULL
           AND hamming_distance(n.perceptual_hash, $1) < 10
         ORDER BY distance
         LIMIT 10`;

    const params = graphId ? [perceptualHash, graphId] : [perceptualHash];
    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      nodeId: row.id,
      similarity: 1 - (row.distance / 64), // Normalize hamming distance
      matchType: 'perceptual' as const,
      props: row.props,
      weight: row.weight,
    }));
  }

  /**
   * Find duplicates by semantic similarity (vector search)
   */
  private async findBySemanticSimilarity(
    content: string,
    graphId?: string
  ): Promise<DuplicateCandidate[]> {
    // This would typically generate an embedding and search
    // For now, return empty array (will be implemented with GraphRAG)
    return [];
  }

  /**
   * Generate SHA256 content hash
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate perceptual hash for media
   */
  private async generatePerceptualHash(
    content: string,
    contentType: 'image' | 'video' | 'audio'
  ): Promise<string | null> {
    try {
      // TODO: Implement perceptual hashing for images and videos
      // if (contentType === 'image') {
      //   return await this.contentAnalysis.generateImageHash(content);
      // } else if (contentType === 'video') {
      //   return await this.contentAnalysis.generateVideoHash(content);
      // }
      console.log(`Perceptual hash not yet implemented for ${contentType}`);
    } catch (error) {
      console.error('Failed to generate perceptual hash:', error);
    }
    return null;
  }

  /**
   * Remove duplicate candidates
   */
  private deduplicateCandidates(candidates: DuplicateCandidate[]): DuplicateCandidate[] {
    const seen = new Set<string>();
    return candidates.filter(c => {
      if (seen.has(c.nodeId)) return false;
      seen.add(c.nodeId);
      return true;
    });
  }

  /**
   * Determine duplicate type from similarity
   */
  private determineDuplicateType(match: DuplicateCandidate): 'exact' | 'near' | 'semantic' | 'none' {
    if (match.similarity >= this.EXACT_HASH_THRESHOLD) return 'exact';
    if (match.similarity >= this.PERCEPTUAL_HASH_THRESHOLD) return 'near';
    if (match.similarity >= this.SEMANTIC_SIMILARITY_THRESHOLD) return 'semantic';
    return 'none';
  }

  /**
   * Determine merge recommendation
   */
  private determineRecommendation(
    topMatch: DuplicateCandidate,
    allMatches: DuplicateCandidate[]
  ): 'merge' | 'link' | 'separate' {
    // Exact matches should be merged
    if (topMatch.similarity >= this.EXACT_HASH_THRESHOLD) {
      return 'merge';
    }

    // Near duplicates should be linked
    if (topMatch.similarity >= this.PERCEPTUAL_HASH_THRESHOLD) {
      return 'link';
    }

    // Semantic similarity might warrant linking if high enough
    if (topMatch.similarity >= this.SEMANTIC_SIMILARITY_THRESHOLD) {
      return 'link';
    }

    return 'separate';
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateReasoning(match: DuplicateCandidate, recommendation: string): string {
    const similarityPercent = (match.similarity * 100).toFixed(1);

    switch (recommendation) {
      case 'merge':
        return `Exact duplicate found (${similarityPercent}% match). Recommend merging to avoid redundancy.`;
      case 'link':
        return `Near-duplicate content found (${similarityPercent}% similarity). Recommend linking as related evidence.`;
      case 'separate':
        return `Similar content found (${similarityPercent}% similarity) but sufficiently distinct to keep separate.`;
      default:
        return 'No recommendation.';
    }
  }

  /**
   * Combine metadata from multiple nodes
   */
  private combineMetadata(nodes: any[]): any {
    const combined: any = {
      sources: [],
      created_at: nodes.map(n => n.created_at).sort()[0], // Earliest
      merged_from: nodes.map(n => n.id),
      merge_timestamp: new Date().toISOString(),
    };

    // Combine unique sources
    const sources = new Set<string>();
    for (const node of nodes) {
      if (node.props?.meta?.source) {
        sources.add(node.props.meta.source);
      }
    }
    combined.sources = Array.from(sources);

    return combined;
  }

  /**
   * Check if claim/challenge already exists (prevent duplicate debates)
   */
  async checkDuplicateChallenge(
    targetNodeId: string,
    claim: string
  ): Promise<{ exists: boolean; challengeId?: string }> {
    // Check for similar challenge claims
    const result = await this.pool.query(
      `SELECT id, rebuttal_claim
       FROM public."Challenges"
       WHERE target_node_id = $1
         AND status IN ('open', 'under_review')
         AND similarity(rebuttal_claim, $2) > 0.7
       LIMIT 1`,
      [targetNodeId, claim]
    );

    if (result.rows.length > 0) {
      return { exists: true, challengeId: result.rows[0].id };
    }

    return { exists: false };
  }
}

export default DeduplicationService;
