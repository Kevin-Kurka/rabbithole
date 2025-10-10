import { ObjectType, Field, ID, Float, Int } from 'type-graphql';
import { Node } from './Node';
import { Edge } from './Edge';
import { Source } from './Source';
import { User } from './User';

@ObjectType()
export class Evidence {
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

  @Field(() => ID)
  source_id!: string;

  @Field(() => Source)
  source!: Source;

  @Field()
  evidence_type!: string; // 'supporting', 'refuting', 'neutral', 'clarifying'

  @Field(() => Float)
  weight!: number;

  @Field(() => Float)
  confidence!: number;

  @Field()
  content!: string;

  @Field({ nullable: true })
  content_excerpt?: string;

  @Field({ nullable: true })
  page_reference?: string;

  @Field(() => Float)
  temporal_relevance!: number;

  @Field(() => Float)
  decay_rate!: number;

  @Field({ nullable: true })
  relevant_date?: Date;

  @Field()
  is_verified!: boolean;

  @Field(() => ID, { nullable: true })
  verified_by?: string;

  @Field({ nullable: true })
  verified_at?: Date;

  @Field()
  peer_review_status!: string; // 'pending', 'accepted', 'rejected', 'disputed'

  @Field(() => Int)
  peer_review_count!: number;

  @Field({ nullable: true })
  metadata?: string; // JSON string

  @Field(() => ID)
  submitted_by!: string;

  @Field(() => User)
  submitter!: User;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
