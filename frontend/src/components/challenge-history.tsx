/**
 * ChallengeHistory Component
 *
 * Timeline view of a challenge's lifecycle.
 * Shows creation, votes, status changes, and resolution.
 */

import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Challenge, ChallengeTimelineEvent, ChallengeVoteType } from '@/types/challenge';
import { formatTimeAgo } from '@/utils/challengeHelpers';
import { theme } from '@/styles/theme';

export interface ChallengeHistoryProps {
  challengeId: string;
  challenge?: Challenge;
  events?: ChallengeTimelineEvent[];
}

/**
 * ChallengeHistory component
 */
export const ChallengeHistory: React.FC<ChallengeHistoryProps> = ({
  challengeId,
  challenge,
  events,
}) => {
  // Generate timeline events from challenge if not provided
  const timelineEvents = events || generateTimelineFromChallenge(challenge);

  if (!timelineEvents || timelineEvents.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-8 rounded-lg"
        style={{
          backgroundColor: theme.colors.bg.primary,
          border: `1px solid ${theme.colors.border.primary}`,
        }}
      >
        <div
          className="text-sm"
          style={{ color: theme.colors.text.tertiary }}
        >
          No history available
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: theme.colors.bg.primary,
        border: `1px solid ${theme.colors.border.primary}`,
      }}
    >
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: theme.colors.text.primary }}
      >
        Challenge Timeline
      </h3>

      {/* Timeline */}
      <div className="space-y-4">
        {timelineEvents.map((event, index) => (
          <TimelineItem
            key={event.id}
            event={event}
            isLast={index === timelineEvents.length - 1}
          />
        ))}
      </div>

      {/* Resolution Impact (if resolved) */}
      {challenge?.resolution && (
        <div
          className="mt-6 p-4 rounded-lg"
          style={{
            backgroundColor: theme.colors.bg.elevated,
            border: `1px solid ${
              challenge.resolution.outcome === 'upheld' ? '#f97316' : '#10b981'
            }`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            {challenge.resolution.outcome === 'upheld' ? (
              <CheckCircle2 size={20} style={{ color: '#f97316' }} />
            ) : (
              <XCircle size={20} style={{ color: '#10b981' }} />
            )}
            <span
              className="font-semibold"
              style={{
                color:
                  challenge.resolution.outcome === 'upheld' ? '#f97316' : '#10b981',
              }}
            >
              {challenge.resolution.outcome === 'upheld'
                ? 'Challenge Upheld'
                : 'Challenge Dismissed'}
            </span>
          </div>

          <div
            className="text-sm mb-3"
            style={{ color: theme.colors.text.primary }}
          >
            {challenge.resolution.reasoning}
          </div>

          {challenge.resolution.veracityImpact !== undefined && (
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: theme.colors.text.secondary }}
            >
              {challenge.resolution.veracityImpact < 0 ? (
                <TrendingDown size={16} style={{ color: '#ef4444' }} />
              ) : (
                <TrendingUp size={16} style={{ color: '#10b981' }} />
              )}
              <span>
                Veracity score adjusted by{' '}
                <span className="font-semibold">
                  {challenge.resolution.veracityImpact > 0 ? '+' : ''}
                  {(challenge.resolution.veracityImpact * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Timeline item component
 */
interface TimelineItemProps {
  event: ChallengeTimelineEvent;
  isLast: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ event, isLast }) => {
  const getEventIcon = () => {
    switch (event.type) {
      case 'created':
        return <MessageSquare size={16} />;
      case 'vote_cast':
        return <CheckCircle2 size={16} />;
      case 'status_change':
        return <Clock size={16} />;
      case 'resolved':
        return <CheckCircle2 size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getEventColor = () => {
    switch (event.type) {
      case 'created':
        return '#eab308'; // yellow
      case 'vote_cast':
        return '#3b82f6'; // blue
      case 'status_change':
        return '#a1a1aa'; // zinc
      case 'resolved':
        return '#10b981'; // green
      default:
        return theme.colors.text.tertiary;
    }
  };

  const color = getEventColor();

  return (
    <div className="flex gap-3">
      {/* Timeline line and icon */}
      <div className="flex flex-col items-center">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          {getEventIcon()}
        </div>
        {!isLast && (
          <div
            className="w-0.5 flex-1 mt-2"
            style={{
              backgroundColor: theme.colors.border.primary,
              minHeight: '24px',
            }}
          />
        )}
      </div>

      {/* Event content */}
      <div className="flex-1 pb-6">
        <div
          className="text-sm font-semibold mb-1"
          style={{ color: theme.colors.text.primary }}
        >
          {event.details}
        </div>
        <div
          className="text-xs"
          style={{ color: theme.colors.text.tertiary }}
        >
          {event.userName && <span>{event.userName} · </span>}
          {formatTimeAgo(event.timestamp)}
        </div>
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div
            className="mt-2 text-xs p-2 rounded"
            style={{
              backgroundColor: theme.colors.bg.elevated,
              color: theme.colors.text.secondary,
            }}
          >
            {JSON.stringify(event.metadata, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Generate timeline events from challenge data
 */
function generateTimelineFromChallenge(
  challenge?: Challenge
): ChallengeTimelineEvent[] {
  if (!challenge) return [];

  const events: ChallengeTimelineEvent[] = [];

  // Challenge created
  events.push({
    id: `${challenge.id}-created`,
    type: 'created',
    timestamp: challenge.createdAt,
    userId: challenge.createdBy,
    userName: challenge.createdByName,
    details: 'Challenge created',
  });

  // Votes cast (group by type and show summary)
  const upholdVotes = challenge.votes.filter(
    (v) => v.voteType === ChallengeVoteType.UPHOLD
  );
  const dismissVotes = challenge.votes.filter(
    (v) => v.voteType === ChallengeVoteType.DISMISS
  );

  if (upholdVotes.length > 0) {
    const latestUpholdVote = upholdVotes[upholdVotes.length - 1];
    events.push({
      id: `${challenge.id}-uphold-votes`,
      type: 'vote_cast',
      timestamp: latestUpholdVote.createdAt,
      details: `${upholdVotes.length} vote${upholdVotes.length !== 1 ? 's' : ''} to uphold`,
      metadata: {
        totalWeight: upholdVotes.reduce((sum, v) => sum + v.weight, 0),
      },
    });
  }

  if (dismissVotes.length > 0) {
    const latestDismissVote = dismissVotes[dismissVotes.length - 1];
    events.push({
      id: `${challenge.id}-dismiss-votes`,
      type: 'vote_cast',
      timestamp: latestDismissVote.createdAt,
      details: `${dismissVotes.length} vote${dismissVotes.length !== 1 ? 's' : ''} to dismiss`,
      metadata: {
        totalWeight: dismissVotes.reduce((sum, v) => sum + v.weight, 0),
      },
    });
  }

  // Status changes
  if (challenge.status === 'under_review' || challenge.status === 'resolved') {
    events.push({
      id: `${challenge.id}-status-review`,
      type: 'status_change',
      timestamp: challenge.createdAt, // Use actual status change timestamp if available
      details: 'Status changed to Under Review',
    });
  }

  // Resolution
  if (challenge.resolution) {
    events.push({
      id: `${challenge.id}-resolved`,
      type: 'resolved',
      timestamp: challenge.resolution.resolvedAt,
      userId: challenge.resolution.resolvedBy,
      details: `Challenge ${challenge.resolution.outcome}`,
      metadata: {
        veracityImpact: challenge.resolution.veracityImpact,
      },
    });
  }

  // Sort by timestamp
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export default ChallengeHistory;
