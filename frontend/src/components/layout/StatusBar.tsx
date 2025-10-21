"use client";

import React from 'react';
import { Wifi, WifiOff, Zap, ZapOff, Layout } from 'lucide-react';
import { theme } from '@/styles/theme';

export interface StatusBarProps {
  /** Current active graph name */
  graphName?: string;
  /** Number of nodes in current graph */
  nodeCount?: number;
  /** Number of edges in current graph */
  edgeCount?: number;
  /** Connection status */
  isConnected?: boolean;
  /** AI assistant status */
  aiActive?: boolean;
  /** Current layout algorithm */
  layoutAlgorithm?: string;
  /** Current zoom level */
  zoomLevel?: number;
}

export default function StatusBar({
  graphName,
  nodeCount = 0,
  edgeCount = 0,
  isConnected = false,
  aiActive = false,
  layoutAlgorithm = 'Force',
  zoomLevel = 100,
}: StatusBarProps) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        height: '24px',
        backgroundColor: theme.colors.bg.tertiary,
        borderTop: `1px solid ${theme.colors.border.primary}`,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${theme.spacing.sm}`,
        fontSize: '11px',
        color: theme.colors.text.tertiary,
        zIndex: 100,
      }}
    >
      {/* Left Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
        {/* Active Graph */}
        {graphName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingRight: theme.spacing.sm,
              borderRight: `1px solid ${theme.colors.border.primary}`,
            }}
          >
            <span style={{ color: theme.colors.text.secondary, fontWeight: 500 }}>
              {graphName}
            </span>
          </div>
        )}

        {/* Node/Edge Count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingRight: theme.spacing.sm,
            borderRight: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          <span>
            {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
          </span>
          <span>•</span>
          <span>
            {edgeCount} {edgeCount === 1 ? 'edge' : 'edges'}
          </span>
        </div>

        {/* Connection Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            color: isConnected ? '#10b981' : '#ef4444',
          }}
          title={isConnected ? 'Connected' : 'Disconnected'}
        >
          {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Center/Right Section */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}
      >
        {/* AI Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            color: aiActive ? '#8b5cf6' : theme.colors.text.tertiary,
            paddingLeft: theme.spacing.sm,
            borderLeft: `1px solid ${theme.colors.border.primary}`,
          }}
          title={aiActive ? 'AI Assistant Active' : 'AI Assistant Inactive'}
        >
          {aiActive ? <Zap size={12} /> : <ZapOff size={12} />}
          <span>AI</span>
        </div>

        {/* Layout Algorithm */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingLeft: theme.spacing.sm,
            borderLeft: `1px solid ${theme.colors.border.primary}`,
          }}
          title={`Layout: ${layoutAlgorithm}`}
        >
          <Layout size={12} />
          <span>{layoutAlgorithm}</span>
        </div>

        {/* Zoom Level */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingLeft: theme.spacing.sm,
            borderLeft: `1px solid ${theme.colors.border.primary}`,
          }}
          title={`Zoom: ${zoomLevel}%`}
        >
          <span>{zoomLevel}%</span>
        </div>
      </div>
    </div>
  );
}
