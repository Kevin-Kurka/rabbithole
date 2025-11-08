import { gql } from '@apollo/client';

/**
 * GraphQL Queries and Mutations for Annotations and Deception Detection
 */

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all annotations for a node/article
 */
export const GET_ANNOTATIONS = gql`
  query GetAnnotations($nodeId: ID!) {
    getAnnotations(nodeId: $nodeId) {
      id
      targetNodeId: target_node_id
      startOffset: start_offset
      endOffset: end_offset
      highlightedText: highlighted_text
      annotationType: annotation_type
      deceptionType: deception_type
      confidence
      explanation
      userNotes: user_notes
      color
      severity
      createdBy: created_by
      isAiGenerated: is_ai_generated
      status
      votes
      createdAt: created_at
      updatedAt: updated_at
    }
  }
`;

/**
 * Get detailed deception analysis for an annotation
 */
export const GET_DECEPTION_ANALYSIS = gql`
  query GetDeceptionAnalysis($annotationId: ID!) {
    getDeceptionAnalysis(annotationId: $annotationId) {
      id
      annotationId: annotation_id
      targetNodeId: target_node_id
      fallacyType: fallacy_type
      explanation
      supportingContext: supporting_context
      suggestedCorrection: suggested_correction
      contradictingSources: contradicting_sources
      supportingSources: supporting_sources
      severityScore: severity_score
      confidence
      aiModel: ai_model
      aiRawResponse: ai_raw_response
      createdAt: created_at
    }
  }
`;

/**
 * Get article trustworthiness score
 */
export const GET_ARTICLE_TRUSTWORTHINESS = gql`
  query GetArticleTrustworthinessScore($nodeId: ID!) {
    getArticleTrustworthinessScore(nodeId: $nodeId)
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Analyze article for deception and logical fallacies
 */
export const ANALYZE_ARTICLE_FOR_DECEPTION = gql`
  mutation AnalyzeArticleForDeception($nodeId: ID!) {
    analyzeArticleForDeception(nodeId: $nodeId) {
      overallScore
      deceptionCount
      fallacyCount
      deceptions {
        text
        startOffset
        endOffset
        fallacyType
        fallacyName
        explanation
        severity
        confidence
        surroundingContext
        suggestedCorrection
        contradictingSources
      }
      summary
      recommendations
      aiModel
      analysisTimestamp
    }
  }
`;

/**
 * Create a manual annotation (user highlight/note)
 */
export const CREATE_ANNOTATION = gql`
  mutation CreateAnnotation(
    $nodeId: ID!
    $startOffset: Int!
    $endOffset: Int!
    $highlightedText: String!
    $annotationType: String!
    $userNotes: String
    $color: String
  ) {
    createAnnotation(
      nodeId: $nodeId
      startOffset: $startOffset
      endOffset: $endOffset
      highlightedText: $highlightedText
      annotationType: $annotationType
      userNotes: $userNotes
      color: $color
    ) {
      id
      targetNodeId: target_node_id
      startOffset: start_offset
      endOffset: end_offset
      highlightedText: highlighted_text
      annotationType: annotation_type
      userNotes: user_notes
      color
      createdBy: created_by
      status
      createdAt: created_at
    }
  }
`;

/**
 * Vote on an annotation
 */
export const VOTE_ON_ANNOTATION = gql`
  mutation VoteOnAnnotation($annotationId: ID!, $vote: Int!) {
    voteOnAnnotation(annotationId: $annotationId, vote: $vote) {
      id
      votes
      updatedAt: updated_at
    }
  }
`;

/**
 * Dispute an AI-generated annotation
 */
export const DISPUTE_ANNOTATION = gql`
  mutation DisputeAnnotation($annotationId: ID!, $reason: String!) {
    disputeAnnotation(annotationId: $annotationId, reason: $reason) {
      id
      status
      userNotes: user_notes
      updatedAt: updated_at
    }
  }
`;

/**
 * Delete an annotation (only owner)
 */
export const DELETE_ANNOTATION = gql`
  mutation DeleteAnnotation($annotationId: ID!) {
    deleteAnnotation(annotationId: $annotationId)
  }
`;

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface Annotation {
  id: string;
  targetNodeId: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  annotationType: string;
  deceptionType?: string;
  confidence?: number;
  explanation?: string;
  userNotes?: string;
  color: string;
  severity?: 'low' | 'medium' | 'high';
  createdBy?: string;
  isAiGenerated: boolean;
  status: string;
  votes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeceptionAnalysis {
  id: string;
  annotationId: string;
  targetNodeId: string;
  fallacyType: string;
  explanation: string;
  supportingContext?: string;
  suggestedCorrection?: string;
  contradictingSources?: string; // JSON string
  supportingSources?: string; // JSON string
  severityScore: number;
  confidence: number;
  aiModel?: string;
  aiRawResponse?: string; // JSON string
  createdAt: string;
}

export interface DeceptionMatch {
  text: string;
  startOffset: number;
  endOffset: number;
  fallacyType: string;
  fallacyName: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  surroundingContext: string;
  suggestedCorrection?: string;
  contradictingSources?: string; // JSON string
}

export interface ArticleAnalysisResult {
  overallScore: number;
  deceptionCount: number;
  fallacyCount: number;
  deceptions: DeceptionMatch[];
  summary: string;
  recommendations: string[];
  aiModel: string;
  analysisTimestamp: string;
}

// Query/Mutation Variables
export interface GetAnnotationsVariables {
  nodeId: string;
}

export interface GetDeceptionAnalysisVariables {
  annotationId: string;
}

export interface GetArticleTrustworthinessVariables {
  nodeId: string;
}

export interface AnalyzeArticleVariables {
  nodeId: string;
}

export interface CreateAnnotationVariables {
  nodeId: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  annotationType: string;
  userNotes?: string;
  color?: string;
}

export interface VoteOnAnnotationVariables {
  annotationId: string;
  vote: number; // 1 or -1
}

export interface DisputeAnnotationVariables {
  annotationId: string;
  reason: string;
}

export interface DeleteAnnotationVariables {
  annotationId: string;
}

// Query/Mutation Data types
export interface GetAnnotationsData {
  getAnnotations: Annotation[];
}

export interface GetDeceptionAnalysisData {
  getDeceptionAnalysis: DeceptionAnalysis | null;
}

export interface GetArticleTrustworthinessData {
  getArticleTrustworthinessScore: number;
}

export interface AnalyzeArticleData {
  analyzeArticleForDeception: ArticleAnalysisResult;
}

export interface CreateAnnotationData {
  createAnnotation: Annotation;
}

export interface VoteOnAnnotationData {
  voteOnAnnotation: Annotation;
}

export interface DisputeAnnotationData {
  disputeAnnotation: Annotation;
}

export interface DeleteAnnotationData {
  deleteAnnotation: boolean;
}
