/**
 * Type definitions for media processing system
 */

export type MediaType = "document" | "audio" | "video" | "image";

export type ProcessingStatus = "queued" | "processing" | "completed" | "failed";

export interface MediaFile {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  type: MediaType;
  uploadedAt: string;
  status: ProcessingStatus;
  progress: number;
  thumbnailUrl?: string;
  downloadUrl?: string;
}

export interface DocumentProcessingOptions {
  extractTables: boolean;
  extractFigures: boolean;
  extractSections: boolean;
}

export interface AudioProcessingOptions {
  transcribe: boolean;
  detectLanguage: boolean;
}

export interface VideoProcessingOptions {
  extractFrames: boolean;
  performOcr: boolean;
  detectScenes: boolean;
  fps: number;
}

export interface ProcessingOptions
  extends DocumentProcessingOptions,
    AudioProcessingOptions,
    VideoProcessingOptions {}

export interface DocumentResult {
  extractedText?: string;
  tableCount?: number;
  figureCount?: number;
  sectionCount?: number;
  tables?: Array<{
    content: string;
    page: number;
    rows: number;
    columns: number;
  }>;
  figures?: Array<{
    url: string;
    caption?: string;
    page: number;
  }>;
  sections?: Array<{
    title: string;
    level: number;
    content: string;
    page: number;
  }>;
}

export interface AudioResult {
  transcript?: string;
  language?: string;
  duration?: number;
  timestamps?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export interface VideoResult {
  duration?: number;
  frameCount?: number;
  sceneCount?: number;
  ocrText?: string;
  frames?: Array<{
    url: string;
    timestamp: number;
    width: number;
    height: number;
  }>;
  scenes?: Array<{
    startTime: number;
    endTime: number;
    description?: string;
    keyFrame?: string;
  }>;
}

export type ProcessingResult = DocumentResult | AudioResult | VideoResult;

export interface ProcessingJobStatus {
  fileId: string;
  status: ProcessingStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  processingTime?: number;
  error?: string;
  result?: ProcessingResult;
}

export interface MediaFileFilter {
  type?: MediaType;
  status?: ProcessingStatus;
  uploadedAfter?: string;
  uploadedBefore?: string;
}

export interface MediaFilesResponse {
  files: MediaFile[];
  total: number;
  hasMore: boolean;
}

export interface SearchResult {
  fileId: string;
  filename: string;
  type: MediaType;
  snippet: string;
  relevance: number;
  uploadedAt: string;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ProcessingResponse {
  success: boolean;
  fileId: string;
  message?: string;
  processingTime?: number;
}
