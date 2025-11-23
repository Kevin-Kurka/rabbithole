/**
 * Graph Type Definitions
 *
 * Defines types for graph visualization and manipulation
 * using React Flow and the knowledge graph system.
 */

import { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';

/**
 * Graph levels for veracity and edit permissions
 * @deprecated Use weight-based checks instead (weight >= 0.90 for high credibility)
 */
export enum GraphLevel {
  /** Level 0: Verified, read-only nodes/edges */
  LEVEL_0 = 0,
  /** Level 1: Editable nodes/edges with veracity scores */
  LEVEL_1 = 1,
}

/**
 * Check if a node/edge has high credibility (replaces Level 0 check)
 */
export const isHighCredibility = (weight: number): boolean => {
  return weight >= 0.90;
};

/**
 * Check if a node/edge should be locked (based on weight)
 */
export const shouldBeLocked = (weight: number): boolean => {
  return isHighCredibility(weight);
};

/**
 * Get GraphLevel enum value from weight (for backward compatibility)
 * @deprecated Components should use weight directly, not level
 */
export const getLevelFromWeight = (weight: number): GraphLevel => {
  return isHighCredibility(weight) ? GraphLevel.LEVEL_0 : GraphLevel.LEVEL_1;
};

/**
 * Backend node structure from GraphQL
 */
export interface GraphNode {
  id: string;
  weight: number;
  props: string; // JSON string containing node properties
  level?: GraphLevel;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Backend edge structure from GraphQL
 */
export interface GraphEdge {
  id: string;
  from: {
    id: string;
  };
  to: {
    id: string;
  };
  weight: number;
  props: string; // JSON string containing edge properties
  level?: GraphLevel;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Graph structure from backend
 */
export interface Graph {
  id: string;
  name: string;
  description?: string;
  methodologyId?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    id: string;
    name: string;
  };
}

/**
 * Custom data for React Flow nodes
 */
export interface NodeData {
  label: string;
  weight: number;
  level: GraphLevel;
  methodology?: string;
  isLocked: boolean;
  graphId?: string; // ID of the graph this node belongs to
  graphColor?: string; // Color indicator for multi-graph overlay
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Custom data for React Flow edges
 */
export interface EdgeData {
  label?: string;
  weight: number;
  level: GraphLevel;
  isLocked: boolean;
  graphId?: string; // ID of the graph this edge belongs to
  graphColor?: string; // Color indicator for multi-graph overlay
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Extended React Flow Node type with our custom data
 */
export type GraphCanvasNode = FlowNode<NodeData>;

/**
 * Extended React Flow Edge type with our custom data
 */
export type GraphCanvasEdge = FlowEdge<EdgeData>;

/**
 * Context menu actions
 */
export enum ContextMenuAction {
  CREATE_NODE = 'create_node',
  EDIT = 'edit',
  DELETE = 'delete',
  DUPLICATE = 'duplicate',
  COPY = 'copy',
  PASTE = 'paste',
  CHANGE_TYPE = 'change_type',
  LOCK = 'lock',
  UNLOCK = 'unlock',
  VIEW_DETAILS = 'view_details',
}

/**
 * Context menu item configuration
 */
export interface ContextMenuItem {
  id: ContextMenuAction;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
}

/**
 * Context menu state
 */
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetType: 'node' | 'edge' | 'canvas' | null;
  targetId: string | null;
}

/**
 * Undo/Redo history item
 */
export interface HistoryItem {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  timestamp: number;
  action: string;
}

/**
 * Graph canvas props
 */
export interface GraphCanvasProps {
  graphIds: string[]; // Changed from graphId to support multiple graphs
  onSave?: (nodes: GraphCanvasNode[], edges: GraphCanvasEdge[]) => void;
  onError?: (error: Error) => void;
  onNodeSelect?: (node: GraphCanvasNode | null) => void;
  onEdgeSelect?: (edge: GraphCanvasEdge | null) => void;
  readOnly?: boolean;
  initialNodes?: GraphCanvasNode[];
  initialEdges?: GraphCanvasEdge[];
  methodologyId?: string;
  showMinimap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  className?: string;
  // Collaboration props
  activeUsers?: import('@/types/collaboration').ActiveUser[];
  onCursorMove?: (x: number, y: number) => void;
}

/**
 * Veracity score color mapping
 */
export interface VeracityColorScheme {
  level0: string; // Verified (weight = 1.0)
  high: string; // High confidence (0.7-0.99)
  medium: string; // Medium confidence (0.4-0.69)
  low: string; // Low confidence (0.1-0.39)
  provisional: string; // Provisional (0-0.09)
}

/**
 * Node/Edge input for mutations
 */
export interface NodeInput {
  graphId: string;
  props: string;
  weight?: number;
}

export interface EdgeInput {
  graphId: string;
  from: string;
  to: string;
  props: string;
  weight?: number;
}
