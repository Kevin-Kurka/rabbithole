/**
 * FeaturedNodes Component
 *
 * Horizontal scrolling list of featured/trending nodes.
 * Optimized for touch scrolling with snap points.
 */

'use client';

import React, { useRef } from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { NodeCard } from './NodeCard';
import { mobileTheme } from '@/styles/mobileTheme';

export interface FeaturedNode {
  id: string;
  title: string;
  type?: string;
  credibility?: number;
  preview?: string;
  created_at?: string;
  author?: string;
}

export interface FeaturedNodesProps {
  nodes: FeaturedNode[];
  title?: string;
  onViewAll?: () => void;
  showViewAll?: boolean;
}

export const FeaturedNodes: React.FC<FeaturedNodesProps> = ({
  nodes,
  title = 'Trending Nodes',
  onViewAll,
  showViewAll = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (nodes.length === 0) {
    return null;
  }

  return (
    <section className="py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
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

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-2 hide-scrollbar"
        style={{
          scrollPaddingLeft: mobileTheme.spacing[4],
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {nodes.map((node) => (
          <div
            key={node.id}
            className="flex-shrink-0 snap-start"
            style={{ width: '280px' }}
          >
            <NodeCard
              {...node}
              size="compact"
              showActions={false}
              className="h-full"
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default FeaturedNodes;
