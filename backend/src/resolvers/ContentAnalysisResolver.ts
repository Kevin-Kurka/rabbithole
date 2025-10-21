import { Resolver, Query, Mutation, Arg, Ctx, ID, Float } from 'type-graphql';
import { Pool } from 'pg';
import { ContentAnalysisService } from '../services/ContentAnalysisService';
import { FileStorageService } from '../services/FileStorageService';
import {
  ContentAnalysisOutput,
  ContentFingerprintOutput,
  DuplicateDetectionOutput,
  DuplicateMatchOutput,
} from '../types/fingerprinting';

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

// No complex inputs needed - we use node IDs

// ============================================================================
// RESOLVER
// ============================================================================

@Resolver()
export class ContentAnalysisResolver {
  private getContentAnalysisService(pool: Pool): ContentAnalysisService {
    const fileStorageService = new FileStorageService(pool);
    return new ContentAnalysisService(pool, fileStorageService);
  }

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  /**
   * Analyze content and generate perceptual fingerprint
   *
   * @example
   * mutation {
   *   analyzeContent(nodeId: "550e8400-e29b-41d4-a716-446655440000") {
   *     nodeId
   *     contentHash
   *     fingerprint {
   *       contentType
   *       fingerprintType
   *       hash
   *       metadata
   *     }
   *     duplicateDetection {
   *       isDuplicate
   *       matches {
   *         nodeId
   *         similarity
   *         hammingDistance
   *       }
   *       primarySourceId
   *     }
   *     processedAt
   *   }
   * }
   */
  @Mutation(() => ContentAnalysisOutput)
  async analyzeContent(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<ContentAnalysisOutput> {
    const service = this.getContentAnalysisService(pool);

    // Generate fingerprint
    const fingerprintResult = await service.analyzeContent(nodeId);

    // Check for duplicates
    const duplicateResult = await service.findDuplicates(nodeId);

    // Convert to GraphQL output type
    const fingerprint: ContentFingerprintOutput = {
      contentType: fingerprintResult.contentType,
      fingerprintType: fingerprintResult.fingerprintType,
      hash: fingerprintResult.hash,
      metadata: JSON.stringify(fingerprintResult.metadata || {}),
    };

    const duplicateDetection: DuplicateDetectionOutput = {
      isDuplicate: duplicateResult.isDuplicate,
      matches: duplicateResult.matches.map((match) => ({
        nodeId: match.nodeId,
        similarity: match.similarity,
        hammingDistance: match.hammingDistance,
        fingerprintType: match.fingerprintType,
        contentHash: match.contentHash,
      })),
      primarySourceId: duplicateResult.primarySourceId,
    };

    return {
      nodeId,
      contentHash: fingerprintResult.hash,
      fingerprint,
      duplicateDetection,
      processedAt: new Date(),
    };
  }

  /**
   * Find duplicate content by comparing fingerprints
   *
   * @example
   * mutation {
   *   findDuplicates(nodeId: "550e8400-e29b-41d4-a716-446655440000", threshold: 0.90) {
   *     isDuplicate
   *     matches {
   *       nodeId
   *       similarity
   *       hammingDistance
   *       contentHash
   *     }
   *     primarySourceId
   *   }
   * }
   */
  @Mutation(() => DuplicateDetectionOutput)
  async findDuplicates(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('threshold', () => Float, { nullable: true }) threshold: number | undefined,
    @Ctx() { pool }: Context
  ): Promise<DuplicateDetectionOutput> {
    const service = this.getContentAnalysisService(pool);
    const result = await service.findDuplicates(nodeId, threshold);

    return {
      isDuplicate: result.isDuplicate,
      matches: result.matches.map((match) => ({
        nodeId: match.nodeId,
        similarity: match.similarity,
        hammingDistance: match.hammingDistance,
        fingerprintType: match.fingerprintType,
        contentHash: match.contentHash,
      })),
      primarySourceId: result.primarySourceId,
    };
  }

  /**
   * Batch analyze multiple nodes
   *
   * @example
   * mutation {
   *   batchAnalyzeContent(nodeIds: [
   *     "550e8400-e29b-41d4-a716-446655440000",
   *     "550e8400-e29b-41d4-a716-446655440001"
   *   ]) {
   *     nodeId
   *     contentHash
   *     fingerprint {
   *       contentType
   *       hash
   *     }
   *     processedAt
   *   }
   * }
   */
  @Mutation(() => [ContentAnalysisOutput])
  async batchAnalyzeContent(
    @Arg('nodeIds', () => [ID]) nodeIds: string[],
    @Ctx() { pool }: Context
  ): Promise<ContentAnalysisOutput[]> {
    const service = this.getContentAnalysisService(pool);
    const results = await service.batchAnalyze(nodeIds);

    const outputs: ContentAnalysisOutput[] = [];

    for (const [nodeId, fingerprintResult] of results.entries()) {
      try {
        // Check for duplicates
        const duplicateResult = await service.findDuplicates(nodeId);

        const fingerprint: ContentFingerprintOutput = {
          contentType: fingerprintResult.contentType,
          fingerprintType: fingerprintResult.fingerprintType,
          hash: fingerprintResult.hash,
          metadata: JSON.stringify(fingerprintResult.metadata || {}),
        };

        const duplicateDetection: DuplicateDetectionOutput = {
          isDuplicate: duplicateResult.isDuplicate,
          matches: duplicateResult.matches.map((match) => ({
            nodeId: match.nodeId,
            similarity: match.similarity,
            hammingDistance: match.hammingDistance,
            fingerprintType: match.fingerprintType,
            contentHash: match.contentHash,
          })),
          primarySourceId: duplicateResult.primarySourceId,
        };

        outputs.push({
          nodeId,
          contentHash: fingerprintResult.hash,
          fingerprint,
          duplicateDetection,
          processedAt: new Date(),
        });
      } catch (error: any) {
        console.error(`Error processing node ${nodeId}:`, error.message);
      }
    }

    return outputs;
  }

  /**
   * Find all duplicates in a graph
   *
   * @example
   * mutation {
   *   findAllDuplicatesInGraph(graphId: "550e8400-e29b-41d4-a716-446655440000") {
   *     nodeId
   *     duplicateDetection {
   *       isDuplicate
   *       matches {
   *         nodeId
   *         similarity
   *       }
   *       primarySourceId
   *     }
   *   }
   * }
   */
  @Mutation(() => [ContentAnalysisOutput])
  async findAllDuplicatesInGraph(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<ContentAnalysisOutput[]> {
    const service = this.getContentAnalysisService(pool);
    const duplicatesMap = await service.findAllDuplicatesInGraph(graphId);

    const outputs: ContentAnalysisOutput[] = [];

    for (const [nodeId, duplicateResult] of duplicatesMap.entries()) {
      // Get node's content hash
      const nodeResult = await pool.query(
        `SELECT content_hash FROM public."Nodes" WHERE id = $1`,
        [nodeId]
      );

      if (nodeResult.rows.length === 0) continue;

      const contentHash = nodeResult.rows[0].content_hash;

      const duplicateDetection: DuplicateDetectionOutput = {
        isDuplicate: duplicateResult.isDuplicate,
        matches: duplicateResult.matches.map((match) => ({
          nodeId: match.nodeId,
          similarity: match.similarity,
          hammingDistance: match.hammingDistance,
          fingerprintType: match.fingerprintType,
          contentHash: match.contentHash,
        })),
        primarySourceId: duplicateResult.primarySourceId,
      };

      // Create minimal fingerprint output (hash already exists)
      const fingerprint: ContentFingerprintOutput = {
        contentType: 'unknown',
        fingerprintType: 'unknown',
        hash: contentHash,
        metadata: '{}',
      };

      outputs.push({
        nodeId,
        contentHash,
        fingerprint,
        duplicateDetection,
        processedAt: new Date(),
      });
    }

    return outputs;
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get content analysis status for a node
   *
   * @example
   * query {
   *   getContentAnalysisStatus(nodeId: "550e8400-e29b-41d4-a716-446655440000") {
   *     hasFingerprint
   *     contentHash
   *     primarySourceId
   *     isDuplicate
   *   }
   * }
   */
  @Query(() => ContentAnalysisStatusOutput)
  async getContentAnalysisStatus(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<ContentAnalysisStatusOutput> {
    const result = await pool.query(
      `SELECT content_hash, primary_source_id FROM public."Nodes" WHERE id = $1`,
      [nodeId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const { content_hash, primary_source_id } = result.rows[0];

    return {
      hasFingerprint: !!content_hash,
      contentHash: content_hash,
      primarySourceId: primary_source_id,
      isDuplicate: !!primary_source_id,
    };
  }

  /**
   * Get all nodes with a specific content hash (exact duplicates)
   *
   * @example
   * query {
   *   getNodesByContentHash(contentHash: "abc123...") {
   *     id
   *     createdAt
   *     primarySourceId
   *   }
   * }
   */
  @Query(() => [NodeContentHashOutput])
  async getNodesByContentHash(
    @Arg('contentHash') contentHash: string,
    @Ctx() { pool }: Context
  ): Promise<NodeContentHashOutput[]> {
    const result = await pool.query(
      `SELECT id, created_at, primary_source_id
       FROM public."Nodes"
       WHERE content_hash = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [contentHash]
    );

    return result.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      primarySourceId: row.primary_source_id,
    }));
  }

  /**
   * Get duplicate groups in a graph (nodes grouped by content hash)
   *
   * @example
   * query {
   *   getDuplicateGroups(graphId: "550e8400-e29b-41d4-a716-446655440000") {
   *     contentHash
   *     nodeCount
   *     nodeIds
   *     primarySourceId
   *   }
   * }
   */
  @Query(() => [DuplicateGroupOutput])
  async getDuplicateGroups(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<DuplicateGroupOutput[]> {
    const result = await pool.query(
      `SELECT
         content_hash,
         COUNT(*) as node_count,
         ARRAY_AGG(id ORDER BY created_at ASC) as node_ids,
         MIN(id) as primary_source_id
       FROM public."Nodes"
       WHERE graph_id = $1
         AND content_hash IS NOT NULL
         AND deleted_at IS NULL
       GROUP BY content_hash
       HAVING COUNT(*) > 1
       ORDER BY node_count DESC`,
      [graphId]
    );

    return result.rows.map((row) => ({
      contentHash: row.content_hash,
      nodeCount: parseInt(row.node_count),
      nodeIds: row.node_ids,
      primarySourceId: row.primary_source_id,
    }));
  }
}

// ============================================================================
// ADDITIONAL OUTPUT TYPES
// ============================================================================

import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
class ContentAnalysisStatusOutput {
  @Field()
  hasFingerprint!: boolean;

  @Field({ nullable: true })
  contentHash?: string;

  @Field({ nullable: true })
  primarySourceId?: string;

  @Field()
  isDuplicate!: boolean;
}

@ObjectType()
class NodeContentHashOutput {
  @Field(() => ID)
  id!: string;

  @Field()
  createdAt!: Date;

  @Field({ nullable: true })
  primarySourceId?: string;
}

@ObjectType()
class DuplicateGroupOutput {
  @Field()
  contentHash!: string;

  @Field(() => Int)
  nodeCount!: number;

  @Field(() => [ID])
  nodeIds!: string[];

  @Field(() => ID)
  primarySourceId!: string;
}
