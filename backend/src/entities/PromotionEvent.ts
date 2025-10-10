import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
export class PromotionEvent {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  graph_id!: string;

  @Field()
  graph_name!: string;

  @Field(() => Int)
  previous_level!: number;

  @Field(() => Int)
  new_level!: number;

  @Field()
  promoted_at!: Date;

  @Field({ nullable: true })
  promotion_reason?: string;
}
