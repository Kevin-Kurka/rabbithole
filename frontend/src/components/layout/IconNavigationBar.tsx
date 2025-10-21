"use client";

import React from 'react';
import { BrainCircuit, Search, List, Puzzle, Settings, LucideIcon } from 'lucide-react';
import { theme } from '@/styles/theme';

export type IconNavItem = 'graphs' | 'search' | 'structure' | 'extensions' | 'settings';

export interface IconNavigationBarProps {
  /** Currently active navigation item */
  activeItem: IconNavItem;
  /** Callback when navigation item is clicked */
  onItemClick: (item: IconNavItem) => void;
}

interface NavItem {
  id: IconNavItem;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'graphs', icon: BrainCircuit, label: 'Graphs', shortcut: '⇧⌘G' },
  { id: 'search', icon: Search, label: 'Search', shortcut: '⇧⌘F' },
  { id: 'structure', icon: List, label: 'Structure', shortcut: '⇧⌘O' },
  { id: 'extensions', icon: Puzzle, label: 'Extensions', shortcut: '⇧⌘X' },
  { id: 'settings', icon: Settings, label: 'Settings', shortcut: '⌘,' },
];

export default function IconNavigationBar({
  activeItem,
  onItemClick,
}: IconNavigationBarProps) {
  return (
    <div
      style={{
        width: '48px',
        height: '100%',
        backgroundColor: theme.colors.bg.tertiary,
        borderRight: `1px solid ${theme.colors.border.primary}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: theme.spacing.sm,
        gap: '2px',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeItem === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ''}`}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? theme.colors.bg.elevated : 'transparent',
              border: 'none',
              borderLeft: isActive ? `2px solid ${theme.colors.button.primary.text}` : '2px solid transparent',
              borderRadius: 0,
              cursor: 'pointer',
              color: isActive ? theme.colors.text.primary : theme.colors.text.tertiary,
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
                e.currentTarget.style.color = theme.colors.text.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.text.tertiary;
              }
            }}
          >
            <Icon size={20} />
          </button>
        );
      })}

      {/* Spacer to push settings to bottom */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
