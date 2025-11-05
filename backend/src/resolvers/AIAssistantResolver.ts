import { Resolver, Query, Mutation, Arg, Ctx, ObjectType, Field, InputType, Float, ID } from 'type-graphql';
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
    @Ctx() { pool }: { pool: Pool }
  ): Promise<GraphRAGResponse> {
    const graphRAG = new GraphRAGService(pool);

    // Embed the query
    const queryEmbedding = await graphRAG.embedText(input.query);

    // Find anchor nodes via vector similarity
    const anchorNodes = await graphRAG.findAnchorNodes(
      queryEmbedding,
      5, // limit
      0.7, // similarity threshold
      input.includeLevel0
    );

    if (anchorNodes.length === 0) {
      return {
        response: 'No relevant information found in the graph.',
        citations: [],
        subgraph: { nodes: [], edges: [], avgVeracity: 0, totalNodes: 0 },
        suggestions: ['Try rephrasing your query', 'Add more context to your question'],
        confidence: 0.0,
      };
    }

    // Traverse graph to build subgraph
    const anchorNodeIds = anchorNodes.map((n) => n.id);
    const subgraph = await graphRAG.traverseGraph(
      anchorNodeIds,
      input.maxDepth,
      input.minVeracity,
      100 // maxNodes
    );

    // Generate augmented prompt
    const augmentedPrompt = graphRAG.generateAugmentedPrompt(input.query, subgraph);

    // Get LLM response
    const response = await graphRAG.generateResponse(augmentedPrompt);

    // Extract citations
    const citations = graphRAG.extractCitations(response, subgraph.nodes);

    // Generate suggestions
    const suggestions = await graphRAG.generateSuggestions(input.query, subgraph);

    return {
      response,
      citations,
      subgraph: {
        nodes: subgraph.nodes.map((n) => ({
          id: n.id,
          nodeTypeId: n.nodeTypeId,
          typeName: n.typeName,
          props: JSON.stringify(n.props),
          meta: JSON.stringify(n.meta),
          veracityScore: n.veracityScore,
          relevanceScore: n.relevanceScore,
        })),
        edges: subgraph.edges.map((e) => ({
          id: e.id,
          edgeTypeId: e.edgeTypeId,
          typeName: e.typeName,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          props: JSON.stringify(e.props),
          weight: e.weight,
        })),
        avgVeracity: subgraph.avgVeracity,
        totalNodes: subgraph.totalNodes,
      },
      suggestions,
      confidence: 0.8, // TODO: Calculate actual confidence
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
      input.contentType,
      input.graphId
    );

    return result;
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

    const result = await dedupService.mergeDuplicates(
      input.duplicateNodeIds,
      input.canonicalNodeId,
      input.strategy
    );

    return result;
  }

  /**
   * Find semantically similar nodes
   */
  @Query(() => [GraphNode])
  async findSimilarNodes(
    @Arg('query') query: string,
    @Arg('graphId', { nullable: true }) graphId: string | undefined,
    @Arg('limit', { defaultValue: 10 }) limit: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<GraphNode[]> {
    const graphRAG = new GraphRAGService(pool);

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
