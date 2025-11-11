/**
 * GraphListView Component
 *
 * Mobile-friendly list view for graph nodes.
 * Alternative to the desktop canvas-based graph visualization.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Network, Filter, SortAsc, Grid, List } from 'lucide-react';
import { NodeCard, type NodeCardProps } from './NodeCard';
import { mobileTheme } from '@/styles/mobileTheme';

export interface GraphNode {
  id: string;
  title: string;
  type?: string;
  credibility?: number;
  preview?: string;
  created_at?: string;
  author?: string;
  connections?: string[];
  connectionCount?: number;
}

export interface GraphListViewProps {
  nodes: GraphNode[];
  loading?: boolean;
  onNodeClick?: (id: string) => void;
  onFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onFilterChange?: (filter: GraphFilter) => void;
  onSortChange?: (sort: GraphSort) => void;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
}

export type GraphFilter = 'all' | 'investigations' | 'evidence' | 'people' | 'articles';
export type GraphSort = 'recent' | 'credibility' | 'connections' | 'alphabetical';

const FILTER_OPTIONS: { value: GraphFilter; label: string }[] = [
  { value: 'all', label: 'All Nodes' },
  { value: 'investigations', label: 'Investigations' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'people', label: 'People' },
  { value: 'articles', label: 'Articles' },
];

const SORT_OPTIONS: { value: GraphSort; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'credibility', label: 'Highest Credibility' },
  { value: 'connections', label: 'Most Connected' },
  { value: 'alphabetical', label: 'A-Z' },
];

export const GraphListView: React.FC<GraphListViewProps> = ({
  nodes,
  loading = false,
  onNodeClick,
  onFavorite,
  onArchive,
  onDelete,
  onFilterChange,
  onSortChange,
  viewMode = 'list',
  onViewModeChange,
}) => {
  const [activeFilter, setActiveFilter] = useState<GraphFilter>('all');
  const [activeSort, setActiveSort] = useState<GraphSort>('recent');
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = useCallback((filter: GraphFilter) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
    setShowFilters(false);
  }, [onFilterChange]);

  const handleSortChange = useCallback((sort: GraphSort) => {
    setActiveSort(sort);
    onSortChange?.(sort);
  }, [onSortChange]);

  const handleViewModeToggle = useCallback(() => {
    const newMode = viewMode === 'list' ? 'grid' : 'list';
    onViewModeChange?.(newMode);
  }, [viewMode, onViewModeChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading graph...</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 px-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <Network className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No nodes found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or create a new node
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              activeFilter !== 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
            style={{ minHeight: mobileTheme.touch.minimum }}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">
              {FILTER_OPTIONS.find(f => f.value === activeFilter)?.label || 'Filter'}
            </span>
          </button>

          {/* Sort Dropdown */}
          <select
            value={activeSort}
            onChange={(e) => handleSortChange(e.target.value as GraphSort)}
            className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium"
            style={{ minHeight: mobileTheme.touch.minimum }}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <button
            onClick={handleViewModeToggle}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            style={{
              minWidth: mobileTheme.touch.minimum,
              minHeight: mobileTheme.touch.minimum,
            }}
            aria-label={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
          >
            {viewMode === 'list' ? (
              <Grid className="w-5 h-5" />
            ) : (
              <List className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
                style={{ minHeight: mobileTheme.touch.minimum }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Node Count */}
        <div className="mt-2 text-xs text-muted-foreground">
          {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
        </div>
      </div>

      {/* Node List/Grid */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'list' ? (
          <div className="flex flex-col gap-3 p-4">
            {nodes.map(node => (
              <NodeCard
                key={node.id}
                {...node}
                size="normal"
                showActions={true}
                onFavorite={onFavorite}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {nodes.map(node => (
              <NodeCard
                key={node.id}
                {...node}
                size="compact"
                showActions={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphListView;
