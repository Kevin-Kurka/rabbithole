/**
 * MobileLayout Component
 *
 * Base layout wrapper for mobile pages.
 * Handles safe areas, bottom navigation spacing, and scroll management.
 */

'use client';

import React from 'react';
import { mobileTheme } from '@/styles/mobileTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { BottomNavigation, type NavItem } from './BottomNavigation';

export interface MobileLayoutProps {
  children: React.ReactNode;
  /** Whether to show bottom navigation */
  showBottomNav?: boolean;
  /** Whether to show pull-to-refresh */
  showPullToRefresh?: boolean;
  /** Custom bottom nav items */
  navItems?: NavItem[];
  /** Callback when refresh is triggered */
  onRefresh?: () => Promise<void>;
  /** Custom class name */
  className?: string;
  /** Whether to add bottom padding for bottom nav */
  paddingBottom?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showBottomNav = true,
  navItems,
  className = '',
  paddingBottom = true,
}) => {
  const { safeArea } = useResponsive();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Main Content Area */}
      <main
        className={`flex-1 overflow-y-auto ${className}`}
        style={{
          paddingTop: safeArea.top || '0px',
          paddingBottom: paddingBottom && showBottomNav
            ? `calc(${mobileTheme.layout.bottomNavHeight} + ${safeArea.bottom || '0px'})`
            : safeArea.bottom || '0px',
        }}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && <BottomNavigation items={navItems} />}
    </div>
  );
};

export default MobileLayout;
