import { gql } from '@apollo/client';

/**
 * Fragment for file data used across queries
 * Includes all fields needed by the UniversalFileViewer
 */
export const FILE_FRAGMENT = gql`
  fragment FileData on File {
    id
    name
    mimeType
    size
    url
    nodeId
    uploadedBy
    createdAt
    updatedAt
  }
`;

export const GET_FILE = gql`
  ${FILE_FRAGMENT}
  query GetFile($id: ID!) {
    file(id: $id) {
      ...FileData
    }
  }
`;

export const GET_NODE_FILES = gql`
  ${FILE_FRAGMENT}
  query GetNodeFiles($nodeId: ID!) {
    nodeFiles(nodeId: $nodeId) {
      ...FileData
    }
  }
`;

/**
 * Query multiple files by their IDs
 * Useful for batch loading files in a list
 */
export const GET_FILES_BY_IDS = gql`
  ${FILE_FRAGMENT}
  query GetFilesByIds($ids: [ID!]!) {
    filesByIds(ids: $ids) {
      ...FileData
    }
  }
`;

/**
 * Query files with metadata for evidence
 * Includes file data plus evidence-specific metadata
 */
export const GET_EVIDENCE_FILES = gql`
  ${FILE_FRAGMENT}
  query GetEvidenceFiles($evidenceId: ID!) {
    evidenceFiles(evidenceId: $evidenceId) {
      ...FileData
      metadata
    }
  }
`;

export const UPLOAD_FILE = gql`
  mutation UploadFile($input: FileUploadInput!) {
    uploadFile(input: $input) {
      id
      name
      mimeType
      size
      url
      nodeId
      createdAt
    }
  }
`;

export const DELETE_FILE = gql`
  mutation DeleteFile($id: ID!) {
    deleteFile(id: $id)
  }
`;
