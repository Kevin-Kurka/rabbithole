import { ObjectType, Field, ID } from 'type-graphql';
import { User } from './User';

@ObjectType()
export class Comment {
  @Field(() => ID)
  id!: string;

  @Field()
  text!: string;

  @Field(() => User)
  author!: User;

  @Field()
  createdAt!: Date;
}
