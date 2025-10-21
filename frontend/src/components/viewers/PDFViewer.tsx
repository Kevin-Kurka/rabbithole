"use client";

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { theme } from '@/styles/theme';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
}

export default function PDFViewer({ fileUrl, fileName = 'document.pdf' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF');
  };

  const handlePreviousPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(numPages || 1, prev + 1));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(2.0, prev + 0.25));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          <button
            onClick={handlePreviousPage}
            disabled={pageNumber <= 1}
            style={{
              padding: '6px',
              borderRadius: theme.radius.sm,
              backgroundColor: 'transparent',
              color: pageNumber <= 1 ? theme.colors.text.disabled : theme.colors.text.primary,
              border: 'none',
              cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '14px', color: theme.colors.text.secondary, minWidth: '80px', textAlign: 'center' }}>
            {numPages ? `${pageNumber} / ${numPages}` : 'Loading...'}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!numPages || pageNumber >= numPages}
            style={{
              padding: '6px',
              borderRadius: theme.radius.sm,
              backgroundColor: 'transparent',
              color: !numPages || pageNumber >= numPages ? theme.colors.text.disabled : theme.colors.text.primary,
              border: 'none',
              cursor: !numPages || pageNumber >= numPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            style={{
              padding: '6px',
              borderRadius: theme.radius.sm,
              backgroundColor: 'transparent',
              color: scale <= 0.5 ? theme.colors.text.disabled : theme.colors.text.primary,
              border: 'none',
              cursor: scale <= 0.5 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ZoomOut size={18} />
          </button>
          <span style={{ fontSize: '14px', color: theme.colors.text.secondary, minWidth: '50px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 2.0}
            style={{
              padding: '6px',
              borderRadius: theme.radius.sm,
              backgroundColor: 'transparent',
              color: scale >= 2.0 ? theme.colors.text.disabled : theme.colors.text.primary,
              border: 'none',
              cursor: scale >= 2.0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ZoomIn size={18} />
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
            title="Download PDF"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: theme.spacing.md,
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
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div style={{ color: theme.colors.text.secondary, fontSize: '14px' }}>
                Loading PDF...
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              loading={
                <div style={{ color: theme.colors.text.secondary, fontSize: '14px' }}>
                  Loading page...
                </div>
              }
            />
          </Document>
        )}
      </div>
    </div>
  );
}
