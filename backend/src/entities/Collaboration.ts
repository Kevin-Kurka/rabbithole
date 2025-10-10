/**
 * Collaboration Entities for Real-Time Features
 * TypeGraphQL object types for GraphQL schema
 */

import { ObjectType, Field, ID, Int, registerEnumType } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';

// =====================================================
// Enums
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
  PERMISSION_CHANGED = 'permission_changed',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left'
}

// Register enums for GraphQL
registerEnumType(Permission, {
  name: 'Permission',
  description: 'Graph access permission levels'
});

registerEnumType(PresenceStatus, {
  name: 'PresenceStatus',
  description: 'User presence status'
});

registerEnumType(ActionType, {
  name: 'ActionType',
  description: 'Types of graph activities'
});

// =====================================================
// Object Types
// =====================================================

@ObjectType()
export class CursorPosition {
  @Field({ nullable: true })
  nodeId?: string;

  @Field()
  x!: number;

  @Field()
  y!: number;
}

@ObjectType()
export class Viewport {
  @Field()
  x!: number;

  @Field()
  y!: number;

  @Field()
  zoom!: number;
}

@ObjectType()
export class GraphShare {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  graphId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => Permission)
  permission!: Permission;

  @Field(() => ID)
  sharedBy!: string;

  @Field()
  sharedAt!: Date;

  @Field({ nullable: true })
  expiresAt?: Date;
}

@ObjectType()
export class GraphInvitation {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  graphId!: string;

  @Field()
  email!: string;

  @Field(() => Permission)
  permission!: Permission;

  @Field()
  token!: string;

  @Field(() => ID)
  invitedBy!: string;

  @Field()
  invitedAt!: Date;

  @Field()
  expiresAt!: Date;

  @Field()
  status!: string; // 'pending' | 'accepted' | 'rejected' | 'expired'

  @Field({ nullable: true })
  acceptedAt?: Date;
}

@ObjectType()
export class UserPresence {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => ID)
  graphId!: string;

  @Field()
  sessionId!: string;

  @Field(() => PresenceStatus)
  status!: PresenceStatus;

  @Field(() => GraphQLJSON, { nullable: true })
  cursorPosition?: any;

  @Field(() => [String], { nullable: true })
  selectedNodes?: string[];

  @Field(() => [String], { nullable: true })
  selectedEdges?: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  viewport?: any;

  @Field()
  lastHeartbeat!: Date;

  @Field()
  connectedAt!: Date;

  @Field({ nullable: true })
  disconnectedAt?: Date;
}

@ObjectType()
export class GraphActivity {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  graphId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => ActionType)
  actionType!: ActionType;

  @Field({ nullable: true })
  entityType?: string;

  @Field(() => ID, { nullable: true })
  entityId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  oldData?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  newData?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class CollaborationSession {
  @Field(() => ID)
  id!: string;

  @Field()
  sessionId!: string;

  @Field(() => ID)
  graphId!: string;

  @Field(() => ID)
  userId!: string;

  @Field({ nullable: true })
  websocketId?: string;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field({ nullable: true })
  userAgent?: string;

  @Field()
  startedAt!: Date;

  @Field({ nullable: true })
  endedAt?: Date;

  @Field()
  lastActivity!: Date;

  @Field(() => Int)
  operationsCount!: number;

  @Field(() => Int)
  bytesSent!: number;

  @Field(() => Int)
  bytesReceived!: number;
}

// =====================================================
// Subscription Payload Types
// =====================================================

@ObjectType()
export class PresenceUpdate {
  @Field(() => ID)
  userId!: string;

  @Field()
  username!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  cursor?: { x: number; y: number; nodeId?: string };

  @Field()
  action!: string; // 'joined' | 'left' | 'moved'

  @Field()
  timestamp!: Date;
}

@ObjectType()
export class CursorUpdate {
  @Field(() => ID)
  userId!: string;

  @Field()
  username!: string;

  @Field()
  x!: number;

  @Field()
  y!: number;

  @Field({ nullable: true })
  nodeId?: string;

  @Field()
  timestamp!: Date;
}

@ObjectType()
export class ChatMessage {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field()
  username!: string;

  @Field()
  message!: string;

  @Field()
  timestamp!: Date;

  @Field(() => ID)
  graphId!: string;
}
