"use client";

import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { FileText, Image, Film, Music, File as FileIcon } from 'lucide-react';
import { GET_NODE_FILES } from '@/graphql/file-queries';
import FileViewerSidebar from './media/file-viewer-sidebar';
import { theme } from '@/styles/theme';

interface FileViewerExampleProps {
  nodeId: string;
}

interface FileData {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export default function FileViewerExample({ nodeId }: FileViewerExampleProps) {
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const { data, loading, error } = useQuery(GET_NODE_FILES, {
    variables: { nodeId },
    skip: !nodeId,
  });

  const handleFileClick = (file: FileData) => {
    setSelectedFile(file);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    // Optional: clear selected file after animation
    setTimeout(() => setSelectedFile(null), 300);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FileText size={16} aria-hidden="true" />;
    if (mimeType.startsWith('image/')) return <Image size={16} aria-hidden="true" />;
    if (mimeType.startsWith('video/')) return <Film size={16} aria-hidden="true" />;
    if (mimeType.startsWith('audio/')) return <Music size={16} aria-hidden="true" />;
    return <FileIcon size={16} aria-hidden="true" />;
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} bytes`;
  };

  if (loading) {
    return (
      <div style={{ padding: theme.spacing.md, color: theme.colors.text.secondary, fontSize: '14px' }}>
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: theme.spacing.md, color: '#ef4444', fontSize: '14px' }}>
        Error loading files: {error.message}
      </div>
    );
  }

  const files = data?.nodeFiles || [];

  if (files.length === 0) {
    return (
      <div style={{ padding: theme.spacing.md, color: theme.colors.text.tertiary, fontSize: '14px' }}>
        No files attached to this node
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
        {files.map((file: FileData) => (
          <div
            key={file.id}
            onClick={() => handleFileClick(file)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: theme.spacing.sm,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.secondary,
              border: `1px solid ${theme.colors.border.primary}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.secondary;
            }}
          >
            <div style={{ color: theme.colors.text.primary }}>
              {getFileIcon(file.mimeType)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  color: theme.colors.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.text.tertiary }}>
                {formatFileSize(file.size)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedFile && (
        <FileViewerSidebar
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
          fileUrl={selectedFile.url}
          fileName={selectedFile.name}
          mimeType={selectedFile.mimeType}
          fileSize={selectedFile.size}
        />
      )}
    </>
  );
}
