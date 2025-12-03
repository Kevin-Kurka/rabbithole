import { Resolver, FieldResolver, Root, Ctx } from 'type-graphql';
import { Pool } from 'pg';
import { MethodologyNodeType, Methodology } from '../types/GraphTypes';

@Resolver(() => MethodologyNodeType)
export class MethodologyNodeTypeResolver {
  @FieldResolver(() => Methodology)
  async methodology(@Root() nodeType: any, @Ctx() { pool }: { pool: Pool }): Promise<Methodology> {
    if (!nodeType.methodology_id) {
      throw new Error("Cannot resolve methodology: methodology_id missing on node type");
    }

    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Methodology'`,
      [nodeType.methodology_id]
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
}
