import { ObjectType, Field, ID, Float } from 'type-graphql';

@ObjectType()
export class ChallengeEvidence {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  challenge_id!: string;

  @Field(() => ID, { nullable: true })
  evidence_id?: string;

  @Field({ nullable: true })
  evidence_type?: string; // 'supporting' | 'refuting' | 'clarifying'

  @Field({ nullable: true })
  source_url?: string;

  @Field({ nullable: true })
  source_title?: string;

  @Field()
  content!: string;

  @Field({ nullable: true })
  excerpt?: string;

  @Field(() => Float)
  credibility_score!: number;

  @Field(() => Float)
  relevance_score!: number;

  @Field()
  is_verified!: boolean;

  @Field(() => ID, { nullable: true })
  verified_by?: string;

  @Field({ nullable: true })
  verified_at?: Date;

  @Field(() => ID)
  submitted_by!: string;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
