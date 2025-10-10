import { ObjectType, Field, ID, Int, Float } from 'type-graphql';

@ObjectType()
export class CuratorRole {
  @Field(() => ID)
  id!: string;

  @Field()
  roleName!: string;

  @Field()
  displayName!: string;

  @Field()
  description!: string;

  @Field(() => [String])
  responsibilities!: string[];

  @Field(() => Int)
  tier!: number;

  @Field(() => Int)
  minReputationRequired!: number;

  @Field(() => Int)
  minContributionsRequired!: number;

  @Field(() => [String])
  expertiseAreasRequired!: string[];

  @Field()
  requiresApplication!: boolean;

  @Field()
  requiresCommunityVote!: boolean;

  @Field(() => Int, { nullable: true })
  minVotesRequired?: number;

  @Field(() => Float, { nullable: true })
  approvalThreshold?: number;

  @Field({ nullable: true })
  icon?: string;

  @Field({ nullable: true })
  color?: string;

  @Field({ nullable: true })
  badgeImageUrl?: string;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
