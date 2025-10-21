"use client";

import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCw, Download, Maximize } from 'lucide-react';
import { theme } from '@/styles/theme';

interface ImageViewerProps {
  fileUrl: string;
  fileName?: string;
  alt?: string;
}

export default function ImageViewer({ fileUrl, fileName = 'image', alt = 'Image preview' }: ImageViewerProps) {
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullscreen = () => {
    const img = document.getElementById('image-viewer-img');
    if (img) {
      if (img.requestFullscreen) {
        img.requestFullscreen();
      }
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
            onClick={handleRotate}
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
            title="Rotate"
          >
            <RotateCw size={18} />
          </button>
          <button
            onClick={handleFullscreen}
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
            title="Fullscreen"
          >
            <Maximize size={18} />
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

      {/* Image Content */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {error ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom Controls Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: theme.spacing.md,
                    right: theme.spacing.md,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing.xs,
                    backgroundColor: theme.colors.bg.elevated,
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border.primary}`,
                    zIndex: 10,
                  }}
                >
                  <button
                    onClick={() => zoomIn()}
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
                    title="Zoom In"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    onClick={() => zoomOut()}
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
                    title="Zoom Out"
                  >
                    <ZoomOut size={18} />
                  </button>
                </div>

                <TransformComponent
                  wrapperStyle={{
                    width: '100%',
                    height: '100%',
                  }}
                  contentStyle={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    id="image-viewer-img"
                    src={fileUrl}
                    alt={alt}
                    onError={() => setError('Failed to load image')}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                    }}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>
    </div>
  );
}
