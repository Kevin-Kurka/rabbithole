import { FormalInquiryResolver } from '../resolvers/FormalInquiryResolver';
import { Pool, PoolClient } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import {
  CreateFormalInquiryInput,
  CastVoteInput,
  UpdateConfidenceScoreInput
} from '../resolvers/FormalInquiryInput';
import { CredibilityCalculationService } from '../services/CredibilityCalculationService';

// Mock dependencies
const mockPool: any = {
  query: jest.fn(),
  connect: jest.fn()
};

const mockClient: any = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPubSub: any = {
  publish: jest.fn(),
  subscribe: jest.fn()
};

// Test data
const mockInquiryNodeTypeId = 'inquiry-node-type-id';
const mockVoteNodeTypeId = 'vote-node-type-id';
const mockInvestigatesEdgeTypeId = 'investigates-edge-type-id';
const mockVotesOnEdgeTypeId = 'votes-on-edge-type-id';
const mockUserId = 'user-123';
const mockInquiryId = 'inquiry-456';
const mockTargetNodeId = 'target-node-789';

// Mock CredibilityService globally
jest.mock('../services/CredibilityCalculationService', () => {
  return {
    CredibilityCalculationService: jest.fn().mockImplementation(() => {
      return {
        calculateNodeCredibility: jest.fn().mockResolvedValue(0.75)
      };
    })
  };
});

