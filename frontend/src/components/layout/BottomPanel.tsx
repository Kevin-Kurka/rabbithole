"use client";

import React from 'react';
import { Terminal, FileOutput, Bug, ScrollText } from 'lucide-react';
import { theme } from '@/styles/theme';
import ResizeHandle from './ResizeHandle';
import ConsolePanel from '@/components/panels/ConsolePanel';
import OutputPanel from '@/components/panels/OutputPanel';

export type BottomPanelTab = 'console' | 'terminal' | 'output' | 'debug';

export interface BottomPanelProps {
  /** Current height of the panel */
  height: number;
  /** Callback when panel is resized */
  onResize: (newHeight: number) => void;
  /** Active tab */
  activeTab: BottomPanelTab;
  /** Callback when tab is changed */
  onTabChange: (tab: BottomPanelTab) => void;
  /** Minimum height constraint */
  minHeight?: number;
  /** Maximum height constraint */
  maxHeight?: number;
}

const tabs: Array<{
  id: BottomPanelTab;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { id: 'console', label: 'Console', icon: ScrollText },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'output', label: 'Output', icon: FileOutput },
  { id: 'debug', label: 'Debug', icon: Bug },
];

export default function BottomPanel({
  height,
  onResize,
  activeTab,
  onTabChange,
  minHeight = 100,
  maxHeight = Infinity,
}: BottomPanelProps) {
  const handleResize = (delta: number) => {
    // Vertical resize from top edge (moving up increases height, moving down decreases)
    // Delta is positive when moving down, so we subtract to increase height when dragging up
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height - delta));
    if (newHeight !== height) {
      onResize(newHeight);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'console':
        return <ConsolePanel />;

      case 'terminal':
        return (
          <div style={{ padding: theme.spacing.md }}>
            <p style={{
              fontSize: '12px',
              color: theme.colors.text.tertiary,
              fontFamily: theme.fonts.mono
            }}>
              Terminal interface (future feature)
            </p>
          </div>
        );

      case 'output':
        return <OutputPanel />;

      case 'debug':
        return (
          <div style={{ padding: theme.spacing.md }}>
            <p style={{
              fontSize: '12px',
              color: theme.colors.text.tertiary,
              fontFamily: theme.fonts.mono
            }}>
              Debug information will be displayed here (future feature)
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
        width: '100%',
        height: `${height}px`,
        backgroundColor: theme.colors.bg.secondary,
        borderTop: `1px solid ${theme.colors.border.primary}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${theme.colors.border.primary}`,
          backgroundColor: theme.colors.bg.tertiary,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: isActive ? theme.colors.bg.secondary : 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${theme.colors.button.primary.bg}` : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? theme.colors.text.primary : theme.colors.text.tertiary,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: theme.colors.bg.primary,
        }}
      >
        {renderTabContent()}
      </div>

      {/* Resize Handle (top edge) */}
      <ResizeHandle
        direction="vertical"
        edge="top"
        onResize={handleResize}
        minSize={minHeight}
        maxSize={maxHeight}
      />
    </div>
  );
}
