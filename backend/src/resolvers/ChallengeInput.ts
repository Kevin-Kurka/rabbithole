import { InputType, Field, ID, Float, Int } from 'type-graphql';

@InputType()
export class CreateChallengeInput {
  @Field(() => ID, { nullable: true })
  targetNodeId?: string;

  @Field(() => ID, { nullable: true })
  targetEdgeId?: string;

  @Field()
  challengeTypeCode!: string;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field({ defaultValue: 'medium' })
  severity!: string; // 'low' | 'medium' | 'high' | 'critical'

  @Field(() => [ID], { nullable: true })
  evidenceIds?: string[];

  @Field(() => [SupportingSourceInput], { nullable: true })
  supportingSources?: SupportingSourceInput[];
}

@InputType()
export class SupportingSourceInput {
  @Field()
  url!: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  excerpt?: string;

  @Field(() => Float, { nullable: true })
  credibility?: number;
}

@InputType()
export class VoteChallengeInput {
  @Field(() => ID)
  challengeId!: string;

  @Field()
  vote!: string; // 'support' | 'reject' | 'abstain'

  @Field(() => Float, { nullable: true, defaultValue: 0.5 })
  confidence?: number;

  @Field({ nullable: true })
  reason?: string;

  @Field(() => String, { nullable: true })
  evidenceEvaluation?: string; // JSON string
}

@InputType()
export class AddChallengeEvidenceInput {
  @Field(() => ID)
  challengeId!: string;

  @Field(() => ID, { nullable: true })
  evidenceId?: string;

  @Field({ nullable: true })
  evidenceType?: string; // 'supporting' | 'refuting' | 'clarifying'

  @Field({ nullable: true })
  sourceUrl?: string;

  @Field({ nullable: true })
  sourceTitle?: string;

  @Field()
  content!: string;

  @Field({ nullable: true })
  excerpt?: string;
}

@InputType()
export class AddChallengeCommentInput {
  @Field(() => ID)
  challengeId!: string;

  @Field(() => ID, { nullable: true })
  parentCommentId?: string;

  @Field()
  content!: string;
}

@InputType()
export class ReportSpamInput {
  @Field(() => ID)
  challengeId!: string;

  @Field()
  reportType!: string; // 'spam' | 'harassment' | 'false_information' | 'duplicate' | 'off_topic' | 'other'

  @Field({ nullable: true })
  description?: string;
}

@InputType()
export class WithdrawChallengeInput {
  @Field(() => ID)
  challengeId!: string;

  @Field()
  reason!: string;
}
