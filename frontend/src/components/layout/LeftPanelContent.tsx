"use client";

import React from 'react';
import { theme } from '@/styles/theme';
import ResizeHandle from './ResizeHandle';
import { IconNavItem } from './IconNavigationBar';
import GraphListPanel from '@/components/panels/GraphListPanel';
import SearchPanel from '@/components/panels/SearchPanel';
import StructurePanel from '@/components/panels/StructurePanel';

export interface LeftPanelContentProps {
  /** Active navigation item determining content */
  activeItem: IconNavItem;
  /** Current width of the panel */
  width: number;
  /** Callback when panel is resized */
  onResize: (newWidth: number) => void;
  /** Minimum width constraint */
  minWidth?: number;
  /** Maximum width constraint */
  maxWidth?: number;
  /** Active graphs for GraphListPanel */
  activeGraphs?: string[];
  /** Toggle graph callback for GraphListPanel */
  onToggleGraph?: (graphId: string) => void;
}

export default function LeftPanelContent({
  activeItem,
  width,
  onResize,
  minWidth = 100,
  maxWidth = Infinity,
  activeGraphs = [],
  onToggleGraph = () => {},
}: LeftPanelContentProps) {
  const handleResize = (delta: number) => {
    const newWidth = Math.max(minWidth, Math.min(maxWidth, width + delta));
    if (newWidth !== width) {
      onResize(newWidth);
    }
  };

  // Placeholder content for each view
  const renderContent = () => {
    switch (activeItem) {
      case 'graphs':
        return (
          <GraphListPanel
            activeGraphs={activeGraphs}
            onToggleGraph={onToggleGraph}
          />
        );

      case 'search':
        return <SearchPanel />;

      case 'structure':
        return <StructurePanel graphId={activeGraphs[0]} />;

      case 'extensions':
        return (
          <div style={{ padding: theme.spacing.md }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md
            }}>
              Extensions
            </h3>
            <p style={{
              fontSize: '12px',
              color: theme.colors.text.tertiary
            }}>
              AI Assistant and plugins will be displayed here
            </p>
          </div>
        );

      case 'settings':
        return (
          <div style={{ padding: theme.spacing.md }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md
            }}>
              Settings
            </h3>
            <p style={{
              fontSize: '12px',
              color: theme.colors.text.tertiary
            }}>
              User preferences will be displayed here (SettingsPanel)
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: '100%',
        backgroundColor: theme.colors.bg.secondary,
        borderRight: `1px solid ${theme.colors.border.primary}`,
        overflow: 'auto',
        transition: 'opacity 0.3s',
      }}
    >
      {renderContent()}

      {/* Resize Handle */}
      <ResizeHandle
        direction="horizontal"
        onResize={handleResize}
        minSize={minWidth}
        maxSize={maxWidth}
      />
    </div>
  );
}
