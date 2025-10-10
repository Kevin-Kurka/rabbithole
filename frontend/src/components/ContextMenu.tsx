/**
 * ContextMenu Component
 *
 * Context menu for graph canvas operations:
 * - Node operations (edit, delete, duplicate, etc.)
 * - Edge operations (edit, delete)
 * - Canvas operations (paste, create node)
 */

import React, { useEffect, useRef } from 'react';
import {
  Edit2,
  Trash2,
  Copy,
  Clipboard,
  Lock,
  Unlock,
  Info,
  GitBranch,
  type LucideIcon,
} from 'lucide-react';
import { ContextMenuItem, ContextMenuState } from '@/types/graph';
import { theme } from '@/styles/theme';

interface ContextMenuProps {
  state: ContextMenuState;
  items: ContextMenuItem[];
  onItemClick: (itemId: string) => void;
  onClose: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  edit: Edit2,
  delete: Trash2,
  duplicate: GitBranch,
  copy: Copy,
  paste: Clipboard,
  lock: Lock,
  unlock: Unlock,
  view_details: Info,
};

/**
 * ContextMenu component
 */
export default function ContextMenu({
  state,
  items,
  onItemClick,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (state.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [state.visible, onClose]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (state.visible) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [state.visible, onClose]);

  if (!state.visible) return null;

  const handleItemClick = (itemId: string, disabled?: boolean) => {
    if (!disabled) {
      onItemClick(itemId);
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${state.x}px`,
        top: `${state.y}px`,
        backgroundColor: theme.colors.overlay.modal,
        border: `1px solid ${theme.colors.border.primary}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.xs,
        minWidth: '180px',
        boxShadow: theme.shadows.lg,
        zIndex: 1000,
      }}
      className="context-menu"
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`separator-${index}`}
              style={{
                height: '1px',
                backgroundColor: theme.colors.border.primary,
                margin: `${theme.spacing.xs} 0`,
              }}
            />
          );
        }

        const Icon = item.icon ? iconMap[item.icon] : null;

        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id, item.disabled)}
            disabled={item.disabled}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: theme.radius.sm,
              color: item.disabled
                ? theme.colors.text.disabled
                : theme.colors.text.primary,
              fontSize: '14px',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              {Icon && <Icon size={16} />}
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span
                style={{
                  fontSize: '12px',
                  color: theme.colors.text.tertiary,
                  marginLeft: theme.spacing.md,
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
