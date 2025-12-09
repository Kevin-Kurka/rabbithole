import { Pool } from 'pg';
import {
    FormalInquiryService,
    CreateInquiryInput,
    CastVoteInput,
    UpdateConfidenceInput,
} from '../services/FormalInquiryService';

// Mock CredibilityCalculationService
jest.mock('../services/CredibilityCalculationService', () => ({
    CredibilityCalculationService: jest.fn().mockImplementation(() => ({
        calculateNodeCredibility: jest.fn().mockResolvedValue(0.75),
    })),
}));

describe('FormalInquiryService', () => {
    let service: FormalInquiryService;
    let mockPool: any;
    let mockClient: any;

    beforeEach(() => {
        service = new FormalInquiryService();
        mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        };
        mockPool = {
            query: jest.fn(),
            connect: jest.fn().mockResolvedValue(mockClient),
        };

        jest.clearAllMocks();
    });

    describe('getInquiries', () => {
        it('should retrieve inquiries with filters', async () => {
            const mockInquiries = [
                {
                    id: 'inquiry-1',
                    props: JSON.stringify({
                        title: 'Test Inquiry',
                        targetNodeId: 'node-1',
                        status: 'open',
                        createdBy: 'user-1',
                    }),
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ];

            // Mock node type lookup
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'formal-inquiry-type-id' }])
            );

            // Mock inquiry query
            mockPool.query.mockResolvedValueOnce(mockQueryResult(mockInquiries));

            // Mock vote counts
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        agree_count: '5',
                        disagree_count: '2',
                        total_votes: '7',
                    },
                ])
            );

            const result = await service.getInquiries(mockPool as Pool, {
                nodeId: 'node-1',
            });

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Test Inquiry');
            expect(result[0].agree_count).toBe(5);
            expect(result[0].total_votes).toBe(7);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('targetNodeId'),
                expect.arrayContaining(['formal-inquiry-type-id', 'node-1'])
            );
        });

        it('should handle empty results', async () => {
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'formal-inquiry-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([]));

            const result = await service.getInquiries(mockPool as Pool, {});

            expect(result).toHaveLength(0);
        });
    });

    describe('getInquiry', () => {
        it('should retrieve a single inquiry by ID', async () => {
            const mockInquiry = {
                id: 'inquiry-1',
                props: JSON.stringify({
                    title: 'Test Inquiry',
                    status: 'open',
                    createdBy: 'user-1',
                }),
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'formal-inquiry-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([mockInquiry]));
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        agree_count: '3',
                        disagree_count: '1',
                        total_votes: '4',
                    },
                ])
            );

            const result = await service.getInquiry(mockPool as Pool, 'inquiry-1');

            expect(result).toBeDefined();
            expect(result?.title).toBe('Test Inquiry');
            expect(result?.total_votes).toBe(4);
        });

        it('should return null if inquiry not found', async () => {
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'formal-inquiry-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([]));

            const result = await service.getInquiry(mockPool as Pool, 'nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('createInquiry', () => {
        it('should create a new inquiry', async () => {
            const input: CreateInquiryInput = {
                targetNodeId: 'node-1',
                title: 'New Inquiry',
                description: 'Test description',
                content: 'Test content',
            };

            // Mock node type lookups
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'formal-inquiry-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'investigates-edge-type-id' }])
            );

            // Mock transaction
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // BEGIN
            mockClient.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'inquiry-1',
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ])
            ); // INSERT
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // INSERT edge
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // COMMIT

            const result = await service.createInquiry(mockPool as Pool, input, 'user-1');

            expect(result).toBeDefined();
            expect(result.title).toBe('New Inquiry');
            expect(result.user_id).toBe('user-1');
            expect(result.status).toBe('open');
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should throw error if both targetNodeId and targetEdgeId provided', async () => {
            const input: CreateInquiryInput = {
                targetNodeId: 'node-1',
                targetEdgeId: 'edge-1',
                title: 'Invalid Inquiry',
            };

            await expect(
                service.createInquiry(mockPool as Pool, input, 'user-1')
            ).rejects.toThrow('Cannot target both node and edge simultaneously');
        });

        it('should throw error if neither targetNodeId nor targetEdgeId provided', async () => {
            const input: CreateInquiryInput = {
                title: 'Invalid Inquiry',
            };

            await expect(
                service.createInquiry(mockPool as Pool, input, 'user-1')
            ).rejects.toThrow('Must specify either targetNodeId or targetEdgeId');
        });
    });

    describe('castVote', () => {
        it('should cast a new vote', async () => {
            const input: CastVoteInput = {
                inquiryId: 'inquiry-1',
                voteType: 'agree',
            };

            // Mock inquiry check
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'inquiry-1',
                        props: JSON.stringify({ status: 'open' }),
                    },
                ])
            );

            // Mock node type lookups
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'consensus-vote-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'votes-on-edge-type-id' }])
            );

            // Mock existing vote check (none found)
            mockPool.query.mockResolvedValueOnce(mockQueryResult([]));

            // Mock transaction
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // BEGIN
            mockClient.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'vote-1',
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ])
            ); // INSERT vote
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // INSERT edge
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // COMMIT
            mockClient.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'vote-1',
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ])
            ); // SELECT vote

            // Mock consensus score update
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ agree_count: '1', total_votes: '1' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([])); // UPDATE consensus

            const result = await service.castVote(mockPool as Pool, input, 'user-1');

            expect(result).toBeDefined();
            expect(result.vote_type).toBe('agree');
            expect(result.user_id).toBe('user-1');
        });

        it('should update existing vote', async () => {
            const input: CastVoteInput = {
                inquiryId: 'inquiry-1',
                voteType: 'disagree',
            };

            // Mock inquiry check
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'inquiry-1',
                        props: JSON.stringify({ status: 'open' }),
                    },
                ])
            );

            // Mock node type lookups
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'consensus-vote-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'votes-on-edge-type-id' }])
            );

            // Mock existing vote check (found)
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'existing-vote-1' }])
            );

            // Mock transaction
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // BEGIN
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // UPDATE vote
            mockClient.query.mockResolvedValueOnce(mockQueryResult([])); // COMMIT
            mockClient.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'existing-vote-1',
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ])
            ); // SELECT vote

            // Mock consensus score update
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ agree_count: '0', total_votes: '1' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([]));

            const result = await service.castVote(mockPool as Pool, input, 'user-1');

            expect(result.id).toBe('existing-vote-1');
        });

        it('should throw error if inquiry is not open for voting', async () => {
            const input: CastVoteInput = {
                inquiryId: 'inquiry-1',
                voteType: 'agree',
            };

            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'inquiry-1',
                        props: JSON.stringify({ status: 'closed' }),
                    },
                ])
            );

            await expect(
                service.castVote(mockPool as Pool, input, 'user-1')
            ).rejects.toThrow('Inquiry is not open for voting');
        });
    });

    describe('getUserVote', () => {
        it('should retrieve user vote', async () => {
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'consensus-vote-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'votes-on-edge-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'vote-1',
                        props: JSON.stringify({ voteType: 'agree', userId: 'user-1' }),
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ])
            );

            const result = await service.getUserVote(
                mockPool as Pool,
                'inquiry-1',
                'user-1'
            );

            expect(result).toBeDefined();
            expect(result?.vote_type).toBe('agree');
        });

        it('should return null if user has not voted', async () => {
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'consensus-vote-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'votes-on-edge-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([]));

            const result = await service.getUserVote(
                mockPool as Pool,
                'inquiry-1',
                'user-1'
            );

            expect(result).toBeNull();
        });
    });

    describe('removeVote', () => {
        it('should remove user vote', async () => {
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'consensus-vote-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'votes-on-edge-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([{ id: 'vote-1' }]));

            const result = await service.removeVote(
                mockPool as Pool,
                'inquiry-1',
                'user-1'
            );

            expect(result).toBe(true);
        });

        it('should return false if no vote to remove', async () => {
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'consensus-vote-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ id: 'votes-on-edge-type-id' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([]));

            const result = await service.removeVote(
                mockPool as Pool,
                'inquiry-1',
                'user-1'
            );

            expect(result).toBe(false);
        });
    });

    describe('updateConfidenceScore', () => {
        it('should update inquiry with AI evaluation', async () => {
            const input: UpdateConfidenceInput = {
                inquiryId: 'inquiry-1',
                aiDetermination: 'VALID',
                aiRationale: 'Strong evidence supports this claim',
            };

            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        id: 'inquiry-1',
                        props: JSON.stringify({
                            title: 'Test',
                            createdBy: 'user-1',
                        }),
                        created_at: new Date(),
                    },
                ])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([])); // UPDATE props
            mockPool.query.mockResolvedValueOnce(mockQueryResult([])); // UPDATE props with score
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([
                    {
                        agree_count: '5',
                        disagree_count: '2',
                        total_votes: '7',
                    },
                ])
            );

            const result = await service.updateConfidenceScore(
                mockPool as Pool,
                input,
                'user-1'
            );

            expect(result).toBeDefined();
            expect(result.ai_determination).toBe('VALID');
            expect(result.status).toBe('evaluated');
            expect(result.confidence_score).toBe(0.75); // Mocked value
        });
    });

    describe('updateConsensusScore', () => {
        it('should update consensus score based on votes', async () => {
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ agree_count: '6', total_votes: '10' }])
            );
            mockPool.query.mockResolvedValueOnce(mockQueryResult([]));

            await service.updateConsensusScore(mockPool as Pool, 'inquiry-1');

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE'),
                expect.arrayContaining([0.6, 'inquiry-1'])
            );
        });

        it('should not update if no votes', async () => {
            mockPool.query.mockResolvedValueOnce(
                mockQueryResult([{ agree_count: '0', total_votes: '0' }])
            );

            await service.updateConsensusScore(mockPool as Pool, 'inquiry-1');

            expect(mockPool.query).toHaveBeenCalledTimes(1); // Only the SELECT, no UPDATE
        });
    });
});
