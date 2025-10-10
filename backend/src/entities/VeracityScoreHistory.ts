import { ObjectType, Field, ID, Float } from 'type-graphql';
import { VeracityScore } from './VeracityScore';

@ObjectType()
export class VeracityScoreHistory {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  veracity_score_id!: string;

  @Field(() => VeracityScore, { nullable: true })
  veracity_score?: VeracityScore;

  @Field(() => Float)
  old_score!: number;

  @Field(() => Float)
  new_score!: number;

  @Field(() => Float)
  score_delta!: number;

  @Field()
  change_reason!: string;

  @Field({ nullable: true })
  triggering_entity_type?: string;

  @Field(() => ID, { nullable: true })
  triggering_entity_id?: string;

  @Field({ nullable: true })
  calculation_snapshot?: string; // JSON string

  @Field()
  changed_at!: Date;

  @Field({ nullable: true })
  changed_by?: string;
}
