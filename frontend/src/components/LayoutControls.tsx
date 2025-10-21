/**
 * Layout Controls Component
 *
 * Provides UI controls for selecting and applying graph layout algorithms.
 * Displays available layouts with recommendations and configuration options.
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutType,
  LayoutEngine,
  LayoutMetadata,
  LayoutConfig,
} from '@/utils/layouts/LayoutEngine';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';
import { theme } from '@/styles/theme';
import {
  Zap,
  GitBranch,
  Clock,
  Circle,
  Hand,
  Layers,
  ArrowRight,
  TreeDeciduous,
  Rows,
  Target,
  RotateCw,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';

interface LayoutControlsProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  currentLayout: LayoutType;
  onLayoutChange: (config: LayoutConfig) => void;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  hand: Hand,
  zap: Zap,
  layers: Layers,
  'git-branch': GitBranch,
  'arrow-right': ArrowRight,
  'tree-deciduous': TreeDeciduous,
  clock: Clock,
  rows: Rows,
  circle: Circle,
  target: Target,
  'rotate-cw': RotateCw,
};

/**
 * Layout Controls Component
 */
export default function LayoutControls({
  nodes,
  edges,
  currentLayout,
  onLayoutChange,
  className = '',
}: LayoutControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const availableLayouts = useMemo(
    () => LayoutEngine.getAvailableLayouts(nodes, edges),
    [nodes, edges]
  );

  const recommended = availableLayouts.find((l) => l.recommended);

  const categories = useMemo(() => {
    const cats = new Set(availableLayouts.map((l) => l.category));
    return Array.from(cats);
  }, [availableLayouts]);

  const filteredLayouts = useMemo(() => {
    if (!selectedCategory) return availableLayouts;
    return availableLayouts.filter((l) => l.category === selectedCategory);
  }, [availableLayouts, selectedCategory]);

  const handleLayoutSelect = (layoutType: LayoutType) => {
    const layout = availableLayouts.find((l) => l.type === layoutType);

    if (layout?.requiresConfig && !showAdvanced) {
      setShowAdvanced(true);
      return;
    }

    const config: LayoutConfig = {
      type: layoutType,
      animated: true,
      animationDuration: 500,
      options: LayoutEngine.getAutoOptions(layoutType, nodes, edges),
    };

    // Add default parameters for specific layouts
    if (layoutType === LayoutType.FORCE_CLUSTERED) {
      config.clusterKey = 'level';
    } else if (layoutType === LayoutType.SWIMLANE) {
      config.laneKey = 'level';
      config.timeKey = 'createdAt';
    } else if (layoutType === LayoutType.TIMELINE) {
      config.timeKey = 'createdAt';
    }

    onLayoutChange(config);
    setIsExpanded(false);
  };

  const handleAutoLayout = () => {
    if (recommended) {
      handleLayoutSelect(recommended.type);
    }
  };

  const currentLayoutMeta = availableLayouts.find(
    (l) => l.type === currentLayout
  );

  if (!isExpanded) {
    return (
      <div
        className={`fixed bottom-24 right-6 z-50 ${className}`}
        style={{
          backgroundColor: theme.colors.bg.elevated,
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadows.lg,
          border: `1px solid ${theme.colors.border.primary}`,
        }}
      >
        <div className="flex items-center gap-2 p-3">
          {/* Current Layout Indicator */}
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              color: theme.colors.text.primary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.secondary;
            }}
          >
            {currentLayoutMeta && iconMap[currentLayoutMeta.icon] && (
              React.createElement(iconMap[currentLayoutMeta.icon], { size: 16 })
            )}
            <span className="text-sm font-medium">
              {currentLayoutMeta?.name || 'Layout'}
            </span>
            <Settings size={14} style={{ opacity: 0.6 }} />
          </button>

          {/* Auto Layout Button */}
          {recommended && (
            <button
              onClick={handleAutoLayout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: theme.colors.button.primary.bg,
                color: theme.colors.button.primary.text,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme.colors.button.primary.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme.colors.button.primary.bg;
              }}
              title="Apply recommended layout"
            >
              <Sparkles size={16} />
              <span className="text-sm font-medium">Auto</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 ${className}`}
      style={{
        backgroundColor: theme.colors.bg.elevated,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.lg,
        border: `1px solid ${theme.colors.border.primary}`,
        width: '360px',
        maxHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: theme.colors.border.primary }}
      >
        <div>
          <h3
            className="font-semibold text-lg"
            style={{ color: theme.colors.text.primary }}
          >
            Layout Algorithm
          </h3>
          <p
            className="text-xs mt-1"
            style={{ color: theme.colors.text.tertiary }}
          >
            Choose how to arrange {nodes.length} nodes
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded hover:bg-opacity-80 transition-colors"
          style={{ color: theme.colors.text.secondary }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Category Tabs */}
      <div
        className="flex gap-2 p-3 border-b overflow-x-auto"
        style={{ borderColor: theme.colors.border.primary }}
      >
        <button
          onClick={() => setSelectedCategory(null)}
          className="px-3 py-1 rounded-md text-sm transition-colors whitespace-nowrap"
          style={{
            backgroundColor: !selectedCategory
              ? theme.colors.button.primary.bg
              : theme.colors.bg.secondary,
            color: !selectedCategory
              ? theme.colors.button.primary.text
              : theme.colors.text.secondary,
          }}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className="px-3 py-1 rounded-md text-sm transition-colors whitespace-nowrap capitalize"
            style={{
              backgroundColor:
                selectedCategory === category
                  ? theme.colors.button.primary.bg
                  : theme.colors.bg.secondary,
              color:
                selectedCategory === category
                  ? theme.colors.button.primary.text
                  : theme.colors.text.secondary,
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Layout Options */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {filteredLayouts.map((layout) => {
            const Icon = iconMap[layout.icon];
            const isActive = layout.type === currentLayout;
            const isRecommended = layout.recommended;

            return (
              <button
                key={layout.type}
                onClick={() => handleLayoutSelect(layout.type)}
                className="w-full text-left p-3 rounded-lg transition-all relative"
                style={{
                  backgroundColor: isActive
                    ? theme.colors.button.primary.bg + '20'
                    : theme.colors.bg.secondary,
                  border: `2px solid ${
                    isActive
                      ? theme.colors.button.primary.bg
                      : 'transparent'
                  }`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      theme.colors.bg.tertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      theme.colors.bg.secondary;
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {Icon && (
                    <div
                      className="p-2 rounded-md"
                      style={{
                        backgroundColor: isActive
                          ? theme.colors.button.primary.bg
                          : theme.colors.bg.tertiary,
                        color: isActive
                          ? theme.colors.button.primary.text
                          : theme.colors.text.secondary,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium text-sm"
                        style={{ color: theme.colors.text.primary }}
                      >
                        {layout.name}
                      </span>
                      {isRecommended && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: theme.colors.button.primary.bg,
                            color: theme.colors.button.primary.text,
                          }}
                        >
                          Recommended
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs mt-1"
                      style={{ color: theme.colors.text.tertiary }}
                    >
                      {layout.description}
                    </p>
                    {layout.requiresConfig && (
                      <p
                        className="text-xs mt-1 italic"
                        style={{ color: theme.colors.text.tertiary }}
                      >
                        May require additional configuration
                      </p>
                    )}
                  </div>

                  {isActive && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: theme.colors.button.primary.bg,
                      }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        className="p-3 border-t flex justify-between items-center"
        style={{ borderColor: theme.colors.border.primary }}
      >
        <span
          className="text-xs"
          style={{ color: theme.colors.text.tertiary }}
        >
          {filteredLayouts.length} layouts available
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          className="px-4 py-2 rounded-md text-sm transition-colors"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            color: theme.colors.text.primary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.secondary;
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
