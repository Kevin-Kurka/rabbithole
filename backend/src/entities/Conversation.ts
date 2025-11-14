import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';
import { User } from './User';
import { Graph } from './Graph';

/**
 * Message role enum
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

registerEnumType(MessageRole, {
  name: 'MessageRole',
  description: 'Role of the message sender in a conversation',
});

/**
 * Conversation entity
 * Represents an AI conversation session
 */
@ObjectType()
export class Conversation {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => ID, { nullable: true })
  graphId?: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  metadata?: string; // JSON string

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  // Resolved fields
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Graph, { nullable: true })
  graph?: Graph;

  @Field(() => [ConversationMessage], { nullable: true })
  messages?: ConversationMessage[];

  @Field(() => Number, { nullable: true })
  messageCount?: number;
}

/**
 * ConversationMessage entity
 * Represents a single message within a conversation
 */
@ObjectType()
export class ConversationMessage {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  conversationId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => MessageRole)
  role!: MessageRole;

  @Field()
  content!: string;

  @Field({ nullable: true })
  metadata?: string; // JSON string

  @Field()
  createdAt!: Date;

  // Resolved fields
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Conversation, { nullable: true })
  conversation?: Conversation;
}

/**
 * SearchableNode - For semantic search results
 */
@ObjectType()
export class SearchableNode {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  props!: string; // JSON string

  @Field({ nullable: true })
  meta?: string; // JSON string

  @Field({ nullable: true })
  nodeType?: string;

  @Field(() => Number)
  weight!: number;

  @Field(() => Number, { nullable: true })
  similarity?: number;
}

/**
 * ConversationalAI Response
 */
@ObjectType()
export class ConversationalAIResponse {
  @Field(() => ID)
  conversationId!: string;

  @Field()
  response!: string;

  @Field(() => [SearchableNode])
  relevantNodes!: SearchableNode[];

  @Field(() => ID)
  messageId!: string;

  @Field(() => Conversation, { nullable: true })
  conversation?: Conversation;
}
