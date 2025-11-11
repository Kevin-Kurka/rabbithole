/**
 * ActivityFeed Component
 *
 * Vertical list of recent activity items (nodes, comments, updates).
 * Infinite scroll support with loading states.
 */

'use client';

import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { NodeCard, type NodeCardProps } from './NodeCard';
import { mobileTheme } from '@/styles/mobileTheme';

export interface ActivityItem {
  id: string;
  title: string;
  type?: string;
  credibility?: number;
  preview?: string;
  created_at?: string;
  author?: string;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  title?: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onViewAll?: () => void;
  showViewAll?: boolean;
  onFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  items,
  title = 'Recent Activity',
  loading = false,
  hasMore = false,
  onLoadMore,
  onViewAll,
  showViewAll = true,
  onFavorite,
  onArchive,
  onDelete,
}) => {
  if (items.length === 0 && !loading) {
    return (
      <section className="py-4 px-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No recent activity</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start exploring to see activity here
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm text-primary font-medium active:opacity-70 transition-opacity"
            style={{ minHeight: mobileTheme.touch.minimum }}
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Activity List */}
      <div className="flex flex-col gap-3 px-4">
        {items.map((item) => (
          <NodeCard
            key={item.id}
            {...item}
            size="normal"
            showActions={true}
            onFavorite={onFavorite}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ))}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !loading && onLoadMore && (
          <button
            onClick={onLoadMore}
            className="w-full py-3 bg-muted text-foreground font-medium rounded-lg active:scale-98 transition-transform"
            style={{ minHeight: mobileTheme.touch.comfortable }}
          >
            Load More
          </button>
        )}
      </div>
    </section>
  );
};

export default ActivityFeed;
