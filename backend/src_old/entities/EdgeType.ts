import { ObjectType, Field, ID } from 'type-graphql';
import { NodeType } from './NodeType';

@ObjectType()
export class EdgeType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  props?: string; // JSONB stored as string

  @Field({ nullable: true })
  meta?: string; // JSONB stored as string

  // Vector field (ai) is not exposed directly in GraphQL
  // It will be used internally for similarity searches

  @Field(() => ID, { nullable: true })
  source_node_type_id?: string;

  @Field(() => ID, { nullable: true })
  target_node_type_id?: string;

  @Field(() => NodeType, { nullable: true })
  sourceNodeType?: NodeType;

  @Field(() => NodeType, { nullable: true })
  targetNodeType?: NodeType;
}
