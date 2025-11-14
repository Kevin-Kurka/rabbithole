/**
 * Utility functions for file handling and type detection
 */

export const FILE_TYPE_CATEGORIES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  PDF: 'pdf',
  DOCUMENT: 'document',
  TEXT: 'text',
  ARCHIVE: 'archive',
  UNKNOWN: 'unknown',
} as const;

export type FileTypeCategory = typeof FILE_TYPE_CATEGORIES[keyof typeof FILE_TYPE_CATEGORIES];

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
]);

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/webm',
  'audio/flac',
]);

const PDF_MIME_TYPES = new Set([
  'application/pdf',
]);

const DOCUMENT_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/msword', // doc
  'application/vnd.ms-excel', // xls
  'application/vnd.ms-powerpoint', // ppt
  'application/rtf',
  'application/vnd.oasis.opendocument.text', // odt
  'application/vnd.oasis.opendocument.spreadsheet', // ods
  'application/vnd.oasis.opendocument.presentation', // odp
]);

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'text/csv',
  'application/javascript',
  'application/json',
  'application/xml',
  'text/xml',
  'application/x-yaml',
  'text/x-yaml',
]);

const ARCHIVE_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
]);

/**
 * Get the file type category from MIME type
 */
export function getFileTypeCategory(mimeType: string): FileTypeCategory {
  if (IMAGE_MIME_TYPES.has(mimeType)) return FILE_TYPE_CATEGORIES.IMAGE;
  if (VIDEO_MIME_TYPES.has(mimeType)) return FILE_TYPE_CATEGORIES.VIDEO;
  if (AUDIO_MIME_TYPES.has(mimeType)) return FILE_TYPE_CATEGORIES.AUDIO;
  if (PDF_MIME_TYPES.has(mimeType)) return FILE_TYPE_CATEGORIES.PDF;
  if (DOCUMENT_MIME_TYPES.has(mimeType)) return FILE_TYPE_CATEGORIES.DOCUMENT;
  if (TEXT_MIME_TYPES.has(mimeType)) return FILE_TYPE_CATEGORIES.TEXT;
  if (ARCHIVE_MIME_TYPES.has(mimeType)) return FILE_TYPE_CATEGORIES.ARCHIVE;
  return FILE_TYPE_CATEGORIES.UNKNOWN;
}

/**
 * Check if a file type can be previewed inline
 */
export function canPreviewFile(mimeType: string): boolean {
  const category = getFileTypeCategory(mimeType);
  return [
    FILE_TYPE_CATEGORIES.IMAGE,
    FILE_TYPE_CATEGORIES.VIDEO,
    FILE_TYPE_CATEGORIES.AUDIO,
    FILE_TYPE_CATEGORIES.PDF,
    FILE_TYPE_CATEGORIES.TEXT,
  ].includes(category);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || '';
}

/**
 * Get icon name for file type (for use with lucide-react)
 */
export function getFileIconName(mimeType: string): string {
  const category = getFileTypeCategory(mimeType);

  switch (category) {
    case FILE_TYPE_CATEGORIES.IMAGE:
      return 'FileImage';
    case FILE_TYPE_CATEGORIES.VIDEO:
      return 'FileVideo';
    case FILE_TYPE_CATEGORIES.AUDIO:
      return 'FileAudio';
    case FILE_TYPE_CATEGORIES.PDF:
      return 'FileText';
    case FILE_TYPE_CATEGORIES.DOCUMENT:
      return 'FileSpreadsheet';
    case FILE_TYPE_CATEGORIES.TEXT:
      return 'FileCode';
    case FILE_TYPE_CATEGORIES.ARCHIVE:
      return 'FileArchive';
    default:
      return 'File';
  }
}

/**
 * Validate file size against a maximum
 */
export function isFileSizeValid(bytes: number, maxSizeInMB: number): boolean {
  const maxBytes = maxSizeInMB * 1024 * 1024;
  return bytes <= maxBytes;
}

/**
 * Get programming language from file extension for syntax highlighting
 */
export function getLanguageFromExtension(filename: string): string {
  const ext = getFileExtension(filename);

  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'dockerfile': 'dockerfile',
  };

  return languageMap[ext] || 'text';
}

/**
 * Check if file is an image
 */
export function isImage(mimeType: string): boolean {
  return getFileTypeCategory(mimeType) === FILE_TYPE_CATEGORIES.IMAGE;
}

/**
 * Check if file is a video
 */
export function isVideo(mimeType: string): boolean {
  return getFileTypeCategory(mimeType) === FILE_TYPE_CATEGORIES.VIDEO;
}

/**
 * Check if file is audio
 */
export function isAudio(mimeType: string): boolean {
  return getFileTypeCategory(mimeType) === FILE_TYPE_CATEGORIES.AUDIO;
}

/**
 * Check if file is a PDF
 */
export function isPDF(mimeType: string): boolean {
  return getFileTypeCategory(mimeType) === FILE_TYPE_CATEGORIES.PDF;
}

/**
 * Check if file is a document
 */
export function isDocument(mimeType: string): boolean {
  return getFileTypeCategory(mimeType) === FILE_TYPE_CATEGORIES.DOCUMENT;
}

/**
 * Check if file is text
 */
export function isText(mimeType: string): boolean {
  return getFileTypeCategory(mimeType) === FILE_TYPE_CATEGORIES.TEXT;
}
