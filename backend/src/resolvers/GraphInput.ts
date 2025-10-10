import { InputType, Field, ID, Int } from 'type-graphql';

@InputType()
export class NodeInput {
  @Field(() => ID)
  graphId!: string;

  @Field()
  props!: string; // JSON string
}

@InputType()
export class EdgeInput {
  @Field(() => ID)
  graphId!: string;

  @Field(() => ID)
  from!: string;

  @Field(() => ID)
  to!: string;

  @Field()
  props!: string; // JSON string
}

@InputType()
export class CommentInput {
  @Field(() => ID)
  targetId!: string; // Node or Edge ID

  @Field()
  text!: string;
}

@InputType()
export class GraphInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  level?: number;

  @Field({ nullable: true })
  methodology?: string;

  @Field({ nullable: true, defaultValue: 'private' })
  privacy?: string;
}