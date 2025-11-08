'use client';

import React, { useState, useMemo } from 'react';
import { Annotation } from '@/graphql/annotations';

/**
 * HighlightedText Component
 *
 * Renders article text with annotations as colored highlights.
 * Shows tooltips on hover with deception explanations.
 *
 * Features:
 * - Color-coded by severity (red/amber/yellow)
 * - Hover tooltips with detailed explanations
 * - Click to show full annotation details
 * - Filter by annotation type
 * - Vote on annotations
 */

interface HighlightedTextProps {
  text: string;
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationVote?: (annotationId: string, vote: number) => void;
  showOnlyDeceptions?: boolean;
}

interface TextSegment {
  text: string;
  annotation?: Annotation;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  annotations,
  onAnnotationClick,
  onAnnotationVote,
  showOnlyDeceptions = false,
}) => {
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);

  // Filter annotations based on showOnlyDeceptions
  const filteredAnnotations = useMemo(() => {
    return showOnlyDeceptions
      ? annotations.filter(a => a.annotationType === 'deception')
      : annotations;
  }, [annotations, showOnlyDeceptions]);

  // Split text into segments based on annotations
  const segments = useMemo(() => {
    if (filteredAnnotations.length === 0) {
      return [{ text }];
    }

    // Sort annotations by start offset
    const sorted = [...filteredAnnotations].sort((a, b) => a.startOffset - b.startOffset);

    const result: TextSegment[] = [];
    let currentOffset = 0;

    sorted.forEach((annotation) => {
      // Add plain text before annotation
      if (currentOffset < annotation.startOffset) {
        result.push({
          text: text.substring(currentOffset, annotation.startOffset),
        });
      }

      // Add annotated text
      result.push({
        text: text.substring(annotation.startOffset, annotation.endOffset),
        annotation,
      });

      currentOffset = annotation.endOffset;
    });

    // Add remaining text
    if (currentOffset < text.length) {
      result.push({
        text: text.substring(currentOffset),
      });
    }

    return result;
  }, [text, filteredAnnotations]);

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'high': return ' ';
      case 'medium': return '¡';
      case 'low': return '9';
      default: return '=Ì';
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '16px',
        lineHeight: 1.8,
        color: '#E5E7EB',
      }}
    >
      {segments.map((segment, index) => {
        if (!segment.annotation) {
          // Plain text
          return <span key={index}>{segment.text}</span>;
        }

        const { annotation } = segment;
        const isHovered = hoveredAnnotation === annotation.id;

        return (
          <span
            key={index}
            style={{
              backgroundColor: annotation.color,
              color: '#000',
              padding: '2px 0',
              borderRadius: '2px',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 200ms ease-out',
              boxShadow: isHovered ? `0 0 0 2px ${annotation.color}` : 'none',
            }}
            onMouseEnter={() => setHoveredAnnotation(annotation.id)}
            onMouseLeave={() => setHoveredAnnotation(null)}
            onClick={() => onAnnotationClick?.(annotation)}
          >
            {segment.text}

            {/* Tooltip on hover */}
            {isHovered && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#1F2937',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
                  zIndex: 1000,
                  minWidth: '280px',
                  maxWidth: '400px',
                  pointerEvents: 'none',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                {/* Arrow */}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid #1F2937',
                  }}
                />

                {/* Content */}
                <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: annotation.color }}>
                  {getSeverityIcon(annotation.severity)} {getFallacyLabel(annotation.deceptionType)}
                </div>

                {annotation.explanation && (
                  <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                    {annotation.explanation}
                  </div>
                )}

                {annotation.confidence && (
                  <div style={{ marginBottom: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                    Confidence: {(annotation.confidence * 100).toFixed(0)}%
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  {annotation.isAiGenerated ? 'AI-detected' : 'User annotation'}
                  {' " '}
                  {annotation.votes > 0 ? `+${annotation.votes}` : annotation.votes} votes
                </div>

                {onAnnotationVote && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      gap: '8px',
                      pointerEvents: 'auto',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnnotationVote(annotation.id, 1);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      =M Upvote
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnnotationVote(annotation.id, -1);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      =N Downvote
                    </button>
                  </div>
                )}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
};
