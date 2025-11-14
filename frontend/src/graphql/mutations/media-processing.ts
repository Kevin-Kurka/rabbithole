import { gql } from '@apollo/client';

export const PROCESS_DOCUMENT = gql`
  mutation ProcessDocument(
    $fileId: ID!
    $extractTables: Boolean
    $extractFigures: Boolean
    $extractSections: Boolean
  ) {
    processDocument(
      fileId: $fileId
      extractTables: $extractTables
      extractFigures: $extractFigures
      extractSections: $extractSections
    ) {
      success
      fileId
      extractedText
      tableCount
      figureCount
      sectionCount
      processingTime
    }
  }
`;

export const PROCESS_AUDIO = gql`
  mutation ProcessAudio(
    $fileId: ID!
    $transcribe: Boolean
    $detectLanguage: Boolean
  ) {
    processAudio(
      fileId: $fileId
      transcribe: $transcribe
      detectLanguage: $detectLanguage
    ) {
      success
      fileId
      transcript
      language
      duration
      processingTime
    }
  }
`;

export const PROCESS_VIDEO = gql`
  mutation ProcessVideo(
    $fileId: ID!
    $extractFrames: Boolean
    $performOcr: Boolean
    $detectScenes: Boolean
    $fps: Int
  ) {
    processVideo(
      fileId: $fileId
      extractFrames: $extractFrames
      performOcr: $performOcr
      detectScenes: $detectScenes
      fps: $fps
    ) {
      success
      fileId
      frameCount
      sceneCount
      ocrText
      duration
      processingTime
    }
  }
`;

export const UPLOAD_MEDIA_FILE = gql`
  mutation UploadMediaFile($file: Upload!, $type: String!) {
    uploadMediaFile(file: $file, type: $type) {
      success
      fileId
      filename
      size
      mimeType
      uploadedAt
    }
  }
`;

export const CANCEL_PROCESSING_JOB = gql`
  mutation CancelProcessingJob($fileId: ID!) {
    cancelProcessingJob(fileId: $fileId) {
      success
      message
    }
  }
`;

export const RETRY_PROCESSING_JOB = gql`
  mutation RetryProcessingJob($fileId: ID!) {
    retryProcessingJob(fileId: $fileId) {
      success
      message
    }
  }
`;
