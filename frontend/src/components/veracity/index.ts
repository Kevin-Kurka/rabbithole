/**
 * Veracity Score Visual System Components
 *
 * This module provides a comprehensive set of components for displaying
 * and interacting with veracity scores throughout the application.
 */

export { default as VeracityBadge } from '../veracity-badge';
export type { VeracityBadgeProps } from '../veracity-badge';

export { default as VeracityIndicator } from '../veracity-indicator';
export type { VeracityIndicatorProps } from '../veracity-indicator';

export { default as VeracityTimeline } from '../veracity-timeline';
export type { VeracityTimelineProps } from '../veracity-timeline';

export { default as VeracityBreakdown } from '../veracity-breakdown';
export type { VeracityBreakdownProps, VeracityBreakdownData, Evidence } from '../veracity-breakdown';

export { default as VeracityPanel } from '../veracity-badge';
export type { VeracityPanelProps } from '../veracity-badge';

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
