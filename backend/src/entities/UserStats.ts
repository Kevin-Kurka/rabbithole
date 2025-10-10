import { ObjectType, Field, Int } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import { UserAchievement } from './UserAchievement';

@ObjectType()
export class UserStats {
  @Field(() => Int)
  totalPoints!: number;

  @Field(() => Int)
  level!: number;

  @Field(() => [UserAchievement])
  achievements!: UserAchievement[];

  @Field(() => GraphQLJSON)
  categoryBreakdown!: Record<string, number>;
}
