import { ObjectType, Field, ID, Float } from 'type-graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { Node } from './Node';
import { Comment } from './Comment';
import { User } from './User';
import { VeracityScore } from './VeracityScore';

/**
 * Edge Entity - Strict 4-Table Schema Compliant
 *
 * Database columns (only 8):
 * - id: UUID primary key
 * - source_node_id: UUID foreign key to Nodes
 * - target_node_id: UUID foreign key to Nodes
 * - edge_type_id: UUID foreign key to EdgeTypes
 * - props: JSONB - ALL application data stored here
 * - ai: vector(1536) - embeddings for semantic search
 * - created_at: timestamp
 * - updated_at: timestamp
 *
 * Props field contains: { weight, graphId, createdBy, relationship, etc. }
 */
@ObjectType()
export class Edge {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  source_node_id!: string;

  @Field(() => ID)
  target_node_id!: string;

  @Field(() => ID)
  edge_type_id!: string;

  // JSONB props field - contains all application data
  @Field(() => GraphQLJSON)
  props!: Record<string, any>;

  // AI embedding vector for semantic search (not exposed in GraphQL)
  ai?: number[];

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  // =========================================================================
  // CONVENIENCE FIELDS - Extracted from props for GraphQL queries
  // =========================================================================

  @Field(() => Float, { nullable: true })
  get weight(): number | undefined {
    const w = this.props?.weight;
    return typeof w === 'number' ? w : typeof w === 'string' ? parseFloat(w) : undefined;
  }

  @Field(() => ID, { nullable: true })
  get graphId(): string | undefined {
    return this.props?.graphId;
  }

  @Field(() => ID, { nullable: true })
  get createdBy(): string | undefined {
    return this.props?.createdBy;
  }

  @Field({ nullable: true })
  get relationship(): string | undefined {
    return this.props?.relationship;
  }

  @Field({ nullable: true })
  get citationType(): string | undefined {
    return this.props?.citationType;
  }

  @Field(() => Float, { nullable: true })
  get hierarchyLevel(): number | undefined {
    return this.props?.hierarchyLevel;
  }

  // =========================================================================
  // RELATIONSHIPS - Populated by resolvers
  // =========================================================================

  @Field(() => Node)
  from!: Node;

  @Field(() => Node)
  to!: Node;

  @Field(() => [Comment], { nullable: true })
  comments?: Comment[];

  @Field(() => VeracityScore, { nullable: true })
  veracity?: VeracityScore;

  @Field(() => User, { nullable: true })
  creator?: User;
}
