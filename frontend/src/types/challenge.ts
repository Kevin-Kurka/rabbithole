/**
 * Challenge System Type Definitions
 *
 * Defines types for the community-driven challenge system
 * for disputing claims in the knowledge graph.
 */

/**
 * Challenge types with severity levels
 */
export enum ChallengeType {
  FACTUAL_ERROR = 'factual_error',
  MISSING_CONTEXT = 'missing_context',
  BIAS_MISLEADING = 'bias_misleading',
  SOURCE_CREDIBILITY = 'source_credibility',
  LOGICAL_FALLACY = 'logical_fallacy',
  OUTDATED = 'outdated',
  CONTRADICTORY = 'contradictory',
  SCOPE = 'scope',
  METHODOLOGY = 'methodology',
  UNSUPPORTED = 'unsupported',
}

/**
 * Challenge status states
 */
export enum ChallengeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

/**
 * Vote types for challenge resolution
 */
export enum ChallengeVoteType {
  UPHOLD = 'uphold',
  DISMISS = 'dismiss',
}

/**
 * Challenge type metadata
 */
export interface ChallengeTypeInfo {
  id: ChallengeType;
  name: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  icon: string; // lucide-react icon name
  color: string; // CSS color
}

/**
 * Challenge vote record
 */
export interface ChallengeVote {
  id: string;
  challengeId: string;
  userId: string;
  userName?: string;
  voteType: ChallengeVoteType;
  weight: number; // Based on user reputation
  reasoning?: string;
  createdAt: string;
}

/**
 * Challenge record
 */
export interface Challenge {
  id: string;
  type: ChallengeType;
  status: ChallengeStatus;
  targetNodeId?: string;
  targetEdgeId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  evidence: string;
  reasoning: string;
  claimReference?: string;
  votes: ChallengeVote[];
  resolution?: {
    outcome: 'upheld' | 'dismissed';
    reasoning: string;
    resolvedAt: string;
    resolvedBy: string;
    veracityImpact?: number; // Change to veracity score if upheld
  };
}

/**
 * User reputation breakdown
 */
export interface UserReputation {
  userId: string;
  score: number; // 0-100
  breakdown: {
    evidenceQuality: number;
    voteAccuracy: number;
    participationLevel: number;
    communityTrust: number;
  };
  rank?: string;
  achievementsCount?: number;
}

/**
 * Challenge statistics
 */
export interface ChallengeStats {
  total: number;
  open: number;
  underReview: number;
  resolved: number;
  dismissed: number;
  byType: Record<ChallengeType, number>;
}

/**
 * Vote distribution for UI
 */
export interface VoteDistribution {
  upholdCount: number;
  dismissCount: number;
  upholdWeight: number; // Sum of reputation-weighted votes
  dismissWeight: number;
  totalParticipants: number;
}

/**
 * Challenge input for creation
 */
export interface CreateChallengeInput {
  type: ChallengeType;
  targetNodeId?: string;
  targetEdgeId?: string;
  evidence: string;
  reasoning: string;
  claimReference?: string;
}

/**
 * Vote input for submission
 */
export interface SubmitVoteInput {
  challengeId: string;
  voteType: ChallengeVoteType;
  reasoning?: string;
}

/**
 * Challenge timeline event
 */
export interface ChallengeTimelineEvent {
  id: string;
  type: 'created' | 'vote_cast' | 'status_change' | 'resolved';
  timestamp: string;
  userId?: string;
  userName?: string;
  details: string;
  metadata?: Record<string, unknown>;
}
