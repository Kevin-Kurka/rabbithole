import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { Evidence } from './Evidence';
import { User } from './User';

@ObjectType()
export class EvidenceReview {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  evidence_id!: string;

  @Field(() => Evidence, { nullable: true })
  evidence?: Evidence;

  @Field(() => ID)
  reviewer_id!: string;

  @Field(() => User, { nullable: true })
  reviewer?: User;

  @Field(() => Float, { nullable: true })
  quality_score?: number;

  @Field(() => Float, { nullable: true })
  credibility_score?: number;

  @Field(() => Float, { nullable: true })
  relevance_score?: number;

  @Field(() => Float, { nullable: true })
  clarity_score?: number;

  @Field(() => Int, { nullable: true })
  overall_rating?: number; // 1-5

  @Field({ nullable: true })
  recommendation?: string; // accept, accept_with_revisions, needs_verification, reject, flag_for_removal

  @Field({ nullable: true })
  review_text?: string;

  @Field({ nullable: true })
  strengths?: string;

  @Field({ nullable: true })
  weaknesses?: string;

  @Field({ nullable: true })
  suggestions?: string;

  @Field(() => [String], { nullable: true })
  flags?: string[]; // high_quality, needs_verification, outdated, biased, etc.

  @Field({ nullable: true })
  flag_explanation?: string;

  @Field({ nullable: true })
  reviewer_expertise_level?: string; // expert, professional, knowledgeable, general

  @Field({ nullable: true })
  reviewer_credentials?: string;

  @Field({ nullable: true })
  verified_claims?: string; // JSON string

  @Field({ nullable: true })
  disputed_claims?: string; // JSON string

  @Field(() => Int)
  helpful_count!: number;

  @Field(() => Int)
  not_helpful_count!: number;

  @Field()
  status!: string; // active, disputed, retracted, hidden

  @Field({ nullable: true })
  moderation_notes?: string;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field({ nullable: true })
  retracted_at?: Date;

  @Field({ nullable: true })
  retraction_reason?: string;
}
