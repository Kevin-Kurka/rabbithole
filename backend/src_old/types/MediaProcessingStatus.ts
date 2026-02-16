import { ObjectType, Field, ID } from 'type-graphql';

/**
 * MediaProcessingStatus
 *
 * Represents the current status of a media processing job
 */
@ObjectType()
export class MediaProcessingStatus {
  @Field(() => ID)
  fileId!: string;

  @Field()
  status!: string; // 'queued' | 'processing' | 'completed' | 'failed'

  @Field({ nullable: true })
  progress?: number; // 0-100

  @Field({ nullable: true })
  error?: string;

  @Field({ nullable: true })
  startedAt?: string;

  @Field({ nullable: true })
  completedAt?: string;

  @Field({ nullable: true })
  processingTimeMs?: number;
}
