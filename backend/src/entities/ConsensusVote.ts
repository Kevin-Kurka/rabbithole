import { ObjectType, Field, ID, Float } from 'type-graphql';
import { User } from './User';

@ObjectType()
export class ConsensusVote {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  graph_id!: string;

  @Field(() => ID)
  user_id!: string;

  @Field(() => User)
  voter!: User;

  @Field(() => Float)
  vote_value!: number; // 0.0 to 1.0 (0 = reject, 1 = approve)

  @Field({ nullable: true })
  reasoning?: string;

  @Field(() => Float)
  vote_weight!: number; // Weighted by user's evidence quality score

  @Field(() => Float)
  voter_reputation_score!: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
