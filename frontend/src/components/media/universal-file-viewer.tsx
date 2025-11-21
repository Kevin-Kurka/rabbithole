"use client"

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useFileViewerStore } from '@/stores/file-viewer-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileIcon, Loader2 } from 'lucide-react';
import { ImageViewer } from '@/components/file-viewers/image-viewer';
import { VideoPlayer } from '@/components/file-viewers/video-player';
import { AudioPlayer } from '@/components/file-viewers/audio-player';
import { DocumentViewer } from '@/components/file-viewers/document-viewer';
import { TextViewer } from '@/components/file-viewers/text-viewer';
import { cn } from '@/lib/utils';

// Dynamically import PDF viewer to avoid SSR issues with DOMMatrix
const PdfViewer = dynamic(
  () => import('@/components/file-viewers/pdf-viewer').then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading PDF viewer...</span>
      </div>
    ),
  }
);

// File type detection utilities
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'];
const PDF_TYPES = ['application/pdf'];
const DOCUMENT_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/msword', // doc
  'application/vnd.ms-excel', // xls
  'application/vnd.ms-powerpoint', // ppt
];
const TEXT_TYPES = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'text/xml',
];

interface FileContentState {
  loading: boolean;
  content: string | null;
  error: string | null;
}

export function UniversalFileViewer() {
  const { isOpen, currentFile, closeFile } = useFileViewerStore();
  const [fileContent, setFileContent] = useState<FileContentState>({
    loading: false,
    content: null,
    error: null,
  });

  // Fetch file content for text-based files and documents
  useEffect(() => {
    if (!currentFile) {
      setFileContent({ loading: false, content: null, error: null });
      return;
    }

    const needsContentFetch =
      TEXT_TYPES.includes(currentFile.mimeType) ||
      DOCUMENT_TYPES.includes(currentFile.mimeType);

    if (needsContentFetch) {
      setFileContent({ loading: true, content: null, error: null });

      fetch(currentFile.url)
        .then((response) => {
          if (!response.ok) throw new Error('Failed to fetch file content');
          return response.text();
        })
        .then((content) => {
          setFileContent({ loading: false, content, error: null });
        })
        .catch((error) => {
          setFileContent({
            loading: false,
            content: null,
            error: error.message,
          });
        });
    }
  }, [currentFile]);

  const handleDownload = () => {
    if (!currentFile) return;

    const link = document.createElement('a');
    link.href = currentFile.url;
    link.download = currentFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderFileViewer = () => {
    if (!currentFile) return null;

    const { mimeType, url, name } = currentFile;

    // Image viewer
    if (IMAGE_TYPES.includes(mimeType)) {
      return <ImageViewer url={url} alt={name} />;
    }

    // Video player
    if (VIDEO_TYPES.includes(mimeType)) {
      return <VideoPlayer url={url} />;
    }

    // Audio player
    if (AUDIO_TYPES.includes(mimeType)) {
      return <AudioPlayer url={url} fileName={name} />;
    }

    // PDF viewer
    if (PDF_TYPES.includes(mimeType)) {
      return <PdfViewer url={url} />;
    }

    // Document viewer (for extracted text from docx, xlsx, etc.)
    if (DOCUMENT_TYPES.includes(mimeType)) {
      if (fileContent.loading) {
        return (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading document...</span>
          </div>
        );
      }

      if (fileContent.error) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Unable to display document: {fileContent.error}
            </p>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        );
      }

      if (fileContent.content) {
        return <DocumentViewer content={fileContent.content} fileName={name} />;
      }
    }

    // Text viewer
    if (TEXT_TYPES.includes(mimeType)) {
      if (fileContent.loading) {
        return (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading file...</span>
          </div>
        );
      }

      if (fileContent.error) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Unable to load file: {fileContent.error}
            </p>
          </div>
        );
      }

      if (fileContent.content) {
        return (
          <TextViewer
            content={fileContent.content}
            fileName={name}
            mimeType={mimeType}
          />
        );
      }
    }

    // Unknown file type - show download option
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{name}</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Type: {mimeType}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Size: {formatFileSize(currentFile.size)}
        </p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeFile()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl lg:max-w-4xl p-0 flex flex-col"
      >
        {currentFile && (
          <>
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b space-y-1">
              <div className="flex items-start justify-between pr-8">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="truncate">{currentFile.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <span>{currentFile.mimeType}</span>
                    <span>•</span>
                    <span>{formatFileSize(currentFile.size)}</span>
                  </SheetDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </SheetHeader>

            {/* File viewer content */}
            <div className="flex-1 overflow-hidden">
              {renderFileViewer()}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
