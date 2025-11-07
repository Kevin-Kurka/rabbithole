"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  PanelLeft,
  PanelRight,
  PanelBottom,
  User,
  Settings,
  LogOut,
  BrainCircuit
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { theme } from '@/styles/theme';

export interface MainMenuProps {
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleBottomPanel: () => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  onSearch?: (query: string) => void;
  onLoginClick?: () => void;
}

export default function MainMenu({
  onToggleLeftPanel,
  onToggleRightPanel,
  onToggleBottomPanel,
  leftPanelOpen,
  rightPanelOpen,
  bottomPanelOpen,
  onSearch,
  onLoginClick,
}: MainMenuProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl+P for search focus
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault();
      const searchInput = document.querySelector<HTMLInputElement>('[data-main-search]');
      searchInput?.focus();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown as any);
    return () => document.removeEventListener('keydown', handleKeyDown as any);
  }, []);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: '40px',
        backgroundColor: theme.colors.bg.tertiary,
        borderBottom: `1px solid ${theme.colors.border.primary}`,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${theme.spacing.md}`,
        gap: theme.spacing.md,
        zIndex: 100,
      }}
    >
      {/* Logo & Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          cursor: 'pointer',
        }}
        onClick={() => router.push('/graph')}
      >
        <BrainCircuit size={20} style={{ color: theme.colors.button.primary.text }} />
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: theme.colors.text.primary,
            whiteSpace: 'nowrap',
            fontFamily: theme.fontFamily.sans,
          }}
        >
          Rabbit Hole
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search Bar - Centered */}
      <form
        onSubmit={handleSearch}
        style={{
          width: '600px',
          maxWidth: '600px',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          backgroundColor: theme.colors.input.bg,
          border: `1px solid ${theme.colors.input.border}`,
          borderRadius: theme.radius.md,
          padding: '4px 8px',
        }}
      >
        <Search size={14} style={{ color: theme.colors.text.tertiary }} />
        <input
          data-main-search
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search graphs, nodes... (⌘P)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: theme.colors.text.primary,
            fontSize: '13px',
            fontFamily: theme.fontFamily.sans,
          }}
        />
      </form>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Panel Toggle Icons - Right Side */}
      <div style={{ display: 'flex', gap: theme.spacing.xs }}>
        <button
          onClick={onToggleLeftPanel}
          title="Toggle Left Panel (⌘B)"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: leftPanelOpen ? theme.colors.bg.elevated : 'transparent',
            border: 'none',
            borderRadius: theme.radius.sm,
            cursor: 'pointer',
            color: leftPanelOpen ? theme.colors.text.primary : theme.colors.text.tertiary,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!leftPanelOpen) {
              e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }
          }}
          onMouseLeave={(e) => {
            if (!leftPanelOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <PanelLeft size={16} />
        </button>

        <button
          onClick={onToggleRightPanel}
          title="Toggle Right Panel (⌘K)"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: rightPanelOpen ? theme.colors.bg.elevated : 'transparent',
            border: 'none',
            borderRadius: theme.radius.sm,
            cursor: 'pointer',
            color: rightPanelOpen ? theme.colors.text.primary : theme.colors.text.tertiary,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!rightPanelOpen) {
              e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }
          }}
          onMouseLeave={(e) => {
            if (!rightPanelOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <PanelRight size={16} />
        </button>

        <button
          onClick={onToggleBottomPanel}
          title="Toggle Bottom Panel (⌘J)"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: bottomPanelOpen ? theme.colors.bg.elevated : 'transparent',
            border: 'none',
            borderRadius: theme.radius.sm,
            cursor: 'pointer',
            color: bottomPanelOpen ? theme.colors.text.primary : theme.colors.text.tertiary,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!bottomPanelOpen) {
              e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }
          }}
          onMouseLeave={(e) => {
            if (!bottomPanelOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <PanelBottom size={16} />
        </button>
      </div>

      {/* User Menu */}
      <div style={{ position: 'relative' }} ref={userMenuRef}>
        <button
          onClick={() => {
            if (!session && onLoginClick) {
              onLoginClick();
            } else {
              setShowUserMenu(!showUserMenu);
            }
          }}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showUserMenu ? theme.colors.bg.elevated : 'transparent',
            border: 'none',
            borderRadius: theme.radius.sm,
            cursor: 'pointer',
            color: theme.colors.text.tertiary,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!showUserMenu) {
              e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }
          }}
          onMouseLeave={(e) => {
            if (!showUserMenu) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <User size={16} />
        </button>

        {/* User Dropdown */}
        {showUserMenu && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '200px',
              backgroundColor: theme.colors.bg.elevated,
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: theme.radius.md,
              boxShadow: theme.shadows.lg,
              padding: theme.spacing.sm,
              zIndex: 1000,
            }}
          >
            {session?.user && (
              <>
                <div
                  style={{
                    padding: theme.spacing.sm,
                    borderBottom: `1px solid ${theme.colors.border.primary}`,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: theme.colors.text.primary,
                    }}
                  >
                    {session.user.email}
                  </p>
                </div>
              </>
            )}

            <button
              onClick={() => router.push('/settings')}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: theme.radius.sm,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                fontSize: '13px',
                color: theme.colors.text.primary,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Settings size={14} />
              Settings
            </button>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: theme.radius.sm,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                fontSize: '13px',
                color: theme.colors.text.primary,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
