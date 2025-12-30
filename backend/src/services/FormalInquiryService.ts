import { Pool, PoolClient } from 'pg';
import { CredibilityCalculationService } from './CredibilityCalculationService';

/**
 * FormalInquiryService
 * 
 * Business logic for formal inquiry management, voting, and consensus calculation.
 * Follows the Service-Resolver pattern with method injection for Pool dependency.
 */

export interface FormalInquiry {
    id: string;
    target_node_id?: string;
    target_edge_id?: string;
    user_id: string;
    title: string;
    description?: string;
    content?: string;
    confidence_score?: number;
    max_allowed_score?: number;
    weakest_node_credibility?: number;
    ai_determination?: string;
    ai_rationale?: string;
    evaluated_at?: string;
    evaluated_by?: string;
    agree_count: number;
    disagree_count: number;
    total_votes: number;
    agree_percentage: number;
    disagree_percentage: number;
    status: string;
    created_at: Date;
    updated_at: Date;
    resolved_at?: string;
}

export interface Vote {
    id: string;
    inquiry_id: string;
    user_id: string;
    vote_type: string;
    created_at: Date;
    updated_at: Date;
}

export interface InquiryFilters {
    nodeId?: string;
    edgeId?: string;
    status?: string;
}

export interface CreateInquiryInput {
    targetNodeId?: string;
    targetEdgeId?: string;
    title: string;
    description?: string;
    content?: string;
    relatedNodeIds?: string[];
}

export interface CastVoteInput {
    inquiryId: string;
    voteType: string; // 'agree', 'disagree', 'VALID', 'INVALID'
}

export interface UpdateConfidenceInput {
    inquiryId: string;
    aiDetermination: string;
    aiRationale: string;
}

export class FormalInquiryService {
    constructor() { }

