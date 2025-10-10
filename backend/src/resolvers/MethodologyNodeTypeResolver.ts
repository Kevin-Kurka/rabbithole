import { Resolver, FieldResolver, Root, Ctx } from 'type-graphql';
import { Pool } from 'pg';
import { MethodologyNodeType } from '../entities/MethodologyNodeType';
import { Methodology } from '../entities/Methodology';

@Resolver(MethodologyNodeType)
export class MethodologyNodeTypeResolver {
  @FieldResolver(() => Methodology)
  async methodology(@Root() nodeType: MethodologyNodeType, @Ctx() { pool }: { pool: Pool }): Promise<Methodology> {
    const result = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [nodeType.methodology_id]);
    return result.rows[0];
  }
}
