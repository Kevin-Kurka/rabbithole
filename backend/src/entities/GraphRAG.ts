import { ObjectType, Field, ID, Float, Int, InputType } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL types for GraphRAG (Graph Retrieval Augmented Generation)
 */

@ObjectType()
export class SimilarNode {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLJSON)
  props!: any;

  @Field(() => GraphQLJSON, { nullable: true })
  meta?: any;

  @Field()
  nodeType!: string;

  @Field(() => Float)
  similarity!: number;

  @Field(() => Float)
  weight!: number;
}

@ObjectType()
export class SubgraphNode {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLJSON)
  props!: any;

  @Field(() => GraphQLJSON, { nullable: true })
  meta?: any;

  @Field()
  nodeType!: string;

  @Field(() => Float)
  weight!: number;

  @Field(() => Int)
  depth!: number;
}

@ObjectType()
export class SubgraphEdge {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sourceNodeId!: string;

  @Field(() => ID)
  targetNodeId!: string;

  @Field()
  edgeType!: string;

  @Field(() => GraphQLJSON)
  props!: any;
}

@ObjectType()
export class Subgraph {
  @Field(() => [SubgraphNode])
  nodes!: SubgraphNode[];

  @Field(() => [SubgraphEdge])
  edges!: SubgraphEdge[];

  @Field(() => [ID])
  anchorNodeIds!: string[];
}

@ObjectType()
export class CitedNode {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLJSON)
  props!: any;

  @Field()
  relevance!: string;
}

@ObjectType()
export class AssistantResponse {
  @Field()
  answer!: string;

  @Field(() => [CitedNode])
  citedNodes!: CitedNode[];

  @Field(() => Subgraph)
  subgraph!: Subgraph;
}

// Input types
@InputType()
export class FindSimilarNodesInput {
  @Field(() => ID)
  graphId!: string;

  @Field()
  query!: string;

  @Field(() => [ID], { nullable: true, defaultValue: [] })
  selectedNodeIds?: string[];

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;
}

@InputType()
export class AskAssistantInput {
  @Field(() => ID)
  graphId!: string;

  @Field()
  query!: string;

  @Field(() => [ID], { nullable: true, defaultValue: [] })
  selectedNodeIds?: string[];

  @Field(() => Int, { nullable: true, defaultValue: 2 })
  expansionDepth?: number;

  @Field(() => Int, { nullable: true, defaultValue: 5 })
  topK?: number;
}
