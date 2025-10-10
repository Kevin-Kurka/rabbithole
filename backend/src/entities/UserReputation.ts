import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class UserReputation {
  @Field(() => ID)
  user_id!: string;

  @Field(() => Float)
  evidence_quality_score!: number; // Average credibility of evidence submitted

  @Field(() => Int)
  total_evidence_submitted!: number;

  @Field(() => Int)
  verified_evidence_count!: number;

  @Field(() => Int)
  rejected_evidence_count!: number;

  @Field(() => Float)
  consensus_participation_rate!: number; // Percentage of eligible votes cast

  @Field(() => Int)
  total_votes_cast!: number;

  @Field(() => Float)
  vote_alignment_score!: number; // How often user votes align with final consensus

  @Field(() => Int)
  methodology_completions!: number;

  @Field(() => Int)
  challenges_raised!: number;

  @Field(() => Int)
  challenges_resolved!: number;

  @Field(() => Float)
  overall_reputation_score!: number; // Composite score used for vote weighting

  @Field()
  calculated_at!: Date;
}
