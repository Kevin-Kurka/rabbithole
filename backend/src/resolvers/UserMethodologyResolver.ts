import { Resolver, Query, Mutation, Arg, Ctx, Subscription, Root, FieldResolver, ID } from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { UserMethodologyProgress, MethodologyPermission, Methodology, Graph, User, MethodologyPermissionLevel } from '../types/GraphTypes';

const WORKFLOW_PROGRESS_UPDATED = 'WORKFLOW_PROGRESS_UPDATED';

interface Context {
  pool: Pool;
  pubSub: PubSubEngine;
  userId?: string;
}

@Resolver(() => UserMethodologyProgress)
export class UserMethodologyProgressResolver {
  @FieldResolver(() => User)
  async user(@Root() progress: any, @Ctx() { pool }: Context): Promise<User> {
    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [progress.user_id]);
    return User.fromNode(result.rows[0]);
  }

  @FieldResolver(() => Graph)
  async graph(@Root() progress: any, @Ctx() { pool }: Context): Promise<Graph> {
    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Graph'`,
      [progress.graph_id]
    );
    const node = result.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
    return { id: node.id, ...props, created_at: node.created_at, updated_at: node.updated_at };
  }

  @FieldResolver(() => Methodology)
  async methodology(@Root() progress: any, @Ctx() { pool }: Context): Promise<Methodology> {
    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Methodology'`,
      [progress.methodology_id]
    );
    const node = result.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
    return { id: node.id, ...props, created_at: node.created_at, updated_at: node.updated_at };
  }

  @Query(() => UserMethodologyProgress, { nullable: true })
  async myMethodologyProgress(
    @Arg('graph_id', () => ID) graphId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<UserMethodologyProgress | null> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // We assume progress is stored as a Node of type 'MethodologyProgress'
    // linked to User, Graph, Methodology via props.
    // Or maybe we should use Edges?
    // For simplicity and consistency with previous code, let's use a Node.
    // We need to find a Node of type 'MethodologyProgress' where props->>'user_id' = userId AND props->>'graph_id' = graphId

    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'MethodologyProgress'
       AND n.props->>'user_id' = $1 
       AND n.props->>'graph_id' = $2`,
      [userId, graphId]
    );

    if (result.rows.length === 0) return null;

    const node = result.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;

    return {
      id: node.id,
      ...props,
      last_active_at: node.updated_at
    };
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

    // Check if graph exists
    const graphCheck = await pool.query(
      `SELECT n.* FROM public."Nodes" n JOIN public."NodeTypes" nt ON n.node_type_id = nt.id WHERE n.id = $1 AND nt.name = 'Graph'`,
      [graphId]
    );
    if (!graphCheck.rows[0]) {
      throw new Error('Graph not found');
    }

    // Check if methodology exists
    const methodologyCheck = await pool.query(
      `SELECT n.* FROM public."Nodes" n JOIN public."NodeTypes" nt ON n.node_type_id = nt.id WHERE n.id = $1 AND nt.name = 'Methodology'`,
      [methodologyId]
    );
    if (!methodologyCheck.rows[0]) {
      throw new Error('Methodology not found');
    }

    // Get or create 'MethodologyProgress' node type
    let nodeTypeId: string;
    const typeCheck = await pool.query(`SELECT id FROM public."NodeTypes" WHERE name = 'MethodologyProgress'`);
    if (typeCheck.rows.length > 0) {
      nodeTypeId = typeCheck.rows[0].id;
    } else {
      // Create it if it doesn't exist (should be in migration, but safe fallback)
      const newType = await pool.query(`INSERT INTO public."NodeTypes" (name, description) VALUES ('MethodologyProgress', 'Tracks user progress in a methodology') RETURNING id`);
      nodeTypeId = newType.rows[0].id;
    }

    // Check if progress already exists
    const existing = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       WHERE n.node_type_id = $1
       AND n.props->>'user_id' = $2 
       AND n.props->>'graph_id' = $3`,
      [nodeTypeId, userId, graphId]
    );

    let node;
    const props = {
      user_id: userId,
      graph_id: graphId,
      methodology_id: methodologyId,
      current_step: 0,
      completed_steps: [],
      step_data: {},
      status: 'active',
      completion_percentage: 0
    };

    if (existing.rows.length > 0) {
      // Update existing
      node = existing.rows[0];
      const existingProps = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
      // Update methodology if changed, reset status if needed?
      // Original logic: DO UPDATE SET methodology_id = $3, current_step = $4, status = $7, last_active_at = NOW()
      existingProps.methodology_id = methodologyId;
      existingProps.current_step = 0;
      existingProps.status = 'active';

      await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(existingProps), node.id]
      );
      node.props = existingProps;
    } else {
      // Create new
      const result = await pool.query(
        `INSERT INTO public."Nodes" (node_type_id, props, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
        [nodeTypeId, JSON.stringify(props)]
      );
      node = result.rows[0];
    }

    const finalProps = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
    return {
      id: node.id,
      ...finalProps,
      last_active_at: node.updated_at
    };
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

    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'MethodologyProgress'
       AND n.props->>'user_id' = $1 
       AND n.props->>'graph_id' = $2`,
      [userId, graphId]
    );

    if (!result.rows[0]) {
      throw new Error('Workflow progress not found');
    }

    const node = result.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;

    const currentStepData = props.step_data || {};
    const updatedStepData = { ...currentStepData, [stepId]: stepData ? JSON.parse(stepData) : null };
    props.step_data = updatedStepData;

    await pool.query(
      `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(props), node.id]
    );

    const updatedProgress = {
      id: node.id,
      ...props,
      last_active_at: new Date() // Approximate
    };

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

    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'MethodologyProgress'
       AND n.props->>'user_id' = $1 
       AND n.props->>'graph_id' = $2`,
      [userId, graphId]
    );

    if (!result.rows[0]) {
      throw new Error('Workflow progress not found');
    }

    const node = result.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;

    const completedSteps = props.completed_steps || [];
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }
    props.completed_steps = completedSteps;

    // Get workflow to calculate completion percentage
    // Workflow is in Methodology props
    const methResult = await pool.query(
      `SELECT n.props FROM public."Nodes" n WHERE id = $1`,
      [props.methodology_id]
    );

    let completionPercentage = 0;
    if (methResult.rows[0]) {
      const methProps = typeof methResult.rows[0].props === 'string' ? JSON.parse(methResult.rows[0].props) : methResult.rows[0].props;
      if (methProps.workflow && methProps.workflow.steps) {
        const totalSteps = methProps.workflow.steps.length;
        completionPercentage = Math.round((completedSteps.length / totalSteps) * 100);
      }
    }

    props.completion_percentage = completionPercentage;
    if (completionPercentage === 100) {
      props.status = 'completed';
      props.completed_at = new Date().toISOString();
    }

    await pool.query(
      `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(props), node.id]
    );

    const updatedProgress = {
      id: node.id,
      ...props,
      last_active_at: new Date()
    };

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

    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'MethodologyProgress'
       AND n.props->>'user_id' = $1 
       AND n.props->>'graph_id' = $2`,
      [userId, graphId]
    );

    if (result.rows[0]) {
      const node = result.rows[0];
      const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
      props.status = 'abandoned';
      await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(props), node.id]
      );
    }

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

@Resolver(() => MethodologyPermission)
export class MethodologyPermissionResolver {
  @FieldResolver(() => Methodology)
  async methodology(@Root() permission: any, @Ctx() { pool }: Context): Promise<Methodology> {
    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Methodology'`,
      [permission.methodology_id]
    );
    const node = result.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
    return { id: node.id, ...props, created_at: node.created_at, updated_at: node.updated_at };
  }

  @FieldResolver(() => User)
  async user(@Root() permission: any, @Ctx() { pool }: Context): Promise<User> {
    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [permission.user_id]);
    return User.fromNode(result.rows[0]);
  }

  @FieldResolver(() => User, { nullable: true })
  async shared_by_user(@Root() permission: any, @Ctx() { pool }: Context): Promise<User | null> {
    if (!permission.shared_by) return null;
    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [permission.shared_by]);
    return User.fromNode(result.rows[0]);
  }
}
