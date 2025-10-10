import { Resolver, Mutation, Arg, Ctx, PubSub, Subscription, Root } from 'type-graphql';
import { Comment } from '../entities/Comment';
import { CommentInput } from './GraphInput';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { User } from '../entities/User';

const NEW_COMMENT = "NEW_COMMENT";

@Resolver(Comment)
export class CommentResolver {
  @Mutation(() => Comment)
  async createComment(
    @Arg("input") { targetId, text }: CommentInput,
    @Ctx() { pool, pubSub }: { pool: Pool, pubSub: PubSubEngine },
    @Ctx() { user }: { user: User } // Assuming user is available in context after authentication
  ): Promise<Comment> {
    const result = await pool.query(
      'INSERT INTO public."Comments" (text, author_id, target_node_id) VALUES ($1, $2, $3) RETURNING *',
      [text, user.id, targetId] // Assuming targetId is a node for now
    );
    const newComment = result.rows[0];
    // Fetch author details for the new comment
    const authorResult = await pool.query('SELECT id, username, email FROM public."Users" WHERE id = $1', [user.id]);
    newComment.author = authorResult.rows[0];
    await pubSub.publish(NEW_COMMENT, newComment);
    return newComment;
  }

  @Subscription(() => Comment, {
    topics: NEW_COMMENT,
  })
  newComment(@Root() comment: Comment): Comment {
    return comment;
  }
}
