import { ObjectType, Field, ID, Int } from 'type-graphql';
import { UserCurator } from './UserCurator';
import { CuratorRole } from './CuratorRole';

@ObjectType()
export class RolePermission {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  roleId!: string;

  @Field(() => CuratorRole, { nullable: true })
  role?: CuratorRole;

  @Field()
  permissionType!: string;

  @Field({ nullable: true })
  resourceType?: string;

  @Field()
  canCreate!: boolean;

  @Field()
  canRead!: boolean;

  @Field()
  canEdit!: boolean;

  @Field()
  canDelete!: boolean;

  @Field()
  canApprove!: boolean;

  @Field()
  canReject!: boolean;

  @Field()
  canPromoteToLevel0!: boolean;

  @Field()
  canDemoteFromLevel0!: boolean;

  @Field()
  canAssignVeracityScore!: boolean;

  @Field()
  canOverrideConsensus!: boolean;

  @Field(() => Int, { nullable: true })
  maxDailyActions?: number;

  @Field()
  requiresPeerReview!: boolean;

  @Field()
  requiresSecondApproval!: boolean;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class CuratorPermission {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userCuratorId!: string;

  @Field(() => UserCurator, { nullable: true })
  userCurator?: UserCurator;

  @Field()
  permissionType!: string;

  @Field({ nullable: true })
  resourceType?: string;

  @Field()
  overrideType!: string;

  @Field({ nullable: true })
  canCreate?: boolean;

  @Field({ nullable: true })
  canRead?: boolean;

  @Field({ nullable: true })
  canEdit?: boolean;

  @Field({ nullable: true })
  canDelete?: boolean;

  @Field({ nullable: true })
  canApprove?: boolean;

  @Field({ nullable: true })
  canReject?: boolean;

  @Field({ nullable: true })
  canPromoteToLevel0?: boolean;

  @Field({ nullable: true })
  canDemoteFromLevel0?: boolean;

  @Field(() => Int, { nullable: true })
  maxDailyActions?: number;

  @Field(() => ID)
  grantedByUserId!: string;

  @Field()
  reason!: string;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
