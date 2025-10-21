"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Download } from 'lucide-react';
import { theme } from '@/styles/theme';

export interface ConsolePanelProps {
  graphId?: string;
}

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

/**
 * ConsolePanel Component
 *
 * Displays system logs, GraphQL operation results, and debugging information.
 */
export default function ConsolePanel({ graphId }: ConsolePanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date(), level: 'info', message: 'Console initialized' },
    { timestamp: new Date(), level: 'info', message: 'Connected to GraphQL API' },
  ]);
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Simulate log messages (in production, these would come from GraphQL subscriptions or error handlers)
  useEffect(() => {
    if (!graphId) return;

    const interval = setInterval(() => {
      const messages = [
        { level: 'info' as const, message: `GraphQL query executed: getNodes(graphId: "${graphId}")` },
        { level: 'debug' as const, message: `Fetched ${Math.floor(Math.random() * 50)} nodes from cache` },
        { level: 'info' as const, message: `WebSocket subscription active: nodeUpdated` },
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [...prev, { timestamp: new Date(), ...randomMessage }]);
    }, 10000);

    return () => clearInterval(interval);
  }, [graphId]);

  const handleClear = () => {
    setLogs([{ timestamp: new Date(), level: 'info', message: 'Console cleared' }]);
  };

  const handleExport = () => {
    const logText = logs.map(log =>
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'debug': return '#8b5cf6';
      case 'info':
      default: return theme.colors.text.primary;
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.bg.primary,
        fontFamily: theme.fonts.mono,
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.xs,
        borderBottom: `1px solid ${theme.colors.border.primary}`,
        backgroundColor: theme.colors.bg.secondary,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          <Terminal size={14} style={{ color: theme.colors.text.tertiary }} />
          <span style={{ fontSize: '11px', color: theme.colors.text.secondary }}>
            {logs.length} entries
          </span>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.xs }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: theme.colors.text.secondary, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button
            onClick={handleExport}
            style={{
              padding: '4px 6px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: theme.colors.text.secondary,
              border: 'none',
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Export logs"
          >
            <Download size={12} />
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '4px 6px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: theme.colors.text.secondary,
              border: 'none',
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Clear console"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Log Entries */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: theme.spacing.xs,
          fontSize: '11px',
          lineHeight: '1.6',
        }}
      >
        {logs.map((log, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: theme.spacing.xs,
              padding: '2px 0',
              borderBottom: index < logs.length - 1 ? `1px solid ${theme.colors.border.primary}` : 'none',
            }}
          >
            <span style={{ color: theme.colors.text.tertiary, minWidth: '60px' }}>
              {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <span style={{
              color: getLevelColor(log.level),
              fontWeight: 600,
              minWidth: '50px',
              textTransform: 'uppercase',
            }}>
              [{log.level}]
            </span>
            <span style={{ color: theme.colors.text.primary, flex: 1, wordBreak: 'break-word' }}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
