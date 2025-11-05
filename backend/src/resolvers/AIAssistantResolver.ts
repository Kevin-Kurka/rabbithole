import { Resolver, Query, Mutation, Arg, Ctx, ObjectType, Field, InputType, Float, ID, Int } from 'type-graphql';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { AIOrchestrator } from '../services/AIOrchestrator';
import { DeduplicationService } from '../services/DeduplicationService';
import { GraphRAGService } from '../services/GraphRAGService';

// ============================================================================
// Input Types
// ============================================================================

@InputType()
class EvidenceValidationInput {
  @Field(() => ID, { nullable: true })
  nodeId?: string;

  @Field()
  graphId: string;

  @Field()
  claim: string;

  @Field()
  evidenceText: string;

  @Field(() => SourceInfoInput)
  sourceInfo: SourceInfoInput;
}

@InputType()
class SourceInfoInput {
  @Field()
  url: string;

  @Field({ nullable: true })
  author?: string;

  @Field({ nullable: true })
  date?: string;

  @Field()
  type: string;
}

@InputType()
class GraphRAGInput {
  @Field()
  query: string;

  @Field()
  graphId: string;

  @Field(() => Float, { defaultValue: 3 })
  maxDepth: number;

  @Field(() => Float, { defaultValue: 0.0 })
  minVeracity: number;

  @Field(() => Boolean, { defaultValue: true })
  includeLevel0: boolean;
}

@InputType()
class DeduplicationCheckInput {
  @Field()
  content: string;

  @Field()
  contentType: string;

  @Field({ nullable: true })
  graphId?: string;
}

@InputType()
class MergeDuplicatesInput {
  @Field(() => [ID])
  duplicateNodeIds: string[];

  @Field(() => ID)
  canonicalNodeId: string;

  @Field()
  strategy: string; // 'keep_canonical', 'merge_properties', 'prefer_higher_weight'
}

// ============================================================================
// Output Types
// ============================================================================

@ObjectType()
class FRECheck {
  @Field()
  passed: boolean;

  @Field(() => Float)
  score: number;

  @Field()
  explanation: string;
}

@ObjectType()
class FREExpertCheck {
  @Field()
  passed: boolean;

  @Field()
  needsExpert: boolean;

  @Field()
  explanation: string;
}

@ObjectType()
class FRECompliance {
  @Field(() => FRECheck)
  fre401_relevance: FRECheck;

  @Field(() => FRECheck)
  fre403_prejudice: FRECheck;

  @Field(() => FRECheck)
  fre602_personal_knowledge: FRECheck;

  @Field(() => FREExpertCheck)
  fre702_expert_testimony: FREExpertCheck;

  @Field(() => FRECheck)
  fre801_hearsay: FRECheck;

  @Field(() => FRECheck)
  fre901_authentication: FRECheck;

  @Field(() => FRECheck)
  fre1002_best_evidence: FRECheck;
}

@ObjectType()
class EvidenceValidationResult {
  @Field()
  isValid: boolean;

  @Field(() => FRECompliance)
  freCompliance: FRECompliance;

  @Field(() => Float)
  overallScore: number;

  @Field(() => [String])
  suggestions: string[];

  @Field(() => [String])
  requiredImprovements: string[];
}

@ObjectType()
class GraphNode {
  @Field(() => ID)
  id: string;

  @Field()
  nodeTypeId: string;

  @Field()
  typeName: string;

  @Field()
  props: string; // JSON stringified

  @Field()
  meta: string; // JSON stringified

  @Field(() => Float)
  veracityScore: number;

  @Field(() => Float, { nullable: true })
  relevanceScore?: number;
}

@ObjectType()
class GraphEdge {
  @Field(() => ID)
  id: string;

  @Field()
  edgeTypeId: string;

  @Field()
  typeName: string;

  @Field(() => ID)
  sourceNodeId: string;

  @Field(() => ID)
  targetNodeId: string;

  @Field()
  props: string; // JSON stringified

  @Field(() => Float)
  weight: number;
}

@ObjectType()
class Subgraph {
  @Field(() => [GraphNode])
  nodes: GraphNode[];

