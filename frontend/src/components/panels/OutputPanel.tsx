"use client";

import React, { useState } from 'react';
import { FileOutput, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { theme } from '@/styles/theme';

export interface OutputPanelProps {
  graphId?: string;
}

interface OutputMessage {
  id: string;
  timestamp: Date;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

const MOCK_MESSAGES: OutputMessage[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 300000),
    type: 'success',
    title: 'Graph Created',
    message: 'Successfully created new graph "Climate Investigation"'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 180000),
    type: 'info',
    title: 'Node Added',
    message: 'Added 3 new evidence nodes to the graph'
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 60000),
    type: 'warning',
    title: 'Veracity Warning',
    message: 'Node "Temperature Data" has conflicting evidence. Review recommended.'
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 30000),
    type: 'success',
    title: 'AI Analysis Complete',
    message: 'Generated 5 new suggestions for your hypothesis'
  }
];

/**
 * OutputPanel Component
 *
 * Displays system notifications, operation results, and status messages.
 */
export default function OutputPanel({ graphId }: OutputPanelProps) {
  const [messages] = useState<OutputMessage[]>(MOCK_MESSAGES);
  const [filter, setFilter] = useState<string>('all');

  const filteredMessages = filter === 'all'
    ? messages
    : messages.filter(m => m.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={14} style={{ color: '#10b981' }} />;
      case 'error': return <AlertCircle size={14} style={{ color: '#ef4444' }} />;
      case 'warning': return <AlertCircle size={14} style={{ color: '#f59e0b' }} />;
      case 'info':
      default: return <Info size={14} style={{ color: '#3b82f6' }} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info':
      default: return '#3b82f6';
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.bg.primary,
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
          <FileOutput size={14} style={{ color: theme.colors.text.tertiary }} />
          <span style={{ fontSize: '11px', color: theme.colors.text.secondary }}>
            Output Messages
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['all', 'success', 'info', 'warning', 'error'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '2px 8px',
                fontSize: '10px',
                backgroundColor: filter === type ? theme.colors.button.primary.bg : 'transparent',
                color: filter === type ? theme.colors.button.primary.text : theme.colors.text.secondary,
                border: 'none',
                borderRadius: theme.radius.sm,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: theme.spacing.sm,
        }}
      >
        {filteredMessages.length === 0 ? (
          <div style={{
            padding: theme.spacing.lg,
            textAlign: 'center',
            color: theme.colors.text.tertiary,
            fontSize: '12px'
          }}>
            <FileOutput size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>No output messages</p>
          </div>
        ) : (
          filteredMessages.map(msg => (
            <div
              key={msg.id}
              style={{
                padding: theme.spacing.sm,
                marginBottom: theme.spacing.xs,
                backgroundColor: theme.colors.bg.secondary,
                border: `1px solid ${theme.colors.border.primary}`,
                borderLeft: `3px solid ${getTypeColor(msg.type)}`,
                borderRadius: theme.radius.sm,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: theme.spacing.xs, marginBottom: '4px' }}>
                {getIcon(msg.type)}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.text.primary }}>
                      {msg.title}
                    </span>
                    <span style={{ fontSize: '10px', color: theme.colors.text.tertiary }}>
                      {msg.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '11px',
                    color: theme.colors.text.secondary,
                    marginTop: '4px',
                    lineHeight: '1.4',
                  }}>
                    {msg.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
