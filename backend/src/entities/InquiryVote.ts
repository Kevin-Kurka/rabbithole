import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';
import { User } from './User';
import { FormalInquiry } from './FormalInquiry';

export enum VoteType {
  AGREE = 'agree',
  DISAGREE = 'disagree',
}

registerEnumType(VoteType, {
  name: 'VoteType',
  description: 'Type of vote on an inquiry (agree or disagree)',
});

/**
 * InquiryVote Entity
 *
 * Community voting on formal inquiries - shows community opinion (NOT evidence quality).
 *
 * CRITICAL PRINCIPLE: Vote counts do NOT affect confidence scores.
 * Truth is not democratic. Votes show community agreement, not evidence-based truth.
 *
 * Features:
 * - Each registered user can vote once per inquiry
 * - Users can change their vote (agree → disagree or vice versa)
 * - NO reputation weighting - all votes are equal
 * - Vote data is NEVER seen by AI evaluation context
 */
@ObjectType()
export class InquiryVote {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  inquiry_id!: string;

  @Field(() => FormalInquiry)
  inquiry!: FormalInquiry;

  @Field(() => ID)
  user_id!: string;

  @Field(() => User)
  user!: User;

  /**
   * Vote type: agree or disagree
   * No abstain option - if user doesn't have opinion, they simply don't vote
   */
  @Field(() => VoteType, { description: 'Whether user agrees or disagrees with inquiry conclusion' })
  vote_type!: VoteType;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}

/**
 * InquiryVoteStats
 *
 * Aggregated voting statistics for an inquiry.
 * This is fetched from the materialized view InquiryVoteStats in the database.
 *
 * WARNING: This data is for DISPLAY ONLY and must NEVER be included in AI evaluation context.
 */
@ObjectType()
export class InquiryVoteStats {
  @Field(() => ID)
  inquiry_id!: string;

  @Field(() => Number, { description: 'Number of agree votes' })
  agree_count!: number;

  @Field(() => Number, { description: 'Number of disagree votes' })
  disagree_count!: number;

  @Field(() => Number, { description: 'Total votes cast' })
  total_votes!: number;

  @Field(() => Number, { description: 'Percentage of agree votes (0-100)' })
  agree_percentage!: number;

  @Field(() => Number, { description: 'Percentage of disagree votes (0-100)' })
  disagree_percentage!: number;
}
