"use client";

import React, { useState, useEffect } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { theme } from '@/styles/theme';

interface TextViewerProps {
  fileUrl: string;
  fileName?: string;
}

export default function TextViewer({ fileUrl, fileName = 'document.txt' }: TextViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch file');
        }
        const text = await response.text();
        setContent(text);
        setError(null);
      } catch (err) {
        console.error('Error loading text file:', err);
        setError('Failed to load text file');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [fileUrl]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: theme.colors.bg.secondary }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.bg.elevated,
          borderBottom: `1px solid ${theme.colors.border.primary}`,
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          <button
            onClick={handleCopy}
            disabled={loading || !!error}
            style={{
              padding: '6px',
              borderRadius: theme.radius.sm,
              backgroundColor: 'transparent',
              color: loading || error ? theme.colors.text.disabled : theme.colors.text.primary,
              border: 'none',
              cursor: loading || error ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Copy to clipboard"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: '6px',
              borderRadius: theme.radius.sm,
              backgroundColor: 'transparent',
              color: theme.colors.text.primary,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Download"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Text Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: theme.spacing.md,
        }}
      >
        {loading ? (
          <div style={{ color: theme.colors.text.secondary, fontSize: '14px' }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{ color: '#ef4444', fontSize: '14px' }}>
            {error}
          </div>
        ) : (
          <pre
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              color: theme.colors.text.primary,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              margin: 0,
              lineHeight: '1.6',
            }}
          >
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
