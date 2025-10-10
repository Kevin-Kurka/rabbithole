import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class ChallengeType {
  @Field(() => ID)
  id!: string;

  @Field()
  type_code!: string; // 'factual_error' | 'missing_context' | etc.

  @Field()
  display_name!: string;

  @Field()
  description!: string;

  @Field({ nullable: true })
  icon?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => Int)
  min_reputation_required!: number;

  @Field()
  evidence_required!: boolean;

  @Field(() => Float)
  max_veracity_impact!: number;

  @Field(() => Int)
  min_votes_required!: number;

  @Field(() => Float)
  acceptance_threshold!: number;

  @Field(() => Int)
  voting_duration_hours!: number;

  @Field({ nullable: true })
  guidelines?: string;

  @Field(() => String, { nullable: true })
  example_challenges?: string; // JSON string

  @Field()
  is_active!: boolean;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
