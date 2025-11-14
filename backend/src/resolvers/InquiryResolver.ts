import { Resolver, Query, Mutation, Arg, Ctx, InputType, Field, ID } from 'type-graphql';
import { Inquiry, InquiryStatus } from '../entities/Inquiry';
import { Context } from '../types/context';

@InputType()
class CreateInquiryInput {
  @Field(() => ID, { nullable: true })
  target_node_id?: string;

  @Field(() => ID, { nullable: true })
  target_edge_id?: string;

  @Field()
  content!: string;

  @Field(() => ID, { nullable: true })
  parent_inquiry_id?: string;
}

@InputType()
class UpdateInquiryStatusInput {
  @Field(() => ID)
  inquiry_id!: string;

  @Field(() => String)
  status!: InquiryStatus;
}

@Resolver(() => Inquiry)
export class InquiryResolver {
  @Query(() => [Inquiry])
  async getInquiries(
    @Arg('nodeId', () => ID, { nullable: true }) nodeId: string | undefined,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId: string | undefined,
    @Ctx() { pool }: Context
  ): Promise<Inquiry[]> {
    try {
      let sql = `
        SELECT
          i.*,
          u.username,
          u.email
        FROM public."Inquiries" i
        JOIN public."Users" u ON i.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (nodeId) {
        params.push(nodeId);
        sql += ` AND i.target_node_id = $${params.length}`;
      }

      if (edgeId) {
        params.push(edgeId);
        sql += ` AND i.target_edge_id = $${params.length}`;
      }

      sql += ` ORDER BY i.created_at DESC`;

      const result = await pool.query(sql, params);

      return result.rows.map(row => ({
        id: row.id,
        target_node_id: row.target_node_id,
        target_edge_id: row.target_edge_id,
        user_id: row.user_id,
        content: row.content,
        status: row.status as InquiryStatus,
        parent_inquiry_id: row.parent_inquiry_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user: {
          id: row.user_id,
          username: row.username,
          email: row.email,
        },
      })) as Inquiry[];
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      return [];
    }
  }

  @Mutation(() => Inquiry)
  async createInquiry(
    @Arg('input') input: CreateInquiryInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Inquiry> {
    if (!userId) {
      throw new Error('Authentication required to create inquiry');
    }

    // Validate that either node_id or edge_id is provided, but not both
    if (
      (!input.target_node_id && !input.target_edge_id) ||
      (input.target_node_id && input.target_edge_id)
    ) {
      throw new Error('Must provide either target_node_id or target_edge_id, but not both');
    }

    try {
      const sql = `
        INSERT INTO public."Inquiries" (
          target_node_id,
          target_edge_id,
          user_id,
          content,
          parent_inquiry_id,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())
        RETURNING *
      `;

      const result = await pool.query(sql, [
        input.target_node_id || null,
        input.target_edge_id || null,
        userId,
        input.content,
        input.parent_inquiry_id || null,
      ]);

      const row = result.rows[0];

      return {
        id: row.id,
        target_node_id: row.target_node_id,
        target_edge_id: row.target_edge_id,
        user_id: row.user_id,
        content: row.content,
        status: row.status as InquiryStatus,
        parent_inquiry_id: row.parent_inquiry_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as Inquiry;
    } catch (error) {
      console.error('Error creating inquiry:', error);
      throw new Error('Failed to create inquiry');
    }
  }

  @Mutation(() => Inquiry)
  async updateInquiryStatus(
    @Arg('input') input: UpdateInquiryStatusInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Inquiry> {
    if (!userId) {
      throw new Error('Authentication required to update inquiry status');
    }

    try {
      const sql = `
        UPDATE public."Inquiries"
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(sql, [input.status, input.inquiry_id]);

      if (result.rows.length === 0) {
        throw new Error('Inquiry not found');
      }

      const row = result.rows[0];

      return {
        id: row.id,
        target_node_id: row.target_node_id,
        target_edge_id: row.target_edge_id,
        user_id: row.user_id,
        content: row.content,
        status: row.status as InquiryStatus,
        parent_inquiry_id: row.parent_inquiry_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as Inquiry;
    } catch (error) {
      console.error('Error updating inquiry status:', error);
      throw new Error('Failed to update inquiry status');
    }
  }

  @Query(() => [Inquiry])
  async getInquiryThread(
    @Arg('inquiryId', () => ID) inquiryId: string,
    @Ctx() { pool }: Context
  ): Promise<Inquiry[]> {
    try {
      // Get inquiry and all its replies recursively
      const sql = `
        WITH RECURSIVE inquiry_thread AS (
          -- Base case: the root inquiry
          SELECT * FROM public."Inquiries"
          WHERE id = $1

          UNION ALL

          -- Recursive case: replies to inquiries in the thread
          SELECT i.*
          FROM public."Inquiries" i
          INNER JOIN inquiry_thread it ON i.parent_inquiry_id = it.id
        )
        SELECT
          t.*,
          u.username,
          u.email
        FROM inquiry_thread t
        JOIN public."Users" u ON t.user_id = u.id
        ORDER BY t.created_at ASC
      `;

      const result = await pool.query(sql, [inquiryId]);

      return result.rows.map(row => ({
        id: row.id,
        target_node_id: row.target_node_id,
        target_edge_id: row.target_edge_id,
        user_id: row.user_id,
        content: row.content,
        status: row.status as InquiryStatus,
        parent_inquiry_id: row.parent_inquiry_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user: {
          id: row.user_id,
          username: row.username,
          email: row.email,
        },
      })) as Inquiry[];
    } catch (error) {
      console.error('Error fetching inquiry thread:', error);
      return [];
    }
  }
}
