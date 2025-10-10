import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class ConsensusStatus {
  @Field(() => ID)
  graph_id!: string;

  @Field(() => Int)
  total_votes!: number;

  @Field(() => Float)
  weighted_consensus_score!: number; // Weighted average of all votes

  @Field(() => Float)
  unweighted_consensus_score!: number; // Simple average of all votes

  @Field(() => Int)
  approve_votes!: number; // Votes >= 0.8

  @Field(() => Int)
  reject_votes!: number; // Votes < 0.5

  @Field(() => Int)
  neutral_votes!: number; // Votes 0.5 to 0.79

  @Field(() => Float)
  minimum_votes_threshold!: number; // Minimum votes needed for valid consensus

  @Field()
  has_sufficient_votes!: boolean;

  @Field()
  consensus_reached!: boolean; // weighted_consensus_score >= 0.8

  @Field({ nullable: true })
  last_vote_at?: Date;

  @Field()
  calculated_at!: Date;
}
