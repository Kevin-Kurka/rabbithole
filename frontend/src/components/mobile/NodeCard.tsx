/**
 * NodeCard Component
 *
 * Compact card for displaying nodes in mobile lists and grids.
 * Supports different sizes and swipeable actions.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Archive, Trash2 } from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';
import { SwipeableCard, type SwipeAction } from './SwipeableCard';

export interface NodeCardProps {
  id: string;
  title: string;
  type?: string;
  credibility?: number;
  preview?: string;
  created_at?: string;
  author?: string;
  size?: 'compact' | 'normal' | 'large';
  showActions?: boolean;
  onFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  id,
  title,
  type = 'Article',
  credibility,
  preview,
  created_at,
  author,
  size = 'normal',
  showActions = true,
  onFavorite,
  onArchive,
  onDelete,
  className = '',
}) => {
  const leftActions: SwipeAction[] = onFavorite
    ? [
        {
          id: 'favorite',
          label: 'Star',
          icon: Star,
          color: 'bg-yellow-500',
          onTrigger: () => onFavorite(id),
        },
      ]
    : [];

  const rightActions: SwipeAction[] = [
    ...(onArchive
      ? [
          {
            id: 'archive',
            label: 'Archive',
            icon: Archive,
            color: 'bg-blue-500',
            onTrigger: () => onArchive(id),
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            color: 'bg-destructive',
            onTrigger: () => onDelete(id),
          },
        ]
      : []),
  ];

  const cardContent = (
    <div
      className={`flex flex-col gap-2 ${
        size === 'compact' ? 'p-3' : size === 'large' ? 'p-5' : 'p-4'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold text-foreground line-clamp-2 ${
              size === 'compact' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
            }`}
          >
            {title}
          </h3>
        </div>
        {credibility !== undefined && (
          <div className="flex-shrink-0">
            <div
              className={`font-bold text-primary ${
                size === 'compact' ? 'text-sm' : 'text-base'
              }`}
            >
              {credibility}%
            </div>
          </div>
        )}
      </div>

      {/* Preview Text */}
      {preview && size !== 'compact' && (
        <p
          className={`text-muted-foreground line-clamp-2 ${
            size === 'large' ? 'text-base' : 'text-sm'
          }`}
        >
          {preview}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-muted rounded-md font-medium">{type}</span>
          {author && size !== 'compact' && <span>by {author}</span>}
        </div>
        {created_at && (
          <span className="flex-shrink-0">
            {new Date(created_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* View Arrow */}
      <div className="flex items-center justify-end mt-1">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );

  const card = (
    <Link
      href={`/nodes/${id}`}
      className={`block bg-card border border-border rounded-lg hover:border-primary transition-colors active:scale-[0.98] ${className}`}
      style={{
        minHeight: mobileTheme.touch.comfortable,
      }}
    >
      {cardContent}
    </Link>
  );

  // Wrap in swipeable if actions are enabled
  if (showActions && (leftActions.length > 0 || rightActions.length > 0)) {
    return (
      <SwipeableCard leftActions={leftActions} rightActions={rightActions}>
        {card}
      </SwipeableCard>
    );
  }

  return card;
};

export default NodeCard;
