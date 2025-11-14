import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * AudioTranscription Entity
 *
 * Represents the result of audio transcription processing using
 * OpenAI Whisper API or AssemblyAI (future).
 */
@ObjectType()
export class AudioTranscription {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  file_id!: string;

  @Field()
  transcript_text!: string;

  @Field(() => GraphQLJSON)
  transcript_json!: any;

  @Field()
  language!: string;

  @Field(() => Float)
  duration_seconds!: number;

  @Field(() => Int)
  word_count!: number;

  @Field(() => Int, { nullable: true })
  speaker_count?: number;

  @Field()
  processing_service!: string; // 'whisper' | 'assemblyai'

  @Field(() => Int)
  processing_time_ms!: number;

  @Field({ nullable: true })
  processing_error?: string;

  @Field()
  processed_at!: Date;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}

/**
 * TranscriptSegment Entity
 *
 * Represents a time-aligned segment of an audio transcription.
 * Supports speaker diarization for multi-speaker audio.
 */
@ObjectType()
export class TranscriptSegment {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  transcription_id!: string;

  @Field(() => Int)
  segment_order!: number;

  @Field(() => Float)
  start_time!: number;

  @Field(() => Float)
  end_time!: number;

  @Field()
  text!: string;

  @Field(() => Int, { nullable: true })
  speaker_id?: number;

  @Field({ nullable: true })
  speaker_label?: string;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}

/**
 * AudioTranscriptionResult
 *
 * Result type for audio processing mutation
 */
@ObjectType()
export class AudioTranscriptionResult {
  @Field()
  success!: boolean;

  @Field(() => ID, { nullable: true })
  transcriptionId?: string;

  @Field({ nullable: true })
  transcriptText?: string;

  @Field()
  language!: string;

  @Field(() => Float)
  durationSeconds!: number;

  @Field(() => Int)
  wordCount!: number;

  @Field(() => Int)
  segmentCount!: number;

  @Field(() => Int, { nullable: true })
  speakerCount?: number;

  @Field()
  processingService!: string;

  @Field(() => Int)
  processingTimeMs!: number;

  @Field(() => [TranscriptSegment])
  segments!: TranscriptSegment[];

  @Field({ nullable: true })
  error?: string;
}

/**
 * AudioProcessingStats
 *
 * Statistics view for audio processing
 */
@ObjectType()
export class AudioProcessingStats {
  @Field(() => ID)
  file_id!: string;

  @Field()
  filename!: string;

  @Field(() => Int)
  file_size!: number;

  @Field()
  mime_type!: string;

  @Field(() => ID, { nullable: true })
  transcription_id?: string;

  @Field({ nullable: true })
  language?: string;

  @Field(() => Float, { nullable: true })
  duration_seconds?: number;

  @Field(() => Int, { nullable: true })
  word_count?: number;

  @Field(() => Int, { nullable: true })
  speaker_count?: number;

  @Field({ nullable: true })
  processing_service?: string;

  @Field(() => Int, { nullable: true })
  processing_time_ms?: number;

  @Field({ nullable: true })
  processing_error?: string;

  @Field({ nullable: true })
  processed_at?: Date;

  @Field(() => Int, { nullable: true })
  segment_count?: number;

  @Field(() => Float, { nullable: true })
  avg_confidence?: number;

  @Field(() => Int, { nullable: true })
  detected_speakers?: number;

  @Field()
  processing_status!: string; // 'pending' | 'completed' | 'failed'
}

/**
 * TranscriptSearchResult
 *
 * Result type for transcript search queries
 */
@ObjectType()
export class TranscriptSearchResult {
  @Field(() => ID)
  transcription_id!: string;

  @Field(() => ID)
  file_id!: string;

  @Field()
  filename!: string;

  @Field()
  language!: string;

  @Field(() => Float)
  duration_seconds!: number;

  @Field()
  match_snippet!: string;

  @Field(() => Float)
  relevance!: number;

  @Field()
  processed_at!: Date;
}
