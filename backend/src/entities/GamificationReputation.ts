import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
export class GamificationReputation {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => Int)
  totalPoints!: number;

  @Field(() => Int)
  evidencePoints!: number;

  @Field(() => Int)
  methodologyPoints!: number;

  @Field(() => Int)
  consensusPoints!: number;

  @Field(() => Int)
  collaborationPoints!: number;

  @Field(() => Int)
  level!: number;

  @Field()
  updatedAt!: Date;

  @Field()
  createdAt!: Date;
}
