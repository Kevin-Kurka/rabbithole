import { Resolver, Query, Mutation, Arg, Ctx, Subscription, Root, FieldResolver, ID } from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { UserMethodologyProgress, MethodologyPermission } from '../entities/UserMethodology';
import { User } from '../entities/User';
import { Graph } from '../entities/Graph';
import { Methodology } from '../entities/Methodology';

const WORKFLOW_PROGRESS_UPDATED = 'WORKFLOW_PROGRESS_UPDATED';

interface Context {
  pool: Pool;
  pubSub: PubSubEngine;
  userId?: string;
}

@Resolver(UserMethodologyProgress)
export class UserMethodologyProgressResolver {
  @FieldResolver(() => User)
  async user(@Root() progress: UserMethodologyProgress, @Ctx() { pool }: Context): Promise<User> {
    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [progress.user_id]);
    return result.rows[0];
  }

  @FieldResolver(() => Graph)
  async graph(@Root() progress: UserMethodologyProgress, @Ctx() { pool }: Context): Promise<Graph> {
    const result = await pool.query('SELECT * FROM public."Graphs" WHERE id = $1', [progress.graph_id]);
    return result.rows[0];
  }

  @FieldResolver(() => Methodology)
  async methodology(@Root() progress: UserMethodologyProgress, @Ctx() { pool }: Context): Promise<Methodology> {
    const result = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [progress.methodology_id]);
    return result.rows[0];
  }

  @Query(() => UserMethodologyProgress, { nullable: true })
  async myMethodologyProgress(
    @Arg('graph_id', () => ID) graphId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<UserMethodologyProgress | null> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const result = await pool.query(
      'SELECT * FROM public."UserMethodologyProgress" WHERE user_id = $1 AND graph_id = $2',
      [userId, graphId]
    );

    return result.rows[0] || null;
  }

  @Mutation(() => UserMethodologyProgress)
  async startMethodologyWorkflow(
    @Arg('graph_id', () => ID) graphId: string,
    @Arg('methodology_id', () => ID) methodologyId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<UserMethodologyProgress> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check if graph exists and user has access
    const graphCheck = await pool.query('SELECT * FROM public."Graphs" WHERE id = $1', [graphId]);
    if (!graphCheck.rows[0]) {
      throw new Error('Graph not found');
    }

    // Check if methodology exists
    const methodologyCheck = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [methodologyId]);
    if (!methodologyCheck.rows[0]) {
      throw new Error('Methodology not found');
    }

    const result = await pool.query(
      `INSERT INTO public."UserMethodologyProgress"
       (user_id, graph_id, methodology_id, current_step, completed_steps, step_data, status, completion_percentage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, graph_id)
       DO UPDATE SET methodology_id = $3, current_step = $4, status = $7, last_active_at = NOW()
       RETURNING *`,
      [userId, graphId, methodologyId, 0, '[]', '{}', 'active', 0]
    );

    return result.rows[0];
  }

  @Mutation(() => UserMethodologyProgress)
  async updateWorkflowProgress(
    @Arg('graph_id', () => ID) graphId: string,
    @Arg('step_id') stepId: string,
    @Arg('step_data', { nullable: true }) stepData: string,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<UserMethodologyProgress> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const current = await pool.query(
      'SELECT * FROM public."UserMethodologyProgress" WHERE user_id = $1 AND graph_id = $2',
      [userId, graphId]
    );

    if (!current.rows[0]) {
      throw new Error('Workflow progress not found');
    }

    const currentProgress = current.rows[0];
    const currentStepData = JSON.parse(currentProgress.step_data || '{}');
    const updatedStepData = { ...currentStepData, [stepId]: stepData ? JSON.parse(stepData) : null };

    const result = await pool.query(
      `UPDATE public."UserMethodologyProgress"
       SET step_data = $1, last_active_at = NOW()
       WHERE user_id = $2 AND graph_id = $3
       RETURNING *`,
      [JSON.stringify(updatedStepData), userId, graphId]
    );

    const updatedProgress = result.rows[0];
    await pubSub.publish(WORKFLOW_PROGRESS_UPDATED, updatedProgress);

    return updatedProgress;
  }

  @Mutation(() => UserMethodologyProgress)
  async completeWorkflowStep(
    @Arg('graph_id', () => ID) graphId: string,
    @Arg('step_id') stepId: string,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<UserMethodologyProgress> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const current = await pool.query(
      'SELECT * FROM public."UserMethodologyProgress" WHERE user_id = $1 AND graph_id = $2',
      [userId, graphId]
    );

    if (!current.rows[0]) {
      throw new Error('Workflow progress not found');
    }

    const currentProgress = current.rows[0];
    const completedSteps = JSON.parse(currentProgress.completed_steps || '[]');

    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    // Get workflow to calculate completion percentage
    const workflow = await pool.query(
      `SELECT mw.steps FROM public."MethodologyWorkflows" mw
       WHERE mw.methodology_id = $1`,
      [currentProgress.methodology_id]
    );

    let completionPercentage = 0;
    if (workflow.rows[0]) {
      const totalSteps = JSON.parse(workflow.rows[0].steps).length;
      completionPercentage = Math.round((completedSteps.length / totalSteps) * 100);
    }

    const status = completionPercentage === 100 ? 'completed' : 'active';
    const completedAt = completionPercentage === 100 ? new Date() : null;

    const result = await pool.query(
      `UPDATE public."UserMethodologyProgress"
       SET completed_steps = $1, completion_percentage = $2, status = $3, completed_at = $4, last_active_at = NOW()
       WHERE user_id = $5 AND graph_id = $6
       RETURNING *`,
      [JSON.stringify(completedSteps), completionPercentage, status, completedAt, userId, graphId]
    );

    const updatedProgress = result.rows[0];
    await pubSub.publish(WORKFLOW_PROGRESS_UPDATED, updatedProgress);

    return updatedProgress;
  }

  @Mutation(() => Boolean)
  async abandonWorkflow(
    @Arg('graph_id', () => ID) graphId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    await pool.query(
      `UPDATE public."UserMethodologyProgress"
       SET status = $1, last_active_at = NOW()
       WHERE user_id = $2 AND graph_id = $3`,
      ['abandoned', userId, graphId]
    );

    return true;
  }

  @Subscription(() => UserMethodologyProgress, {
    topics: WORKFLOW_PROGRESS_UPDATED,
    filter: ({ payload, args }) => payload.graph_id === args.graphId
  })
  workflowProgressUpdated(
    @Arg('graphId', () => ID) graphId: string,
    @Root() progress: UserMethodologyProgress
  ): UserMethodologyProgress {
    return progress;
  }
}

@Resolver(MethodologyPermission)
export class MethodologyPermissionResolver {
  @FieldResolver(() => Methodology)
  async methodology(@Root() permission: MethodologyPermission, @Ctx() { pool }: Context): Promise<Methodology> {
    const result = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [permission.methodology_id]);
    return result.rows[0];
  }

  @FieldResolver(() => User)
  async user(@Root() permission: MethodologyPermission, @Ctx() { pool }: Context): Promise<User> {
    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [permission.user_id]);
    return result.rows[0];
  }

  @FieldResolver(() => User, { nullable: true })
  async shared_by_user(@Root() permission: MethodologyPermission, @Ctx() { pool }: Context): Promise<User | null> {
    if (!permission.shared_by) return null;
    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [permission.shared_by]);
    return result.rows[0] || null;
  }
}
