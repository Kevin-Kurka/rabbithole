import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { CuratorRole } from './CuratorRole';
import { User } from './User';

@ObjectType()
export class UserCurator {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => ID)
  roleId!: string;

  @Field(() => CuratorRole, { nullable: true })
  role?: CuratorRole;

  @Field()
  status!: string;

  @Field()
  assignedAt!: Date;

  @Field(() => ID, { nullable: true })
  assignedByUserId?: string;

  @Field(() => User, { nullable: true })
  assignedBy?: User;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field(() => [String])
  expertiseAreas!: string[];

  @Field(() => [String], { nullable: true })
  specializationTags?: string[];

  @Field(() => Int)
  totalActions!: number;

  @Field(() => Int)
  approvedActions!: number;

  @Field(() => Int)
  rejectedActions!: number;

  @Field(() => Int)
  overturnedActions!: number;

  @Field(() => Float)
  peerReviewScore!: number;

  @Field(() => Float)
  communityTrustScore!: number;

  @Field(() => Float)
  accuracyRate!: number;

  @Field(() => Int)
  warningsReceived!: number;

  @Field({ nullable: true })
  lastWarningAt?: Date;

  @Field(() => Int)
  suspensionCount!: number;

  @Field({ nullable: true })
  lastSuspendedAt?: Date;

  @Field({ nullable: true })
  lastReviewDate?: Date;

  @Field({ nullable: true })
  nextReviewDate?: Date;

  @Field({ nullable: true })
  reviewNotes?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
