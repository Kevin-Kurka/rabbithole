import { ObjectType, Field, ID } from 'type-graphql';
import { Methodology } from './Methodology';
import { Graph } from './Graph';

@ObjectType()
export class MethodologyWorkflow {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  methodology_id!: string;

  @Field()
  steps!: string; // JSON string array

  @Field({ nullable: true })
  initial_canvas_state?: string; // JSON string

  @Field()
  is_linear!: boolean;

  @Field()
  allow_skip!: boolean;

  @Field()
  require_completion!: boolean;

  @Field({ nullable: true })
  instructions?: string;

  @Field({ nullable: true })
  example_graph_id?: string;

  @Field({ nullable: true })
  tutorial_url?: string;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  // Resolved fields
  @Field(() => Methodology)
  methodology!: Methodology;

  @Field(() => Graph, { nullable: true })
  example_graph?: Graph;
}
