/**
 * AdaptiveNavigation Component
 *
 * Intelligent navigation wrapper that renders the appropriate navigation
 * components based on device type (mobile/tablet/desktop).
 */

'use client';

import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { useNavigation } from '@/contexts/NavigationContext';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { HamburgerMenu } from '@/components/mobile/HamburgerMenu';
import { BottomNavigation } from '@/components/mobile/BottomNavigation';
import { TabletNavigation } from './TabletNavigation';
import { DesktopSidebar } from './DesktopSidebar';
import {
  PRIMARY_NAV_ITEMS,
  HAMBURGER_MENU_ITEMS,
  TABLET_NAV_ITEMS,
  DESKTOP_NAV_ITEMS,
} from '@/config/navigation';

export interface AdaptiveNavigationProps {
  /** User session data */
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  /** Whether to show bottom navigation on mobile */
  showBottomNav?: boolean;
  /** Whether to show header on mobile */
  showHeader?: boolean;
  /** Children content */
  children?: React.ReactNode;
}

export const AdaptiveNavigation: React.FC<AdaptiveNavigationProps> = ({
  user,
  showBottomNav = true,
  showHeader = true,
  children,
}) => {
  const { device, isMobile, isTablet, isDesktop } = useResponsive();
  const navigation = useNavigation();

  // Filter menu items based on authentication
  const filterMenuItems = (items: any[]) => {
    return items.filter(item => {
      if (item.requiresAuth && !user) {
        return false;
      }
      return true;
    });
  };

  // Mobile Layout (0-767px)
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        {showHeader && (
          <MobileHeader
            user={user}
            onMenuToggle={navigation.toggleMobileMenu}
            isMenuOpen={navigation.isMobileMenuOpen}
          />
        )}

        {/* Hamburger Menu */}
        <HamburgerMenu
          isOpen={navigation.isMobileMenuOpen}
          onClose={navigation.closeMobileMenu}
          items={filterMenuItems(HAMBURGER_MENU_ITEMS)}
          user={user}
        />

        {/* Main Content */}
        {children}

        {/* Bottom Navigation */}
        {showBottomNav && (
          <BottomNavigation
            items={filterMenuItems(PRIMARY_NAV_ITEMS).map(item => ({
              id: item.id,
              label: item.label,
              href: item.href,
              icon: item.icon!,
              badge: item.badge,
            }))}
          />
        )}
      </>
    );
  }

  // Tablet Layout (768-1023px)
  if (isTablet) {
    return (
      <>
        {/* Tablet Navigation (top bar + side rail) */}
        <TabletNavigation
          user={user}
          items={filterMenuItems(TABLET_NAV_ITEMS)}
          onMenuToggle={navigation.toggleMobileMenu}
        />

        {/* Hamburger Menu (for overflow items) */}
        <HamburgerMenu
          isOpen={navigation.isMobileMenuOpen}
          onClose={navigation.closeMobileMenu}
          items={filterMenuItems(HAMBURGER_MENU_ITEMS)}
          user={user}
        />

        {/* Main Content */}
        {children}
      </>
    );
  }

  // Desktop Layout (1024px+)
  if (isDesktop) {
    return (
      <>
        {/* Desktop Sidebar */}
        <DesktopSidebar
          user={user}
          items={filterMenuItems(DESKTOP_NAV_ITEMS)}
          isCollapsed={false}
        />

        {/* Main Content */}
        {children}
      </>
    );
  }

  // Fallback (should never reach here)
  return <>{children}</>;
};

export default AdaptiveNavigation;
