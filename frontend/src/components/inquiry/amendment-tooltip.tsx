'use client';

import { useState } from 'react';
import { theme } from '@/styles/theme';

interface Amendment {
  id: string;
  fieldPath: string;
  originalValue: string;
  newValue: string;
  explanation: string;
  proposedBy: string;
  proposedAt: string;
  inquiryId?: string;
  positionId?: string;
  status: 'pending' | 'applied' | 'rejected';
  appliedAt?: string;
  appliedBy?: string;
}

interface AmendmentTooltipProps {
  amendment: Amendment;
  children: React.ReactNode;
}

export function AmendmentTooltip({ amendment, children }: AmendmentTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      {children}

      {showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: theme.spacing[2],
          padding: theme.spacing[4],
          backgroundColor: theme.colors.background.elevated,
          border: `1px solid ${theme.colors.border.DEFAULT}`,
          borderRadius: theme.radius.DEFAULT,
          boxShadow: theme.shadow.xl,
          zIndex: theme.zIndex.tooltip,
          minWidth: '320px',
          maxWidth: '400px',
        }}>
          {/* Header */}
          <div style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing[3],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>Amendment</span>
            <span style={{
              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
              borderRadius: theme.radius.sm,
              fontSize: theme.fontSize.xs,
              fontWeight: theme.fontWeight.medium,
              backgroundColor: amendment.status === 'applied' ? theme.colors.success.bg :
                              amendment.status === 'pending' ? theme.colors.warning.bg :
                              theme.colors.error.bg,
              color: amendment.status === 'applied' ? theme.colors.success.dark :
                    amendment.status === 'pending' ? theme.colors.warning.dark :
                    theme.colors.error.dark,
              textTransform: 'capitalize',
            }}>
              {amendment.status}
            </span>
          </div>

          {/* Field path */}
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.text.tertiary,
            marginBottom: theme.spacing[3],
            fontFamily: 'monospace',
          }}>
            {amendment.fieldPath}
          </div>

          {/* Value changes */}
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.radius.DEFAULT,
            marginBottom: theme.spacing[3],
          }}>
            <div style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.text.tertiary,
              marginBottom: theme.spacing[2],
            }}>
              Original:
            </div>
            <div style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.error.DEFAULT,
              textDecoration: 'line-through',
              marginBottom: theme.spacing[3],
              wordBreak: 'break-word',
            }}>
              {amendment.originalValue}
            </div>

            <div style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.text.tertiary,
              marginBottom: theme.spacing[2],
            }}>
              New:
            </div>
            <div style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.success.DEFAULT,
              fontWeight: theme.fontWeight.medium,
              wordBreak: 'break-word',
            }}>
              {amendment.newValue}
            </div>
          </div>

          {/* Explanation */}
          <div style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
            lineHeight: theme.lineHeight.relaxed,
            marginBottom: theme.spacing[3],
            maxHeight: '120px',
            overflowY: 'auto',
          }}>
            {amendment.explanation}
          </div>

          {/* Metadata */}
          <div style={{
            paddingTop: theme.spacing[3],
            borderTop: `1px solid ${theme.colors.border.DEFAULT}`,
            fontSize: theme.fontSize.xs,
            color: theme.colors.text.tertiary,
          }}>
            <div style={{ marginBottom: theme.spacing[1] }}>
              Proposed by {amendment.proposedBy}
            </div>
            <div style={{ marginBottom: theme.spacing[1] }}>
              {new Date(amendment.proposedAt).toLocaleDateString()}
            </div>
            {amendment.appliedAt && amendment.appliedBy && (
              <div>
                Applied by {amendment.appliedBy} on {new Date(amendment.appliedAt).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Link to inquiry */}
          {amendment.inquiryId && (
            <a
              href={`/inquiries/${amendment.inquiryId}`}
              style={{
                display: 'inline-block',
                marginTop: theme.spacing[3],
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                backgroundColor: theme.colors.primary[50],
                color: theme.colors.primary[700],
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.medium,
                borderRadius: theme.radius.DEFAULT,
                textDecoration: 'none',
                transition: `all ${theme.transition.base}`,
              }}
            >
              View Inquiry →
            </a>
          )}

          {/* Arrow pointer */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `8px solid ${theme.colors.background.elevated}`,
          }} />
        </div>
      )}
    </span>
  );
}

interface InlineAmendedValueProps {
  originalValue: string;
  amendment: Amendment;
  showStrikethrough?: boolean;
}

export function InlineAmendedValue({ originalValue, amendment, showStrikethrough = true }: InlineAmendedValueProps) {
  return (
    <span>
      {showStrikethrough && (
        <>
          <AmendmentTooltip amendment={amendment}>
            <span style={{
              textDecoration: 'line-through',
              color: theme.colors.error.DEFAULT,
              cursor: 'help',
              borderBottom: `2px dotted ${theme.colors.error.DEFAULT}`,
            }}>
              {originalValue}
            </span>
          </AmendmentTooltip>
          {' '}
        </>
      )}
      <AmendmentTooltip amendment={amendment}>
        <span style={{
          color: theme.colors.success.DEFAULT,
          fontWeight: theme.fontWeight.medium,
          cursor: 'help',
          borderBottom: `2px dotted ${theme.colors.success.DEFAULT}`,
        }}>
          {amendment.newValue}
        </span>
      </AmendmentTooltip>
    </span>
  );
}

