import { Resolver, FieldResolver, Root, Ctx } from 'type-graphql';
import { Pool } from 'pg';
import { MethodologyEdgeType } from '../entities/MethodologyEdgeType';
import { Methodology } from '../entities/Methodology';

@Resolver(MethodologyEdgeType)
export class MethodologyEdgeTypeResolver {
  @FieldResolver(() => Methodology)
  async methodology(@Root() edgeType: MethodologyEdgeType, @Ctx() { pool }: { pool: Pool }): Promise<Methodology> {
    const result = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [edgeType.methodology_id]);
    return result.rows[0];
  }
}
