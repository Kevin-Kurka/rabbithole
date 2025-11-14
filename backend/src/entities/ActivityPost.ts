import { ObjectType, Field, ID, Int } from 'type-graphql';
import { User } from './User';
import { Node } from './Node';
import { EvidenceFile } from './EvidenceFile';

@ObjectType()
export class ActivityPost {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  node_id!: string;

  @Field(() => Node, { nullable: true })
  node?: Node;

  @Field(() => ID)
  author_id!: string;

  @Field(() => User, { nullable: true })
  author?: User;

  @Field()
  content!: string;

  @Field(() => [ID], { nullable: true })
  mentioned_node_ids?: string[];

  @Field(() => [Node], { nullable: true })
  mentionedNodes?: Node[];

  @Field(() => [ID], { nullable: true })
  attachment_ids?: string[];

  @Field(() => [EvidenceFile], { nullable: true })
  attachments?: EvidenceFile[];

  @Field()
  is_reply!: boolean;

  @Field(() => ID, { nullable: true })
  parent_post_id?: string;

  @Field(() => ActivityPost, { nullable: true })
  parentPost?: ActivityPost;

  @Field()
  is_share!: boolean;

  @Field(() => ID, { nullable: true })
  shared_post_id?: string;

  @Field(() => ActivityPost, { nullable: true })
  sharedPost?: ActivityPost;

  // Computed fields
  @Field(() => Int)
  replyCount!: number;

  @Field(() => Int)
  shareCount!: number;

  @Field(() => String)
  reactionCounts!: string; // JSONB as string, e.g., {"like": 5, "love": 2}

  @Field(() => Int)
  totalReactionCount!: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field({ nullable: true })
  deleted_at?: Date;

  // User-specific fields (optional, populated based on context)
  @Field(() => Boolean, { nullable: true })
  hasUserLiked?: boolean;

  @Field(() => [String], { nullable: true })
  userReactions?: string[]; // List of reaction types the current user has given
}

@ObjectType()
export class ActivityReaction {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  post_id!: string;

  @Field(() => ID)
  user_id!: string;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field()
  reaction_type!: string;

  @Field()
  created_at!: Date;
}

// Input types for mutations
import { InputType } from 'type-graphql';

@InputType()
export class CreatePostInput {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  content!: string;

  @Field(() => [ID], { nullable: true })
  mentionedNodeIds?: string[];

  @Field(() => [ID], { nullable: true })
  attachmentIds?: string[];
}

@InputType()
export class ReplyToPostInput {
  @Field(() => ID)
  parentPostId!: string;

  @Field()
  content!: string;

  @Field(() => [ID], { nullable: true })
  mentionedNodeIds?: string[];

  @Field(() => [ID], { nullable: true })
  attachmentIds?: string[];
}

@InputType()
export class SharePostInput {
  @Field(() => ID)
  postId!: string;

  @Field({ nullable: true })
  comment?: string; // Optional comment when sharing
}
