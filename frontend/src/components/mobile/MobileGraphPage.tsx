/**
 * MobileGraphPage Component
 *
 * Complete mobile graph experience with list view and connections explorer.
 * Alternative to desktop canvas-based graph visualization.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { MobileLayout } from './MobileLayout';
import { MobileHeader } from './MobileHeader';
import { GraphListView, type GraphNode, type GraphFilter, type GraphSort } from './GraphListView';
import { NodeConnectionsView, type NodeConnection } from './NodeConnectionsView';
import { BottomSheet } from './BottomSheet';
import { FAB } from './FAB';
import { PullToRefresh } from './PullToRefresh';

export interface MobileGraphPageProps {
  /** Initial nodes to display */
  nodes?: GraphNode[];
  /** Loading state */
  loading?: boolean;
  /** User session data */
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  /** Callback when filter changes */
  onFilterChange?: (filter: GraphFilter) => void;
  /** Callback when sort changes */
  onSortChange?: (sort: GraphSort) => void;
  /** Callback when creating new node */
  onCreateNode?: () => void;
  /** Callback when refreshing */
  onRefresh?: () => Promise<void>;
}

// Mock data for demo
const MOCK_NODES: GraphNode[] = [
  {
    id: '1',
    title: 'JFK Assassination Investigation',
    type: 'Investigation',
    credibility: 85,
    preview: 'Comprehensive analysis of evidence and testimonies...',
    created_at: '2024-01-15',
    author: 'Research Team',
    connectionCount: 12,
  },
  {
    id: '2',
    title: 'Warren Commission Report',
    type: 'Evidence',
    credibility: 72,
    preview: 'Official government investigation findings...',
    created_at: '2024-01-10',
    author: 'Historical Archives',
    connectionCount: 8,
  },
  {
    id: '3',
    title: 'Lee Harvey Oswald',
    type: 'Person',
    credibility: 90,
    preview: 'Primary suspect in assassination...',
    created_at: '2024-01-08',
    author: 'Historical Archives',
    connectionCount: 15,
  },
  {
    id: '4',
    title: 'Jack Ruby',
    type: 'Person',
    credibility: 88,
    preview: 'Dallas nightclub owner who shot Oswald...',
    created_at: '2024-01-05',
    author: 'Historical Archives',
    connectionCount: 6,
  },
  {
    id: '5',
    title: 'Ballistics Analysis',
    type: 'Evidence',
    credibility: 92,
    preview: 'Forensic examination of bullets and trajectories...',
    created_at: '2024-01-03',
    author: 'Dr. Smith',
    connectionCount: 10,
  },
];

const MOCK_CONNECTIONS: NodeConnection[] = [
  {
    id: '2',
    title: 'Warren Commission Report',
    type: 'Evidence',
    credibility: 72,
    relationshipType: 'outgoing',
    relationshipLabel: 'referenced in',
  },
  {
    id: '3',
    title: 'Lee Harvey Oswald',
    type: 'Person',
    credibility: 90,
    relationshipType: 'bidirectional',
    relationshipLabel: 'related to',
  },
  {
    id: '5',
    title: 'Ballistics Analysis',
    type: 'Evidence',
    credibility: 92,
    relationshipType: 'incoming',
    relationshipLabel: 'supports',
  },
];

export const MobileGraphPage: React.FC<MobileGraphPageProps> = ({
  nodes = MOCK_NODES,
  loading = false,
  user,
  onFilterChange,
  onSortChange,
  onCreateNode,
  onRefresh,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const handleNodeClick = useCallback((id: string) => {
    setSelectedNodeId(id);
    setIsConnectionsOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      // Mock refresh
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }, [onRefresh]);

  const handleCreateNode = useCallback(() => {
    if (onCreateNode) {
      onCreateNode();
    } else {
      // Default behavior: navigate to create page
      window.location.href = '/nodes/create';
    }
  }, [onCreateNode]);

  const handleFavorite = useCallback((id: string) => {
    console.log('Favorite node:', id);
    // TODO: Implement favorite mutation
  }, []);

  const handleArchive = useCallback((id: string) => {
    console.log('Archive node:', id);
    // TODO: Implement archive mutation
  }, []);

  const handleDelete = useCallback((id: string) => {
    console.log('Delete node:', id);
    // TODO: Implement delete mutation
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <>
      {/* Mobile Header */}
      <MobileHeader
        title="Knowledge Graph"
        user={user}
        onMenuToggle={() => setMenuOpen(!menuOpen)}
        isMenuOpen={menuOpen}
        showNotifications={true}
        notificationCount={3}
      />

      {/* Main Content with Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <MobileLayout showBottomNav={true} paddingBottom={true}>
          {/* Graph List View */}
          <GraphListView
            nodes={nodes}
            loading={loading}
            onFavorite={handleFavorite}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onFilterChange={onFilterChange}
            onSortChange={onSortChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </MobileLayout>
      </PullToRefresh>

      {/* Node Connections Bottom Sheet */}
      <BottomSheet
        isOpen={isConnectionsOpen}
        onClose={() => setIsConnectionsOpen(false)}
        title={selectedNode?.title || 'Connections'}
        showHandle={true}
      >
        {selectedNode && (
          <NodeConnectionsView
            nodeId={selectedNode.id}
            nodeTitle={selectedNode.title}
            connections={MOCK_CONNECTIONS}
            onConnectionClick={(id) => {
              setSelectedNodeId(id);
              // Keep bottom sheet open to show new connections
            }}
          />
        )}
      </BottomSheet>

      {/* Search Bottom Sheet */}
      <BottomSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Search Graph"
        showHandle={true}
      >
        <div className="px-4 py-4">
          <input
            type="text"
            placeholder="Search nodes..."
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none focus:border-primary"
            autoFocus
          />
          <p className="text-sm text-muted-foreground mt-2">
            Search across all nodes in the knowledge graph
          </p>
        </div>
      </BottomSheet>

      {/* Floating Action Buttons */}
      <FAB
        icon={Plus}
        label="Create Node"
        onClick={handleCreateNode}
        position="bottom-right"
        speedDial={[
          {
            icon: Search,
            label: 'Search',
            onClick: () => setIsSearchOpen(true),
          },
        ]}
      />
    </>
  );
};

export default MobileGraphPage;
