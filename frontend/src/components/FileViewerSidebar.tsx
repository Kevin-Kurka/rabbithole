"use client";

import React, { useState } from 'react';
import { X, FileText, Image as ImageIcon, Film, Music, File } from 'lucide-react';
import { theme } from '@/styles/theme';
import PDFViewer from './viewers/PDFViewer';
import ImageViewer from './viewers/ImageViewer';
import VideoPlayer from './viewers/VideoPlayer';
import AudioPlayer from './viewers/AudioPlayer';
import TextViewer from './viewers/TextViewer';

interface FileViewerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

const SIDEBAR_WIDTH = 480;

export default function FileViewerSidebar({
  isOpen,
  onClose,
  fileUrl,
  fileName = 'file',
  mimeType = 'application/octet-stream',
  fileSize,
}: FileViewerSidebarProps) {

  // Determine file type based on MIME type
  const getFileType = (): 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'unknown' => {
    if (!mimeType) return 'unknown';

    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';

    // Check file extension as fallback
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'].includes(ext || '')) return 'audio';
    if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx'].includes(ext || '')) return 'text';

    return 'unknown';
  };

  const fileType = getFileType();

  // Get icon for file type
  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText size={16} />;
      case 'image':
        return <ImageIcon size={16} />;
      case 'video':
        return <Film size={16} />;
      case 'audio':
        return <Music size={16} />;
      case 'text':
        return <FileText size={16} />;
      default:
        return <File size={16} />;
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} bytes`;
  };

  // Render appropriate viewer
  const renderViewer = () => {
    switch (fileType) {
      case 'pdf':
        return <PDFViewer fileUrl={fileUrl} fileName={fileName} />;
      case 'image':
        return <ImageViewer fileUrl={fileUrl} fileName={fileName} alt={fileName} />;
      case 'video':
        return <VideoPlayer fileUrl={fileUrl} fileName={fileName} mimeType={mimeType} />;
      case 'audio':
        return <AudioPlayer fileUrl={fileUrl} fileName={fileName} mimeType={mimeType} />;
      case 'text':
        return <TextViewer fileUrl={fileUrl} fileName={fileName} />;
      default:
        return (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: theme.spacing.xl,
              textAlign: 'center',
              gap: theme.spacing.md,
            }}
          >
            <File size={48} style={{ color: theme.colors.text.tertiary }} />
            <div style={{ color: theme.colors.text.secondary, fontSize: '14px' }}>
              Preview not available for this file type
            </div>
            <div style={{ color: theme.colors.text.tertiary, fontSize: '12px' }}>
              {mimeType}
            </div>
            <a
              href={fileUrl}
              download={fileName}
              style={{
                marginTop: theme.spacing.sm,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.button.primary.bg,
                color: theme.colors.button.primary.text,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Download File
            </a>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${SIDEBAR_WIDTH}px`,
          backgroundColor: theme.colors.bg.elevated,
          borderLeft: `1px solid ${theme.colors.border.primary}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 101,
          boxShadow: theme.shadows.xl,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.md,
            borderBottom: `1px solid ${theme.colors.border.primary}`,
            backgroundColor: theme.colors.bg.secondary,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flex: 1, minWidth: 0 }}>
            <div style={{ color: theme.colors.text.primary }}>{getFileIcon()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: theme.colors.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={fileName}
              >
                {fileName}
              </div>
              {fileSize && (
                <div style={{ fontSize: '12px', color: theme.colors.text.tertiary }}>
                  {formatFileSize(fileSize)}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
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
              marginLeft: theme.spacing.sm,
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewer Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {error ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                fontSize: '14px',
                padding: theme.spacing.xl,
              }}
            >
              {error}
            </div>
          ) : (
            renderViewer()
          )}
        </div>
      </div>
    </>
  );
}
