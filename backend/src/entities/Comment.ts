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

  @Field(() => ID, { nullable: true })
  parentCommentId?: string;

  @Field(() => Comment, { nullable: true })
  parentComment?: Comment;

  @Field(() => [Comment], { nullable: true })
  replies?: Comment[];

  @Field(() => ID, { nullable: true })
  targetNodeId?: string;

  @Field(() => ID, { nullable: true })
  targetEdgeId?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
