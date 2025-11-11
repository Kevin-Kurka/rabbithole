/**
 * DesktopSidebar Component
 *
 * Full-featured sidebar navigation for desktop.
 * Supports collapsible state, nested menus, and badges.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Bell,
  Plus,
  Search,
} from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';
import { type MenuItem } from '@/contexts/NavigationContext';

export interface DesktopSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  items: MenuItem[];
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  user,
  items,
  isCollapsed: controlledCollapsed,
  onCollapsedChange,
}) => {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggleCollapse = () => {
    const newValue = !isCollapsed;
    setInternalCollapsed(newValue);
    onCollapsedChange?.(newValue);
  };

  const handleToggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isExpanded = (itemId: string) => {
    return expandedItems.includes(itemId);
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const expanded = isExpanded(item.id);

    return (
      <div key={item.id}>
        {/* Menu Item */}
        {hasChildren ? (
          <button
            onClick={() => handleToggleExpanded(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            style={{ paddingLeft: `${12 + level * 16}px` }}
            title={isCollapsed ? item.label : undefined}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              {!isCollapsed && (
                <span className="font-medium truncate">{item.label}</span>
              )}
            </div>
            {!isCollapsed && (
              <ChevronRight
                className={`w-4 h-4 flex-shrink-0 transition-transform ${
                  expanded ? 'rotate-90' : ''
                }`}
              />
            )}
          </button>
        ) : (
          <Link
            href={item.href}
            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            style={{ paddingLeft: `${12 + level * 16}px` }}
            title={isCollapsed ? item.label : undefined}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              {!isCollapsed && (
                <span className="font-medium truncate">{item.label}</span>
              )}
            </div>
            {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full flex-shrink-0">
                {item.badge}
              </span>
            )}
          </Link>
        )}

        {/* Nested Children */}
        {hasChildren && expanded && !isCollapsed && (
          <div className="mt-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 bg-background border-r border-border flex flex-col transition-all duration-200"
      style={{
        width: isCollapsed ? '64px' : '280px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        {!isCollapsed ? (
          <>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground text-sm">RH</span>
              </div>
              <span>Rabbit Hole</span>
            </Link>
            <button
              onClick={handleToggleCollapse}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            onClick={handleToggleCollapse}
            className="w-full flex items-center justify-center"
            aria-label="Expand sidebar"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground text-sm">RH</span>
            </div>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-border">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title={isCollapsed ? 'Search' : undefined}
        >
          <Search className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Search</span>}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          {items.map(item => renderMenuItem(item))}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-border px-3 py-3">
        {/* Create Button */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium mb-2"
          title={isCollapsed ? 'Create' : undefined}
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Create Node</span>}
        </button>

        {/* Notifications */}
        {user && (
          <button
            className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors mb-2 relative"
            title={isCollapsed ? 'Notifications' : undefined}
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Notifications</span>}
            <span className="absolute top-2 left-8 w-2 h-2 bg-destructive rounded-full" />
          </button>
        )}

        {/* User Profile */}
        <Link
          href={user ? '/profile' : '/login'}
          className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title={isCollapsed ? (user?.name || 'Profile') : undefined}
        >
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || 'User'}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
          )}
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate">
                {user?.name || 'Sign In'}
              </div>
              {user?.email && (
                <div className="text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
              )}
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
