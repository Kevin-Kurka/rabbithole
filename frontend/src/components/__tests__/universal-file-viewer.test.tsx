/**
 * Tests for UniversalFileViewer component and related functionality
 */

import { renderHook, act } from '@testing-library/react';
import { useFileViewer } from '@/hooks/use-file-viewer';
import { useFileViewerStore, FileViewerFile } from '@/stores/file-viewer-store';
import {
  getFileTypeCategory,
  formatFileSize,
  getFileExtension,
  canPreviewFile,
  isImage,
  isVideo,
  isAudio,
  isPDF,
} from '@/lib/file-utils';

describe('FileViewerStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { closeFile } = useFileViewerStore.getState();
    closeFile();
  });

  it('should initialize with closed state', () => {
    const { isOpen, currentFile } = useFileViewerStore.getState();
    expect(isOpen).toBe(false);
    expect(currentFile).toBe(null);
  });

  it('should open file with correct data', () => {
    const testFile: FileViewerFile = {
      id: '1',
      name: 'test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      url: 'https://example.com/test.pdf',
    };

    const { openFile } = useFileViewerStore.getState();
    act(() => {
      openFile(testFile);
    });

    const { isOpen, currentFile } = useFileViewerStore.getState();
    expect(isOpen).toBe(true);
    expect(currentFile).toEqual(testFile);
  });

  it('should close file and reset state', () => {
    const testFile: FileViewerFile = {
      id: '1',
      name: 'test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      url: 'https://example.com/test.pdf',
    };

    const { openFile, closeFile } = useFileViewerStore.getState();

    act(() => {
      openFile(testFile);
    });

    act(() => {
      closeFile();
    });

    const { isOpen, currentFile } = useFileViewerStore.getState();
    expect(isOpen).toBe(false);
    expect(currentFile).toBe(null);
  });
});

describe('useFileViewer Hook', () => {
  it('should open file through hook', () => {
    const { result } = renderHook(() => useFileViewer());

    const testFile: FileViewerFile = {
      id: '1',
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
      url: 'https://example.com/test.jpg',
    };

    act(() => {
      result.current.openFile(testFile);
    });

    const { isOpen, currentFile } = useFileViewerStore.getState();
    expect(isOpen).toBe(true);
    expect(currentFile).toEqual(testFile);
  });

  it('should close file through hook', () => {
    const { result } = renderHook(() => useFileViewer());

    const testFile: FileViewerFile = {
      id: '1',
      name: 'test.mp4',
      mimeType: 'video/mp4',
      size: 5120000,
      url: 'https://example.com/test.mp4',
    };

    act(() => {
      result.current.openFile(testFile);
      result.current.closeFile();
    });

    const { isOpen } = useFileViewerStore.getState();
    expect(isOpen).toBe(false);
  });
});

describe('File Utilities', () => {
  describe('getFileTypeCategory', () => {
    it('should detect image types', () => {
      expect(getFileTypeCategory('image/jpeg')).toBe('image');
      expect(getFileTypeCategory('image/png')).toBe('image');
      expect(getFileTypeCategory('image/gif')).toBe('image');
    });

    it('should detect video types', () => {
      expect(getFileTypeCategory('video/mp4')).toBe('video');
      expect(getFileTypeCategory('video/webm')).toBe('video');
    });

    it('should detect audio types', () => {
      expect(getFileTypeCategory('audio/mpeg')).toBe('audio');
      expect(getFileTypeCategory('audio/wav')).toBe('audio');
    });

    it('should detect PDF type', () => {
      expect(getFileTypeCategory('application/pdf')).toBe('pdf');
    });

    it('should detect document types', () => {
      expect(getFileTypeCategory('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
    });

    it('should detect text types', () => {
      expect(getFileTypeCategory('text/plain')).toBe('text');
      expect(getFileTypeCategory('application/json')).toBe('text');
    });

    it('should return unknown for unsupported types', () => {
      expect(getFileTypeCategory('application/octet-stream')).toBe('unknown');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('test.pdf')).toBe('pdf');
      expect(getFileExtension('image.jpg')).toBe('jpg');
      expect(getFileExtension('document.docx')).toBe('docx');
      expect(getFileExtension('file.tar.gz')).toBe('gz');
    });

    it('should handle files without extension', () => {
      expect(getFileExtension('README')).toBe('');
    });
  });

  describe('canPreviewFile', () => {
    it('should return true for previewable types', () => {
      expect(canPreviewFile('image/jpeg')).toBe(true);
      expect(canPreviewFile('video/mp4')).toBe(true);
      expect(canPreviewFile('audio/mpeg')).toBe(true);
      expect(canPreviewFile('application/pdf')).toBe(true);
      expect(canPreviewFile('text/plain')).toBe(true);
    });

    it('should return false for non-previewable types', () => {
      expect(canPreviewFile('application/zip')).toBe(false);
      expect(canPreviewFile('application/octet-stream')).toBe(false);
    });
  });

  describe('Type check helpers', () => {
    it('isImage should detect images', () => {
      expect(isImage('image/jpeg')).toBe(true);
      expect(isImage('image/png')).toBe(true);
      expect(isImage('video/mp4')).toBe(false);
    });

    it('isVideo should detect videos', () => {
      expect(isVideo('video/mp4')).toBe(true);
      expect(isVideo('video/webm')).toBe(true);
      expect(isVideo('image/jpeg')).toBe(false);
    });

    it('isAudio should detect audio', () => {
      expect(isAudio('audio/mpeg')).toBe(true);
      expect(isAudio('audio/wav')).toBe(true);
      expect(isAudio('video/mp4')).toBe(false);
    });

    it('isPDF should detect PDFs', () => {
      expect(isPDF('application/pdf')).toBe(true);
      expect(isPDF('text/plain')).toBe(false);
    });
  });
});
