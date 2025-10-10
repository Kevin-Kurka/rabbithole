/**
 * Promotion Eligibility Type Definitions
 *
 * Types for transparent Level 0 promotion validation system.
 * All criteria visible to community, no hidden requirements.
 */

/**
 * Individual promotion criterion with progress tracking
 */
export interface PromotionCriterion {
  /** Criterion identifier */
  id: string;
  /** Display name */
  name: string;
  /** Current score (0-100) */
  currentScore: number;
  /** Target score needed for promotion */
  targetScore: number;
  /** Is this criterion met? */
  isMet: boolean;
  /** Description of what this measures */
  description: string;
  /** Actionable items to improve this score */
  recommendations: string[];
}

/**
 * Methodology workflow step tracking
 */
export interface MethodologyStep {
  /** Step identifier */
  id: string;
  /** Step name */
  name: string;
  /** Description of what needs to be done */
  description: string;
  /** Is this step completed? */
  isCompleted: boolean;
  /** Completion percentage (0-100) */
  completionPercentage: number;
  /** Who completed this (null if incomplete) */
  completedBy?: {
    id: string;
    username: string;
  };
  /** When completed (null if incomplete) */
  completedAt?: string;
  /** Evidence supporting completion */
  evidenceIds?: string[];
}

/**
 * Community vote on consensus
 */
export interface ConsensusVote {
  /** Voter ID */
  userId: string;
  /** Voter username */
  username: string;
  /** User's reputation score (affects vote weight) */
  reputationScore: number;
  /** Vote confidence (0-100) */
  confidence: number;
  /** Reasoning for vote */
  reasoning?: string;
  /** When vote was cast */
  votedAt: string;
  /** Calculated vote weight (based on reputation and evidence quality) */
  voteWeight: number;
}

/**
 * Consensus scoring details
 */
export interface ConsensusScore {
  /** Overall consensus percentage (0-100) */
  overallScore: number;
  /** Number of votes cast */
  voteCount: number;
  /** List of all votes */
  votes: ConsensusVote[];
  /** Weighted average consensus */
  weightedAverage: number;
  /** Target consensus needed */
  targetConsensus: number;
  /** Is consensus met? */
  isMet: boolean;
}

/**
 * Evidence quality metrics
 */
export interface EvidenceQuality {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Number of evidence items */
  evidenceCount: number;
  /** Breakdown by quality tier */
  qualityBreakdown: {
    high: number; // Count of high-quality evidence
    medium: number;
    low: number;
  };
  /** Average source credibility */
  averageCredibility: number;
  /** Is evidence quality met? */
  isMet: boolean;
  /** Target quality score */
  targetScore: number;
}

/**
 * Challenge tracking
 */
export interface Challenge {
  /** Challenge ID */
  id: string;
  /** Who raised the challenge */
  raisedBy: {
    id: string;
    username: string;
  };
  /** Challenge description */
  description: string;
  /** Status */
  status: 'open' | 'resolved' | 'rejected';
  /** When raised */
  raisedAt: string;
  /** When resolved (if resolved) */
  resolvedAt?: string;
  /** Resolution notes */
  resolution?: string;
}

/**
 * Challenge resolution status
 */
export interface ChallengeResolution {
  /** Overall resolution score (0-100) */
  overallScore: number;
  /** Number of open challenges */
  openChallenges: number;
  /** Number of resolved challenges */
  resolvedChallenges: number;
  /** List of all challenges */
  challenges: Challenge[];
  /** Is resolution met? (no open challenges) */
  isMet: boolean;
}

/**
 * Complete promotion eligibility data
 */
export interface PromotionEligibility {
  /** Graph ID */
  graphId: string;
  /** Methodology completion criterion */
  methodologyCompletion: PromotionCriterion & {
    steps: MethodologyStep[];
  };
  /** Consensus criterion */
  consensus: PromotionCriterion & {
    details: ConsensusScore;
  };
  /** Evidence quality criterion */
  evidenceQuality: PromotionCriterion & {
    details: EvidenceQuality;
  };
  /** Challenge resolution criterion */
  challengeResolution: PromotionCriterion & {
    details: ChallengeResolution;
  };
  /** Overall eligibility score (0-100) */
  overallScore: number;
  /** Is graph eligible for promotion? */
  isEligible: boolean;
  /** Minimum score needed for promotion */
  promotionThreshold: number;
  /** Next recommended action */
  nextAction?: {
    criterion: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  };
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Compact eligibility data for badges
 */
export interface PromotionEligibilityBadgeData {
  overallScore: number;
  isEligible: boolean;
  criteriaMet: number;
  totalCriteria: number;
  nextAction?: string;
}

/**
 * Vote submission input
 */
export interface VoteSubmission {
  graphId: string;
  confidence: number; // 0-100
  reasoning: string;
}

/**
 * Eligibility color scheme for visual feedback
 */
export type EligibilityColor = 'red' | 'yellow' | 'green';

/**
 * Get color based on score
 */
export const getEligibilityColor = (score: number): EligibilityColor => {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
};

/**
 * Get color hex values for display
 */
export const eligibilityColors: Record<EligibilityColor, { bg: string; text: string; border: string }> = {
  green: {
    bg: '#10b981', // emerald-500
    text: '#ffffff',
    border: '#059669', // emerald-600
  },
  yellow: {
    bg: '#eab308', // yellow-500
    text: '#000000',
    border: '#ca8a04', // yellow-600
  },
  red: {
    bg: '#ef4444', // red-500
    text: '#ffffff',
    border: '#dc2626', // red-600
  },
};
