import { ObjectType, Field, ID, Int, Float } from 'type-graphql';

@ObjectType()
export class VideoMetadata {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  file_id!: string;

  @Field(() => Float)
  duration_seconds!: number;

  @Field(() => Int)
  width!: number;

  @Field(() => Int)
  height!: number;

  @Field(() => Float)
  fps!: number;

  @Field()
  codec!: string;

  @Field(() => Int, { nullable: true })
  bitrate?: number;

  @Field()
  file_format!: string;

  @Field(() => Int)
  total_frames!: number;

  @Field(() => Int)
  extracted_frames!: number;

  @Field(() => Int)
  scene_count!: number;

  @Field(() => Int)
  ocr_text_length!: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
