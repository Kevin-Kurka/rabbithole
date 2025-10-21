import { ObjectType, Field, ID } from 'type-graphql';

@ObjectType()
export class NodeType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  props?: string; // JSONB stored as string

  @Field({ nullable: true })
  meta?: string; // JSONB stored as string

  // Vector field (ai) is not exposed directly in GraphQL
  // It will be used internally for similarity searches

  @Field(() => ID, { nullable: true })
  parent_node_type_id?: string;

  @Field(() => NodeType, { nullable: true })
  parentNodeType?: NodeType;
}
