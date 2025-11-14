import { ObjectType, Field, ID, Float, registerEnumType } from 'type-graphql';
import { User } from './User';
import { Node } from './Node';
import { Edge } from './Edge';

export enum FormalInquiryStatus {
  OPEN = 'open',
  EVALUATING = 'evaluating',
  EVALUATED = 'evaluated',
  RESOLVED = 'resolved',
  WITHDRAWN = 'withdrawn',
}

registerEnumType(FormalInquiryStatus, {
  name: 'FormalInquiryStatus',
  description: 'Status of a formal inquiry evaluation process',
});

/**
 * FormalInquiry Entity
 *
 * Formal inquiries go through structured evaluation processes with AI-judged
 * confidence scores based on evidence quality (NOT community voting).
 *
 * Key Principle: Confidence scores are evidence-based and vote-independent.
 */
@ObjectType()
export class FormalInquiry {
  @Field(() => ID)
  id!: string;

  // Target: what is being inquired about
  @Field(() => ID, { nullable: true })
  target_node_id?: string;

  @Field(() => Node, { nullable: true })
  target_node?: Node;

  @Field(() => ID, { nullable: true })
  target_edge_id?: string;

  @Field(() => Edge, { nullable: true })
  target_edge?: Edge;

  // Inquiry details
  @Field(() => ID)
  user_id!: string;

  @Field(() => User)
  user!: User;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  content!: string;

  // ============================================================================
  // EVIDENCE-BASED CREDIBILITY (AI-judged, vote-independent)
  // ============================================================================

  /**
   * Confidence score: 0.00 to 1.00
   * Determined by AI evaluation of evidence quality and logical soundness
   * NEVER influenced by vote counts or popular opinion
   */
  @Field(() => Float, { nullable: true, description: 'AI-judged confidence score (0.00-1.00) based on evidence quality' })
  confidence_score?: number;

  /**
   * Maximum allowed confidence score based on weakest related node
   * Implements "weakest link" rule: inquiry can never be more credible than its weakest evidence
   */
  @Field(() => Float, { nullable: true, description: 'Maximum confidence score based on weakest related evidence (ceiling rule)' })
  max_allowed_score?: number;

  /**
   * AI's determination of the inquiry
   * Example: "Supported by strong evidence", "Insufficient evidence", "Contradicted by evidence"
   */
  @Field({ nullable: true, description: 'AI determination based on evidence evaluation' })
  ai_determination?: string;

  /**
   * AI's detailed rationale for the confidence score
   */
  @Field({ nullable: true, description: 'Detailed AI rationale for confidence score' })
  ai_rationale?: string;

  @Field({ nullable: true })
  evaluated_at?: Date;

  @Field({ nullable: true })
  evaluated_by?: string;

  // Related nodes that constrain confidence score (weakest link rule)
  @Field(() => [ID], { nullable: true, description: 'Node IDs that this inquiry references (for weakest link calculation)' })
  related_node_ids?: string[];

  /**
   * Credibility of the weakest related node (stored for audit trail)
   */
  @Field(() => Float, { nullable: true, description: 'Credibility of the weakest related node' })
  weakest_node_credibility?: number;

  // Status tracking
  @Field(() => FormalInquiryStatus)
  status!: FormalInquiryStatus;

  // Timestamps
  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field({ nullable: true })
  resolved_at?: Date;

  // ============================================================================
  // COMMUNITY OPINION (voting - separate from credibility)
  // ============================================================================
  // Note: Voting fields are fetched from InquiryVoteStats view, not stored here
  // This ensures complete separation of evidence-based truth from popular opinion

  @Field(() => Float, { nullable: true, description: 'Number of agree votes (community opinion, NOT evidence)' })
  agree_count?: number;

  @Field(() => Float, { nullable: true, description: 'Number of disagree votes (community opinion, NOT evidence)' })
  disagree_count?: number;

  @Field(() => Float, { nullable: true, description: 'Total votes cast (community opinion, NOT evidence)' })
  total_votes?: number;

  @Field(() => Float, { nullable: true, description: 'Percentage of agree votes (community opinion, NOT evidence)' })
  agree_percentage?: number;

  @Field(() => Float, { nullable: true, description: 'Percentage of disagree votes (community opinion, NOT evidence)' })
  disagree_percentage?: number;
}
