'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { theme, getCredibilityColor, getCredibilityLabel, getCredibilityStatus, getThresholdDescription } from '@/styles/theme';

// GraphQL queries and mutations
const GET_INQUIRY_POSITIONS = gql`
  query GetInquiryPositions($inquiryId: String!, $groupByThreshold: Boolean!) {
    inquiryPositions(inquiryId: $inquiryId, groupByThreshold: $groupByThreshold) {
      verified {
        id
        argument
        stance
        credibilityScore
        evidenceQualityScore
        sourceCredibilityScore
        coherenceScore
        upvotes
        downvotes
        createdBy
        createdAt
        status
      }
      credible {
        id
        argument
        stance
        credibilityScore
        evidenceQualityScore
        sourceCredibilityScore
        coherenceScore
        upvotes
        downvotes
        createdBy
        createdAt
        status
      }
      weak {
        id
        argument
        stance
        credibilityScore
        evidenceQualityScore
        sourceCredibilityScore
        coherenceScore
        upvotes
        downvotes
        createdBy
        createdAt
        status
      }
      excluded {
        id
        argument
        stance
        credibilityScore
        evidenceQualityScore
        sourceCredibilityScore
        coherenceScore
        upvotes
        downvotes
        createdBy
        createdAt
        status
      }
    }
  }
`;

const VOTE_ON_POSITION = gql`
  mutation VoteOnPosition($positionId: String!, $voteType: String!) {
    voteOnPosition(input: { positionId: $positionId, vote: $voteType }) {
      id
      upvotes
      downvotes
      credibilityScore
    }
  }
`;

interface Position {
  id: string;
  argument: string;
  stance: 'supporting' | 'opposing' | 'neutral';
  credibilityScore: number;
  evidenceQualityScore: number;
  sourceCredibilityScore: number;
  coherenceScore: number;
  upvotes: number;
  downvotes: number;
  createdBy: string;
  createdAt: string;
  status: string;
}

interface PositionListProps {
  inquiryId: string;
}

