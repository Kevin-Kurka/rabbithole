import { InputType, Field, ID, Int, Float } from 'type-graphql';

@InputType()
export class CuratorApplicationInput {
  @Field(() => ID)
  roleId!: string;

  @Field()
  applicationStatement!: string;

  @Field()
  motivation!: string;

  @Field(() => [String])
  expertiseAreas!: string[];

  @Field({ nullable: true })
  relevantExperience?: string;

  @Field(() => [String], { nullable: true })
  sampleContributions?: string[];
}

@InputType()
export class CuratorApplicationVoteInput {
  @Field(() => ID)
  applicationId!: string;

  @Field()
  vote!: string; // 'for', 'against', 'abstain'

  @Field({ nullable: true })
  rationale?: string;
}

@InputType()
export class CuratorApplicationReviewInput {
  @Field(() => ID)
  applicationId!: string;

  @Field()
  decision!: string; // 'approved', 'rejected', 'needs_revision'

  @Field({ nullable: true })
  decisionReason?: string;

  @Field({ nullable: true })
  reviewerNotes?: string;

  @Field({ nullable: true })
  conditionsForApproval?: string;

  @Field(() => Int, { nullable: true })
  probationPeriodDays?: number;
}

@InputType()
export class AssignCuratorRoleInput {
  @Field(() => ID)
  userId!: string;

  @Field(() => ID)
  roleId!: string;

  @Field(() => [String])
  expertiseAreas!: string[];

  @Field(() => [String], { nullable: true })
  specializationTags?: string[];

  @Field({ nullable: true })
  notes?: string;

  @Field({ nullable: true })
  expiresAt?: Date;
}

@InputType()
export class CuratorActionLogInput {
  @Field()
  actionType!: string;

  @Field()
  resourceType!: string;

  @Field(() => ID)
  resourceId!: string;

  @Field({ nullable: true })
  oldValue?: string; // JSON string

  @Field({ nullable: true })
  newValue?: string; // JSON string

  @Field({ nullable: true })
  reason?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => [ID], { nullable: true })
  relatedEvidenceIds?: string[];
}

@InputType()
export class CuratorReviewInput {
  @Field(() => ID)
  auditLogId!: string;

  @Field()
  reviewType!: string; // 'routine_review', 'flag_investigation', etc.

  @Field(() => Int, { nullable: true })
  rating?: number; // 1-5

  @Field()
  verdict!: string; // 'approved', 'flagged_minor', etc.

  @Field()
  comments!: string;

  @Field(() => [String], { nullable: true })
  specificConcerns?: string[];

  @Field(() => [String], { nullable: true })
  recommendations?: string[];

  @Field({ nullable: true })
  actionRequired?: boolean;

  @Field({ nullable: true })
  escalate?: boolean;

  @Field(() => ID, { nullable: true })
  escalateToUserId?: string;
}

@InputType()
export class GrantPermissionInput {
  @Field(() => ID)
  userCuratorId!: string;

  @Field()
  permissionType!: string;

  @Field({ nullable: true })
  resourceType?: string;

  @Field()
  overrideType!: string; // 'grant', 'revoke', 'modify'

  @Field({ nullable: true })
  canCreate?: boolean;

  @Field({ nullable: true })
  canEdit?: boolean;

  @Field({ nullable: true })
  canDelete?: boolean;

  @Field({ nullable: true })
  canApprove?: boolean;

  @Field({ nullable: true })
  canReject?: boolean;

  @Field(() => Int, { nullable: true })
  maxDailyActions?: number;

  @Field()
  reason!: string;

  @Field({ nullable: true })
  expiresAt?: Date;
}

@InputType()
export class UpdateCuratorStatusInput {
  @Field(() => ID)
  curatorId!: string;

  @Field()
  status!: string; // 'active', 'suspended', 'under_review', 'retired', 'revoked'

  @Field()
  reason!: string;

  @Field({ nullable: true })
  notes?: string;
}

@InputType()
export class CuratorFilters {
  @Field(() => ID, { nullable: true })
  roleId?: string;

  @Field({ nullable: true })
  status?: string;

  @Field(() => [String], { nullable: true })
  expertiseAreas?: string[];

  @Field(() => Int, { nullable: true })
  minTier?: number;

  @Field(() => Float, { nullable: true })
  minAccuracyRate?: number;

  @Field(() => Float, { nullable: true })
  minPeerReviewScore?: number;
}

@InputType()
export class ApplicationFilters {
  @Field(() => ID, { nullable: true })
  roleId?: string;

  @Field({ nullable: true })
  status?: string;

  @Field(() => Int, { nullable: true })
  minReputation?: number;

  @Field({ nullable: true })
  votingOpen?: boolean;
}

@InputType()
export class AuditLogFilters {
  @Field(() => ID, { nullable: true })
  curatorId?: string;

  @Field(() => ID, { nullable: true })
  userId?: string;

  @Field({ nullable: true })
  actionType?: string;

  @Field({ nullable: true })
  resourceType?: string;

  @Field(() => ID, { nullable: true })
  resourceId?: string;

  @Field({ nullable: true })
  requiresPeerReview?: boolean;

  @Field({ nullable: true })
  peerReviewed?: boolean;

  @Field({ nullable: true })
  dateFrom?: Date;

  @Field({ nullable: true })
  dateTo?: Date;
}