    /**
     * Get multiple inquiries with optional filters
     */
    async getInquiries(
        pool: Pool,
        filters: InquiryFilters = {}
    ): Promise<FormalInquiry[]> {
        // Get FormalInquiry node type ID
        const nodeTypeResult = await pool.query(
            `SELECT id FROM public.node_types WHERE name = 'FormalInquiry'`
        );
        if (nodeTypeResult.rows.length === 0) {
            throw new Error('FormalInquiry node type not found');
        }
        const inquiryNodeTypeId = nodeTypeResult.rows[0].id;

        // Build query with optional filters
        let query = `
      SELECT
        n.id,
        n.props,
        n.created_at,
        n.updated_at
      FROM public.nodes n
      WHERE n.node_type_id = $1
    `;

        const params: any[] = [inquiryNodeTypeId];
        let paramCount = 2;

        if (filters.nodeId) {
            query += ` AND (n.props->>'targetNodeId')::text = $${paramCount}`;
            params.push(filters.nodeId);
            paramCount++;
        }

        if (filters.edgeId) {
            query += ` AND (n.props->>'targetEdgeId')::text = $${paramCount}`;
            params.push(filters.edgeId);
            paramCount++;
        }

        if (filters.status) {
            query += ` AND (n.props->>'status')::text = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }

        query += ` ORDER BY n.created_at DESC`;

        const result = await pool.query(query, params);

        // Parse JSONB props and calculate vote counts
        const inquiriesWithVotes = await Promise.all(
            result.rows.map(async (row) => this.serializeInquiryWithVotes(pool, row))
        );

        return inquiriesWithVotes;
    }

    /**
     * Get a single inquiry by ID
     */
    async getInquiry(pool: Pool, inquiryId: string): Promise<FormalInquiry | null> {
        // Get FormalInquiry node type ID
        const nodeTypeResult = await pool.query(
            `SELECT id FROM public.node_types WHERE name = 'FormalInquiry'`
        );
        if (nodeTypeResult.rows.length === 0) {
            throw new Error('FormalInquiry node type not found');
        }
        const inquiryNodeTypeId = nodeTypeResult.rows[0].id;

        // Query single inquiry
        const result = await pool.query(
            `SELECT
        n.id,
        n.props,
        n.created_at,
        n.updated_at
      FROM public.nodes n
      WHERE n.id = $1 AND n.node_type_id = $2`,
            [inquiryId, inquiryNodeTypeId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.serializeInquiryWithVotes(pool, result.rows[0]);
    }

    /**
     * Create a new formal inquiry
     */
    async createInquiry(
        pool: Pool,
        input: CreateInquiryInput,
        userId: string
    ): Promise<FormalInquiry> {
        // Validate either node or edge is targeted
        if (!input.targetNodeId && !input.targetEdgeId) {
            throw new Error('Must specify either targetNodeId or targetEdgeId');
        }
        if (input.targetNodeId && input.targetEdgeId) {
            throw new Error('Cannot target both node and edge simultaneously');
        }

        // Get FormalInquiry node type ID
        const nodeTypeResult = await pool.query(
            `SELECT id FROM public.node_types WHERE name = 'FormalInquiry'`
        );
        if (nodeTypeResult.rows.length === 0) {
            throw new Error('FormalInquiry node type not found');
        }
        const inquiryNodeTypeId = nodeTypeResult.rows[0].id;

        // Get INVESTIGATES edge type ID
        const edgeTypeResult = await pool.query(
            `SELECT id FROM public.edge_types WHERE name = 'INVESTIGATES'`
        );
        if (edgeTypeResult.rows.length === 0) {
            throw new Error('INVESTIGATES edge type not found');
        }
        const investigatesEdgeTypeId = edgeTypeResult.rows[0].id;

        // Begin transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create FormalInquiry node with props
            const inquiryProps = {
                targetNodeId: input.targetNodeId,
                targetEdgeId: input.targetEdgeId,
                targetType: input.targetNodeId ? 'node' : 'edge',
                title: input.title,
                description: input.description,
                content: input.content,
                relatedNodeIds: input.relatedNodeIds || [],
                status: 'open',
                createdBy: userId,
                // AI evaluation fields (initially null)
                confidenceScore: null,
                maxAllowedScore: null,
                weakestNodeCredibility: null,
                aiDetermination: null,
                aiRationale: null,
                evaluatedAt: null,
                evaluatedBy: null,
            };

            const inquiryResult = await client.query(
                `INSERT INTO public.nodes (node_type_id, props, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING *`,
                [inquiryNodeTypeId, JSON.stringify(inquiryProps)]
            );
            const inquiry = inquiryResult.rows[0];

            // Create edge from FormalInquiry to target (node or edge)
            const targetId = input.targetNodeId || input.targetEdgeId;
            await client.query(
                `INSERT INTO public.edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
                [investigatesEdgeTypeId, inquiry.id, targetId]
            );

            await client.query('COMMIT');

            // Calculate initial credibility score
            const credibilityService = new CredibilityCalculationService(pool);
            const initialScore = await credibilityService.calculateNodeCredibility(inquiry.id);

            // Return serialized inquiry
            return {
                id: inquiry.id,
                target_node_id: inquiryProps.targetNodeId,
                target_edge_id: inquiryProps.targetEdgeId,
                user_id: userId,
                title: inquiryProps.title,
                description: inquiryProps.description,
                content: inquiryProps.content,
                confidence_score: initialScore,
                max_allowed_score: null,
                weakest_node_credibility: null,
                ai_determination: null,
                ai_rationale: null,
                evaluated_at: null,
                evaluated_by: null,
                agree_count: 0,
                disagree_count: 0,
                total_votes: 0,
                agree_percentage: 0,
                disagree_percentage: 0,
                status: 'open',
                created_at: inquiry.created_at,
                updated_at: inquiry.updated_at,
                resolved_at: null,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Cast or update a vote on an inquiry
     */
    async castVote(
        pool: Pool,
        input: CastVoteInput,
        userId: string
    ): Promise<Vote> {
        // Get FormalInquiry node
        const inquiryResult = await pool.query(
            `SELECT id, props FROM public.nodes n
       JOIN public.node_types nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'FormalInquiry'`,
            [input.inquiryId]
        );

        if (inquiryResult.rows.length === 0) {
            throw new Error('Formal inquiry not found');
        }

        const inquiryRow = inquiryResult.rows[0];
        const inquiryProps =
            typeof inquiryRow.props === 'string'
                ? JSON.parse(inquiryRow.props)
                : inquiryRow.props;

        // Check if inquiry is still open for voting
        if (inquiryProps.status !== 'open' && inquiryProps.status !== 'evaluating') {
            throw new Error('Inquiry is not open for voting');
        }

        // Get ConsensusVote node type ID
        const nodeTypeResult = await pool.query(
            `SELECT id FROM public.node_types WHERE name = 'ConsensusVote'`
        );
        if (nodeTypeResult.rows.length === 0) {
            throw new Error('ConsensusVote node type not found');
        }
        const voteNodeTypeId = nodeTypeResult.rows[0].id;

        // Get VOTES_ON edge type ID
        const edgeTypeResult = await pool.query(
            `SELECT id FROM public.edge_types WHERE name = 'VOTES_ON'`
        );
        if (edgeTypeResult.rows.length === 0) {
            throw new Error('VOTES_ON edge type not found');
        }
        const votesOnEdgeTypeId = edgeTypeResult.rows[0].id;

        // Check if user already voted
        const existingVoteResult = await pool.query(
            `SELECT n.id FROM public.nodes n
       JOIN public.edges e ON n.id = e.source_node_id
       WHERE n.node_type_id = $1
         AND e.edge_type_id = $2
         AND e.target_node_id = $3
         AND (n.props->>'userId')::text = $4`,
            [voteNodeTypeId, votesOnEdgeTypeId, input.inquiryId, userId]
        );

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let voteId: string;

            if (existingVoteResult.rows.length > 0) {
                // Update existing vote
                voteId = existingVoteResult.rows[0].id;
                const updatedVoteProps = {
                    voteType: input.voteType,
                    userId,
                    targetType: 'inquiry',
                };

                await client.query(
                    `UPDATE public.nodes
           SET props = $1, updated_at = NOW()
           WHERE id = $2`,
                    [JSON.stringify(updatedVoteProps), voteId]
                );
            } else {
                // Create new vote node
                const voteProps = {
                    voteType: input.voteType,
                    userId,
                    targetType: 'inquiry',
                };

                const voteResult = await client.query(
                    `INSERT INTO public.nodes (node_type_id, props, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           RETURNING *`,
                    [voteNodeTypeId, JSON.stringify(voteProps)]
                );

                voteId = voteResult.rows[0].id;

                // Create VOTES_ON edge
                await client.query(
                    `INSERT INTO public.edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
           VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
                    [votesOnEdgeTypeId, voteId, input.inquiryId]
                );
            }

            await client.query('COMMIT');

            // Get updated vote
            const updatedVoteResult = await client.query(
                `SELECT * FROM public.nodes WHERE id = $1`,
                [voteId]
            );

            const voteRow = updatedVoteResult.rows[0];

            // Recalculate consensus score
            await this.updateConsensusScore(pool, input.inquiryId);

            return {
                id: voteId,
                inquiry_id: input.inquiryId,
                user_id: userId,
                vote_type: input.voteType,
                created_at: voteRow.created_at,
                updated_at: voteRow.updated_at,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get user's vote on an inquiry
     */
    async getUserVote(
        pool: Pool,
        inquiryId: string,
        userId: string
    ): Promise<Vote | null> {
        // Get ConsensusVote node type ID
        const nodeTypeResult = await pool.query(
            `SELECT id FROM public.node_types WHERE name = 'ConsensusVote'`
        );
        if (nodeTypeResult.rows.length === 0) {
            throw new Error('ConsensusVote node type not found');
        }
        const voteNodeTypeId = nodeTypeResult.rows[0].id;

        // Get VOTES_ON edge type ID
        const edgeTypeResult = await pool.query(
            `SELECT id FROM public.edge_types WHERE name = 'VOTES_ON'`
        );
        if (edgeTypeResult.rows.length === 0) {
            throw new Error('VOTES_ON edge type not found');
        }
        const votesOnEdgeTypeId = edgeTypeResult.rows[0].id;

        // Query user's vote
        const result = await pool.query(
            `SELECT n.id, n.props, n.created_at, n.updated_at
      FROM public.nodes n
      JOIN public.edges e ON n.id = e.source_node_id
      WHERE n.node_type_id = $1
        AND e.edge_type_id = $2
        AND e.target_node_id = $3
        AND (n.props->>'userId')::text = $4`,
            [voteNodeTypeId, votesOnEdgeTypeId, inquiryId, userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;

        return {
            id: row.id,
            inquiry_id: inquiryId,
            user_id: userId,
            vote_type: props.voteType,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    /**
     * Remove a user's vote
     */
    async removeVote(pool: Pool, inquiryId: string, userId: string): Promise<boolean> {
        // Get ConsensusVote node type ID
        const nodeTypeResult = await pool.query(
            `SELECT id FROM public.node_types WHERE name = 'ConsensusVote'`
        );
        if (nodeTypeResult.rows.length === 0) {
            throw new Error('ConsensusVote node type not found');
        }
        const voteNodeTypeId = nodeTypeResult.rows[0].id;

        // Get VOTES_ON edge type ID
        const edgeTypeResult = await pool.query(
            `SELECT id FROM public.edge_types WHERE name = 'VOTES_ON'`
        );
        if (edgeTypeResult.rows.length === 0) {
            throw new Error('VOTES_ON edge type not found');
        }
        const votesOnEdgeTypeId = edgeTypeResult.rows[0].id;

        // Find and delete user's vote
        const result = await pool.query(
            `DELETE FROM public.nodes n
       USING public.edges e
       WHERE n.id = e.source_node_id
         AND n.node_type_id = $1
         AND e.edge_type_id = $2
         AND e.target_node_id = $3
         AND (n.props->>'userId')::text = $4
       RETURNING n.id`,
            [voteNodeTypeId, votesOnEdgeTypeId, inquiryId, userId]
        );

        return result.rows.length > 0;
    }

    /**
     * Update confidence score with AI evaluation
     */
    async updateConfidenceScore(
        pool: Pool,
        input: UpdateConfidenceInput,
        userId: string
    ): Promise<FormalInquiry> {
        // Get FormalInquiry node
        const inquiryResult = await pool.query(
            `SELECT id, props, created_at FROM public.nodes n
       JOIN public.node_types nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'FormalInquiry'`,
            [input.inquiryId]
        );

        if (inquiryResult.rows.length === 0) {
            throw new Error('Formal inquiry not found');
        }

        const inquiryRow = inquiryResult.rows[0];
        const inquiryProps =
            typeof inquiryRow.props === 'string'
                ? JSON.parse(inquiryRow.props)
                : inquiryRow.props;

        // Update inquiry with AI evaluation
        const updatedProps = {
            ...inquiryProps,
            aiDetermination: input.aiDetermination,
            aiRationale: input.aiRationale,
            evaluatedAt: new Date().toISOString(),
            evaluatedBy: userId,
            status: 'evaluated',
        };

        await pool.query(
            `UPDATE public.nodes
       SET props = $1, updated_at = NOW()
       WHERE id = $2`,
            [JSON.stringify(updatedProps), input.inquiryId]
        );

        // Calculate credibility score
        const credibilityService = new CredibilityCalculationService(pool);
        const newCredibilityScore = await credibilityService.calculateNodeCredibility(
            input.inquiryId
        );

        // Sync credibility score to props
        updatedProps.confidenceScore = newCredibilityScore;

        await pool.query(
            `UPDATE public.nodes
       SET props = $1
       WHERE id = $2`,
            [JSON.stringify(updatedProps), input.inquiryId]
        );

        // Get vote counts
        const voteResult = await pool.query(
            `SELECT
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text IN ('agree', 'VALID')) as agree_count,
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text IN ('disagree', 'INVALID')) as disagree_count,
        COUNT(*) as total_votes
      FROM public.nodes n
      JOIN public.edges e ON n.id = e.source_node_id
      JOIN public.edge_types et ON e.edge_type_id = et.id
      JOIN public.node_types nt ON n.node_type_id = nt.id
      WHERE et.name = 'VOTES_ON'
        AND nt.name = 'ConsensusVote'
        AND e.target_node_id = $1`,
            [input.inquiryId]
        );

        const votes = voteResult.rows[0];
        const agreeCount = parseInt(votes.agree_count) || 0;
        const disagreeCount = parseInt(votes.disagree_count) || 0;
        const totalVotes = parseInt(votes.total_votes) || 0;

        return {
            id: input.inquiryId,
            target_node_id: updatedProps.targetNodeId,
            target_edge_id: updatedProps.targetEdgeId,
            user_id: updatedProps.createdBy,
            title: updatedProps.title,
            description: updatedProps.description,
            content: updatedProps.content,
            confidence_score: newCredibilityScore,
            max_allowed_score: updatedProps.maxAllowedScore,
            weakest_node_credibility: updatedProps.weakestNodeCredibility,
            ai_determination: input.aiDetermination,
            ai_rationale: input.aiRationale,
            evaluated_at: updatedProps.evaluatedAt,
            evaluated_by: userId,
            agree_count: agreeCount,
            disagree_count: disagreeCount,
            total_votes: totalVotes,
            agree_percentage: totalVotes > 0 ? (agreeCount / totalVotes) * 100 : 0,
            disagree_percentage: totalVotes > 0 ? (disagreeCount / totalVotes) * 100 : 0,
            status: 'evaluated',
            created_at: inquiryRow.created_at,
            updated_at: new Date(),
            resolved_at: updatedProps.resolvedAt,
        };
    }

    /**
     * Update consensus score based on votes
     */
    async updateConsensusScore(pool: Pool, inquiryId: string): Promise<void> {
        // Get vote counts
        const voteResult = await pool.query(
            `SELECT
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text IN ('agree', 'VALID')) as agree_count,
        COUNT(*) as total_votes
      FROM public.nodes n
      JOIN public.edges e ON n.id = e.source_node_id
      JOIN public.edge_types et ON e.edge_type_id = et.id
      JOIN public.node_types nt ON n.node_type_id = nt.id
      WHERE et.name = 'VOTES_ON'
        AND nt.name = 'ConsensusVote'
        AND e.target_node_id = $1`,
            [inquiryId]
        );

        const votes = voteResult.rows[0];
        const agreeCount = parseInt(votes.agree_count) || 0;
        const totalVotes = parseInt(votes.total_votes) || 0;

        if (totalVotes === 0) return;

        const consensusScore = agreeCount / totalVotes; // 0 to 1

        // Update inquiry node's consensusScore in props (not as column)
        await pool.query(
            `UPDATE public.nodes
       SET props = props || $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
            [JSON.stringify({ consensusScore }), inquiryId]
        );
    }

    /**
     * Helper: Serialize inquiry with vote counts
     */
    private async serializeInquiryWithVotes(
        pool: Pool,
        row: any
    ): Promise<FormalInquiry> {
        const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;

        // Get vote counts
        const voteResult = await pool.query(
            `SELECT
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text IN ('agree', 'VALID')) as agree_count,
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text IN ('disagree', 'INVALID')) as disagree_count,
        COUNT(*) as total_votes
      FROM public.nodes n
      JOIN public.edges e ON n.id = e.source_node_id
      JOIN public.edge_types et ON e.edge_type_id = et.id
      JOIN public.node_types nt ON n.node_type_id = nt.id
      WHERE et.name = 'VOTES_ON'
        AND nt.name = 'ConsensusVote'
        AND e.target_node_id = $1`,
            [row.id]
        );

        const votes = voteResult.rows[0];
        const agreeCount = parseInt(votes.agree_count) || 0;
        const disagreeCount = parseInt(votes.disagree_count) || 0;
        const totalVotes = parseInt(votes.total_votes) || 0;

        return {
            id: row.id,
            target_node_id: props.targetNodeId,
            target_edge_id: props.targetEdgeId,
            user_id: props.createdBy,
            title: props.title,
            description: props.description,
            content: props.content,
            confidence_score: props.confidenceScore,
            max_allowed_score: props.maxAllowedScore,
            weakest_node_credibility: props.weakestNodeCredibility,
            ai_determination: props.aiDetermination,
            ai_rationale: props.aiRationale,
            evaluated_at: props.evaluatedAt,
            evaluated_by: props.evaluatedBy,
            agree_count: agreeCount,
            disagree_count: disagreeCount,
            total_votes: totalVotes,
            agree_percentage: totalVotes > 0 ? (agreeCount / totalVotes) * 100 : 0,
            disagree_percentage: totalVotes > 0 ? (disagreeCount / totalVotes) * 100 : 0,
            status: props.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            resolved_at: props.resolvedAt,
        };
    }
}
