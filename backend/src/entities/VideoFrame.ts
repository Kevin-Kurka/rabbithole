import { ObjectType, Field, ID, Int, Float } from 'type-graphql';

@ObjectType()
export class VideoFrame {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  file_id!: string;

  @Field(() => Int)
  frame_number!: number;

  @Field(() => Float)
  timestamp_seconds!: number;

  @Field()
  frame_type!: string; // 'thumbnail', 'scene_change', 'ocr_extracted', 'key_frame'

  @Field()
  storage_key!: string;

  @Field({ nullable: true })
  storage_provider?: string;

  @Field({ nullable: true })
  storage_bucket?: string;

  @Field({ nullable: true })
  ocr_text?: string;

  @Field(() => Float, { nullable: true })
  ocr_confidence?: number;

  @Field({ nullable: true })
  ocr_language?: string;

  @Field(() => Int, { nullable: true })
  width?: number;

  @Field(() => Int, { nullable: true })
  height?: number;

  @Field(() => Int, { nullable: true })
  file_size?: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
