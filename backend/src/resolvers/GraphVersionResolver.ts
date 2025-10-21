import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  ID,
  Int,
} from 'type-graphql';
import { Pool } from 'pg';
import {
  GraphVersion,
  GraphVersionHistory,
  GraphFork,
  GraphAncestor,
} from '../entities/GraphVersion';
import { Graph } from '../entities/Graph';
import { GraphVersionService } from '../services/GraphVersionService';

@Resolver(GraphVersion)
export class GraphVersionResolver {
  /**
   * Query: Get version history for a graph
   */
  @Query(() => [GraphVersionHistory])
  async graphVersionHistory(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<GraphVersionHistory[]> {
    const service = new GraphVersionService(pool);
    return service.getVersionHistory(graphId);
  }

  /**
   * Query: Get all forks of a graph
   */
  @Query(() => [GraphFork])
  async graphForks(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<GraphFork[]> {
    const service = new GraphVersionService(pool);
    return service.getGraphForks(graphId);
  }

  /**
   * Query: Get fork ancestry (parent chain) of a graph
   */
  @Query(() => [GraphAncestor])
  async graphAncestry(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<GraphAncestor[]> {
    const service = new GraphVersionService(pool);
    return service.getGraphAncestry(graphId);
  }

  /**
   * Query: Get a specific version snapshot
   */
  @Query(() => GraphVersion, { nullable: true })
  async graphVersion(
    @Arg('graphId', () => ID) graphId: string,
    @Arg('versionNumber', () => Int) versionNumber: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<GraphVersion | null> {
    const result = await pool.query(
      'SELECT * FROM public."GraphVersions" WHERE graph_id = $1 AND version_number = $2',
      [graphId, versionNumber]
    );

    return result.rows[0] || null;
  }

  /**
   * Mutation: Create a manual snapshot of a graph
   */
  @Mutation(() => GraphVersion)
  async createGraphSnapshot(
    @Arg('graphId', () => ID) graphId: string,
    @Arg('userId', () => ID, { nullable: true }) userId: string | undefined,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<GraphVersion> {
    const service = new GraphVersionService(pool);
    return service.createSnapshot(graphId, userId);
  }

  /**
   * Mutation: Fork a graph (create a copy with parent link)
   */
  @Mutation(() => Graph)
  async forkGraph(
    @Arg('graphId', () => ID) graphId: string,
    @Arg('newName') newName: string,
    @Arg('userId', () => ID, { nullable: true }) userId: string | undefined,
    @Arg('forkReason', { nullable: true }) forkReason: string | undefined,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<Graph> {
    const service = new GraphVersionService(pool);
    const forkedGraph = await service.forkGraph(
      graphId,
      newName,
      userId,
      forkReason
    );

    // Fetch complete graph with nodes and edges
    const nodesResult = await pool.query(
      'SELECT * FROM public."Nodes" WHERE graph_id = $1',
      [forkedGraph.id]
    );
    const edgesResult = await pool.query(
      'SELECT * FROM public."Edges" WHERE graph_id = $1',
      [forkedGraph.id]
    );

    forkedGraph.nodes = nodesResult.rows;
    forkedGraph.edges = edgesResult.rows;

    return forkedGraph;
  }

  /**
   * Mutation: Revert a graph to a specific version
   */
  @Mutation(() => Boolean)
  async revertGraph(
    @Arg('graphId', () => ID) graphId: string,
    @Arg('versionNumber', () => Int) versionNumber: number,
    @Arg('userId', () => ID, { nullable: true }) userId: string | undefined,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<boolean> {
    const service = new GraphVersionService(pool);
    return service.revertToVersion(graphId, versionNumber, userId);
  }

  /**
   * Mutation: Delete a specific version snapshot
   */
  @Mutation(() => Boolean)
  async deleteGraphVersion(
    @Arg('graphId', () => ID) graphId: string,
    @Arg('versionNumber', () => Int) versionNumber: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<boolean> {
    // Check if the version exists
    const versionCheck = await pool.query(
      'SELECT id FROM public."GraphVersions" WHERE graph_id = $1 AND version_number = $2',
      [graphId, versionNumber]
    );

    if (!versionCheck.rows[0]) {
      throw new Error(
        `Version ${versionNumber} not found for graph ${graphId}`
      );
    }

    // Delete the version
    await pool.query(
      'DELETE FROM public."GraphVersions" WHERE graph_id = $1 AND version_number = $2',
      [graphId, versionNumber]
    );

    return true;
  }
}
