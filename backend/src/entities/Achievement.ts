import { ObjectType, Field, ID, Int } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Achievement {
  @Field(() => ID)
  id!: string;

  @Field()
  key!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  icon?: string;

  @Field()
  category!: string;

  @Field(() => Int)
  points!: number;

  @Field(() => GraphQLJSON)
  criteria!: Record<string, any>;

  @Field()
  createdAt!: Date;
}
