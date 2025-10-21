import { ObjectType, Field, ID } from 'type-graphql';
import { User } from './User';

@ObjectType()
export class Notification {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field()
  type!: string;

  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field()
  read!: boolean;

  @Field({ nullable: true })
  entityType?: string;

  @Field(() => ID, { nullable: true })
  entityId?: string;

  @Field(() => User, { nullable: true })
  relatedUser?: User;

  @Field({ nullable: true })
  metadata?: string; // JSON string

  @Field()
  createdAt!: Date;
}
