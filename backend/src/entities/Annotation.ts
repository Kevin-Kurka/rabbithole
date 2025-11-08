import { ObjectType, Field, ID, Int, Float } from 'type-graphql';

@ObjectType()
export class Annotation {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  target_node_id!: string;

  @Field(() => Int)
  start_offset!: number;

  @Field(() => Int)
  end_offset!: number;

  @Field()
  highlighted_text!: string;

  @Field()
  annotation_type!: string;

  @Field({ nullable: true })
  deception_type?: string;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field({ nullable: true })
  explanation?: string;

  @Field({ nullable: true })
  user_notes?: string;

  @Field({ defaultValue: '#FFFF00' })
  color!: string;

  @Field({ nullable: true })
  severity?: string;

  @Field(() => ID, { nullable: true })
  created_by?: string;

  @Field({ defaultValue: false })
  is_ai_generated!: boolean;

  @Field({ defaultValue: 'pending_review' })
  status!: string;

  @Field(() => Int, { defaultValue: 0 })
  votes!: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}

@ObjectType()
export class DeceptionAnalysis {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  annotation_id!: string;

  @Field(() => ID)
  target_node_id!: string;

  @Field()
  fallacy_type!: string;

  @Field()
  explanation!: string;

  @Field({ nullable: true })
  supporting_context?: string;

  @Field({ nullable: true })
  suggested_correction?: string;

  @Field({ nullable: true })
  contradicting_sources?: string; // JSON string

  @Field({ nullable: true })
  supporting_sources?: string; // JSON string

  @Field(() => Float)
  severity_score!: number;

  @Field(() => Float)
  confidence!: number;

  @Field({ nullable: true })
  ai_model?: string;

  @Field({ nullable: true })
  ai_raw_response?: string; // JSON string

  @Field()
  created_at!: Date;
}
