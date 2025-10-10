import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class ChallengeResolution {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  challenge_id!: string;

  @Field()
  resolution_type!: string; // 'accepted' | 'rejected' | 'partially_accepted' | 'modified' | 'withdrawn' | 'expired'

  @Field()
  resolution_summary!: string;

  @Field({ nullable: true })
  detailed_reasoning?: string;

  @Field(() => String, { nullable: true })
  evidence_assessment?: string; // JSON string

  @Field(() => Float)
  veracity_impact!: number;

  @Field(() => String, { nullable: true })
  modifications_made?: string; // JSON string

  @Field(() => Int)
  total_votes!: number;

  @Field(() => Int)
  support_votes!: number;

  @Field(() => Int)
  reject_votes!: number;

  @Field(() => Int)
  abstain_votes!: number;

  @Field(() => Float, { nullable: true })
  weighted_support_percentage?: number;

  @Field(() => ID)
  resolved_by!: string;

  @Field({ nullable: true })
  resolver_role?: string; // 'moderator' | 'admin' | 'automated' | 'community'

  @Field()
  is_appealable!: boolean;

  @Field({ nullable: true })
  appeal_deadline?: Date;

  @Field()
  was_appealed!: boolean;

  @Field(() => ID, { nullable: true })
  appeal_id?: string;

  @Field()
  created_at!: Date;
}
