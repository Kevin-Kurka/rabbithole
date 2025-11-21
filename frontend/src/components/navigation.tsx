/**
 * Navigation Component
 *
 * Simple navigation bar for navigating between main pages.
 * Displayed at the top of pages outside the graph canvas.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme } from '@/styles/theme';
import { BrainCircuit, BookOpen, Home } from 'lucide-react';
import NotificationBell from './notification-bell';

export const Navigation: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/graph',
      label: 'Graphs',
      icon: <BrainCircuit size={18} />,
    },
    {
      href: '/ledger',
      label: 'Promotion Ledger',
      icon: <BookOpen size={18} />,
    },
  ];

  return (
    <nav
      style={{
        backgroundColor: theme.colors.bg.elevated,
        borderBottom: `1px solid ${theme.colors.border.primary}`,
        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.lg,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            textDecoration: 'none',
            color: theme.colors.text.primary,
            fontSize: '1.125rem',
            fontWeight: 700,
          }}
        >
          <Home size={24} />
          <span>Rabbit Hole</span>
        </Link>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Navigation Items */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.md,
                  backgroundColor: isActive
                    ? theme.colors.button.primary.bg
                    : 'transparent',
                  color: isActive
                    ? theme.colors.button.primary.text
                    : theme.colors.text.secondary,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                className="hover:opacity-80"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Notification Bell */}
          <NotificationBell />
        </div>
      </div>
    </nav>
  );
};
