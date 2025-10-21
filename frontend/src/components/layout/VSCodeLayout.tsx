"use client";

import React, { useState, useEffect, useCallback } from 'react';
import MainMenu from './MainMenu';
import StatusBar from './StatusBar';
import IconNavigationBar, { IconNavItem } from './IconNavigationBar';
import LeftPanelContent from './LeftPanelContent';
import RightPanel, { RightPanelTab } from './RightPanel';
import BottomPanel, { BottomPanelTab } from './BottomPanel';
import { theme } from '@/styles/theme';

export interface VSCodeLayoutProps {
  /** Main content area (typically GraphCanvas) */
  children: React.ReactNode;
  /** Optional callback for main menu search */
  onSearch?: (query: string) => void;
  /** Graph statistics for status bar */
  graphName?: string;
  nodeCount?: number;
  edgeCount?: number;
  isConnected?: boolean;
  aiActive?: boolean;
  layoutAlgorithm?: string;
  zoomLevel?: number;
  /** Active graphs for GraphListPanel */
  activeGraphs?: string[];
  /** Toggle graph callback for GraphListPanel */
  onToggleGraph?: (graphId: string) => void;
  /** Selected node for properties panel */
  selectedNode?: any;
  /** Selected edge for properties panel */
  selectedEdge?: any;
}

// LocalStorage keys
const STORAGE_KEYS = {
  LEFT_PANEL_OPEN: 'vscode-layout:leftPanel:open',
  LEFT_PANEL_WIDTH: 'vscode-layout:leftPanel:width',
  LEFT_PANEL_ACTIVE: 'vscode-layout:leftPanel:active',
  RIGHT_PANEL_OPEN: 'vscode-layout:rightPanel:open',
  RIGHT_PANEL_WIDTH: 'vscode-layout:rightPanel:width',
  RIGHT_PANEL_TAB: 'vscode-layout:rightPanel:tab',
  BOTTOM_PANEL_OPEN: 'vscode-layout:bottomPanel:open',
  BOTTOM_PANEL_HEIGHT: 'vscode-layout:bottomPanel:height',
  BOTTOM_PANEL_TAB: 'vscode-layout:bottomPanel:tab',
};

// Default sizes
const DEFAULTS = {
  LEFT_PANEL_WIDTH: 250,
  RIGHT_PANEL_WIDTH: 400,
  BOTTOM_PANEL_HEIGHT: 200,
  ICON_NAV_WIDTH: 48,
};

