/**
 * Navigation Configuration
 *
 * Centralized navigation menu structure for the application.
 * Used across mobile, tablet, and desktop layouts.
 */

import {
  Home,
  Search,
  Network,
  Target,
  Users,
  BookOpen,
  TrendingUp,
  MessageCircle,
  Settings,
  User,
  Bell,
  Star,
  Archive,
  Clock,
  HelpCircle,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { type MenuItem } from '@/contexts/NavigationContext';

/**
 * Primary navigation items (appear in bottom nav on mobile)
 */
export const PRIMARY_NAV_ITEMS: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: Home,
    description: 'Home page with trending nodes',
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: Search,
    description: 'Search the knowledge graph',
  },
  {
    id: 'graph',
    label: 'Graph',
    href: '/graph',
    icon: Network,
    description: 'Interactive graph canvas',
  },
  {
    id: 'inquiries',
    label: 'Inquiries',
    href: '/inquiries',
    icon: Target,
    description: 'Active investigations',
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: User,
    requiresAuth: true,
    description: 'Your profile and settings',
  },
];

/**
 * Explore navigation items (categories)
 */
export const EXPLORE_NAV_ITEMS: MenuItem[] = [
  {
    id: 'explore-articles',
    label: 'Articles',
    href: '/explore/articles',
    icon: FileText,
    description: 'Browse articles',
  },
  {
    id: 'explore-investigations',
    label: 'Investigations',
    href: '/explore/investigations',
    icon: Target,
    description: 'Active investigations',
  },
  {
    id: 'explore-communities',
    label: 'Communities',
    href: '/explore/communities',
    icon: Users,
    description: 'Join communities',
  },
  {
    id: 'explore-discussions',
    label: 'Discussions',
    href: '/explore/discussions',
    icon: MessageCircle,
    description: 'Join discussions',
  },
  {
    id: 'explore-research',
    label: 'Research',
    href: '/explore/research',
    icon: BookOpen,
    description: 'Browse research',
  },
  {
    id: 'explore-trending',
    label: 'Trending',
    href: '/explore/trending',
    icon: TrendingUp,
    description: 'Trending topics',
  },
];

/**
 * User menu items (authenticated users)
 */
export const USER_NAV_ITEMS: MenuItem[] = [
  {
    id: 'activity',
    label: 'Activity',
    href: '/activity',
    icon: Clock,
    description: 'Recent activity',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    href: '/favorites',
    icon: Star,
    description: 'Your starred items',
  },
  {
    id: 'archived',
    label: 'Archived',
    href: '/archived',
    icon: Archive,
    description: 'Archived items',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
    description: 'Your notifications',
  },
];

/**
 * Settings and help items
 */
export const SETTINGS_NAV_ITEMS: MenuItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    requiresAuth: true,
    description: 'Account settings',
  },
  {
    id: 'help',
    label: 'Help & Support',
    href: '/help',
    icon: HelpCircle,
    description: 'Get help',
  },
];

/**
 * Complete menu structure for hamburger menu
 */
export const HAMBURGER_MENU_ITEMS: MenuItem[] = [
  {
    id: 'explore',
    label: 'Explore',
    href: '/explore',
    icon: Search,
    children: EXPLORE_NAV_ITEMS,
    description: 'Explore the knowledge graph',
  },
  {
    id: 'challenges',
    label: 'Challenges',
    href: '/challenges',
    icon: Target,
    description: 'Truth-seeking challenges',
  },
  ...USER_NAV_ITEMS,
  ...SETTINGS_NAV_ITEMS,
];

/**
 * Desktop sidebar navigation (full navigation tree)
 */
export const DESKTOP_NAV_ITEMS: MenuItem[] = [
  ...PRIMARY_NAV_ITEMS,
  {
    id: 'explore',
    label: 'Explore',
    href: '/explore',
    icon: Search,
    children: EXPLORE_NAV_ITEMS,
  },
  ...USER_NAV_ITEMS,
  ...SETTINGS_NAV_ITEMS,
];

/**
 * Tablet navigation (condensed)
 */
export const TABLET_NAV_ITEMS: MenuItem[] = [
  ...PRIMARY_NAV_ITEMS.slice(0, 4), // Home, Search, Graph, Inquiries
  {
    id: 'more',
    label: 'More',
    href: '/more',
    icon: Settings,
    children: [
      ...EXPLORE_NAV_ITEMS,
      ...USER_NAV_ITEMS,
      ...SETTINGS_NAV_ITEMS,
    ],
  },
];

/**
 * Get navigation items for specific device type
 */
export const getNavigationForDevice = (
  device: 'mobile' | 'tablet' | 'desktop'
): MenuItem[] => {
  switch (device) {
    case 'mobile':
      return PRIMARY_NAV_ITEMS;
    case 'tablet':
      return TABLET_NAV_ITEMS;
    case 'desktop':
      return DESKTOP_NAV_ITEMS;
    default:
      return PRIMARY_NAV_ITEMS;
  }
};

/**
 * Get icon for route
 */
export const getIconForRoute = (route: string): LucideIcon | undefined => {
  const allItems = [
    ...PRIMARY_NAV_ITEMS,
    ...EXPLORE_NAV_ITEMS,
    ...USER_NAV_ITEMS,
    ...SETTINGS_NAV_ITEMS,
  ];

  const item = allItems.find(
    item => item.href === route || route.startsWith(item.href + '/')
  );

  return item?.icon;
};

export default {
  PRIMARY_NAV_ITEMS,
  EXPLORE_NAV_ITEMS,
  USER_NAV_ITEMS,
  SETTINGS_NAV_ITEMS,
  HAMBURGER_MENU_ITEMS,
  DESKTOP_NAV_ITEMS,
  TABLET_NAV_ITEMS,
  getNavigationForDevice,
  getIconForRoute,
};