interface AmendmentHistoryListProps {
  amendments: Amendment[];
  onApprove?: (amendmentId: string) => void;
  onReject?: (amendmentId: string, reason: string) => void;
}

export function AmendmentHistoryList({ amendments, onApprove, onReject }: AmendmentHistoryListProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = (amendmentId: string) => {
    if (rejectReason.trim()) {
      onReject?.(amendmentId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  if (amendments.length === 0) {
    return (
      <div style={{
        padding: theme.spacing[8],
        textAlign: 'center',
        color: theme.colors.text.secondary,
      }}>
        No amendments yet
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
      {amendments.map((amendment) => (
        <div
          key={amendment.id}
          style={{
            padding: theme.spacing[6],
            border: `1px solid ${theme.colors.border.DEFAULT}`,
            borderRadius: theme.radius.DEFAULT,
            backgroundColor: theme.colors.background.primary,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing[4],
          }}>
            <div style={{
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text.primary,
              fontFamily: 'monospace',
            }}>
              {amendment.fieldPath}
            </div>
            <div style={{
              padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
              borderRadius: theme.radius.full,
              fontSize: theme.fontSize.xs,
              fontWeight: theme.fontWeight.medium,
              backgroundColor: amendment.status === 'applied' ? theme.colors.success.bg :
                              amendment.status === 'pending' ? theme.colors.warning.bg :
                              theme.colors.error.bg,
              color: amendment.status === 'applied' ? theme.colors.success.dark :
                    amendment.status === 'pending' ? theme.colors.warning.dark :
                    theme.colors.error.dark,
              textTransform: 'capitalize',
            }}>
              {amendment.status}
            </div>
          </div>

          {/* Value changes */}
          <div style={{
            padding: theme.spacing[4],
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.radius.DEFAULT,
            marginBottom: theme.spacing[4],
          }}>
            <div style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.error.DEFAULT,
              textDecoration: 'line-through',
              marginBottom: theme.spacing[2],
            }}>
              {amendment.originalValue}
            </div>
            <div style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.success.DEFAULT,
              fontWeight: theme.fontWeight.medium,
            }}>
              {amendment.newValue}
            </div>
          </div>

          {/* Explanation */}
          <div style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
            lineHeight: theme.lineHeight.relaxed,
            marginBottom: theme.spacing[4],
          }}>
            {amendment.explanation}
          </div>

          {/* Metadata */}
          <div style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.text.tertiary,
            marginBottom: amendment.status === 'pending' ? theme.spacing[4] : 0,
          }}>
            <div>Proposed by {amendment.proposedBy} on {new Date(amendment.proposedAt).toLocaleDateString()}</div>
            {amendment.appliedAt && amendment.appliedBy && (
              <div>Applied by {amendment.appliedBy} on {new Date(amendment.appliedAt).toLocaleDateString()}</div>
            )}
          </div>

          {/* Actions for pending amendments */}
          {amendment.status === 'pending' && (onApprove || onReject) && (
            <div>
              {rejectingId === amendment.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why you're rejecting this amendment..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: theme.spacing[3],
                      border: `1px solid ${theme.colors.border.DEFAULT}`,
                      borderRadius: theme.radius.DEFAULT,
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.text.primary,
                      backgroundColor: theme.colors.background.primary,
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'flex', gap: theme.spacing[3] }}>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                      style={{
                        flex: 1,
                        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                        border: `1px solid ${theme.colors.border.DEFAULT}`,
                        borderRadius: theme.radius.DEFAULT,
                        backgroundColor: theme.colors.background.primary,
                        color: theme.colors.text.primary,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: 'pointer',
                        transition: `all ${theme.transition.base}`,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(amendment.id)}
                      disabled={!rejectReason.trim()}
                      style={{
                        flex: 1,
                        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                        border: 'none',
                        borderRadius: theme.radius.DEFAULT,
                        backgroundColor: rejectReason.trim() ? theme.colors.error.DEFAULT : theme.colors.neutral[300],
                        color: theme.colors.text.inverse,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                        transition: `all ${theme.transition.base}`,
                      }}
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: theme.spacing[3] }}>
                  {onReject && (
                    <button
                      onClick={() => setRejectingId(amendment.id)}
                      style={{
                        flex: 1,
                        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                        border: `1px solid ${theme.colors.error.DEFAULT}`,
                        borderRadius: theme.radius.DEFAULT,
                        backgroundColor: theme.colors.background.primary,
                        color: theme.colors.error.DEFAULT,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: 'pointer',
                        transition: `all ${theme.transition.base}`,
                      }}
                    >
                      Reject
                    </button>
                  )}
                  {onApprove && (
                    <button
                      onClick={() => onApprove(amendment.id)}
                      style={{
                        flex: 1,
                        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                        border: 'none',
                        borderRadius: theme.radius.DEFAULT,
                        backgroundColor: theme.colors.success.DEFAULT,
                        color: theme.colors.text.inverse,
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        cursor: 'pointer',
                        transition: `all ${theme.transition.base}`,
                      }}
                    >
                      Approve
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
