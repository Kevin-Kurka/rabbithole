import { mediaQueueService } from '../services/MediaQueueService';
import { doclingService } from '../services/DoclingProcessingService';
import { audioTranscriptionService } from '../services/AudioTranscriptionService';
import { videoAnalysisService } from '../services/VideoAnalysisService';

/**
 * Auto-detect media type from MIME type and enqueue processing
 *
 * This function is called after uploading a file to automatically
 * queue appropriate processing based on file type.
 *
 * @param fileId - Database ID of the file
 * @param mimetype - MIME type of the file
 * @param filename - Original filename
 */
export async function autoEnqueueMediaProcessing(
  fileId: string,
  mimetype: string,
  filename: string
): Promise<void> {
  try {
    // Determine processing type from MIME type
    let processingType: 'document' | 'audio' | 'video' | null = null;
    let options: any = {};

    // Document types
    if (
      mimetype.includes('pdf') ||
      mimetype.includes('word') ||
      mimetype.includes('document') ||
      mimetype.includes('presentation') ||
      mimetype.includes('spreadsheet') ||
      doclingService.isSupportedFormat(filename)
    ) {
      processingType = 'document';
      options = {
        extractTables: true,
        extractFigures: true,
        extractSections: true,
        outputFormat: 'markdown',
      };
    }
    // Audio types
    else if (
      mimetype.includes('audio') ||
      audioTranscriptionService.isSupportedFormat(filename)
    ) {
      processingType = 'audio';
      options = {
        transcribe: true,
        speakerDiarization: false,
      };
    }
    // Video types
    else if (
      mimetype.includes('video') ||
      videoAnalysisService.isSupportedFormat(filename)
    ) {
      processingType = 'video';
      options = {
        extractFrames: false, // Can be enabled on demand
        extractAudio: false,
        detectScenes: false,
        generateThumbnail: true,
      };
    }

    // Enqueue processing if type is supported
    if (processingType) {
      console.log(`Auto-enqueuing ${processingType} processing for file ${fileId}`);

      await mediaQueueService.enqueueMediaProcessing(
        fileId,
        processingType,
        options,
        5 // Default priority
      );

      console.log(`✓ ${processingType} processing queued for ${fileId}`);
    } else {
      console.log(`No automatic processing for file type: ${mimetype}`);
    }
  } catch (error: any) {
    console.error(`Failed to auto-enqueue media processing:`, error.message);
    // Don't throw error - file upload should succeed even if processing fails to queue
  }
}

/**
 * Get MIME type category for a file
 */
export function getMediaCategory(mimetype: string, filename: string): 'document' | 'audio' | 'video' | 'image' | 'other' {
  if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('presentation') || mimetype.includes('spreadsheet')) {
    return 'document';
  }
  if (mimetype.includes('audio')) {
    return 'audio';
  }
  if (mimetype.includes('video')) {
    return 'video';
  }
  if (mimetype.includes('image')) {
    return 'image';
  }
  return 'other';
}
