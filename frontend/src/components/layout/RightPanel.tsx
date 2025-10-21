"use client";

import React, { useState } from 'react';
import { FileText, Users, MessageSquare, History } from 'lucide-react';
import { theme } from '@/styles/theme';
import ResizeHandle from './ResizeHandle';
import PropertiesPanel from '@/components/panels/PropertiesPanel';

export type RightPanelTab = 'properties' | 'collaboration' | 'ai-chat' | 'history';

export interface RightPanelProps {
  /** Current width of the panel */
  width: number;
  /** Callback when panel is resized */
  onResize: (newWidth: number) => void;
  /** Active tab */
  activeTab: RightPanelTab;
  /** Callback when tab is changed */
  onTabChange: (tab: RightPanelTab) => void;
  /** Minimum width constraint */
  minWidth?: number;
  /** Maximum width constraint */
  maxWidth?: number;
  /** Selected node for properties panel */
  selectedNode?: any;
  /** Selected edge for properties panel */
  selectedEdge?: any;
}

const tabs: Array<{
  id: RightPanelTab;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { id: 'properties', label: 'Properties', icon: FileText },
  { id: 'collaboration', label: 'Collaboration', icon: Users },
  { id: 'ai-chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'history', label: 'History', icon: History },
];

export default function RightPanel({
  width,
  onResize,
  activeTab,
  onTabChange,
  minWidth = 100,
  maxWidth = Infinity,
  selectedNode,
  selectedEdge,
}: RightPanelProps) {
  const handleResize = (delta: number) => {
    // Horizontal resize from left edge (moving left increases width, moving right decreases)
    // Delta is positive when moving right, so we subtract to increase width when dragging left
    const newWidth = Math.max(minWidth, Math.min(maxWidth, width - delta));
    if (newWidth !== width) {
      onResize(newWidth);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'properties':
        return <PropertiesPanel selectedNode={selectedNode} selectedEdge={selectedEdge} />;

      case 'collaboration':
        return (
          <div style={{ padding: theme.spacing.md }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md
            }}>
              Collaboration
            </h3>
            <p style={{
              fontSize: '12px',
              color: theme.colors.text.tertiary
            }}>
              Collaboration features will be displayed here (refactored CollaborationPanel)
            </p>
          </div>
        );

      case 'ai-chat':
        return (
          <div style={{ padding: theme.spacing.md }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md
            }}>
              AI Chat
            </h3>
            <p style={{
              fontSize: '12px',
              color: theme.colors.text.tertiary
            }}>
              AI Assistant chat will be displayed here (refactored AIAssistantPanel)
            </p>
          </div>
        );

      case 'history':
        return (
          <div style={{ padding: theme.spacing.md }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md
            }}>
              History
            </h3>
            <p style={{
              fontSize: '12px',
              color: theme.colors.text.tertiary
            }}>
              Recent changes timeline will be displayed here
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
        borderLeft: `1px solid ${theme.colors.border.primary}`,
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
                flex: 1,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: isActive ? theme.colors.bg.secondary : 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${theme.colors.button.primary.bg}` : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
        }}
      >
        {renderTabContent()}
      </div>

      {/* Resize Handle (left edge) */}
      <ResizeHandle
        direction="horizontal"
        edge="left"
        onResize={handleResize}
        minSize={minWidth}
        maxSize={maxWidth}
      />
    </div>
  );
}
