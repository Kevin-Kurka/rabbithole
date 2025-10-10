import { ObjectType, Field, Int } from 'type-graphql';
import { User } from './User';

@ObjectType()
export class LeaderboardEntry {
  @Field(() => User)
  user!: User;

  @Field(() => Int)
  totalPoints!: number;

  @Field(() => Int)
  level!: number;

  @Field(() => Int)
  rank!: number;

  @Field(() => Int)
  evidencePoints!: number;

  @Field(() => Int)
  methodologyPoints!: number;

  @Field(() => Int)
  consensusPoints!: number;

  @Field(() => Int)
  collaborationPoints!: number;
}