  @Field(() => [GraphEdge])
  edges: GraphEdge[];

  @Field(() => Float)
  avgVeracity: number;

  @Field(() => Int)
  totalNodes: number;
}

@ObjectType()
class Citation {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field()
  text: string;

  @Field(() => Float, { nullable: true })
  veracityScore?: number;
}

@ObjectType()
class GraphRAGResponse {
  @Field()
  response: string;

  @Field(() => [Citation])
  citations: Citation[];

  @Field(() => Subgraph)
  subgraph: Subgraph;

  @Field(() => [String])
  suggestions: string[];

  @Field(() => Float)
  confidence: number;
}

@ObjectType()
class DuplicateNode {
  @Field(() => ID)
  id: string;

  @Field()
  similarity: number;

  @Field()
  matchType: string; // 'exact', 'perceptual', 'semantic'

  @Field()
  content: string;

  @Field(() => Float)
  weight: number;
}

@ObjectType()
class DeduplicationResult {
  @Field()
  isDuplicate: boolean;

  @Field(() => [DuplicateNode])
  duplicates: DuplicateNode[];

  @Field(() => ID, { nullable: true })
  canonicalNodeId?: string;

  @Field(() => [String])
  recommendations: string[];
}

@ObjectType()
class MergeResult {
  @Field()
  success: boolean;

  @Field(() => ID)
  mergedNodeId: string;

  @Field()
  message: string;
}

// ============================================================================
// Resolver
// ============================================================================

@Resolver()
export class AIAssistantResolver {
  /**
   * Validate evidence against Federal Rules of Evidence
   */
  @Mutation(() => EvidenceValidationResult)
  async validateEvidence(
    @Arg('input') input: EvidenceValidationInput,
    @Ctx() { pool, redis }: { pool: Pool; redis: Redis }
  ): Promise<EvidenceValidationResult> {
    const orchestrator = new AIOrchestrator(pool, redis);

    const result = await orchestrator.validateEvidence(
      input.nodeId,
      input.evidenceText,
      {
        url: input.sourceInfo.url,
        author: input.sourceInfo.author,
        date: input.sourceInfo.date,
        type: input.sourceInfo.type,
      },
      [] // contextNodes - could be expanded
    );

    return result;
  }

  /**
   * Query graph using GraphRAG (vector search + LLM)
   */
  @Mutation(() => GraphRAGResponse)
  async askGraphRAG(
    @Arg('input') input: GraphRAGInput,
    @Ctx() { pool, redis }: { pool: Pool; redis: Redis }
  ): Promise<GraphRAGResponse> {
    const config = {
      vectorSearch: { limit: 5, similarityThreshold: 0.7, efSearch: 100 },
      graphTraversal: { maxDepth: 3, maxNodes: 100, minVeracity: 0.0, traversalMode: 'weighted' as const },
      promptGeneration: { maxTokens: 8000, includeProperties: true, summarizeLongValues: true, citationFormat: 'inline' as const },
      caching: { l1TtlSeconds: 300, l2TtlSeconds: 3600, enableQueryCache: true },
    };
    const graphRAG = new GraphRAGService(pool, redis, config);

    // Use the main query method which handles everything internally
    const result = await graphRAG.query({
      query: input.query,
      userGraphId: input.graphId,
      config: {
        vectorSearch: {
          limit: 5,
          similarityThreshold: 0.7,
          level0Only: input.includeLevel0,
          efSearch: 100,
        },
        graphTraversal: {
          maxDepth: input.maxDepth,
          maxNodes: 100,
          minVeracity: input.minVeracity,
          traversalMode: 'weighted',
        },
        promptGeneration: {
          maxTokens: 8000,
          includeProperties: true,
          summarizeLongValues: true,
          citationFormat: 'inline',
        },
        caching: {
          l1TtlSeconds: 300,
          l2TtlSeconds: 3600,
          enableQueryCache: true,
        },
      },
    });

    // Transform response to match GraphQL types
    // Calculate avgVeracity and totalNodes
    const avgVeracity = result.subgraph.nodes.length > 0
      ? result.subgraph.nodes.reduce((sum, n) => sum + n.veracityScore, 0) / result.subgraph.nodes.length
      : 0;
    const totalNodes = result.subgraph.nodes.length;

    return {
      response: result.response,
      citations: result.citations,
      subgraph: {
        nodes: result.subgraph.nodes.map((n) => ({
          id: n.id,
          nodeTypeId: n.nodeTypeId,
          typeName: n.typeName,
          props: JSON.stringify(n.props),
          meta: JSON.stringify(n.meta),
          veracityScore: n.veracityScore,
          relevanceScore: n.relevanceScore,
        })),
        edges: result.subgraph.edges.map((e) => ({
          id: e.id,
          edgeTypeId: e.edgeTypeId,
          typeName: e.typeName,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          props: JSON.stringify(e.props),
          weight: e.veracityScore || 0,
        })),
        avgVeracity,
        totalNodes,
      },
      suggestions: result.suggestions,
      confidence: 0.8, // Use metrics to calculate confidence
    };
  }