export default function VSCodeLayout({
  children,
  onSearch,
  graphName,
  nodeCount,
  edgeCount,
  isConnected = false,
  aiActive = false,
  layoutAlgorithm = 'Force',
  zoomLevel = 100,
  activeGraphs = [],
  onToggleGraph = () => {},
  selectedNode,
  selectedEdge,
}: VSCodeLayoutProps) {
  // Panel states
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULTS.LEFT_PANEL_WIDTH);
  const [leftPanelActive, setLeftPanelActive] = useState<IconNavItem>('graphs');

  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULTS.RIGHT_PANEL_WIDTH);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('properties');

  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(DEFAULTS.BOTTOM_PANEL_HEIGHT);
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>('console');

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const leftOpen = localStorage.getItem(STORAGE_KEYS.LEFT_PANEL_OPEN);
    const leftWidth = localStorage.getItem(STORAGE_KEYS.LEFT_PANEL_WIDTH);
    const leftActive = localStorage.getItem(STORAGE_KEYS.LEFT_PANEL_ACTIVE);

    const rightOpen = localStorage.getItem(STORAGE_KEYS.RIGHT_PANEL_OPEN);
    const rightWidth = localStorage.getItem(STORAGE_KEYS.RIGHT_PANEL_WIDTH);
    const rightTab = localStorage.getItem(STORAGE_KEYS.RIGHT_PANEL_TAB);

    const bottomOpen = localStorage.getItem(STORAGE_KEYS.BOTTOM_PANEL_OPEN);
    const bottomHeight = localStorage.getItem(STORAGE_KEYS.BOTTOM_PANEL_HEIGHT);
    const bottomTab = localStorage.getItem(STORAGE_KEYS.BOTTOM_PANEL_TAB);

    if (leftOpen !== null) setLeftPanelOpen(leftOpen === 'true');
    if (leftWidth !== null) setLeftPanelWidth(Number(leftWidth));
    if (leftActive !== null) setLeftPanelActive(leftActive as IconNavItem);

    if (rightOpen !== null) setRightPanelOpen(rightOpen === 'true');
    if (rightWidth !== null) setRightPanelWidth(Number(rightWidth));
    if (rightTab !== null) setRightPanelTab(rightTab as RightPanelTab);

    if (bottomOpen !== null) setBottomPanelOpen(bottomOpen === 'true');
    if (bottomHeight !== null) setBottomPanelHeight(Number(bottomHeight));
    if (bottomTab !== null) setBottomPanelTab(bottomTab as BottomPanelTab);
  }, []);

  // Save state to localStorage
  const saveState = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(STORAGE_KEYS.LEFT_PANEL_OPEN, String(leftPanelOpen));
    localStorage.setItem(STORAGE_KEYS.LEFT_PANEL_WIDTH, String(leftPanelWidth));
    localStorage.setItem(STORAGE_KEYS.LEFT_PANEL_ACTIVE, leftPanelActive);

    localStorage.setItem(STORAGE_KEYS.RIGHT_PANEL_OPEN, String(rightPanelOpen));
    localStorage.setItem(STORAGE_KEYS.RIGHT_PANEL_WIDTH, String(rightPanelWidth));
    localStorage.setItem(STORAGE_KEYS.RIGHT_PANEL_TAB, rightPanelTab);

    localStorage.setItem(STORAGE_KEYS.BOTTOM_PANEL_OPEN, String(bottomPanelOpen));
    localStorage.setItem(STORAGE_KEYS.BOTTOM_PANEL_HEIGHT, String(bottomPanelHeight));
    localStorage.setItem(STORAGE_KEYS.BOTTOM_PANEL_TAB, bottomPanelTab);
  }, [
    leftPanelOpen, leftPanelWidth, leftPanelActive,
    rightPanelOpen, rightPanelWidth, rightPanelTab,
    bottomPanelOpen, bottomPanelHeight, bottomPanelTab
  ]);

  // Save whenever state changes
  useEffect(() => {
    saveState();
  }, [saveState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          setLeftPanelOpen(prev => !prev);
          break;
        case 'k':
          e.preventDefault();
          setRightPanelOpen(prev => !prev);
          break;
        case 'j':
          e.preventDefault();
          setBottomPanelOpen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate main content dimensions
  const leftPanelTotalWidth = leftPanelOpen ? DEFAULTS.ICON_NAV_WIDTH + leftPanelWidth : 0;
  const rightPanelTotalWidth = rightPanelOpen ? rightPanelWidth : 0;
  const bottomPanelTotalHeight = bottomPanelOpen ? bottomPanelHeight : 0;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.bg.primary,
        overflow: 'hidden',
      }}
    >
      {/* Main Menu */}
      <MainMenu
        onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        onToggleBottomPanel={() => setBottomPanelOpen(!bottomPanelOpen)}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        bottomPanelOpen={bottomPanelOpen}
        onSearch={onSearch}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left Panel (Icon Nav + Content) */}
        {leftPanelOpen && (
          <div
            style={{
              display: 'flex',
              height: '100%',
            }}
          >
            <IconNavigationBar
              activeItem={leftPanelActive}
              onItemClick={setLeftPanelActive}
            />
            <LeftPanelContent
              activeItem={leftPanelActive}
              width={leftPanelWidth}
              onResize={setLeftPanelWidth}
              activeGraphs={activeGraphs}
              onToggleGraph={onToggleGraph}
            />
          </div>
        )}

        {/* Center Content (Main Canvas + Bottom Panel) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Main Canvas */}
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {children}
          </div>

          {/* Bottom Panel */}
          {bottomPanelOpen && (
            <BottomPanel
              height={bottomPanelHeight}
              onResize={setBottomPanelHeight}
              activeTab={bottomPanelTab}
              onTabChange={setBottomPanelTab}
            />
          )}
        </div>

        {/* Right Panel */}
        {rightPanelOpen && (
          <RightPanel
            width={rightPanelWidth}
            onResize={setRightPanelWidth}
            activeTab={rightPanelTab}
            onTabChange={setRightPanelTab}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        graphName={graphName}
        nodeCount={nodeCount}
        edgeCount={edgeCount}
        isConnected={isConnected}
        aiActive={aiActive}
        layoutAlgorithm={layoutAlgorithm}
        zoomLevel={zoomLevel}
      />
    </div>
  );
}
