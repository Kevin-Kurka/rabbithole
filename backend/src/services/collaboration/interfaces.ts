/**
 * Collaboration System Service Interfaces
 *
 * Core interfaces for the real-time collaboration system including
 * presence management, conflict resolution, and activity tracking.
 */

import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';

// =====================================================
// Core Types and Enums
// =====================================================

export enum Permission {
  VIEW = 'view',
  EDIT = 'edit',
  ADMIN = 'admin'
}

export enum PresenceStatus {
  ONLINE = 'online',
  IDLE = 'idle',
  OFFLINE = 'offline'
}

export enum ActionType {
  NODE_CREATED = 'node_created',
  NODE_UPDATED = 'node_updated',
  NODE_DELETED = 'node_deleted',
  EDGE_CREATED = 'edge_created',
  EDGE_UPDATED = 'edge_updated',
  EDGE_DELETED = 'edge_deleted',
  COMMENT_ADDED = 'comment_added',
  GRAPH_SHARED = 'graph_shared',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left'
}

export enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  UPDATE = 'update',
  MOVE = 'move',
  TRANSFORM = 'transform'
}

export enum LockType {
  READ = 'read',
  WRITE = 'write',
  EXCLUSIVE = 'exclusive'
}

// =====================================================
// Data Models
// =====================================================

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface CursorPosition {
  nodeId?: string;
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface UserPresenceData {
  userId: string;
  graphId: string;
  sessionId: string;
  status: PresenceStatus;
  cursorPosition?: CursorPosition;
  selectedNodes?: string[];
  selectedEdges?: string[];
  viewport?: Viewport;
  lastHeartbeat: Date;
  user?: User; // Populated user data
}

export interface GraphShare {
  id: string;
  graphId: string;
  userId: string;
  permission: Permission;
  sharedBy: string;
  sharedAt: Date;
  expiresAt?: Date;
}

export interface GraphInvitation {
  id: string;
  graphId: string;
  email: string;
  permission: Permission;
  token: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface GraphActivity {
  id: string;
  graphId: string;
  userId: string;
  actionType: ActionType;
  entityType?: 'node' | 'edge' | 'comment' | 'graph' | 'user';
  entityId?: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
  createdAt: Date;
  user?: User; // Populated user data
}

export interface GraphLock {
  id: string;
  graphId: string;
  userId: string;
  lockType: LockType;
  entityType?: 'graph' | 'node' | 'edge';
  entityId?: string;
  acquiredAt: Date;
  expiresAt: Date;
  releasedAt?: Date;
}

export interface Operation {
  id: string;
  type: OperationType;
  entityType: 'node' | 'edge' | 'property';
  entityId?: string;
  path?: string[]; // Property path for nested updates
  value?: any;
  oldValue?: any;
  position?: number; // For ordered operations
  timestamp: number;
  userId: string;
  sessionId: string;
}

export interface TransformResult {
  operation: Operation;
  transformed: boolean;
  conflicts?: ConflictInfo[];
}

export interface ConflictInfo {
  type: 'value' | 'delete' | 'position';
  localOp: Operation;
  remoteOp: Operation;
  resolution: 'local' | 'remote' | 'merge';
  mergedValue?: any;
}

export interface CollaborationSession {
  id: string;
  sessionId: string;
  graphId: string;
  userId: string;
  websocketId?: string;
  ipAddress?: string;
  userAgent?: string;
  startedAt: Date;
  endedAt?: Date;
  lastActivity: Date;
  operationsCount: number;
  bytesSent: number;
  bytesReceived: number;
}

// =====================================================
// Service Interfaces
// =====================================================

/**
 * Manages user presence and cursor tracking
 */
export interface IPresenceService {
  /**
   * Track a user joining a graph
   */
  join(userId: string, graphId: string, sessionId: string): Promise<void>;

  /**
   * Track a user leaving a graph
   */
  leave(userId: string, graphId: string, sessionId: string): Promise<void>;

  /**
   * Update user's cursor position
   */
  updateCursor(
    userId: string,
    graphId: string,
    position: CursorPosition
  ): Promise<void>;

  /**
   * Update user's selection
   */
  updateSelection(
    userId: string,
    graphId: string,
    nodes: string[],
    edges: string[]
  ): Promise<void>;

  /**
   * Update user's viewport
   */
  updateViewport(
    userId: string,
    graphId: string,
    viewport: Viewport
  ): Promise<void>;

  /**
   * Process heartbeat from user
   */
  heartbeat(userId: string, graphId: string, sessionId: string): Promise<void>;

  /**
   * Get all active users in a graph
   */
  getActiveUsers(graphId: string): Promise<UserPresenceData[]>;

  /**
   * Clean up expired presence records
   */
  cleanupExpired(): Promise<void>;
}

/**
 * Coordinates collaborative editing operations
 */
export interface ICollaborationService {
  /**
   * Initialize a collaboration session
   */
  createSession(
    userId: string,
    graphId: string,
    websocketId?: string
  ): Promise<CollaborationSession>;

  /**
   * End a collaboration session
   */
  endSession(sessionId: string): Promise<void>;

  /**
   * Submit an operation for processing
   */
  submitOperation(
    sessionId: string,
    operation: Operation
  ): Promise<TransformResult>;

  /**
   * Get operation history for a graph
   */
  getOperationHistory(
    graphId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<Operation[]>;

  /**
   * Acquire a lock on an entity
   */
  acquireLock(
    userId: string,
    graphId: string,
    entityType: 'graph' | 'node' | 'edge',
    entityId: string,
    lockType: LockType
  ): Promise<GraphLock>;

  /**
   * Release a lock
   */
  releaseLock(lockId: string): Promise<void>;

  /**
   * Check if an entity is locked
   */
  isLocked(
    entityType: 'graph' | 'node' | 'edge',
    entityId: string
  ): Promise<boolean>;
}

/**
 * Logs and retrieves graph activity
 */
export interface IActivityService {
  /**
   * Log an activity
   */
  logActivity(
    graphId: string,
    userId: string,
    actionType: ActionType,
    entityType?: string,
    entityId?: string,
    oldData?: any,
    newData?: any,
    metadata?: any
  ): Promise<GraphActivity>;

  /**
   * Get activity feed for a graph
   */
  getActivityFeed(
    graphId: string,
    limit?: number,
    offset?: number,
    userId?: string,
    actionTypes?: ActionType[]
  ): Promise<GraphActivity[]>;

  /**
   * Get activity summary for a graph
   */
  getActivitySummary(
    graphId: string,
    period?: 'hour' | 'day' | 'week' | 'month'
  ): Promise<{
    totalActions: number;
    uniqueUsers: number;
    actionBreakdown: Record<ActionType, number>;
  }>;

  /**
   * Archive old activity records
   */
  archiveOldActivity(daysToKeep: number): Promise<number>;
}

/**
 * Manages notifications and alerts
 */
export interface INotificationService {
  /**
   * Send a real-time notification
   */
  sendRealtime(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<void>;

  /**
   * Queue an email notification
   */
  queueEmail(
    userId: string,
    subject: string,
    body: string,
    data?: any
  ): Promise<void>;

  /**
   * Send batch notifications
   */
  sendBatch(
    userIds: string[],
    notification: {
      type: string;
      title: string;
      message: string;
    }
  ): Promise<void>;

  /**
   * Get user's notification preferences
   */
  getPreferences(
    userId: string,
    graphId?: string
  ): Promise<{
    emailEnabled: boolean;
    pushEnabled: boolean;
    notificationTypes: Record<string, boolean>;
  }>;

  /**
   * Update notification preferences
   */
  updatePreferences(
    userId: string,
    preferences: Partial<{
      emailEnabled: boolean;
      pushEnabled: boolean;
      notificationTypes: Record<string, boolean>;
    }>,
    graphId?: string
  ): Promise<void>;
}

/**
 * Manages graph sharing and permissions
 */
export interface ISharingService {
  /**
   * Share a graph with a user
   */
  shareGraph(
    graphId: string,
    userId: string,
    permission: Permission,
    sharedBy: string,
    expiresAt?: Date
  ): Promise<GraphShare>;

  /**
   * Create an invitation to collaborate
   */
  createInvitation(
    graphId: string,
    email: string,
    permission: Permission,
    invitedBy: string
  ): Promise<GraphInvitation>;

  /**
   * Accept an invitation
   */
  acceptInvitation(
    token: string,
    userId: string
  ): Promise<GraphShare>;

  /**
   * Reject an invitation
   */
  rejectInvitation(token: string): Promise<void>;

  /**
   * Revoke access to a graph
   */
  revokeAccess(
    graphId: string,
    userId: string
  ): Promise<void>;

  /**
   * Update user's permission level
   */
  updatePermission(
    graphId: string,
    userId: string,
    permission: Permission
  ): Promise<GraphShare>;

  /**
   * Get all users with access to a graph
   */
  getGraphCollaborators(
    graphId: string
  ): Promise<Array<GraphShare & { user: User }>>;

  /**
   * Check if a user has access to a graph
   */
  hasAccess(
    userId: string,
    graphId: string,
    requiredPermission?: Permission
  ): Promise<boolean>;

  /**
   * Get all graphs shared with a user
   */
  getSharedGraphs(userId: string): Promise<GraphShare[]>;
}

// =====================================================
// Operational Transform Engine
// =====================================================

/**
 * Handles conflict resolution using Operational Transform
 */
export interface IOperationalTransform {
  /**
   * Transform an operation against another operation
   */
  transform(
    op1: Operation,
    op2: Operation,
    priority: 'local' | 'remote'
  ): TransformResult;

  /**
   * Compose multiple operations into one
   */
  compose(operations: Operation[]): Operation;

  /**
   * Invert an operation (for undo)
   */
  invert(operation: Operation): Operation;

  /**
   * Apply an operation to a state
   */
  apply(state: any, operation: Operation): any;

  /**
   * Validate an operation
   */
  validate(operation: Operation): boolean;
}

// =====================================================
// WebSocket Protocol
// =====================================================

export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
  sessionId: string;
}

export enum MessageType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HEARTBEAT = 'heartbeat',

  // Presence
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  CURSOR_MOVED = 'cursor_moved',
  SELECTION_CHANGED = 'selection_changed',
  VIEWPORT_CHANGED = 'viewport_changed',

  // Operations
  OPERATION = 'operation',
  OPERATION_ACK = 'operation_ack',
  OPERATION_REJECT = 'operation_reject',

  // Sync
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response',

  // Notifications
  NOTIFICATION = 'notification',
  ACTIVITY = 'activity',

  // Errors
  ERROR = 'error'
}

// =====================================================
// Service Factory
// =====================================================

export interface CollaborationServiceConfig {
  pool: Pool;
  pubSub: PubSubEngine;
  redis: any; // Redis client
}

export interface ICollaborationServiceFactory {
  createPresenceService(config: CollaborationServiceConfig): IPresenceService;
  createCollaborationService(config: CollaborationServiceConfig): ICollaborationService;
  createActivityService(config: CollaborationServiceConfig): IActivityService;
  createNotificationService(config: CollaborationServiceConfig): INotificationService;
  createSharingService(config: CollaborationServiceConfig): ISharingService;
  createOTEngine(): IOperationalTransform;
}