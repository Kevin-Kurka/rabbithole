/**
 * TabletNavigation Component
 *
 * Hybrid navigation for tablets: top bar with primary actions + side rail.
 * Combines desktop and mobile patterns for optimal tablet UX.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, Bell, User, Plus } from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';
import { type MenuItem } from '@/contexts/NavigationContext';

export interface TabletNavigationProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  items: MenuItem[];
  onMenuToggle: () => void;
  onSearch?: () => void;
}

export const TabletNavigation: React.FC<TabletNavigationProps> = ({
  user,
  items,
  onMenuToggle,
  onSearch,
}) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Top Bar */}
      <header
        className="fixed top-0 left-0 right-0 z-30 bg-background border-b border-border"
        style={{
          height: '64px',
          paddingTop: mobileTheme.safe.top,
        }}
      >
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left: Logo + Primary Nav */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground text-sm">RH</span>
              </div>
              <span className="hidden lg:inline">Rabbit Hole</span>
            </Link>

            {/* Primary Navigation */}
            <nav className="flex items-center gap-2">
              {items.slice(0, 4).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    title={item.description}
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                    <span className="font-medium">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <button
              onClick={onSearch}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Create Button */}
            <button
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              aria-label="Create"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden lg:inline">Create</span>
            </button>

            {/* Notifications */}
            {user && (
              <button
                className="relative w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </button>
            )}

            {/* Profile / Menu */}
            <button
              onClick={onMenuToggle}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors"
              aria-label={user ? 'Profile menu' : 'Menu'}
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              {user && (
                <span className="hidden xl:inline text-sm font-medium text-foreground">
                  {user.name?.split(' ')[0]}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div style={{ height: '64px' }} />
    </>
  );
};

export default TabletNavigation;
