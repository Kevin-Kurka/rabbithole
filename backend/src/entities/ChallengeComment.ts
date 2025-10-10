import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
export class ChallengeComment {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  challenge_id!: string;

  @Field(() => ID)
  user_id!: string;

  @Field(() => ID, { nullable: true })
  parent_comment_id?: string;

  @Field()
  content!: string;

  @Field()
  is_edited!: boolean;

  @Field({ nullable: true })
  edited_at?: Date;

  @Field()
  is_hidden!: boolean;

  @Field({ nullable: true })
  hidden_reason?: string;

  @Field(() => ID, { nullable: true })
  hidden_by?: string;

  @Field(() => Int)
  upvotes!: number;

  @Field(() => Int)
  downvotes!: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
