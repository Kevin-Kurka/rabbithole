import { ObjectType, Field, ID, Float } from 'type-graphql';

@ObjectType()
export class ChallengeVote {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  challenge_id!: string;

  @Field(() => ID)
  user_id!: string;

  @Field()
  vote!: string; // 'support' | 'reject' | 'abstain'

  @Field(() => Float)
  confidence!: number;

  @Field({ nullable: true })
  reason?: string;

  @Field(() => String, { nullable: true })
  evidence_evaluation?: string; // JSON string

  @Field(() => Float)
  weight!: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
