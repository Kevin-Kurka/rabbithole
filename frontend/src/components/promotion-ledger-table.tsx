/**
 * PromotionLedgerTable Component
 *
 * Displays a public ledger of all Level 0 promotions with full transparency.
 * Shows promotion history, eligibility criteria, and audit trail.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { theme } from '@/styles/theme';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export interface PromotionEvent {
  id: string;
  graph_id: string;
  graph_name: string;
  previous_level: number;
  new_level: number;
  promoted_at: string;
  promotion_reason?: string;
}

interface PromotionLedgerTableProps {
  events: PromotionEvent[];
  loading?: boolean;
  onRowClick?: (graphId: string) => void;
}

/**
 * Format date to readable string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get relative time string (e.g., "2 days ago")
 */
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return formatDate(dateString);
  }
};

/**
 * Expandable row component for detailed view
 */
const ExpandableRow: React.FC<{
  event: PromotionEvent;
  isExpanded: boolean;
  onToggle: () => void;
  onRowClick?: (graphId: string) => void;
}> = ({ event, isExpanded, onToggle, onRowClick }) => {
  return (
    <>
      {/* Main row */}
      <tr
        style={{
          backgroundColor: theme.colors.bg.primary,
          borderBottom: `1px solid ${theme.colors.border.primary}`,
          cursor: 'pointer',
        }}
        className="hover:opacity-80 transition-opacity"
        onClick={onToggle}
      >
        <td style={{ padding: theme.spacing.md }}>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp size={16} style={{ color: theme.colors.text.tertiary }} />
            ) : (
              <ChevronDown size={16} style={{ color: theme.colors.text.tertiary }} />
            )}
            <span style={{ color: theme.colors.text.primary, fontWeight: 500 }}>
              {event.graph_name}
            </span>
          </div>
        </td>
        <td style={{ padding: theme.spacing.md }}>
          <span
            style={{
              color: theme.colors.text.secondary,
              fontSize: '0.875rem',
            }}
          >
            {formatDate(event.promoted_at)}
          </span>
          <div
            style={{
              color: theme.colors.text.tertiary,
              fontSize: '0.75rem',
              marginTop: '2px',
            }}
          >
            {getRelativeTime(event.promoted_at)}
          </div>
        </td>
        <td style={{ padding: theme.spacing.md, textAlign: 'center' }}>
          <div className="flex items-center justify-center gap-2">
            <span
              style={{
                color: theme.colors.text.tertiary,
                fontSize: '0.875rem',
              }}
            >
              Level {event.previous_level}
            </span>
            <span style={{ color: theme.colors.text.tertiary }}>→</span>
            <span
              style={{
                color: theme.colors.text.primary,
                fontWeight: 600,
                backgroundColor: theme.colors.bg.elevated,
                padding: '2px 8px',
                borderRadius: theme.radius.sm,
              }}
            >
              Level {event.new_level}
            </span>
          </div>
        </td>
        <td style={{ padding: theme.spacing.md, textAlign: 'center' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onRowClick) onRowClick(event.graph_id);
            }}
            style={{
              color: theme.colors.button.primary.text,
              backgroundColor: theme.colors.button.ghost.bg,
              border: `1px solid ${theme.colors.border.primary}`,
              padding: '4px 12px',
              borderRadius: theme.radius.md,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            className="hover:opacity-80 transition-opacity"
          >
            View
            <ExternalLink size={14} />
          </button>
        </td>
      </tr>

      {/* Expanded details row */}
      {isExpanded && (
        <tr
          style={{
            backgroundColor: theme.colors.bg.secondary,
            borderBottom: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          <td colSpan={4} style={{ padding: theme.spacing.lg }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div>
                <div
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  Graph ID
                </div>
                <div
                  style={{
                    color: theme.colors.text.secondary,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {event.graph_id}
                </div>
              </div>

              {event.promotion_reason && (
                <div>
                  <div
                    style={{
                      color: theme.colors.text.tertiary,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    Promotion Reason
                  </div>
                  <div
                    style={{
                      color: theme.colors.text.secondary,
                      fontSize: '0.875rem',
                    }}
                  >
                    {event.promotion_reason}
                  </div>
                </div>
              )}

              <div>
                <div
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  Promoted At
                </div>
                <div
                  style={{
                    color: theme.colors.text.secondary,
                    fontSize: '0.875rem',
                  }}
                >
                  {new Date(event.promoted_at).toISOString()}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

/**
 * Main table component
 */
export const PromotionLedgerTable: React.FC<PromotionLedgerTableProps> = ({
  events,
  loading = false,
  onRowClick,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (eventId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: theme.colors.bg.primary,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          textAlign: 'center',
        }}
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
          style={{ borderColor: theme.colors.text.primary }}
        />
        <p style={{ color: theme.colors.text.secondary }}>Loading promotion events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        style={{
          backgroundColor: theme.colors.bg.primary,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          textAlign: 'center',
        }}
      >
        <p style={{ color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
          No promotion events found
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: theme.colors.bg.primary,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        border: `1px solid ${theme.colors.border.primary}`,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr
            style={{
              backgroundColor: theme.colors.bg.elevated,
              borderBottom: `1px solid ${theme.colors.border.primary}`,
            }}
          >
            <th
              style={{
                padding: theme.spacing.md,
                textAlign: 'left',
                color: theme.colors.text.tertiary,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
              }}
            >
              Graph Name
            </th>
            <th
              style={{
                padding: theme.spacing.md,
                textAlign: 'left',
                color: theme.colors.text.tertiary,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
              }}
            >
              Promoted At
            </th>
            <th
              style={{
                padding: theme.spacing.md,
                textAlign: 'center',
                color: theme.colors.text.tertiary,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
              }}
            >
              Level Change
            </th>
            <th
              style={{
                padding: theme.spacing.md,
                textAlign: 'center',
                color: theme.colors.text.tertiary,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <ExpandableRow
              key={event.id}
              event={event}
              isExpanded={expandedRows.has(event.id)}
              onToggle={() => toggleRow(event.id)}
              onRowClick={onRowClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
