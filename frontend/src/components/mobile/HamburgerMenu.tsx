/**
 * HamburgerMenu Component
 *
 * Slide-in drawer menu for mobile navigation.
 * Accessible with swipe gestures and keyboard navigation.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  Network,
  Scale,
  User,
  Settings,
  HelpCircle,
  X,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import { useGestures } from '@/hooks/useGestures';
import { mobileTheme } from '@/styles/mobileTheme';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  children?: MenuItem[];
}

export interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: MenuItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  className?: string;
}

const DEFAULT_ITEMS: MenuItem[] = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'search', label: 'Search', icon: Search, href: '/search' },
  { id: 'graph', label: 'Graph', icon: Network, href: '/graph' },
  {
    id: 'explore',
    label: 'Explore',
    icon: Network,
    href: '/explore',
    children: [
      { id: 'investigations', label: 'Investigations', icon: Search, href: '/explore/investigations' },
      { id: 'evidence', label: 'Evidence', icon: Search, href: '/explore/evidence' },
      { id: 'people', label: 'People', icon: User, href: '/explore/people' },
      { id: 'documents', label: 'Documents', icon: Search, href: '/explore/documents' },
    ],
  },
  { id: 'my-graphs', label: 'My Graphs', icon: Network, href: '/my-graphs' },
  {
    id: 'challenges',
    label: 'Challenges',
    icon: Scale,
    href: '/challenges',
    children: [
      { id: 'open-inquiries', label: 'Open Inquiries', icon: Scale, href: '/challenges/open' },
      { id: 'my-challenges', label: 'My Challenges', icon: Scale, href: '/challenges/mine' },
      { id: 'voting-queue', label: 'Voting Queue', icon: Scale, href: '/challenges/voting' },
    ],
  },
  { id: 'activity', label: 'Activity', icon: Home, href: '/activity' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  { id: 'help', label: 'Help', icon: HelpCircle, href: '/help' },
];

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  items = DEFAULT_ITEMS,
  user,
  className = '',
}) => {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  // Swipe to close
  useGestures(menuRef, {
    onSwipeLeft: onClose,
  });

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Toggle expanded item
  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Render menu item
  const renderItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
              isActive ? 'bg-muted text-primary' : 'text-foreground'
            }`}
            style={{ paddingLeft: `${16 + level * 16}px` }}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${
              isActive ? 'bg-muted text-primary' : 'text-foreground'
            }`}
            style={{ paddingLeft: `${16 + level * 16}px` }}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        )}

        {/* Child items */}
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (typeof window === 'undefined') {
    return null;
  }

  const content = (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          style={{ zIndex: mobileTheme.zIndex.modalBackdrop }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        ref={menuRef}
        className={`fixed top-0 left-0 h-full bg-background border-r border-border shadow-2xl transition-transform ${className}`}
        style={{
          width: mobileTheme.layout.sidebarWidth,
          zIndex: mobileTheme.zIndex.modal,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transitionDuration: mobileTheme.animation.normal,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {user && (
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((item) => renderItem(item))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          <p>Rabbit Hole v1.0.0</p>
          <p className="mt-1">© 2025 All rights reserved</p>
        </div>
      </aside>
    </>
  );

  return createPortal(content, document.body);
};

export default HamburgerMenu;
