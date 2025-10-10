/**
 * Veracity Score Visual System Components
 *
 * This module provides a comprehensive set of components for displaying
 * and interacting with veracity scores throughout the application.
 */

export { default as VeracityBadge } from '../VeracityBadge';
export type { VeracityBadgeProps } from '../VeracityBadge';

export { default as VeracityIndicator } from '../VeracityIndicator';
export type { VeracityIndicatorProps } from '../VeracityIndicator';

export { default as VeracityTimeline } from '../VeracityTimeline';
export type { VeracityTimelineProps } from '../VeracityTimeline';

export { default as VeracityBreakdown } from '../VeracityBreakdown';
export type { VeracityBreakdownProps, VeracityBreakdownData, Evidence } from '../VeracityBreakdown';

export { default as VeracityPanel } from '../VeracityPanel';
export type { VeracityPanelProps } from '../VeracityPanel';

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
