/**
 * NodeConnectionsView Component
 *
 * Mobile view for exploring node connections and relationships.
 * Shows connected nodes in an expandable tree structure.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Network, ArrowRight, ArrowLeft } from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';

export interface NodeConnection {
  id: string;
  title: string;
  type?: string;
  credibility?: number;
  relationshipType: 'incoming' | 'outgoing' | 'bidirectional';
  relationshipLabel?: string;
  depth?: number;
}

export interface NodeConnectionsViewProps {
  nodeId: string;
  nodeTitle: string;
  connections: NodeConnection[];
  onConnectionClick?: (id: string) => void;
  maxDepth?: number;
}

export const NodeConnectionsView: React.FC<NodeConnectionsViewProps> = ({
  nodeId,
  nodeTitle,
  connections,
  onConnectionClick,
  maxDepth = 2,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([nodeId]));

  const toggleExpanded = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isExpanded = (id: string) => expandedNodes.has(id);

  const groupedConnections = {
    incoming: connections.filter(c => c.relationshipType === 'incoming'),
    outgoing: connections.filter(c => c.relationshipType === 'outgoing'),
    bidirectional: connections.filter(c => c.relationshipType === 'bidirectional'),
  };

  const renderConnectionArrow = (type: NodeConnection['relationshipType']) => {
    switch (type) {
      case 'incoming':
        return <ArrowLeft className="w-4 h-4 text-muted-foreground" />;
      case 'outgoing':
        return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
      case 'bidirectional':
        return (
          <div className="flex items-center">
            <ArrowLeft className="w-3 h-3 text-muted-foreground -mr-1" />
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </div>
        );
    }
  };

  const renderConnection = (connection: NodeConnection, index: number) => {
    const expanded = isExpanded(connection.id);
    const depth = connection.depth || 0;

    return (
      <div
        key={connection.id}
        className="border-l-2 border-muted"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="flex items-start gap-2 py-2 px-3 hover:bg-muted/50 transition-colors">
          {/* Connection Arrow */}
          <div className="flex-shrink-0 mt-1">
            {renderConnectionArrow(connection.relationshipType)}
          </div>

          {/* Connection Info */}
          <Link
            href={`/nodes/${connection.id}`}
            onClick={(e) => {
              if (onConnectionClick) {
                e.preventDefault();
                onConnectionClick(connection.id);
              }
            }}
            className="flex-1 min-w-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">
                  {connection.title}
                </h4>
                {connection.relationshipLabel && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {connection.relationshipLabel}
                  </p>
                )}
              </div>
              {connection.credibility !== undefined && (
                <div className="flex-shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {connection.credibility}%
                  </span>
                </div>
              )}
            </div>
            {connection.type && (
              <div className="mt-1">
                <span className="inline-block px-2 py-0.5 text-xs bg-muted rounded">
                  {connection.type}
                </span>
              </div>
            )}
          </Link>

          {/* Expand Button */}
          {depth < maxDepth && (
            <button
              onClick={() => toggleExpanded(connection.id)}
              className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  expanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderConnectionGroup = (
    title: string,
    connections: NodeConnection[],
    defaultExpanded: boolean = false
  ) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    if (connections.length === 0) return null;

    return (
      <div className="mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-muted rounded-lg"
          style={{ minHeight: mobileTheme.touch.minimum }}
        >
          <span className="font-medium text-sm">
            {title} ({connections.length})
          </span>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        </button>
        {expanded && (
          <div className="mt-2">
            {connections.map((connection, index) => renderConnection(connection, index))}
          </div>
        )}
      </div>
    );
  };

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Network className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">No connections</p>
        <p className="text-sm text-muted-foreground mt-1">
          This node has no connections yet
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Central Node */}
      <div className="mb-6 p-4 bg-primary/10 border-2 border-primary rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{nodeTitle}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
        </p>
      </div>

      {/* Connection Groups */}
      {renderConnectionGroup('Outgoing Links', groupedConnections.outgoing, true)}
      {renderConnectionGroup('Incoming Links', groupedConnections.incoming, true)}
      {renderConnectionGroup('Bidirectional', groupedConnections.bidirectional, true)}
    </div>
  );
};

export default NodeConnectionsView;
