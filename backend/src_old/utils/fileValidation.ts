/**
 * File Validation Utilities
 *
 * Comprehensive file validation for Evidence Management System
 */

// ============================================================================
// ALLOWED MIME TYPES
// ============================================================================

export const ALLOWED_MIME_TYPES = {
  // Documents
  documents: [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'text/plain',
    'text/markdown',
    'application/rtf',
  ],

  // Images
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ],

  // Videos
  videos: [
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
  ],

  // Audio
  audio: [
    'audio/mpeg', // .mp3
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/webm',
    'audio/flac',
  ],

  // Data/Datasets
  datasets: [
    'application/json',
    'text/csv',
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/xml',
    'application/xml',
  ],

  // Archives
  archives: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
  ],

  // Presentations
  presentations: [
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  ],
};

// Flatten all allowed types
export const ALL_ALLOWED_MIME_TYPES = Object.values(ALLOWED_MIME_TYPES).flat();

// ============================================================================
// DANGEROUS MIME TYPES (NEVER ALLOWED)
// ============================================================================

export const DANGEROUS_MIME_TYPES = [
  'application/x-msdownload', // .exe
  'application/x-executable',
  'application/x-sh', // Shell scripts
  'application/x-bat', // Batch files
  'application/x-msdos-program',
  'application/x-dosexec',
  'application/vnd.microsoft.portable-executable',
  'text/x-shellscript',
  'text/x-python', // Prevent direct Python script uploads
  'text/x-php',
  'application/x-httpd-php',
  'application/javascript', // Prevent JS uploads (use static hosting)
  'text/javascript',
];

// ============================================================================
// FILE SIZE LIMITS
// ============================================================================

export const FILE_SIZE_LIMITS = {
  documents: 50 * 1024 * 1024,      // 50MB
  images: 20 * 1024 * 1024,         // 20MB
  videos: 500 * 1024 * 1024,        // 500MB
  audio: 100 * 1024 * 1024,         // 100MB
  datasets: 100 * 1024 * 1024,      // 100MB
  archives: 200 * 1024 * 1024,      // 200MB
  presentations: 50 * 1024 * 1024,  // 50MB
  default: 100 * 1024 * 1024,       // 100MB
};

// ============================================================================
// FILE TYPE DETECTION
// ============================================================================

export function detectFileType(mimetype: string): string {
  for (const [type, mimeTypes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimeTypes.includes(mimetype)) {
      // Return singular form
      return type.replace(/s$/, ''); // documents -> document
    }
  }

  return 'other';
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  fileType?: string;
  maxSize?: number;
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimetype: string): ValidationResult {
  // Check if dangerous
  if (DANGEROUS_MIME_TYPES.includes(mimetype)) {
    return {
      valid: false,
      error: `File type ${mimetype} is not allowed for security reasons`,
    };
  }

  // Check if allowed
  if (!ALL_ALLOWED_MIME_TYPES.includes(mimetype)) {
    return {
      valid: false,
      error: `File type ${mimetype} is not supported`,
    };
  }

  const fileType = detectFileType(mimetype);
  return {
    valid: true,
    fileType,
  };
}

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  mimetype: string,
  maxSizeOverride?: number
): ValidationResult {
  const fileType = detectFileType(mimetype);
  const maxSize = maxSizeOverride || FILE_SIZE_LIMITS[fileType as keyof typeof FILE_SIZE_LIMITS] || FILE_SIZE_LIMITS.default;

  if (size > maxSize) {
    return {
      valid: false,
      error: `File size ${formatBytes(size)} exceeds maximum allowed size of ${formatBytes(maxSize)} for ${fileType} files`,
      maxSize,
    };
  }

  return {
    valid: true,
    fileType,
    maxSize,
  };
}

/**
 * Validate filename
 */
export function validateFilename(filename: string): ValidationResult {
  // Check for null bytes
  if (filename.includes('\0')) {
    return {
      valid: false,
      error: 'Filename contains invalid characters',
    };
  }

  // Check for directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return {
      valid: false,
      error: 'Filename contains invalid path characters',
    };
  }

  // Check length
  if (filename.length > 255) {
    return {
      valid: false,
      error: 'Filename is too long (max 255 characters)',
    };
  }

  // Check if empty
  if (filename.trim().length === 0) {
    return {
      valid: false,
      error: 'Filename cannot be empty',
    };
  }

  return { valid: true };
}

/**
 * Complete file validation
 */
export function validateFile(
  filename: string,
  mimetype: string,
  size: number,
  maxSizeOverride?: number
): ValidationResult {
  // Validate filename
  const filenameResult = validateFilename(filename);
  if (!filenameResult.valid) {
    return filenameResult;
  }

  // Validate MIME type
  const mimeResult = validateMimeType(mimetype);
  if (!mimeResult.valid) {
    return mimeResult;
  }

  // Validate size
  const sizeResult = validateFileSize(size, mimetype, maxSizeOverride);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  return {
    valid: true,
    fileType: mimeResult.fileType,
    maxSize: sizeResult.maxSize,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const baseName = filename.split(/[/\\]/).pop() || filename;

  // Replace unsafe characters with underscores
  let sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Ensure it doesn't start with a dot (hidden file)
  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const nameWithoutExt = sanitized.substring(0, 255 - ext.length - 1);
    sanitized = `${nameWithoutExt}.${ext}`;
  }

  return sanitized || 'unnamed_file';
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Check if file is an image
 */
export function isImage(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.images.includes(mimetype);
}

/**
 * Check if file is a video
 */
export function isVideo(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.videos.includes(mimetype);
}

/**
 * Check if file is a document
 */
export function isDocument(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.documents.includes(mimetype);
}

/**
 * Check if file needs thumbnail generation
 */
export function needsThumbnail(mimetype: string): boolean {
  return isImage(mimetype) || isVideo(mimetype);
}

/**
 * Get recommended dimensions for thumbnail
 */
export function getThumbnailDimensions(mimetype: string): { width: number; height: number } {
  if (isImage(mimetype)) {
    return { width: 300, height: 300 };
  }
  if (isVideo(mimetype)) {
    return { width: 480, height: 270 }; // 16:9 aspect ratio
  }
  return { width: 200, height: 200 };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  DANGEROUS_MIME_TYPES,
  FILE_SIZE_LIMITS,
  detectFileType,
  validateMimeType,
  validateFileSize,
  validateFilename,
  validateFile,
  formatBytes,
  sanitizeFilename,
  getFileExtension,
  isImage,
  isVideo,
  isDocument,
  needsThumbnail,
  getThumbnailDimensions,
};
