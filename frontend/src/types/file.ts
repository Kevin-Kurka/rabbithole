/**
 * File-related type definitions for the File Viewer system
 */

export interface FileData {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  nodeId?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FileUploadInput {
  name: string;
  mimeType: string;
  size: number;
  nodeId: string;
  file: File;
}

export type FileType = 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'unknown';

export interface FileViewerProps {
  fileUrl: string;
  fileName?: string;
}

export interface MediaViewerProps extends FileViewerProps {
  mimeType?: string;
}

export interface FileViewerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

/**
 * MIME type categories for file type detection
 */
export const MIME_TYPES = {
  PDF: 'application/pdf',
  IMAGE: {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    GIF: 'image/gif',
    WEBP: 'image/webp',
    SVG: 'image/svg+xml',
    BMP: 'image/bmp',
  },
  VIDEO: {
    MP4: 'video/mp4',
    WEBM: 'video/webm',
    OGG: 'video/ogg',
    MOV: 'video/quicktime',
    AVI: 'video/x-msvideo',
  },
  AUDIO: {
    MP3: 'audio/mpeg',
    WAV: 'audio/wav',
    OGG: 'audio/ogg',
    AAC: 'audio/aac',
    M4A: 'audio/mp4',
    FLAC: 'audio/flac',
  },
  TEXT: {
    PLAIN: 'text/plain',
    MARKDOWN: 'text/markdown',
    JSON: 'application/json',
    XML: 'application/xml',
    HTML: 'text/html',
    CSS: 'text/css',
    JAVASCRIPT: 'text/javascript',
  },
} as const;

/**
 * File extensions mapped to MIME types
 */
export const FILE_EXTENSIONS = {
  // Images
  jpg: MIME_TYPES.IMAGE.JPEG,
  jpeg: MIME_TYPES.IMAGE.JPEG,
  png: MIME_TYPES.IMAGE.PNG,
  gif: MIME_TYPES.IMAGE.GIF,
  webp: MIME_TYPES.IMAGE.WEBP,
  svg: MIME_TYPES.IMAGE.SVG,
  bmp: MIME_TYPES.IMAGE.BMP,

  // Videos
  mp4: MIME_TYPES.VIDEO.MP4,
  webm: MIME_TYPES.VIDEO.WEBM,
  ogg: MIME_TYPES.VIDEO.OGG,
  mov: MIME_TYPES.VIDEO.MOV,
  avi: MIME_TYPES.VIDEO.AVI,

  // Audio
  mp3: MIME_TYPES.AUDIO.MP3,
  wav: MIME_TYPES.AUDIO.WAV,
  m4a: MIME_TYPES.AUDIO.M4A,
  aac: MIME_TYPES.AUDIO.AAC,
  flac: MIME_TYPES.AUDIO.FLAC,

  // Documents
  pdf: MIME_TYPES.PDF,
  txt: MIME_TYPES.TEXT.PLAIN,
  md: MIME_TYPES.TEXT.MARKDOWN,
  json: MIME_TYPES.TEXT.JSON,
  xml: MIME_TYPES.TEXT.XML,
  html: MIME_TYPES.TEXT.HTML,
  css: MIME_TYPES.TEXT.CSS,
  js: MIME_TYPES.TEXT.JAVASCRIPT,
  ts: MIME_TYPES.TEXT.JAVASCRIPT,
  jsx: MIME_TYPES.TEXT.JAVASCRIPT,
  tsx: MIME_TYPES.TEXT.JAVASCRIPT,
} as const;

/**
 * Helper function to detect file type from MIME type
 */
export function getFileTypeFromMimeType(mimeType: string): FileType {
  if (mimeType === MIME_TYPES.PDF) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';
  return 'unknown';
}

/**
 * Helper function to detect file type from file name extension
 */
export function getFileTypeFromExtension(fileName: string): FileType {
  const ext = fileName.toLowerCase().split('.').pop() as keyof typeof FILE_EXTENSIONS;
  const mimeType = FILE_EXTENSIONS[ext];
  if (!mimeType) return 'unknown';
  return getFileTypeFromMimeType(mimeType);
}

/**
 * Helper function to format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Helper function to validate file size
 */
export function isFileSizeValid(bytes: number, maxSizeMB: number = 100): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return bytes <= maxBytes;
}

/**
 * Helper function to get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() || '';
}
