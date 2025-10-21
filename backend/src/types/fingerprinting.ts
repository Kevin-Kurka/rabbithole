/**
 * Type definitions for content fingerprinting and duplicate detection
 */

import { ObjectType, Field, Float, Int } from 'type-graphql';

// ============================================================================
// ENUMS
// ============================================================================

export enum FingerprintType {
  IMAGE_PHASH = 'image_phash',
  IMAGE_DHASH = 'image_dhash',
  VIDEO_FRAME = 'video_frame',
  AUDIO_FINGERPRINT = 'audio_fingerprint',
  TEXT_MINHASH = 'text_minhash',
}

export enum ContentType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
  DOCUMENT = 'document',
}

// ============================================================================
// FINGERPRINT RESULT TYPES
// ============================================================================

export interface BaseFingerprintResult {
  contentType: ContentType;
  fingerprintType: FingerprintType;
  hash: string;
  metadata?: Record<string, any>;
}

export interface ImageFingerprintResult extends BaseFingerprintResult {
  contentType: ContentType.IMAGE;
  fingerprintType: FingerprintType.IMAGE_PHASH | FingerprintType.IMAGE_DHASH;
  width?: number;
  height?: number;
  format?: string;
}

export interface VideoFingerprintResult extends BaseFingerprintResult {
  contentType: ContentType.VIDEO;
  fingerprintType: FingerprintType.VIDEO_FRAME;
  durationSeconds?: number;
  frameHashes: string[]; // Array of hashes from sampled frames
  fps?: number;
}

export interface AudioFingerprintResult extends BaseFingerprintResult {
  contentType: ContentType.AUDIO;
  fingerprintType: FingerprintType.AUDIO_FINGERPRINT;
  durationSeconds?: number;
  sampleRate?: number;
  channels?: number;
}

export interface TextFingerprintResult extends BaseFingerprintResult {
  contentType: ContentType.TEXT;
  fingerprintType: FingerprintType.TEXT_MINHASH;
  wordCount?: number;
  characterCount?: number;
  language?: string;
}

export type FingerprintResult =
  | ImageFingerprintResult
  | VideoFingerprintResult
  | AudioFingerprintResult
  | TextFingerprintResult;

// ============================================================================
// DUPLICATE DETECTION TYPES
// ============================================================================

export interface DuplicateMatch {
  nodeId: string;
  similarity: number; // 0.0 to 1.0
  hammingDistance?: number; // For perceptual hashes
  fingerprintType: FingerprintType;
  contentHash: string;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matches: DuplicateMatch[];
  primarySourceId?: string; // ID of the original/canonical version
}

// ============================================================================
// GRAPHQL OUTPUT TYPES
// ============================================================================

@ObjectType()
export class ContentFingerprintOutput {
  @Field()
  contentType!: string;

  @Field()
  fingerprintType!: string;

  @Field()
  hash!: string;

  @Field(() => String, { nullable: true })
  metadata?: string; // JSON string
}

@ObjectType()
export class DuplicateMatchOutput {
  @Field()
  nodeId!: string;

  @Field(() => Float)
  similarity!: number;

  @Field(() => Int, { nullable: true })
  hammingDistance?: number;

  @Field()
  fingerprintType!: string;

  @Field()
  contentHash!: string;
}

@ObjectType()
export class DuplicateDetectionOutput {
  @Field()
  isDuplicate!: boolean;

  @Field(() => [DuplicateMatchOutput])
  matches!: DuplicateMatchOutput[];

  @Field({ nullable: true })
  primarySourceId?: string;
}

@ObjectType()
export class ContentAnalysisOutput {
  @Field()
  nodeId!: string;

  @Field()
  contentHash!: string;

  @Field(() => ContentFingerprintOutput)
  fingerprint!: ContentFingerprintOutput;

  @Field(() => DuplicateDetectionOutput)
  duplicateDetection!: DuplicateDetectionOutput;

  @Field()
  processedAt!: Date;
}

// ============================================================================
// HAMMING DISTANCE CALCULATION
// ============================================================================

/**
 * Calculate Hamming distance between two hex strings
 * Lower distance = more similar images
 */
export function calculateHammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hash lengths must match');
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    // Count set bits
    let bits = xor;
    while (bits > 0) {
      distance += bits & 1;
      bits >>= 1;
    }
  }

  return distance;
}

/**
 * Calculate similarity score (0.0 to 1.0) from Hamming distance
 */
export function calculateSimilarity(distance: number, maxDistance: number): number {
  return Math.max(0, 1 - (distance / maxDistance));
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface FingerprintConfig {
  // Image settings
  imageHashSize: number; // Default: 8 (creates 64-bit hash)
  imageSimilarityThreshold: number; // 0.0-1.0, default: 0.90

  // Video settings
  videoFrameSampleCount: number; // Default: 10 frames
  videoSimilarityThreshold: number; // Default: 0.85

  // Audio settings
  audioSampleDuration: number; // Seconds, default: 30
  audioSimilarityThreshold: number; // Default: 0.80

  // Text settings
  textMinHashSize: number; // Default: 128
  textShingleSize: number; // N-gram size, default: 3
  textSimilarityThreshold: number; // Default: 0.85

  // Processing limits
  maxFileSize: number; // Bytes, default: 100MB
  processingTimeout: number; // Milliseconds, default: 60000
}

export const DEFAULT_FINGERPRINT_CONFIG: FingerprintConfig = {
  imageHashSize: 8,
  imageSimilarityThreshold: 0.90,
  videoFrameSampleCount: 10,
  videoSimilarityThreshold: 0.85,
  audioSampleDuration: 30,
  audioSimilarityThreshold: 0.80,
  textMinHashSize: 128,
  textShingleSize: 3,
  textSimilarityThreshold: 0.85,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  processingTimeout: 60000,
};