describe('FormalInquiryResolver', () => {
  let resolver: FormalInquiryResolver;

  beforeEach(() => {
    resolver = new FormalInquiryResolver();
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  // ============================================================================
  // QUERY TESTS
  // ============================================================================

  describe('getFormalInquiries() - Query inquiries with filters', () => {
    it('should return all inquiries when no filters provided', async () => {
      const mockInquiries = [{
        id: 'inquiry-1',
        props: JSON.stringify({
          targetNodeId: 'target-123',
          title: 'Inquiry 1',
          description: 'Test inquiry',
          content: 'Content here',
          status: 'open',
          createdBy: 'user-1'
        }),
        created_at: new Date(),
        updated_at: new Date()
      }];

      const mockVotes = {
        agree_count: '5',
        disagree_count: '2',
        total_votes: '7'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: mockInquiries })
        .mockResolvedValueOnce({ rows: [mockVotes] });

      const result = await resolver.getFormalInquiries(
        { pool: mockPool },
        undefined,
        undefined,
        undefined
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Inquiry 1');
      expect(result[0].agree_count).toBe(5);
      expect(result[0].disagree_count).toBe(2);
      expect(result[0].total_votes).toBe(7);
      expect(result[0].agree_percentage).toBeCloseTo(71.43, 1);
      expect(result[0].disagree_percentage).toBeCloseTo(28.57, 1);
    });

    it('should filter inquiries by nodeId', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await resolver.getFormalInquiries(
        { pool: mockPool },
        'target-node-123',
        undefined,
        undefined
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(`(n.props->>'targetNodeId')::text = $2`),
        expect.arrayContaining([mockInquiryNodeTypeId, 'target-node-123'])
      );
    });

    it('should filter inquiries by edgeId', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [] });

      await resolver.getFormalInquiries(
        { pool: mockPool },
        undefined,
        'target-edge-456',
        undefined
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(`(n.props->>'targetEdgeId')::text = $2`),
        expect.arrayContaining([mockInquiryNodeTypeId, 'target-edge-456'])
      );
    });

    it('should filter inquiries by status', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [] });

      await resolver.getFormalInquiries(
        { pool: mockPool },
        undefined,
        undefined,
        'evaluated'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(`(n.props->>'status')::text = $2`),
        expect.arrayContaining([mockInquiryNodeTypeId, 'evaluated'])
      );
    });

    it('should handle inquiries with zero votes', async () => {
      const mockInquiries = [{
        id: 'inquiry-1',
        props: JSON.stringify({
          targetNodeId: 'target-123',
          title: 'No votes inquiry',
          content: 'Content',
          status: 'open',
          createdBy: 'user-1'
        }),
        created_at: new Date(),
        updated_at: new Date()
      }];

      const mockVotes = {
        agree_count: '0',
        disagree_count: '0',
        total_votes: '0'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: mockInquiries })
        .mockResolvedValueOnce({ rows: [mockVotes] });

      const result = await resolver.getFormalInquiries(
        { pool: mockPool },
        undefined,
        undefined,
        undefined
      );

      expect(result[0].agree_count).toBe(0);
      expect(result[0].disagree_count).toBe(0);
      expect(result[0].total_votes).toBe(0);
      expect(result[0].agree_percentage).toBe(0);
      expect(result[0].disagree_percentage).toBe(0);
    });

    it('should handle props as object (not string)', async () => {
      const mockInquiries = [{
        id: 'inquiry-1',
        props: { // Already an object, not a string
          targetNodeId: 'target-123',
          title: 'Object props',
          content: 'Content',
          status: 'open',
          createdBy: 'user-1'
        },
        created_at: new Date(),
        updated_at: new Date()
      }];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: mockInquiries })
        .mockResolvedValueOnce({ rows: [{ agree_count: '0', disagree_count: '0', total_votes: '0' }] });

      const result = await resolver.getFormalInquiries(
        { pool: mockPool },
        undefined,
        undefined,
        undefined
      );

      expect(result[0].title).toBe('Object props');
    });
  });

  describe('getFormalInquiry() - Query single inquiry', () => {
    it('should return inquiry with vote counts', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({
          targetNodeId: mockTargetNodeId,
          title: 'Single Inquiry',
          description: 'Description',
          content: 'Content',
          status: 'open',
          createdBy: mockUserId,
          confidenceScore: 0.85,
          aiDetermination: 'likely_true',
          aiRationale: 'Evidence supports claim'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockVotes = {
        agree_count: '10',
        disagree_count: '3',
        total_votes: '13'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [mockInquiry] })
        .mockResolvedValueOnce({ rows: [mockVotes] });

      const result = await resolver.getFormalInquiry({ pool: mockPool }, mockInquiryId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockInquiryId);
      expect(result.title).toBe('Single Inquiry');
      expect(result.confidence_score).toBe(0.85);
      expect(result.agree_count).toBe(10);
      expect(result.total_votes).toBe(13);
    });

    it('should return null when inquiry not found', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await resolver.getFormalInquiry({ pool: mockPool }, 'nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw error when FormalInquiry node type not found', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        resolver.getFormalInquiry({ pool: mockPool }, mockInquiryId)
      ).rejects.toThrow('FormalInquiry node type not found');
    });
  });

  describe('getUserVote() - Query user vote', () => {
    it('should return user vote when it exists', async () => {
      const mockVote = {
        id: 'vote-123',
        props: JSON.stringify({
          voteType: 'agree',
          userId: mockUserId,
          targetType: 'inquiry'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockVoteNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockVotesOnEdgeTypeId }] })
        .mockResolvedValueOnce({ rows: [mockVote] });

      const result = await resolver.getUserVote(
        { pool: mockPool, userId: mockUserId },
        mockInquiryId
      );

      expect(result).toBeDefined();
      expect(result.inquiry_id).toBe(mockInquiryId);
      expect(result.user_id).toBe(mockUserId);
      expect(result.vote_type).toBe('agree');
    });

    it('should return null when user has not voted', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockVoteNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockVotesOnEdgeTypeId }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await resolver.getUserVote(
        { pool: mockPool, userId: mockUserId },
        mockInquiryId
      );

      expect(result).toBeNull();
    });

    it('should return null when userId not provided', async () => {
      const result = await resolver.getUserVote(
        { pool: mockPool, userId: '' },
        mockInquiryId
      );

      expect(result).toBeNull();
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // MUTATION TESTS
  // ============================================================================

  describe('createFormalInquiry() - Create new inquiry', () => {
    const validInput: CreateFormalInquiryInput = {
      targetNodeId: mockTargetNodeId,
      title: 'Test Inquiry',
      description: 'Description',
      content: 'Detailed content',
      relatedNodeIds: ['related-1', 'related-2']
    };



    it('should create inquiry with valid input and initial score', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({
          targetNodeId: mockTargetNodeId,
          title: 'Test Inquiry',
          description: 'Description',
          content: 'Detailed content',
          relatedNodeIds: ['related-1', 'related-2'],
          status: 'open',
          createdBy: mockUserId,
          confidenceScore: 0.75
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = q.toString().toUpperCase();
        if (upperQ.includes('FROM PUBLIC."NODETYPES"')) return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] });
        if (upperQ.includes('FROM PUBLIC."EDGETYPES"')) return Promise.resolve({ rows: [{ id: mockInvestigatesEdgeTypeId }] });
        return Promise.resolve({ rows: [] });
      });

      (mockClient.query as jest.Mock).mockReset();
      (mockClient.query as jest.Mock).mockImplementation((query) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = q ? q.toString().toUpperCase() : '';

        if (upperQ.includes('BEGIN')) return Promise.resolve();
        // Handle INSERT Node
        if (upperQ.includes('INSERT') && upperQ.includes('NODES')) {
          return Promise.resolve({ rows: [mockInquiry] });
        }
        // Handle INSERT Edge
        if (upperQ.includes('INSERT') && upperQ.includes('EDGES')) {
          return Promise.resolve({ rows: [{ id: 'edge-123' }] });
        }
        if (upperQ.includes('ROLLBACK')) return Promise.resolve();
        if (upperQ.includes('COMMIT')) return Promise.resolve();

        return Promise.resolve({ rows: [] });
      });

      const result = await resolver.createFormalInquiry(
        validInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockInquiryId);
      expect(result.title).toBe('Test Inquiry');
      expect(result.status).toBe('open');
      expect(result.confidence_score).toBe(0.75);
      expect(result.target_node_id).toBe(mockTargetNodeId);

      expect(mockPubSub.publish).toHaveBeenCalledWith('INQUIRY_CREATED', expect.any(Object));
    });

    it('should require authentication', async () => {
      await expect(
        resolver.createFormalInquiry(
          validInput,
          { pool: mockPool, userId: '', pubSub: mockPubSub }
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should rollback transaction on error', async () => {
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = q.toString().toUpperCase();
        if (upperQ.includes('FROM PUBLIC."NODETYPES"')) return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] });
        if (upperQ.includes('FROM PUBLIC."EDGETYPES"')) return Promise.resolve({ rows: [{ id: mockInvestigatesEdgeTypeId }] });
        return Promise.resolve({ rows: [] });
      });

      (mockClient.query as jest.Mock).mockReset();
      (mockClient.query as jest.Mock).mockImplementation((query) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = q ? q.toString().toUpperCase() : '';

        if (upperQ.includes('BEGIN')) return Promise.resolve();
        if (upperQ.includes('INSERT')) return Promise.reject(new Error('Database error'));
        if (upperQ.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      await expect(
        resolver.createFormalInquiry(
          validInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should require either targetNodeId or targetEdgeId', async () => {
      const invalidInput = {
        title: 'Test Inquiry',
        content: 'Content'
      } as CreateFormalInquiryInput;

      await expect(
        resolver.createFormalInquiry(
          invalidInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Must specify either targetNodeId or targetEdgeId');
    });

    it('should not allow both targetNodeId and targetEdgeId', async () => {
      const invalidInput: CreateFormalInquiryInput = {
        targetNodeId: 'node-123',
        targetEdgeId: 'edge-456',
        title: 'Test',
        content: 'Content'
      };

      await expect(
        resolver.createFormalInquiry(
          invalidInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Cannot target both node and edge simultaneously');
    });

    it('should create inquiry targeting an edge', async () => {
      const edgeInput: CreateFormalInquiryInput = {
        targetEdgeId: 'edge-789',
        title: 'Edge Inquiry',
        content: 'Content'
      };

      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = q.toString().toUpperCase();
        if (upperQ.includes('FROM PUBLIC."NODETYPES"')) return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] });
        if (upperQ.includes('FROM PUBLIC."EDGETYPES"')) return Promise.resolve({ rows: [{ id: mockInvestigatesEdgeTypeId }] });
        return Promise.resolve({ rows: [] });
      });

      (mockClient.query as jest.Mock).mockReset();
      (mockClient.query as jest.Mock).mockImplementation((query) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = q ? q.toString().toUpperCase() : '';

        if (upperQ.includes('BEGIN')) return Promise.resolve();
        if (upperQ.includes('INSERT') && upperQ.includes('NODES')) {
          return Promise.resolve({
            rows: [{
              id: mockInquiryId,
              props: JSON.stringify({
                targetEdgeId: 'edge-789',
                targetType: 'edge',
                title: 'Edge Inquiry',
                status: 'open',
                createdBy: mockUserId,
                confidenceScore: 0.75
              }),
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        if (upperQ.includes('INSERT') && upperQ.includes('EDGES')) return Promise.resolve({ rows: [{ id: 'edge-123' }] });
        return Promise.resolve({ rows: [] });
      });

      const result = await resolver.createFormalInquiry(
        edgeInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result).toBeDefined();
      expect(result.target_edge_id).toBe('edge-789');
    });
  });

  describe('castVote() - Cast or update vote', () => {
    const validVoteInput: CastVoteInput = {
      inquiryId: mockInquiryId,
      voteType: 'agree'
    };

    it('should cast new vote successfully', async () => {
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query, params) => {
        const text = typeof query === 'string' ? query : query.text;
        const q = text.trim().toUpperCase();
        if (q.includes('FROM PUBLIC."NODETYPES"')) return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] }); // inquiry or vote node types
        if (q.includes('FROM PUBLIC."EDGETYPES"')) return Promise.resolve({ rows: [{ id: mockVotesOnEdgeTypeId }] });

        // Inquiry Lookup
        if (q.includes('FROM PUBLIC."NODES"') && q.includes('FORMALINQUIRY')) {
          return Promise.resolve({ rows: [{ id: mockInquiryId, props: JSON.stringify({ status: 'open', createdBy: 'user-1' }) }] });
        }
        // Vote Lookup (User)
        if (q.includes('FROM PUBLIC."NODES"') && q.includes('USERID')) {
          return Promise.resolve({ rows: [] }); // No existing vote
        }
        if (q.includes('COUNT(*)')) return Promise.resolve({ rows: [{ agree_count: '1', total_votes: '1' }] });
        return Promise.resolve({ rows: [] });
      });

      (mockClient.query as jest.Mock).mockReset();
      (mockClient.query as jest.Mock).mockImplementation((query, params) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = q ? q.toString().toUpperCase() : '';
        console.error('MOCK CLIENT QUERY:', upperQ); // DEBUG

        if (upperQ.includes('BEGIN') || upperQ.includes('COMMIT')) return Promise.resolve();
        if (upperQ.includes('INSERT') && upperQ.includes('NODES')) {
          return Promise.resolve({
            rows: [{
              id: 'vote-123',
              props: JSON.stringify({ voteType: 'agree', userId: mockUserId }),
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        if (upperQ.includes('INSERT') && upperQ.includes('EDGES')) return Promise.resolve({ rows: [{ id: 'edge-123' }] });

        // Re-fetch vote after commit
        if (upperQ.includes('SELECT') && upperQ.includes('NODES') && upperQ.includes('ID')) {
          return Promise.resolve({
            rows: [{
              id: 'vote-123',
              props: JSON.stringify({ voteType: 'agree', userId: mockUserId }),
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await resolver.castVote(
        validVoteInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result).toBeDefined();
      expect(result.vote_type).toBe('agree');
      expect(result.inquiry_id).toBe(mockInquiryId);
      expect(mockPubSub.publish).toHaveBeenCalledWith('INQUIRY_VOTE_CAST', expect.any(Object));
    });

    it('should update existing vote', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: { status: 'open', createdBy: 'user-1' } // Object not string for internal usage if parsed? No DB returns string props usually.
        // But mockImplementation returns rows directly.
        // Wait, pg returns props as JSON object IF jsonb column?
        // My other mocks returned props: { ... }.
        // Let's stick to standard practice.
      };

      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query, params) => {
        const text = typeof query === 'string' ? query : query.text;
        const q = text.trim().toUpperCase();
        if (q.includes('FROM PUBLIC."NODETYPES"')) return Promise.resolve({ rows: [{ id: mockVoteNodeTypeId }] });
        if (q.includes('FROM PUBLIC."EDGETYPES"')) return Promise.resolve({ rows: [{ id: mockVotesOnEdgeTypeId }] });
        // Inquiry lookup
        if (q.includes('FORMALINQUIRY')) {
          return Promise.resolve({ rows: [{ id: mockInquiryId, props: { status: 'open', createdBy: 'user-1' } }] });
        }
        // Existing vote lookup
        if (q.includes('FROM PUBLIC."NODES"') && q.includes('USERID')) {
          return Promise.resolve({ rows: [{ id: 'existing-vote-123', props: { voteType: 'agree' } }] });
        }
        if (q.includes('COUNT(*)')) return Promise.resolve({ rows: [{ agree_count: '0', total_votes: '1' }] });
        if (q.includes('UPDATE PUBLIC."NODES"')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      (mockClient.query as jest.Mock).mockReset();
      (mockClient.query as jest.Mock).mockImplementation((query, params) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = typeof q === 'string' ? q.toUpperCase() : '';

        if (upperQ.includes('UPDATE')) {
          return Promise.resolve({ rows: [] }); // Update command result
        }
        if (upperQ.includes('SELECT') && upperQ.includes('FROM PUBLIC."NODES"') && upperQ.includes('ID = $1')) {
          // Fetch updated vote
          return Promise.resolve({
            rows: [{
              id: 'existing-vote-123',
              props: JSON.stringify({ voteType: 'disagree', userId: mockUserId }),
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        if (upperQ.includes('BEGIN') || upperQ.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      const changeVoteInput: CastVoteInput = {
        inquiryId: mockInquiryId,
        voteType: 'disagree'
      };

      const result = await resolver.castVote(
        changeVoteInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result.vote_type).toBe('disagree');
    });

    it('should require authentication', async () => {
      // Note: validInquiryInput is not defined in this scope. Assuming it's meant to be validVoteInput.
      await expect(
        resolver.castVote(
          validVoteInput,
          { pool: mockPool, userId: '', pubSub: mockPubSub }
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should throw error when inquiry not found', async () => {
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        resolver.castVote(
          validVoteInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Formal inquiry not found');
    });

    it('should not allow voting on closed inquiries', async () => {
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query) => {
        const q = typeof query === 'string' ? query : query.text;
        if (q.toUpperCase().includes('FORMALINQUIRY')) {
          return Promise.resolve({ rows: [{ id: mockInquiryId, props: JSON.stringify({ status: 'resolved' }) }] });
        }
        if (q.toUpperCase().includes('NODETYPES')) return Promise.resolve({ rows: [{ id: '1' }] });
        return Promise.resolve({ rows: [] });
      });

      await expect(
        resolver.castVote(
          validVoteInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Inquiry is not open for voting');
    });

    it('should allow voting on evaluating status', async () => {
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query, params) => {
        const text = typeof query === 'string' ? query : query.text;
        const q = text.trim().toUpperCase();
        if (q.includes('FROM PUBLIC."NODETYPES"')) return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] });
        if (q.includes('FROM PUBLIC."EDGETYPES"')) return Promise.resolve({ rows: [{ id: mockVotesOnEdgeTypeId }] });
        if (q.includes('FROM PUBLIC."NODES"') && q.includes('USERID')) return Promise.resolve({ rows: [] }); // No vote
        if (q.includes('FROM PUBLIC."NODES"') && q.includes('FORMALINQUIRY')) {
          return Promise.resolve({ rows: [{ id: mockInquiryId, props: JSON.stringify({ status: 'evaluating', createdBy: 'user-1' }) }] });
        }
        if (q.includes('COUNT(*)')) return Promise.resolve({ rows: [{ agree_count: '1', total_votes: '1' }] });
        return Promise.resolve({ rows: [] });
      });

      (mockClient.query as jest.Mock).mockReset();
      (mockClient.query as jest.Mock).mockImplementation((query, params) => {
        const q = typeof query === 'string' ? query : query.text;
        const upperQ = q ? q.toString().toUpperCase() : '';

        if (upperQ.includes('BEGIN') || upperQ.includes('COMMIT')) return Promise.resolve();
        if (upperQ.includes('INSERT') && upperQ.includes('NODES')) {
          return Promise.resolve({
            rows: [{
              id: 'vote-123',
              props: JSON.stringify({ voteType: 'agree', userId: mockUserId }),
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        if (upperQ.includes('INSERT') && upperQ.includes('EDGES')) return Promise.resolve({ rows: [{ id: 'edge-123' }] });

        if (upperQ.includes('SELECT') && upperQ.includes('NODES') && upperQ.includes('ID')) {
          return Promise.resolve({
            rows: [{
              id: 'vote-123',
              props: JSON.stringify({ voteType: 'agree', userId: mockUserId }),
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await resolver.castVote(
        validVoteInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result).toBeDefined();
    });
  });

  describe('removeVote() - Remove user vote', () => {
    it('should remove vote successfully', async () => {
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query, params) => {
        const text = typeof query === 'string' ? query : query.text;
        const q = text.trim().toUpperCase();

        if (q.includes('FROM PUBLIC."NODETYPES"')) {
          return Promise.resolve({ rows: [{ id: mockVoteNodeTypeId }] });
        }
        if (q.includes('FROM PUBLIC."EDGETYPES"')) {
          return Promise.resolve({ rows: [{ id: mockVotesOnEdgeTypeId }] });
        }
        if (q.includes('DELETE FROM PUBLIC."NODES"')) {
          return Promise.resolve({ rows: [{ id: 'vote-123' }] });
        }
        // Handle inquiry lookup if it exists
        if (q.includes('FROM PUBLIC."NODES"') && q.includes('FORMALINQUIRY')) {
          return Promise.resolve({ rows: [{ id: mockInquiryId, props: {} }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await resolver.removeVote(
        mockInquiryId,
        { pool: mockPool, userId: mockUserId }
      );

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM public."Nodes"'),
        expect.arrayContaining([mockVoteNodeTypeId, mockVotesOnEdgeTypeId, 'inquiry-456', mockUserId])
      );
    });

    it('should return false when no vote exists', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockVoteNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockVotesOnEdgeTypeId }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await resolver.removeVote(
        mockInquiryId,
        { pool: mockPool, userId: mockUserId }
      );

      expect(result).toBe(false);
    });

    it('should require authentication', async () => {
      await expect(
        resolver.removeVote(
          mockInquiryId,
          { pool: mockPool, userId: '' }
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('updateConfidenceScore() - AI evaluation', () => {
    const validScoreInput: UpdateConfidenceScoreInput = {
      inquiryId: mockInquiryId,
      confidenceScore: 0.82,
      aiDetermination: 'likely_true',
      aiRationale: 'Strong evidence supports the claim with multiple reliable sources'
    };

    it('should update confidence score successfully', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({
          targetNodeId: mockTargetNodeId,
          title: 'Test Inquiry',
          content: 'Content',
          status: 'open',
          createdBy: 'user-1'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };
      // Mock implementation
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query, params) => {
        const text = typeof query === 'string' ? query : query.text;
        const q = text.trim().toUpperCase();

        if (q.includes('FROM PUBLIC."NODETYPES"')) {
          return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] });
        }
        if (q.includes('FORMALINQUIRY')) { // select inquiry
          return Promise.resolve({ rows: [mockInquiry] });
        }
        if (q.includes('UPDATE PUBLIC."NODES"')) {
          return Promise.resolve();
        }
        if (q.includes('COUNT(*)')) { // vote counts
          const mockVotes = { agree_count: '15', total_votes: '20' };
          return Promise.resolve({ rows: [mockVotes] });
        }

        return Promise.resolve({ rows: [] });
      });

      // Mock Credibility Service for this test
      (CredibilityCalculationService as unknown as jest.Mock).mockImplementation(() => ({
        calculateNodeCredibility: jest.fn().mockResolvedValue(0.82)
      }));

      const result = await resolver.updateConfidenceScore(
        validScoreInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result).toBeDefined();
      expect(result.confidence_score).toBe(0.82);
      expect(result.ai_determination).toBe('likely_true');
      expect(result.status).toBe('evaluated');
      expect(result.evaluated_by).toBe(mockUserId);
      expect(mockPubSub.publish).toHaveBeenCalledWith('INQUIRY_EVALUATED', expect.any(Object));
    });

    it('should require authentication', async () => {
      await expect(
        resolver.updateConfidenceScore(
          validScoreInput,
          { pool: mockPool, userId: '', pubSub: mockPubSub }
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should throw error if inquiry not found', async () => {
      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query, params) => {
        const text = typeof query === 'string' ? query : query.text;
        const q = text.trim().toUpperCase();

        if (q.includes('FROM PUBLIC."NODETYPES"')) {
          return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] });
        }
        if (q.includes('FORMALINQUIRY')) { // select inquiry
          return Promise.resolve({ rows: [] }); // RETURN EMPTY
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        resolver.updateConfidenceScore(
          validScoreInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Formal inquiry not found');
    });

    it('should throw error when inquiry not found', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        resolver.updateConfidenceScore(
          validScoreInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Formal inquiry not found');
    });

    it('should preserve existing inquiry properties', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({
          targetNodeId: mockTargetNodeId,
          targetEdgeId: undefined,
          title: 'Preserve Props',
          description: 'Keep this',
          content: 'Content',
          status: 'evaluating',
          createdBy: 'user-1',
          relatedNodeIds: ['related-1']
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      const existingProps = { ...JSON.parse(mockInquiry.props), title: 'Preserve Props', description: 'Keep this' };
      const mockExistingInquiry = { ...mockInquiry, props: JSON.stringify(existingProps) };

      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query, params) => {
        const text = typeof query === 'string' ? query : query.text;
        const q = text.trim().toUpperCase();

        if (q.includes('FROM PUBLIC."NODETYPES"')) {
          return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] });
        }
        if (q.includes('FORMALINQUIRY')) { // select inquiry
          return Promise.resolve({ rows: [mockExistingInquiry] });
        }
        if (q.includes('UPDATE PUBLIC."NODES"')) {
          return Promise.resolve();
        }
        if (q.includes('COUNT(*)')) { // vote counts
          const mockVotes = { agree_count: '0', total_votes: '0' };
          return Promise.resolve({ rows: [mockVotes] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await resolver.updateConfidenceScore(
        validScoreInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result.title).toBe('Preserve Props');
      expect(result.description).toBe('Keep this');
      expect(result.target_node_id).toBe(mockTargetNodeId);
    });

    it('should calculate vote percentages correctly', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({
          targetNodeId: mockTargetNodeId,
          title: 'Vote Test',
          content: 'Content',
          status: 'open',
          createdBy: 'user-1'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockVotes = {
        agree_count: '15',
        disagree_count: '5',
        total_votes: '20'
      };

      (mockPool.query as jest.Mock).mockReset();
      (mockPool.query as jest.Mock).mockImplementation((query, params) => {
        const text = typeof query === 'string' ? query : query.text;
        const q = text.trim().toUpperCase();

        if (q.includes('FROM PUBLIC."NODETYPES"')) {
          return Promise.resolve({ rows: [{ id: mockInquiryNodeTypeId }] });
        }
        if (q.includes('FORMALINQUIRY')) { // select inquiry
          return Promise.resolve({ rows: [mockInquiry] });
        }
        if (q.includes('UPDATE PUBLIC."NODES"')) {
          return Promise.resolve();
        }
        if (q.includes('COUNT(*)')) { // vote counts (robust match)
          return Promise.resolve({ rows: [mockVotes] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await resolver.updateConfidenceScore(
        validScoreInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result.agree_percentage).toBe(75);
      expect(result.disagree_percentage).toBe(25);
    });
  });
});
