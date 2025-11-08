'use client';

import React, { useState, useMemo } from 'react';
import { Annotation } from '@/graphql/annotations';

/**
 * AnnotationPanel Component
 *
 * Displays a sidebar panel with all annotations for an article.
 * Allows filtering by type, severity, and status.
 *
 * Features:
 * - Filter by annotation type (deception, highlight, note)
 * - Filter by severity (high, medium, low)
 * - Sort by confidence, votes, or created date
 * - Click to scroll to annotation in article
 * - Vote on annotations
 * - Dispute annotations
 */

interface AnnotationPanelProps {
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  onVote?: (annotationId: string, vote: number) => void;
  onDispute?: (annotationId: string) => void;
  trustworthinessScore?: number;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotations,
  onAnnotationClick,
  onVote,
  onDispute,
  trustworthinessScore,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'votes' | 'created'>('confidence');

  // Filter and sort annotations
  const filteredAnnotations = useMemo(() => {
    let filtered = annotations;

    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.annotationType === filterType);
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(a => a.severity === filterSeverity);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'confidence') {
        return (b.confidence || 0) - (a.confidence || 0);
      } else if (sortBy === 'votes') {
        return b.votes - a.votes;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [annotations, filterType, filterSeverity, sortBy]);

  const deceptionCount = annotations.filter(a => a.annotationType === 'deception').length;
  const highSeverityCount = annotations.filter(a => a.severity === 'high').length;
  const mediumSeverityCount = annotations.filter(a => a.severity === 'medium').length;
  const lowSeverityCount = annotations.filter(a => a.severity === 'low').length;

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#FCD34D';
      default: return '#9CA3AF';
    }
  };

  const getFallacyLabel = (deceptionType?: string) => {
    if (!deceptionType) return 'Annotation';
    const labels: Record<string, string> = {
      ad_hominem: 'Ad Hominem',
      straw_man: 'Straw Man',
      false_dichotomy: 'False Dichotomy',
      slippery_slope: 'Slippery Slope',
      appeal_to_authority: 'Appeal to Authority',
      appeal_to_emotion: 'Appeal to Emotion',
      red_herring: 'Red Herring',
      exaggeration: 'Exaggeration',
      false_comparison: 'False Comparison',
      cherry_picking: 'Cherry-Picking',
      misleading_statistic: 'Misleading Statistic',
      out_of_context: 'Out of Context',
      hasty_generalization: 'Hasty Generalization',
    };
    return labels[deceptionType] || deceptionType.replace(/_/g, ' ');
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#111827',
        borderLeft: '1px solid #374151',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px',
          borderBottom: '1px solid #374151',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 600,
            marginBottom: '16px',
            color: '#fff',
          }}
        >
          Annotations ({annotations.length})
        </h2>

        {/* Trustworthiness Score */}
        {trustworthinessScore !== undefined && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#1F2937',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
              Trustworthiness Score
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 600,
                color: trustworthinessScore >= 0.7 ? '#10B981' : trustworthinessScore >= 0.4 ? '#F59E0B' : '#EF4444',
              }}
            >
              {(trustworthinessScore * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '8px',
              backgroundColor: '#1F2937',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#EF4444' }}>
              {highSeverityCount}
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>High</div>
          </div>
          <div
            style={{
              padding: '8px',
              backgroundColor: '#1F2937',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#F59E0B' }}>
              {mediumSeverityCount}
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Medium</div>
          </div>
          <div
            style={{
              padding: '8px',
              backgroundColor: '#1F2937',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#FCD34D' }}>
              {lowSeverityCount}
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Low</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1F2937',
              color: '#fff',
              border: '1px solid #374151',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="all">All Types</option>
            <option value="deception">Deceptions ({deceptionCount})</option>
            <option value="highlight">Highlights</option>
            <option value="note">Notes</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1F2937',
              color: '#fff',
              border: '1px solid #374151',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="all">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1F2937',
              color: '#fff',
              border: '1px solid #374151',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="confidence">Sort by Confidence</option>
            <option value="votes">Sort by Votes</option>
            <option value="created">Sort by Date</option>
          </select>
        </div>
      </div>

      {/* Annotation List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {filteredAnnotations.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '24px' }}>
            No annotations found
          </div>
        ) : (
          filteredAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              onClick={() => onAnnotationClick?.(annotation)}
              style={{
                padding: '12px',
                backgroundColor: '#1F2937',
                borderLeft: `4px solid ${getSeverityColor(annotation.severity)}`,
                borderRadius: '4px',
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'background-color 200ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1F2937';
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: getSeverityColor(annotation.severity),
                  }}
                >
                  {getFallacyLabel(annotation.deceptionType)}
                </div>
                {annotation.confidence && (
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {(annotation.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Highlighted text */}
              <div
                style={{
                  fontSize: '14px',
                  color: '#E5E7EB',
                  marginBottom: '8px',
                  fontStyle: 'italic',
                }}
              >
                "{annotation.highlightedText.substring(0, 100)}
                {annotation.highlightedText.length > 100 ? '...' : ''}"
              </div>

              {/* Explanation */}
              {annotation.explanation && (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#9CA3AF',
                    marginBottom: '8px',
                  }}
                >
                  {annotation.explanation.substring(0, 150)}
                  {annotation.explanation.length > 150 ? '...' : ''}
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#6B7280',
                }}
              >
                <span>{annotation.isAiGenerated ? '> AI' : '=d User'}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {onVote && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVote(annotation.id, 1);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9CA3AF',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        =M
                      </button>
                      <span>{annotation.votes > 0 ? `+${annotation.votes}` : annotation.votes}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVote(annotation.id, -1);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9CA3AF',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        =N
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