function PositionCard({ position }: { position: Position }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [voteOnPosition, { loading: voting }] = useMutation(VOTE_ON_POSITION);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    try {
      await voteOnPosition({
        variables: {
          positionId: position.id,
          voteType,
        },
      });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const credibilityColor = getCredibilityColor(position.credibilityScore);
  const credibilityLabel = getCredibilityLabel(position.credibilityScore);
  const credibilityStatus = getCredibilityStatus(position.credibilityScore);

  return (
    <div style={{
      padding: theme.spacing[6],
      border: `1px solid ${theme.colors.border.DEFAULT}`,
      borderRadius: theme.radius.DEFAULT,
      backgroundColor: theme.colors.background.primary,
      marginBottom: theme.spacing[4],
      transition: `all ${theme.transition.base}`,
    }}>
      {/* Header with stance and credibility */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[4],
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
          {/* Stance badge */}
          <div style={{
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: theme.radius.full,
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.medium,
            backgroundColor: position.stance === 'supporting' ? theme.colors.success.bg :
                           position.stance === 'opposing' ? theme.colors.error.bg :
                           theme.colors.neutral[100],
            color: position.stance === 'supporting' ? theme.colors.success.dark :
                  position.stance === 'opposing' ? theme.colors.error.dark :
                  theme.colors.neutral[700],
            textTransform: 'capitalize',
          }}>
            {position.stance}
          </div>

          {/* Credibility badge */}
          <div
            onMouseEnter={() => setShowBreakdown(true)}
            onMouseLeave={() => setShowBreakdown(false)}
            style={{
              position: 'relative',
              padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
              borderRadius: theme.radius.full,
              fontSize: theme.fontSize.xs,
              fontWeight: theme.fontWeight.semibold,
              backgroundColor: credibilityColor,
              color: theme.colors.text.inverse,
              cursor: 'help',
            }}
          >
            {credibilityLabel} {(position.credibilityScore * 100).toFixed(0)}%

            {/* Breakdown tooltip */}
            {showBreakdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: theme.spacing[2],
                padding: theme.spacing[4],
                backgroundColor: theme.colors.background.elevated,
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                boxShadow: theme.shadow.lg,
                zIndex: theme.zIndex.tooltip,
                minWidth: '280px',
              }}>
                <div style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing[3],
                }}>
                  Credibility Breakdown
                </div>
                <div style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing[2],
                }}>
                  {getThresholdDescription(credibilityStatus)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                      Evidence Quality:
                    </span>
                    <span style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      {(position.evidenceQualityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                      Source Credibility:
                    </span>
                    <span style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      {(position.sourceCredibilityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                      Coherence:
                    </span>
                    <span style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      {(position.coherenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{
                    height: '1px',
                    backgroundColor: theme.colors.border.DEFAULT,
                    margin: `${theme.spacing[2]} 0`,
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary }}>
                      Community Vote:
                    </span>
                    <span style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.text.primary }}>
                      +{position.upvotes} / -{position.downvotes}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vote buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <button
            onClick={() => handleVote('upvote')}
            disabled={voting}
            style={{
              padding: theme.spacing[2],
              border: `1px solid ${theme.colors.border.DEFAULT}`,
              borderRadius: theme.radius.DEFAULT,
              backgroundColor: theme.colors.background.primary,
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.sm,
              cursor: voting ? 'not-allowed' : 'pointer',
              transition: `all ${theme.transition.base}`,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
            }}
          >
            ↑ {position.upvotes}
          </button>
          <button
            onClick={() => handleVote('downvote')}
            disabled={voting}
            style={{
              padding: theme.spacing[2],
              border: `1px solid ${theme.colors.border.DEFAULT}`,
              borderRadius: theme.radius.DEFAULT,
              backgroundColor: theme.colors.background.primary,
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.sm,
              cursor: voting ? 'not-allowed' : 'pointer',
              transition: `all ${theme.transition.base}`,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
            }}
          >
            ↓ {position.downvotes}
          </button>
        </div>
      </div>

      {/* Argument text */}
      <div style={{
        fontSize: theme.fontSize.base,
        color: theme.colors.text.primary,
        lineHeight: theme.lineHeight.relaxed,
        marginBottom: theme.spacing[4],
      }}>
        {position.argument}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: theme.fontSize.sm,
        color: theme.colors.text.tertiary,
      }}>
        <span>By {position.createdBy}</span>
        <span>{new Date(position.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function PositionSection({ title, positions, color, isCollapsible = false, defaultCollapsed = false }: {
  title: string;
  positions: Position[];
  color: string;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (positions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: theme.spacing[8] }}>
      <div
        onClick={() => isCollapsible && setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing[4],
          padding: theme.spacing[4],
          backgroundColor: theme.colors.background.secondary,
          borderRadius: theme.radius.DEFAULT,
          cursor: isCollapsible ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
          <div style={{
            width: '4px',
            height: '24px',
            backgroundColor: color,
            borderRadius: theme.radius.full,
          }} />
          <h3 style={{
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text.primary,
            margin: 0,
          }}>
            {title}
          </h3>
          <div style={{
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: theme.radius.full,
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.medium,
            backgroundColor: theme.colors.neutral[100],
            color: theme.colors.neutral[700],
          }}>
            {positions.length} {positions.length === 1 ? 'position' : 'positions'}
          </div>
        </div>
        {isCollapsible && (
          <div style={{
            fontSize: theme.fontSize.lg,
            color: theme.colors.text.secondary,
            transition: `transform ${theme.transition.base}`,
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}>
            ▼
          </div>
        )}
      </div>

      {!collapsed && (
        <div>
          {positions.map((position) => (
            <PositionCard key={position.id} position={position} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PositionList({ inquiryId }: PositionListProps) {
  const { data, loading, error } = useQuery(GET_INQUIRY_POSITIONS, {
    variables: {
      inquiryId,
      groupByThreshold: true,
    },
  });

  if (loading) {
    return (
      <div style={{
        padding: theme.spacing[8],
        textAlign: 'center',
        color: theme.colors.text.secondary,
      }}>
        Loading positions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: theme.spacing[8],
        textAlign: 'center',
        color: theme.colors.error.DEFAULT,
      }}>
        Error loading positions: {error.message}
      </div>
    );
  }

  const positions = data?.inquiryPositions || { verified: [], credible: [], weak: [], excluded: [] };
  const totalPositions = positions.verified.length + positions.credible.length +
                         positions.weak.length + positions.excluded.length;

  if (totalPositions === 0) {
    return (
      <div style={{
        padding: theme.spacing[12],
        textAlign: 'center',
        color: theme.colors.text.secondary,
      }}>
        <div style={{
          fontSize: theme.fontSize.xl,
          fontWeight: theme.fontWeight.medium,
          marginBottom: theme.spacing[2],
        }}>
          No positions yet
        </div>
        <div style={{ fontSize: theme.fontSize.base }}>
          Be the first to contribute to this inquiry
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: theme.spacing[6] }}>
      {/* Summary header */}
      <div style={{
        display: 'flex',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
        padding: theme.spacing[4],
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.DEFAULT,
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.credibility.verified,
          }}>
            {positions.verified.length}
          </div>
          <div style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
            marginTop: theme.spacing[1],
          }}>
            Verified
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.credibility.credible,
          }}>
            {positions.credible.length}
          </div>
          <div style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
            marginTop: theme.spacing[1],
          }}>
            Credible
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.credibility.weak,
          }}>
            {positions.weak.length}
          </div>
          <div style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
            marginTop: theme.spacing[1],
          }}>
            Weak
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.credibility.excluded,
          }}>
            {positions.excluded.length}
          </div>
          <div style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.text.secondary,
            marginTop: theme.spacing[1],
          }}>
            Excluded
          </div>
        </div>
      </div>

      {/* Position sections */}
      <PositionSection
        title="Verified Positions"
        positions={positions.verified}
        color={theme.colors.credibility.verified}
      />

      <PositionSection
        title="Credible Positions"
        positions={positions.credible}
        color={theme.colors.credibility.credible}
      />

      <PositionSection
        title="Weak Positions"
        positions={positions.weak}
        color={theme.colors.credibility.weak}
      />

      <PositionSection
        title="Excluded Positions"
        positions={positions.excluded}
        color={theme.colors.credibility.excluded}
        isCollapsible
        defaultCollapsed
      />
    </div>
  );
}
