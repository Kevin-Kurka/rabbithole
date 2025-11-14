import { gql } from '@apollo/client';

// Types
export interface EvidenceFile {
  id: string;
  evidence_id: string;
  file_type: string;
  is_primary: boolean;
  storage_provider: string;
  storage_key: string;
  storage_bucket?: string;
  storage_region?: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  original_filename: string;
  file_extension: string;
  encoding?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnail_storage_key?: string;
  has_preview: boolean;
  processing_status: string;
  virus_scan_status: string;
  virus_scan_date?: Date;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  download_count: number;
  last_accessed?: Date;
  access_policy?: {
    require_auth: boolean;
  };
}

export interface Evidence {
  id: string;
  target_node_id?: string;
  target_edge_id?: string;
  source_id: string;
  evidence_type: string;
  weight: number;
  confidence: number;
  content?: string;
  temporal_relevance: number;
  decay_rate: number;
  is_verified: boolean;
  peer_review_status: string;
  peer_review_count: number;
  submitted_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface EvidenceWithFiles extends Evidence {
  files: EvidenceFile[];
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all files for a specific evidence
 */
export const GET_EVIDENCE_FILES = gql`
  query GetEvidenceFiles($evidenceId: ID!) {
    getEvidenceFiles(evidenceId: $evidenceId) {
      id
      evidence_id
      file_type
      is_primary
      storage_provider
      storage_key
      storage_bucket
      storage_region
      file_hash
      file_size
      mime_type
      original_filename
      file_extension
      encoding
      dimensions {
        width
        height
      }
      thumbnail_storage_key
      has_preview
      processing_status
      virus_scan_status
      virus_scan_date
      uploaded_by
      created_at
      updated_at
      deleted_at
      download_count
      last_accessed
      access_policy {
        require_auth
      }
    }
  }
`;

/**
 * Get signed download URL for a file
 */
export const GET_FILE_DOWNLOAD_URL = gql`
  query GetFileDownloadUrl($fileId: ID!, $expiresIn: Int) {
    getFileDownloadUrl(fileId: $fileId, expiresIn: $expiresIn)
  }
`;

/**
 * Get all evidence files for a node (with their evidence)
 */
export const GET_NODE_EVIDENCE_FILES = gql`
  query GetNodeEvidenceFiles($nodeId: ID!) {
    getNodeEvidence(nodeId: $nodeId) {
      id
      target_node_id
      evidence_type
      weight
      confidence
      content
      is_verified
      peer_review_status
      created_at
      files: getEvidenceFiles(evidenceId: id) {
        id
        file_type
        is_primary
        file_size
        mime_type
        original_filename
        file_extension
        has_preview
        thumbnail_storage_key
        created_at
        uploaded_by
      }
    }
  }
`;

/**
 * Get all evidence files for an edge (with their evidence)
 */
export const GET_EDGE_EVIDENCE_FILES = gql`
  query GetEdgeEvidenceFiles($edgeId: ID!) {
    getEdgeEvidence(edgeId: $edgeId) {
      id
      target_edge_id
      evidence_type
      weight
      confidence
      content
      is_verified
      peer_review_status
      created_at
      files: getEvidenceFiles(evidenceId: id) {
        id
        file_type
        is_primary
        file_size
        mime_type
        original_filename
        file_extension
        has_preview
        thumbnail_storage_key
        created_at
        uploaded_by
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Upload file to evidence
 */
export const UPLOAD_EVIDENCE_FILE = gql`
  mutation UploadEvidenceFile(
    $evidenceId: ID!
    $file: Upload!
    $isPrimary: Boolean
  ) {
    uploadEvidenceFile(
      evidenceId: $evidenceId
      file: $file
      isPrimary: $isPrimary
    ) {
      id
      evidence_id
      file_type
      is_primary
      storage_provider
      storage_key
      file_hash
      file_size
      mime_type
      original_filename
      file_extension
      dimensions {
        width
        height
      }
      thumbnail_storage_key
      has_preview
      processing_status
      virus_scan_status
      created_at
      uploaded_by
    }
  }
`;

/**
 * Delete evidence file
 */
export const DELETE_EVIDENCE_FILE = gql`
  mutation DeleteEvidenceFile($fileId: ID!, $reason: String) {
    deleteEvidenceFile(fileId: $fileId, reason: $reason)
  }
`;

/**
 * Attach link/URL as evidence to node or edge
 */
export const ATTACH_LINK_EVIDENCE = gql`
  mutation AttachLinkEvidence($input: AttachLinkInput!) {
    attachLinkEvidence(input: $input) {
      id
      target_node_id
      target_edge_id
      source_id
      evidence_type
      weight
      confidence
      content
      is_verified
      peer_review_status
      created_at
    }
  }
`;

// Input type for attaching links
export interface AttachLinkInput {
  nodeId?: string;
  edgeId?: string;
  url: string;
  title: string;
  description?: string;
}

// ============================================================================
// NODE ASSOCIATIONS & REFERENCES
// ============================================================================

/**
 * Process an external reference with AI
 */
export const PROCESS_REFERENCE = gql`
  mutation ProcessReference($input: ProcessReferenceInput!) {
    processReference(input: $input) {
      nodeId
      title
      confidence
      content
      metadata {
        sourceUrl
        scrapedAt
        wordCount
        author
        publishDate
        domain
      }
    }
  }
`;

/**
 * Add a node association (edge between two nodes)
 */
export const ADD_NODE_ASSOCIATION = gql`
  mutation AddNodeAssociation($input: AddNodeAssociationInput!) {
    addNodeAssociation(input: $input) {
      id
      sourceNodeId
      targetNodeId
      confidence
      relationshipType
      createdAt
      targetNode {
        id
        title
        type
        veracity
      }
    }
  }
`;

/**
 * Add a reference or citation to a node
 */
export const ADD_REFERENCE = gql`
  mutation AddReference($input: AddReferenceInput!) {
    addReference(input: $input) {
      id
      nodeId
      url
      title
      description
      type
      confidence
      createdAt
      processedNodeId
    }
  }
`;

/**
 * Get all node associations for a node
 */
export const GET_NODE_ASSOCIATIONS = gql`
  query GetNodeAssociations($nodeId: ID!) {
    getNodeAssociations(nodeId: $nodeId) {
      id
      sourceNodeId
      targetNodeId
      confidence
      relationshipType
      createdAt
      targetNode {
        id
        title
        type
        veracity
      }
    }
  }
`;

/**
 * Get all references for a node
 */
export const GET_NODE_REFERENCES = gql`
  query GetNodeReferences($nodeId: ID!, $type: String) {
    getNodeReferences(nodeId: $nodeId, type: $type) {
      id
      nodeId
      url
      title
      description
      type
      confidence
      createdAt
      processedNodeId
    }
  }
`;

// TypeScript interfaces for the new types
export interface ProcessReferenceInput {
  url: string;
  parentNodeId: string;
  additionalContext?: string;
  type?: string;
}

export interface AddNodeAssociationInput {
  sourceNodeId: string;
  targetNodeId: string;
  confidence?: number;
  relationshipType?: string;
}

export interface AddReferenceInput {
  nodeId: string;
  url: string;
  title: string;
  description?: string;
  type?: string;
}

export interface NodeAssociation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  confidence: number;
  relationshipType?: string;
  createdAt: Date;
  targetNode: {
    id: string;
    title: string;
    type: string;
    veracity: number;
  };
}

export interface NodeReference {
  id: string;
  nodeId: string;
  url: string;
  title: string;
  description?: string;
  type: string;
  confidence?: number;
  createdAt: Date;
  processedNodeId?: string;
}
