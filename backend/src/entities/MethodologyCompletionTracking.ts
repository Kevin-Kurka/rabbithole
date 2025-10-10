import { ObjectType, Field, ID } from 'type-graphql';

@ObjectType()
export class MethodologyCompletionTracking {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  graph_id!: string;

  @Field(() => ID)
  step_id!: string;

  @Field()
  step_name!: string;

  @Field(() => ID)
  completed_by!: string;

  @Field()
  completed_at!: Date;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  is_verified!: boolean;

  @Field({ nullable: true })
  verification_notes?: string;
}
