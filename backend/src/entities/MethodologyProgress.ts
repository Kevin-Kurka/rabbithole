import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class MethodologyWorkflowStep {
  @Field(() => ID)
  step_id!: string;

  @Field()
  step_name!: string;

  @Field()
  step_description!: string;

  @Field(() => Int)
  step_order!: number;

  @Field()
  is_required!: boolean;

  @Field()
  is_completed!: boolean;

  @Field({ nullable: true })
  completed_at?: Date;

  @Field(() => ID, { nullable: true })
  completed_by?: string;
}

@ObjectType()
export class MethodologyProgress {
  @Field(() => ID)
  graph_id!: string;

  @Field(() => ID)
  methodology_id!: string;

  @Field()
  methodology_name!: string;

  @Field(() => Int)
  total_steps!: number;

  @Field(() => Int)
  completed_steps!: number;

  @Field(() => Int)
  required_steps!: number;

  @Field(() => Int)
  completed_required_steps!: number;

  @Field(() => Float)
  completion_percentage!: number; // completed_steps / total_steps * 100

  @Field(() => Float)
  required_completion_percentage!: number; // completed_required_steps / required_steps * 100

  @Field(() => [MethodologyWorkflowStep])
  workflow_steps!: MethodologyWorkflowStep[];

  @Field()
  is_methodology_complete!: boolean;

  @Field()
  calculated_at!: Date;
}
