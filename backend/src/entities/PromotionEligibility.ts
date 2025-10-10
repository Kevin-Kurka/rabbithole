import { ObjectType, Field, ID, Float } from 'type-graphql';

@ObjectType()
export class PromotionEligibility {
  @Field(() => ID)
  graph_id!: string;

  @Field(() => Float)
  methodology_completion_score!: number;

  @Field(() => Float)
  consensus_score!: number;

  @Field(() => Float)
  evidence_quality_score!: number;

  @Field(() => Float)
  challenge_resolution_score!: number;

  @Field(() => Float)
  overall_score!: number;

  @Field()
  is_eligible!: boolean;

  @Field({ nullable: true })
  blocking_reason?: string;

  @Field(() => [String])
  missing_requirements!: string[];

  @Field()
  calculated_at!: Date;
}
