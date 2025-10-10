/**
 * Type definitions for Veracity Score System
 */

export type VeracityScore = number; // 0.0 to 1.0

export type VeracityLevel =
  | 'verified'        // Level 0 (1.0)
  | 'high'           // 0.7-1.0
  | 'medium'         // 0.4-0.7
  | 'low'            // 0.1-0.4
  | 'very-low';      // 0.0-0.1

export type EventType =
  | 'evidence_added'
  | 'challenge_resolved'
  | 'consensus_changed'
  | 'manual_update';

export interface VeracityHistoryEntry {
  score: number;
  timestamp: Date;
  reason: string;
  eventType?: EventType;
}

export interface Evidence {
  id: string;
  type: string;
  description: string;
  weight: number;
  addedAt: Date;
  addedBy?: string;
}

export interface VeracityBreakdownData {
  evidenceScore: number;
  consensusScore: number;
  challengePenalty: number;
  totalScore: number;
  evidence: Evidence[];
}

export interface VeracityMetrics {
  nodeId?: string;
  edgeId?: string;
  currentScore: number;
  isLevel0: boolean;
  breakdown: VeracityBreakdownData;
  history: VeracityHistoryEntry[];
  lastUpdated: Date;
}

/**
 * Determines the veracity level based on score
 */
export function getVeracityLevel(score: number, isLevel0: boolean): VeracityLevel {
  if (isLevel0) return 'verified';
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.1) return 'low';
  return 'very-low';
}

/**
 * Gets the display label for a veracity level
 */
export function getVeracityLabel(level: VeracityLevel): string {
  const labels: Record<VeracityLevel, string> = {
    verified: 'Verified',
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence',
    'very-low': 'Very Low Confidence',
  };
  return labels[level];
}

/**
 * Gets the color for a veracity score
 */
export function getVeracityColorHex(score: number, isLevel0: boolean): string {
  if (isLevel0) return '#10b981'; // green
  if (score >= 0.7) return '#84cc16'; // lime
  if (score >= 0.4) return '#eab308'; // yellow
  if (score >= 0.1) return '#f97316'; // orange
  return '#ef4444'; // red
}
