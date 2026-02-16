import { InputType, Field, ID, Float } from 'type-graphql';

@InputType()
export class CreateFormalInquiryInput {
  @Field(() => ID, { nullable: true })
  targetNodeId?: string;

  @Field(() => ID, { nullable: true })
  targetEdgeId?: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  content!: string;

  @Field(() => [ID], { nullable: true })
  relatedNodeIds?: string[];
}

@InputType()
export class CastVoteInput {
  @Field(() => ID)
  inquiryId!: string;

  @Field()
  voteType!: string; // 'agree' | 'disagree'
}

@InputType()
export class UpdateConfidenceScoreInput {
  @Field(() => ID)
  inquiryId!: string;

  @Field(() => Float)
  confidenceScore!: number;

  @Field()
  aiDetermination!: string;

  @Field()
  aiRationale!: string;
}
