import { ObjectType, Field, ID, Float, Int } from 'type-graphql';
import { PromotionEligibility } from './PromotionEligibility';

@ObjectType()
export class PromotionResult {
  @Field(() => ID)
  graph_id!: string;

  @Field()
  promotion_successful!: boolean;

  @Field(() => Int, { nullable: true })
  previous_level?: number;

  @Field(() => Int, { nullable: true })
  new_level?: number;

  @Field(() => PromotionEligibility)
  eligibility_breakdown!: PromotionEligibility;

  @Field({ nullable: true })
  promotion_message?: string;

  @Field({ nullable: true })
  failure_reason?: string;

  @Field(() => [String])
  detailed_requirements!: string[];

  @Field()
  evaluated_at!: Date;

  @Field(() => ID, { nullable: true })
  evaluated_by?: string;
}
