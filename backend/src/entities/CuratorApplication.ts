import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { User } from './User';
import { CuratorRole } from './CuratorRole';

@ObjectType()
export class CuratorApplication {
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
  applicationStatement!: string;

  @Field()
  motivation!: string;

  @Field(() => [String])
  expertiseAreas!: string[];

  @Field({ nullable: true })
  relevantExperience?: string;

  @Field(() => [String], { nullable: true })
  sampleContributions?: string[];

  @Field(() => Int)
  reputationAtApplication!: number;

  @Field(() => Int)
  contributionsAtApplication!: number;

  @Field(() => Int, { nullable: true })
  challengesWon?: number;

  @Field(() => Int, { nullable: true })
  methodologiesCompleted?: number;

  @Field({ nullable: true })
  votingStartedAt?: Date;

  @Field({ nullable: true })
  votingDeadline?: Date;

  @Field(() => Int)
  votesFor!: number;

  @Field(() => Int)
  votesAgainst!: number;

  @Field(() => Int)
  votesAbstain!: number;

  @Field(() => Float)
  totalVotingWeight!: number;

  @Field(() => ID, { nullable: true })
  reviewedByUserId?: string;

  @Field(() => User, { nullable: true })
  reviewedBy?: User;

  @Field({ nullable: true })
  reviewedAt?: Date;

  @Field({ nullable: true })
  decision?: string;

  @Field({ nullable: true })
  decisionReason?: string;

  @Field({ nullable: true })
  reviewerNotes?: string;

  @Field({ nullable: true })
  conditionsForApproval?: string;

  @Field(() => Int, { nullable: true })
  probationPeriodDays?: number;

  @Field({ nullable: true })
  submittedAt?: Date;

  @Field({ nullable: true })
  decisionMadeAt?: Date;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => Float, { nullable: true })
  approvalRatio?: number;
}

@ObjectType()
export class CuratorApplicationVote {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  applicationId!: string;

  @Field(() => ID)
  voterId!: string;

  @Field(() => User, { nullable: true })
  voter?: User;

  @Field()
  vote!: string;

  @Field(() => Float)
  voteWeight!: number;

  @Field({ nullable: true })
  rationale?: string;

  @Field()
  votedAt!: Date;
}
