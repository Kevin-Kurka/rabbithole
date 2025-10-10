import { ObjectType, Field, ID, Int } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { UserCurator } from './UserCurator';
import { User } from './User';

@ObjectType()
export class CuratorAuditLog {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  curatorId!: string;

  @Field(() => UserCurator, { nullable: true })
  curator?: UserCurator;

  @Field(() => ID)
  userId!: string;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field()
  actionType!: string;

  @Field()
  resourceType!: string;

  @Field(() => ID)
  resourceId!: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  oldValue?: any;

  @Field(() => GraphQLJSONObject, { nullable: true })
  newValue?: any;

  @Field(() => GraphQLJSONObject, { nullable: true })
  changes?: any;

  @Field({ nullable: true })
  reason?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => [ID], { nullable: true })
  relatedEvidenceIds?: string[];

  @Field()
  requiresPeerReview!: boolean;

  @Field()
  peerReviewed!: boolean;

  @Field({ nullable: true })
  peerReviewStatus?: string;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field({ nullable: true })
  userAgent?: string;

  @Field({ nullable: true })
  sessionId?: string;

  @Field()
  performedAt!: Date;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: any;

  @Field(() => [CuratorReview], { nullable: true })
  reviews?: CuratorReview[];

  @Field(() => Int, { nullable: true })
  reviewCount?: number;
}

@ObjectType()
export class CuratorReview {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  auditLogId!: string;

  @Field(() => CuratorAuditLog, { nullable: true })
  auditLog?: CuratorAuditLog;

  @Field(() => ID)
  reviewerId!: string;

  @Field(() => UserCurator, { nullable: true })
  reviewer?: UserCurator;

  @Field(() => ID)
  reviewerUserId!: string;

  @Field(() => User, { nullable: true })
  reviewerUser?: User;

  @Field()
  reviewType!: string;

  @Field(() => Int, { nullable: true })
  rating?: number;

  @Field()
  verdict!: string;

  @Field()
  comments!: string;

  @Field(() => [String], { nullable: true })
  specificConcerns?: string[];

  @Field(() => [String], { nullable: true })
  recommendations?: string[];

  @Field()
  actionRequired!: boolean;

  @Field({ nullable: true })
  actionTaken?: string;

  @Field()
  escalated!: boolean;

  @Field(() => ID, { nullable: true })
  escalatedToUserId?: string;

  @Field(() => User, { nullable: true })
  escalatedTo?: User;

  @Field()
  reviewedAt!: Date;

  @Field()
  createdAt!: Date;
}
