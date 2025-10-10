import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class Challenge {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  target_node_id?: string;

  @Field(() => ID, { nullable: true })
  target_edge_id?: string;

  @Field(() => ID)
  challenge_type_id!: string;

  @Field(() => ID)
  challenger_id!: string;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field(() => [ID])
  evidence_ids!: string[];

  @Field(() => String, { nullable: true })
  supporting_sources?: string; // JSON string

  @Field()
  severity!: string; // 'low' | 'medium' | 'high' | 'critical'

  @Field()
  voting_starts_at!: Date;

  @Field()
  voting_ends_at!: Date;

  @Field(() => Int)
  vote_count!: number;

  @Field(() => Int)
  support_votes!: number;

  @Field(() => Int)
  reject_votes!: number;

  @Field(() => Float)
  support_percentage!: number;

  @Field()
  status!: string; // 'open' | 'voting' | 'closed' | 'resolved' | 'withdrawn'

  @Field({ nullable: true })
  resolution?: string; // 'pending' | 'accepted' | 'rejected' | 'modified' | 'withdrawn'

  @Field({ nullable: true })
  resolution_reason?: string;

  @Field(() => ID, { nullable: true })
  resolved_by?: string;

  @Field({ nullable: true })
  resolved_at?: Date;

  @Field(() => Float)
  veracity_impact!: number;

  @Field()
  is_spam!: boolean;

  @Field(() => Int)
  spam_reports!: number;

  @Field()
  visibility!: string; // 'public' | 'restricted' | 'hidden'

  @Field(() => String, { nullable: true })
  metadata?: string; // JSON string

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
