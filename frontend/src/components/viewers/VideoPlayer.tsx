"use client";

import React, { useState, useRef } from 'react';
import { Download } from 'lucide-react';
import { theme } from '@/styles/theme';

interface VideoPlayerProps {
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
}

export default function VideoPlayer({ fileUrl, fileName = 'video', mimeType = 'video/mp4' }: VideoPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleError = () => {
    setError('Failed to load video. The format may not be supported.');
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

      {/* Video Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.md,
        }}
      >
        {error ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '14px',
              textAlign: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <div>{error}</div>
            <div style={{ fontSize: '12px', color: theme.colors.text.tertiary }}>
              Supported formats: MP4, WebM, Ogg
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            controls
            onError={handleError}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              borderRadius: theme.radius.md,
            }}
          >
            <source src={fileUrl} type={mimeType} />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </div>
  );
}
