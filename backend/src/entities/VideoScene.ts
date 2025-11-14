import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { VideoFrame } from './VideoFrame';

@ObjectType()
export class VideoScene {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  file_id!: string;

  @Field(() => Int)
  scene_number!: number;

  @Field(() => Float)
  start_time!: number;

  @Field(() => Float)
  end_time!: number;

  @Field(() => ID, { nullable: true })
  thumbnail_frame_id?: string;

  @Field(() => VideoFrame, { nullable: true })
  thumbnail_frame?: VideoFrame;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => Int)
  frame_count!: number;

  @Field(() => Float)
  duration_seconds!: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
