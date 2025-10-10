import { Resolver, FieldResolver, Root, Ctx } from 'type-graphql';
import { Pool } from 'pg';
import { MethodologyWorkflow } from '../entities/MethodologyWorkflow';
import { Methodology } from '../entities/Methodology';
import { Graph } from '../entities/Graph';

@Resolver(MethodologyWorkflow)
export class MethodologyWorkflowResolver {
  @FieldResolver(() => Methodology)
  async methodology(@Root() workflow: MethodologyWorkflow, @Ctx() { pool }: { pool: Pool }): Promise<Methodology> {
    const result = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [workflow.methodology_id]);
    return result.rows[0];
  }

  @FieldResolver(() => Graph, { nullable: true })
  async example_graph(@Root() workflow: MethodologyWorkflow, @Ctx() { pool }: { pool: Pool }): Promise<Graph | null> {
    if (!workflow.example_graph_id) return null;
    const result = await pool.query('SELECT * FROM public."Graphs" WHERE id = $1', [workflow.example_graph_id]);
    return result.rows[0] || null;
  }
}
