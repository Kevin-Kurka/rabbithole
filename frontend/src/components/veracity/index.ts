/**
 * Veracity Score Visual System Components
 *
 * This module provides a comprehensive set of components for displaying
 * and interacting with veracity scores throughout the application.
 */

export { default as VeracityBadge } from '../credibility/veracity-badge';
export type { VeracityBadgeProps } from '../credibility/veracity-badge';

export { default as VeracityIndicator } from '../credibility/veracity-indicator';
export type { VeracityIndicatorProps } from '../credibility/veracity-indicator';

export { default as VeracityTimeline } from '../credibility/veracity-timeline';
export type { VeracityTimelineProps } from '../credibility/veracity-timeline';

export { default as VeracityBreakdown } from '../credibility/veracity-breakdown';
export type { VeracityBreakdownProps, VeracityBreakdownData, Evidence } from '../credibility/veracity-breakdown';

export { default as VeracityPanel } from '../credibility/veracity-badge';
export type { VeracityPanelProps } from '../credibility/veracity-badge';

// Re-export types
export type {
  VeracityScore,
  VeracityLevel,
  EventType,
  VeracityHistoryEntry,
  VeracityMetrics,
} from '../../types/veracity';

export {
  getVeracityLevel,
  getVeracityLabel,
  getVeracityColorHex,
} from '../../types/veracity';
