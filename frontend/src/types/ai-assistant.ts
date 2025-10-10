/**
 * TypeScript types for AI Assistant and GraphRAG features
 */

export interface SimilarNode {
  id: string;
  props: Record<string, any>;
  meta?: Record<string, any>;
  nodeType: string;
  similarity: number;
  weight: number;
}

export interface SubgraphNode {
  id: string;
  props: Record<string, any>;
  meta?: Record<string, any>;
  nodeType: string;
  weight: number;
  depth: number;
}

export interface SubgraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  props: Record<string, any>;
}

export interface Subgraph {
  nodes: SubgraphNode[];
  edges: SubgraphEdge[];
  anchorNodeIds: string[];
}

export interface CitedNode {
  id: string;
  props: Record<string, any>;
  relevance: string;
}

export interface AssistantResponse {
  answer: string;
  citedNodes: CitedNode[];
  subgraph: Subgraph;
}

export interface FindSimilarNodesInput {
  graphId: string;
  query: string;
  selectedNodeIds?: string[];
  limit?: number;
}

export interface AskAssistantInput {
  graphId: string;
  query: string;
  selectedNodeIds?: string[];
  expansionDepth?: number;
  topK?: number;
}

export interface EvidenceSuggestion {
  type: 'source' | 'document' | 'data' | 'expert' | 'experiment';
  description: string;
  searchQuery: string;
  priority: number;
  rationale: string;
}

export interface ComplianceIssue {
  type: string;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  nodeId?: string;
  edgeId?: string;
  suggestion?: string;
}

export interface ComplianceReport {
  graphId: string;
  methodologyId: string;
  methodologyName: string;
  complianceScore: number;
  isCompliant: boolean;
  issues: ComplianceIssue[];
  totalNodes: number;
  totalEdges: number;
  missingRequiredNodeTypes: number;
  invalidEdgeConnections: number;
  overallAssessment: string;
  generatedAt: Date;
}

/**
 * AI Chat message type
 */
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citedNodes?: CitedNode[];
  timestamp: number;
}

/**
 * AI Assistant state
 */
export interface AIAssistantState {
  messages: AIMessage[];
  loading: boolean;
  error: string | null;
  remainingRequests: number;
  suggestedPrompts: string[];
}
