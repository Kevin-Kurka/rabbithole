/**
 * AppShell Component
 *
 * Root application shell with adaptive navigation.
 * Wraps the entire app with navigation context and renders
 * device-appropriate navigation components.
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { AdaptiveNavigation } from './AdaptiveNavigation';
import { useResponsive } from '@/hooks/useResponsive';

export interface AppShellProps {
  children: React.ReactNode;
  /** Whether to show navigation on this page */
  showNavigation?: boolean;
  /** Whether to show bottom navigation on mobile */
  showBottomNav?: boolean;
  /** Whether to show header on mobile */
  showHeader?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  showNavigation = true,
  showBottomNav = true,
  showHeader = true,
}) => {
  const { data: session } = useSession();
  const { isDesktop } = useResponsive();

  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <NavigationProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Navigation */}
        <AdaptiveNavigation
          user={session?.user}
          showBottomNav={showBottomNav}
          showHeader={showHeader}
        />

        {/* Main Content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            marginLeft: isDesktop ? '280px' : '0',
          }}
        >
          {children}
        </main>
      </div>
    </NavigationProvider>
  );
};

export default AppShell;
