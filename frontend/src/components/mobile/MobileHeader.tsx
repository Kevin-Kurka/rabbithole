/**
 * MobileHeader Component
 *
 * Fixed header for mobile with hamburger menu, logo, and user actions.
 * Includes safe area insets for iOS notch.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, User, Bell } from 'lucide-react';
import HamburgerMenu from './HamburgerMenu';
import { mobileTheme } from '@/styles/mobileTheme';

export interface MobileHeaderProps {
  logo?: React.ReactNode;
  title?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onUserClick?: () => void;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  logo,
  title = 'Rabbit Hole',
  user,
  showNotifications = false,
  notificationCount = 0,
  onNotificationClick,
  onUserClick,
  className = '',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 bg-background border-b border-border ${className}`}
        style={{
          height: mobileTheme.layout.headerHeight,
          paddingTop: mobileTheme.safe.top,
          zIndex: mobileTheme.zIndex.fixed,
        }}
      >
        <div className="flex items-center justify-between h-full px-4">
          {/* Left: Hamburger Menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            style={{
              minWidth: mobileTheme.touch.comfortable,
              minHeight: mobileTheme.touch.comfortable,
            }}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Center: Logo / Title */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            {logo || title}
          </Link>

          {/* Right: Notifications + User */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            {showNotifications && (
              <button
                onClick={onNotificationClick}
                className="relative p-2 hover:bg-muted rounded-full transition-colors"
                style={{
                  minWidth: mobileTheme.touch.comfortable,
                  minHeight: mobileTheme.touch.comfortable,
                }}
                aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            )}

            {/* User Avatar */}
            <button
              onClick={onUserClick}
              className="p-0.5 hover:opacity-80 rounded-full transition-opacity"
              style={{
                minWidth: mobileTheme.touch.comfortable,
                minHeight: mobileTheme.touch.comfortable,
              }}
              aria-label="User menu"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger Menu */}
      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} />

      {/* Spacer to prevent content from hiding under fixed header */}
      <div
        style={{
          height: mobileTheme.layout.headerHeightSafe,
        }}
        aria-hidden="true"
      />
    </>
  );
};

export default MobileHeader;
