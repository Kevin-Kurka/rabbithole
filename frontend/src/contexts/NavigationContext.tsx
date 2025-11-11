/**
 * NavigationContext
 *
 * Global navigation state management for adaptive navigation.
 * Manages active routes, menu state, and navigation history.
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: MenuItem[];
  requiresAuth?: boolean;
  description?: string;
}

export interface NavigationState {
  /** Currently active route */
  activeRoute: string;
  /** Is mobile menu open */
  isMobileMenuOpen: boolean;
  /** Is search open */
  isSearchOpen: boolean;
  /** Navigation history stack */
  history: string[];
  /** Breadcrumb items */
  breadcrumbs: { label: string; href: string }[];
}

export interface NavigationContextValue extends NavigationState {
  /** Open mobile menu */
  openMobileMenu: () => void;
  /** Close mobile menu */
  closeMobileMenu: () => void;
  /** Toggle mobile menu */
  toggleMobileMenu: () => void;
  /** Open search */
  openSearch: () => void;
  /** Close search */
  closeSearch: () => void;
  /** Toggle search */
  toggleSearch: () => void;
  /** Update breadcrumbs */
  updateBreadcrumbs: (breadcrumbs: { label: string; href: string }[]) => void;
  /** Navigate back */
  goBack: () => void;
  /** Check if route is active */
  isRouteActive: (href: string) => boolean;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const pathname = usePathname();

  const [state, setState] = useState<NavigationState>({
    activeRoute: pathname || '/',
    isMobileMenuOpen: false,
    isSearchOpen: false,
    history: [pathname || '/'],
    breadcrumbs: [],
  });

  // Update active route when pathname changes
  React.useEffect(() => {
    setState(prev => ({
      ...prev,
      activeRoute: pathname || '/',
      history: [...prev.history, pathname || '/'].slice(-10), // Keep last 10
    }));
  }, [pathname]);

  const openMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, isMobileMenuOpen: true }));
  }, []);

  const closeMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, isMobileMenuOpen: false }));
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, isMobileMenuOpen: !prev.isMobileMenuOpen }));
  }, []);

  const openSearch = useCallback(() => {
    setState(prev => ({ ...prev, isSearchOpen: true }));
  }, []);

  const closeSearch = useCallback(() => {
    setState(prev => ({ ...prev, isSearchOpen: false }));
  }, []);

  const toggleSearch = useCallback(() => {
    setState(prev => ({ ...prev, isSearchOpen: !prev.isSearchOpen }));
  }, []);

  const updateBreadcrumbs = useCallback((breadcrumbs: { label: string; href: string }[]) => {
    setState(prev => ({ ...prev, breadcrumbs }));
  }, []);

  const goBack = useCallback(() => {
    if (state.history.length > 1) {
      window.history.back();
    }
  }, [state.history]);

  const isRouteActive = useCallback((href: string) => {
    return state.activeRoute === href || state.activeRoute.startsWith(href + '/');
  }, [state.activeRoute]);

  const value: NavigationContextValue = {
    ...state,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu,
    openSearch,
    closeSearch,
    toggleSearch,
    updateBreadcrumbs,
    goBack,
    isRouteActive,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationProvider;
