import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { Evidence } from './Evidence';
import { User } from './User';

@ObjectType()
export class EvidenceFileDimensions {
  @Field(() => Int)
  width!: number;

  @Field(() => Int)
  height!: number;
}

@ObjectType()
export class EvidenceFileAccessPolicy {
  @Field()
  require_auth!: boolean;

  @Field(() => [String], { nullable: true })
  allowed_roles?: string[];
}

@ObjectType()
export class EvidenceFile {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  evidence_id!: string;

  @Field(() => Evidence, { nullable: true })
  evidence?: Evidence;

  @Field()
  file_type!: string; // document, image, video, audio, etc.

  @Field()
  is_primary!: boolean;

  @Field(() => Int)
  version!: number;

  @Field()
  storage_provider!: string; // local, s3, cloudflare_r2, etc.

  @Field()
  storage_key!: string;

  @Field({ nullable: true })
  storage_bucket?: string;

  @Field({ nullable: true })
  storage_region?: string;

  @Field({ nullable: true })
  cdn_url?: string;

  @Field()
  file_hash!: string;

  @Field()
  hash_algorithm!: string;

  @Field(() => Int)
  file_size!: number;

  @Field()
  mime_type!: string;

  @Field()
  original_filename!: string;

  @Field({ nullable: true })
  file_extension?: string;

  @Field({ nullable: true })
  encoding?: string;

  @Field(() => Int, { nullable: true })
  duration_seconds?: number;

  @Field(() => EvidenceFileDimensions, { nullable: true })
  dimensions?: EvidenceFileDimensions;

  @Field({ nullable: true })
  thumbnail_storage_key?: string;

  @Field({ nullable: true })
  thumbnail_cdn_url?: string;

  @Field()
  has_preview!: boolean;

  @Field()
  processing_status!: string; // pending, processing, completed, failed, quarantined

  @Field({ nullable: true })
  processing_error?: string;

  @Field()
  virus_scan_status!: string; // pending, clean, infected, suspicious, error

  @Field({ nullable: true })
  virus_scan_date?: Date;

  @Field({ nullable: true })
  virus_scan_result?: string; // JSON string

  @Field()
  is_public!: boolean;

  @Field(() => EvidenceFileAccessPolicy, { nullable: true })
  access_policy?: EvidenceFileAccessPolicy;

  @Field(() => Float, { nullable: true })
  estimated_monthly_cost?: number;

  @Field(() => Int)
  access_count!: number;

  @Field({ nullable: true })
  last_accessed_at?: Date;

  @Field(() => ID, { nullable: true })
  uploaded_by?: string;

  @Field(() => User, { nullable: true })
  uploader?: User;

  @Field()
  uploaded_at!: Date;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field({ nullable: true })
  deleted_at?: Date;

  @Field(() => ID, { nullable: true })
  deleted_by?: string;

  @Field({ nullable: true })
  deletion_reason?: string;
}
