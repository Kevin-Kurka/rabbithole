import { ObjectType, Field, ID } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import { Achievement } from './Achievement';

@ObjectType()
export class UserAchievement {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => ID)
  achievementId!: string;

  @Field(() => Achievement)
  achievement!: Achievement;

  @Field()
  earnedAt!: Date;

  @Field(() => GraphQLJSON, { nullable: true })
  progress?: Record<string, any>;
}
