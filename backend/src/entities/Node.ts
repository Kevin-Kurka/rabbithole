import { ObjectType, Field, ID, Float } from 'type-graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { Edge } from './Edge';
import { Comment } from './Comment';
import { User } from './User';
import { VeracityScore } from './VeracityScore';

/**
 * Node Entity - Strict 4-Table Schema Compliant
 *
 * Database columns (only 6):
 * - id: UUID primary key
 * - node_type_id: UUID foreign key to NodeTypes
 * - props: JSONB - ALL application data stored here
 * - ai: vector(1536) - embeddings for semantic search
 * - created_at: timestamp
 * - updated_at: timestamp
 *
 * Props field contains: { title, narrative, weight, graphId, authorId,
 *                         createdBy, publishedAt, permissions, etc. }
 */
@ObjectType()
export class Node {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  node_type_id!: string;

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

  @Field({ nullable: true })
  get title(): string | undefined {
    return this.props?.title;
  }

  @Field({ nullable: true })
  get narrative(): string | undefined {
    return this.props?.narrative;
  }

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
  get authorId(): string | undefined {
    return this.props?.authorId;
  }

  @Field(() => ID, { nullable: true })
  get createdBy(): string | undefined {
    return this.props?.createdBy;
  }

  @Field({ nullable: true })
  get publishedAt(): Date | undefined {
    const pub = this.props?.publishedAt;
    return pub ? new Date(pub) : undefined;
  }

  @Field(() => [String], { nullable: true })
  get permissions(): string[] | undefined {
    return this.props?.permissions;
  }

  @Field(() => Float, { nullable: true })
  get hierarchyLevel(): number | undefined {
    return this.props?.hierarchyLevel;
  }

  @Field({ nullable: true })
  get verified(): boolean | undefined {
    return this.props?.verified;
  }

  @Field({ nullable: true })
  get status(): string | undefined {
    return this.props?.status;
  }

  // =========================================================================
  // RELATIONSHIPS - Populated by resolvers
  // =========================================================================

  @Field(() => [Edge], { nullable: true })
  edges?: Edge[];

  @Field(() => [Comment], { nullable: true })
  comments?: Comment[];

  @Field(() => VeracityScore, { nullable: true })
  veracity?: VeracityScore;

  @Field(() => User, { nullable: true })
  author?: User;

  @Field(() => User, { nullable: true })
  creator?: User;
}
