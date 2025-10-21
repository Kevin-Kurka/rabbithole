import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class NodeTypeInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  props?: string; // JSON string for custom schema properties

  @Field({ nullable: true })
  meta?: string; // JSON string for metadata

  @Field(() => ID, { nullable: true })
  parent_node_type_id?: string;
}

@InputType()
export class EdgeTypeInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  props?: string; // JSON string for custom schema properties

  @Field({ nullable: true })
  meta?: string; // JSON string for metadata

  @Field(() => ID, { nullable: true })
  source_node_type_id?: string;

  @Field(() => ID, { nullable: true })
  target_node_type_id?: string;
}

@InputType()
export class UpdateNodeTypeInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  props?: string;

  @Field({ nullable: true })
  meta?: string;

  @Field(() => ID, { nullable: true })
  parent_node_type_id?: string;
}

@InputType()
export class UpdateEdgeTypeInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  props?: string;

  @Field({ nullable: true })
  meta?: string;

  @Field(() => ID, { nullable: true })
  source_node_type_id?: string;

  @Field(() => ID, { nullable: true })
  target_node_type_id?: string;
}
