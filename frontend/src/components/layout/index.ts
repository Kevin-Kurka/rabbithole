/**
 * VS Code-style Layout Components
 *
 * This module provides a complete VS Code-like layout system with:
 * - Resizable panels (left, right, bottom)
 * - Icon-based navigation
 * - Main menu with search
 * - Status bar with indicators
 * - Multi-graph layering support
 */

export { default as MainMenu } from './MainMenu';
export type { MainMenuProps } from './MainMenu';

export { default as StatusBar } from './StatusBar';
export type { StatusBarProps } from './StatusBar';

export { default as ResizeHandle } from './ResizeHandle';
export type { ResizeHandleProps, ResizeDirection } from './ResizeHandle';

export { default as IconNavigationBar } from './IconNavigationBar';
export type { IconNavigationBarProps, IconNavItem } from './IconNavigationBar';

export { default as LeftPanelContent } from './LeftPanelContent';
export type { LeftPanelContentProps } from './LeftPanelContent';

export { default as RightPanel } from './RightPanel';
export type { RightPanelProps, RightPanelTab } from './RightPanel';

export { default as BottomPanel } from './BottomPanel';
export type { BottomPanelProps, BottomPanelTab } from './BottomPanel';

export { default as VSCodeLayout } from './VSCodeLayout';
export type { VSCodeLayoutProps } from './VSCodeLayout';
