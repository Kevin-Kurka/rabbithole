/**
 * BottomNavigation Component
 *
 * Fixed bottom navigation bar for mobile with 5 primary actions.
 * iOS and Android style with haptic feedback and active indicators.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Network, Scale, User, LucideIcon } from 'lucide-react';
import { mobileTheme } from '@/styles/mobileTheme';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number; // Notification count
}

export interface BottomNavigationProps {
  items?: NavItem[];
  onItemClick?: (item: NavItem) => void;
  className?: string;
}

const DEFAULT_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    href: '/',
  },
  {
    id: 'search',
    label: 'Search',
    icon: Search,
    href: '/search',
  },
  {
    id: 'graph',
    label: 'Graph',
    icon: Network,
    href: '/graph',
  },
  {
    id: 'challenges',
    label: 'Inquiries',
    icon: Scale,
    href: '/challenges',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    href: '/profile',
  },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items = DEFAULT_ITEMS,
  onItemClick,
  className = '',
}) => {
  const pathname = usePathname();

  const handleClick = (item: NavItem) => {
    // Trigger haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }

    onItemClick?.(item);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-background border-t border-border ${className}`}
      style={{
        height: mobileTheme.layout.bottomNavHeight,
        paddingBottom: mobileTheme.safe.bottom,
        zIndex: mobileTheme.zIndex.fixed,
      }}
      role="navigation"
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-around h-full px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center justify-center relative"
              style={{
                minWidth: mobileTheme.touch.comfortable,
                minHeight: mobileTheme.touch.comfortable,
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Badge */}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="absolute top-1 right-1/2 mr-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                  aria-label={`${item.badge} notifications`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}

              {/* Icon */}
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Active Indicator */}
                {isActive && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs mt-1 transition-colors ${
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
