import { gql } from '@apollo/client';

export const GET_MEDIA_PROCESSING_STATUS = gql`
  query GetMediaProcessingStatus($jobId: String!) {
    mediaProcessingJob(jobId: $jobId) {
      jobId
      fileId
      status
      progress
      error
      result
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
