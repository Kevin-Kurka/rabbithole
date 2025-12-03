import { Resolver, FieldResolver, Root, Ctx } from 'type-graphql';
import { Pool } from 'pg';
import { MethodologyWorkflow, Methodology, Graph } from '../types/GraphTypes';

@Resolver(() => MethodologyWorkflow)
export class MethodologyWorkflowResolver {
  @FieldResolver(() => Methodology)
  async methodology(@Root() workflow: any, @Ctx() { pool }: { pool: Pool }): Promise<Methodology> {
    // workflow object from JSON might not have methodology_id directly if it's just the workflow part.
    // However, if we are resolving this, we assume we have context.
    // If workflow is embedded in Methodology, we don't need to fetch methodology.
    // But if this resolver is called, it means we are asking for the parent.
    // We need to ensure methodology_id is passed.

    if (!workflow.methodology_id) {
      throw new Error("Cannot resolve methodology: methodology_id missing on workflow");
    }

    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Methodology'`,
      [workflow.methodology_id]
    );

    if (result.rows.length === 0) {
      throw new Error("Methodology not found");
    }

    const node = result.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;

    return {
      id: node.id,
      ...props,
      created_at: node.created_at,
      updated_at: node.updated_at
    };
  }

  @FieldResolver(() => Graph, { nullable: true })
  async example_graph(@Root() workflow: any, @Ctx() { pool }: { pool: Pool }): Promise<Graph | null> {
    if (!workflow.example_graph_id) return null;

    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Graph'`,
      [workflow.example_graph_id]
    );

    if (result.rows.length === 0) return null;

    const node = result.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;

    return {
      id: node.id,
      ...props,
      created_at: node.created_at,
      updated_at: node.updated_at
    };
  }
}