  /**
   * Check if content is a duplicate
   */
  @Query(() => DeduplicationResult)
  async checkDuplicate(
    @Arg('input') input: DeduplicationCheckInput,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<DeduplicationResult> {
    const dedupService = new DeduplicationService(pool);

    const result = await dedupService.checkDuplicate(
      input.content,
      input.contentType as 'text' | 'image' | 'video' | 'audio',
      input.graphId
    );

    // Transform service result to GraphQL type
    return {
      isDuplicate: result.isDuplicate,
      duplicates: result.duplicateCandidates.map((c) => ({
        id: c.nodeId,
        similarity: c.similarity,
        matchType: c.matchType,
        content: JSON.stringify(c.props),
        weight: c.weight,
      })),
      canonicalNodeId: result.canonicalNodeId,
      recommendations: [result.reasoning, `Recommendation: ${result.recommendation}`],
    };
  }

  /**
   * Merge duplicate nodes
   */
  @Mutation(() => MergeResult)
  async mergeDuplicates(
    @Arg('input') input: MergeDuplicatesInput,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<MergeResult> {
    const dedupService = new DeduplicationService(pool);

    // Convert strategy string to MergeStrategy object
    const strategy = {
      keepCanonical: input.strategy === 'keep_canonical',
      combineMetadata: input.strategy === 'merge_properties',
      consolidateEvidence: true,
      redirectReferences: true,
    };

    const result = await dedupService.mergeDuplicates(
      input.duplicateNodeIds,
      input.canonicalNodeId,
      strategy
    );

    return {
      success: result.success,
      mergedNodeId: result.mergedNodeId,
      message: `Successfully merged ${input.duplicateNodeIds.length} nodes`,
    };
  }

  /**
   * Find semantically similar nodes
   */
  @Query(() => [GraphNode])
  async findSimilarNodes(
    @Arg('query') query: string,
    @Arg('graphId', { nullable: true }) graphId: string | undefined,
    @Arg('limit', { defaultValue: 10 }) limit: number,
    @Ctx() { pool, redis }: { pool: Pool; redis: Redis }
  ): Promise<GraphNode[]> {
    const config = {
      vectorSearch: { limit: 5, similarityThreshold: 0.7, efSearch: 100 },
      graphTraversal: { maxDepth: 3, maxNodes: 100, minVeracity: 0.0, traversalMode: 'weighted' as const },
      promptGeneration: { maxTokens: 8000, includeProperties: true, summarizeLongValues: true, citationFormat: 'inline' as const },
      caching: { l1TtlSeconds: 300, l2TtlSeconds: 3600, enableQueryCache: true },
    };
    const graphRAG = new GraphRAGService(pool, redis, config);

    // Embed the query
    const queryEmbedding = await graphRAG.embedText(query);

    // Find similar nodes
    const nodes = await graphRAG.findAnchorNodes(queryEmbedding, limit, 0.5, false);

    return nodes.map((n) => ({
      id: n.id,
      nodeTypeId: n.nodeTypeId,
      typeName: n.typeName,
      props: JSON.stringify(n.props),
      meta: JSON.stringify(n.meta),
      veracityScore: n.veracityScore,
      relevanceScore: n.relevanceScore,
    }));
  }
}
