import { Resolver, Query, Mutation, Arg, Ctx, InputType, Field, ID } from 'type-graphql';
import { Node } from '../entities/Node';
import { Context } from '../types/context';

@InputType()
class CreateArticleInput {
  @Field()
  graphId!: string;

  @Field()
  title!: string;

  @Field()
  narrative!: string;

  @Field(() => [String], { nullable: true })
  referencedNodeIds?: string[]; // IDs of nodes to reference via edges
}

@InputType()
class UpdateArticleInput {
  @Field(() => ID)
  articleId!: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  narrative?: string;

  @Field(() => [String], { nullable: true })
  referencedNodeIds?: string[];
}

@InputType()
class PublishArticleInput {
  @Field(() => ID)
  articleId!: string;
}

@Resolver(() => Node)
export class ArticleResolver {
  @Query(() => [Node])
  async getArticles(
    @Arg('graphId', () => ID, { nullable: true }) graphId: string | undefined,
    @Arg('published', { nullable: true }) published: boolean | undefined,
    @Ctx() { pool }: Context
  ): Promise<Node[]> {
    try {
      let sql = `
        SELECT
          n.*,
          nt.name as node_type_name
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE nt.name = 'Article'
      `;
      const params: any[] = [];

      if (graphId) {
        params.push(graphId);
        sql += ` AND n.props->>'graphId' = $${params.length}`;
      }

      if (published !== undefined) {
        if (published) {
          sql += ` AND n.props->>'publishedAt' IS NOT NULL`;
        } else {
          sql += ` AND n.props->>'publishedAt' IS NULL`;
        }
      }

      sql += ` ORDER BY n.created_at DESC`;

      const result = await pool.query(sql, params);

      return result.rows.map(row => this.mapRowToNode(row));
    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  }

  @Query(() => Node, { nullable: true })
  async getArticle(
    @Arg('articleId', () => ID) articleId: string,
    @Ctx() { pool }: Context
  ): Promise<Node | null> {
    try {
      const sql = `
        SELECT
          n.*,
          nt.name as node_type_name
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE n.id = $1 AND nt.name = 'Article'
      `;

      const result = await pool.query(sql, [articleId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToNode(result.rows[0]);
    } catch (error) {
      console.error('Error fetching article:', error);
      return null;
    }
  }

  @Mutation(() => Node)
  async createArticle(
    @Arg('input') input: CreateArticleInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Node> {
    if (!userId) {
      throw new Error('Authentication required to create article');
    }

    try {
      // Get Article node type ID
      const nodeTypeResult = await pool.query(
        `SELECT id FROM public."NodeTypes" WHERE name = 'Article'`
      );

      if (nodeTypeResult.rows.length === 0) {
        throw new Error('Article node type not found');
      }

      const articleNodeTypeId = nodeTypeResult.rows[0].id;

      // Create the article node using props-only schema
      const props = {
        graphId: input.graphId,
        title: input.title,
        narrative: input.narrative,
        authorId: userId,
        createdBy: userId,
        weight: 0.5
      };

      const sql = `
        INSERT INTO public."Nodes" (
          node_type_id,
          props,
          created_at,
          updated_at
        ) VALUES ($1, $2, NOW(), NOW())
        RETURNING *
      `;

      const result = await pool.query(sql, [
        articleNodeTypeId,
        JSON.stringify(props)
      ]);

      const articleNode = this.mapRowToNode(result.rows[0]);

      // Create edges to referenced nodes if provided
      if (input.referencedNodeIds && input.referencedNodeIds.length > 0) {
        await this.createReferencedEdges(
          pool,
          articleNode.id,
          input.graphId,
          input.referencedNodeIds,
          userId
        );
      }

      return articleNode;
    } catch (error) {
      console.error('Error creating article:', error);
      throw new Error('Failed to create article');
    }
  }

  @Mutation(() => Node)
  async updateArticle(
    @Arg('input') input: UpdateArticleInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Node> {
    if (!userId) {
      throw new Error('Authentication required to update article');
    }

    try {
      // Check if user has permission to edit
      const checkSql = `
        SELECT props FROM public."Nodes"
        WHERE id = $1
      `;
      const checkResult = await pool.query(checkSql, [input.articleId]);

      if (checkResult.rows.length === 0) {
        throw new Error('Article not found');
      }

      const article = checkResult.rows[0];
      const props = typeof article.props === 'string' ? JSON.parse(article.props) : article.props;
      const hasPermission =
        props.authorId === userId ||
        (props.permissions && props.permissions.includes(userId));

      if (!hasPermission) {
        throw new Error('You do not have permission to edit this article');
      }

      // Build props update object
      const propsUpdate: any = {};

      if (input.title) {
        propsUpdate.title = input.title;
      }

      if (input.narrative) {
        propsUpdate.narrative = input.narrative;
      }

      // Update props using JSONB merge operator
      const updateSql = `
        UPDATE public."Nodes"
        SET props = props || $1::jsonb, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(updateSql, [JSON.stringify(propsUpdate), input.articleId]);

      // Update referenced nodes if provided
      if (input.referencedNodeIds) {
        // Delete existing reference edges
        await pool.query(
          `DELETE FROM public."Edges" WHERE source_node_id = $1`,
          [input.articleId]
        );

        // Create new reference edges
        const graphResult = await pool.query(
          `SELECT props->>'graphId' as graph_id FROM public."Nodes" WHERE id = $1`,
          [input.articleId]
        );
        const graphId = graphResult.rows[0].graph_id;

        await this.createReferencedEdges(
          pool,
          input.articleId,
          graphId,
          input.referencedNodeIds,
          userId
        );
      }

      return this.mapRowToNode(result.rows[0]);
    } catch (error) {
      console.error('Error updating article:', error);
      throw new Error('Failed to update article');
    }
  }

  @Mutation(() => Node)
  async publishArticle(
    @Arg('input') input: PublishArticleInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Node> {
    if (!userId) {
      throw new Error('Authentication required to publish article');
    }

    try {
      const sql = `
        UPDATE public."Nodes"
        SET props = props || $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND props->>'authorId' = $3
        RETURNING *
      `;

      const result = await pool.query(sql, [
        JSON.stringify({ publishedAt: new Date().toISOString() }),
        input.articleId,
        userId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Article not found or you do not have permission to publish');
      }

      return this.mapRowToNode(result.rows[0]);
    } catch (error) {
      console.error('Error publishing article:', error);
      throw new Error('Failed to publish article');
    }
  }

  @Mutation(() => Boolean)
  async deleteArticle(
    @Arg('articleId', () => ID) articleId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to delete article');
    }

    try {
      const sql = `
        DELETE FROM public."Nodes"
        WHERE id = $1 AND props->>'authorId' = $2
      `;

      const result = await pool.query(sql, [articleId, userId]);

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting article:', error);
      return false;
    }
  }

  // Helper methods

  private async createReferencedEdges(
    pool: any,
    articleId: string,
    graphId: string,
    nodeIds: string[],
    userId: string
  ): Promise<void> {
    // Get "references" edge type
    let edgeTypeResult = await pool.query(
      `SELECT id FROM public."EdgeTypes" WHERE name = 'references'`
    );

    let edgeTypeId: string;

    if (edgeTypeResult.rows.length === 0) {
      // Create "references" edge type if it doesn't exist
      const createEdgeType = await pool.query(
        `INSERT INTO public."EdgeTypes" (name, props) VALUES ('references', '{}') RETURNING id`
      );
      edgeTypeId = createEdgeType.rows[0].id;
    } else {
      edgeTypeId = edgeTypeResult.rows[0].id;
    }

    // Create edges using props-only schema
    for (const nodeId of nodeIds) {
      const edgeProps = {
        graphId,
        createdBy: userId,
        weight: 0.5
      };

      await pool.query(
        `INSERT INTO public."Edges" (
          edge_type_id,
          source_node_id,
          target_node_id,
          props,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [edgeTypeId, articleId, nodeId, JSON.stringify(edgeProps)]
      );
    }
  }

  private mapRowToNode(row: any): Node {
    return {
      id: row.id,
      node_type_id: row.node_type_id,
      props: row.props || {},
      ai: row.ai,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Node;
  }
}
