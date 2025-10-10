import { ObjectType, Field, ID, Float, Int } from 'type-graphql';
import { Node } from './Node';
import { Edge } from './Edge';

@ObjectType()
export class VeracityScore {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  target_node_id?: string;

  @Field(() => ID, { nullable: true })
  target_edge_id?: string;

  @Field(() => Node, { nullable: true })
  node?: Node;

  @Field(() => Edge, { nullable: true })
  edge?: Edge;

  @Field(() => Float)
  veracity_score!: number;

  @Field(() => Float, { nullable: true })
  confidence_interval_lower?: number;

  @Field(() => Float, { nullable: true })
  confidence_interval_upper?: number;

  @Field(() => Float)
  evidence_weight_sum!: number;

  @Field(() => Int)
  evidence_count!: number;

  @Field(() => Float)
  supporting_evidence_weight!: number;

  @Field(() => Float)
  refuting_evidence_weight!: number;

  @Field(() => Float)
  consensus_score!: number;

  @Field(() => Int)
  source_count!: number;

  @Field(() => Float)
  source_agreement_ratio!: number;

  @Field(() => Int)
  challenge_count!: number;

  @Field(() => Int)
  open_challenge_count!: number;

  @Field(() => Float)
  challenge_impact!: number;

  @Field(() => Float)
  temporal_decay_factor!: number;

  @Field()
  calculation_method!: string;

  @Field()
  calculated_at!: Date;

  @Field({ nullable: true })
  expires_at?: Date;

  @Field()
  calculated_by!: string;

  @Field()
  updated_at!: Date;
}
