import { gql } from '@apollo/client';

export const GET_FILE = gql`
  query GetFile($id: ID!) {
    file(id: $id) {
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
  }
`;

export const GET_NODE_FILES = gql`
  query GetNodeFiles($nodeId: ID!) {
    nodeFiles(nodeId: $nodeId) {
      id
      name
      mimeType
      size
      url
      uploadedBy
      createdAt
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
