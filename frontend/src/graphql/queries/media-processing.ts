import { gql } from '@apollo/client';

export const GET_MEDIA_PROCESSING_STATUS = gql`
  query GetMediaProcessingStatus($fileId: ID!) {
    getMediaProcessingStatus(fileId: $fileId) {
      fileId
      status
      progress
      startedAt
      completedAt
      processingTime
      error
      result {
        extractedText
        tableCount
        figureCount
        sectionCount
        transcript
        language
        duration
        frameCount
        sceneCount
        ocrText
        tables
        figures
        sections
        frames
        scenes
      }
    }
  }
`;

export const GET_MEDIA_FILES = gql`
  query GetMediaFiles($filter: MediaFileFilter, $limit: Int, $offset: Int) {
    getMediaFiles(filter: $filter, limit: $limit, offset: $offset) {
      files {
        fileId
        filename
        size
        mimeType
        type
        uploadedAt
        status
        progress
        thumbnailUrl
      }
      total
      hasMore
    }
  }
`;

export const GET_MEDIA_FILE_DETAILS = gql`
  query GetMediaFileDetails($fileId: ID!) {
    getMediaFileDetails(fileId: $fileId) {
      fileId
      filename
      size
      mimeType
      type
      uploadedAt
      status
      progress
      processingTime
      thumbnailUrl
      downloadUrl
      result {
        extractedText
        tableCount
        figureCount
        sectionCount
        transcript
        language
        duration
        frameCount
        sceneCount
        ocrText
        tables
        figures
        sections
        frames
        scenes
      }
    }
  }
`;

export const SEARCH_MEDIA_CONTENT = gql`
  query SearchMediaContent($query: String!, $type: String, $limit: Int) {
    searchMediaContent(query: $query, type: $type, limit: $limit) {
      fileId
      filename
      type
      snippet
      relevance
      uploadedAt
    }
  }
`;
