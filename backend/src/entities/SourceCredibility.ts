import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class SourceCredibility {
  @Field(() => ID)
  source_id!: string;

  @Field(() => Float)
  credibility_score!: number;

  @Field(() => Float)
  evidence_accuracy_score!: number;

  @Field(() => Float)
  peer_validation_score!: number;

  @Field(() => Float)
  historical_reliability_score!: number;

  @Field(() => Int)
  total_evidence_count!: number;

  @Field(() => Int)
  verified_evidence_count!: number;

  @Field(() => Int)
  challenged_evidence_count!: number;

  @Field(() => Float)
  challenge_ratio!: number;

  @Field(() => Float)
  consensus_alignment_score!: number;

  @Field()
  last_calculated_at!: Date;

  @Field({ nullable: true })
  calculation_metadata?: string; // JSON string

  @Field()
  updated_at!: Date;
}
