import { FormalInquiryResolver } from '../resolvers/FormalInquiryResolver';
import { Pool, PoolClient } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import {
  CreateFormalInquiryInput,
  CastVoteInput,
  UpdateConfidenceScoreInput
} from '../resolvers/FormalInquiryInput';

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

    it('should create inquiry with valid input', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({
          targetNodeId: mockTargetNodeId,
          title: 'Test Inquiry',
          description: 'Description',
          content: 'Detailed content',
          relatedNodeIds: ['related-1', 'related-2'],
          status: 'open',
          createdBy: mockUserId
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockInvestigatesEdgeTypeId }] });

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockInquiry] }) // INSERT inquiry
        .mockResolvedValueOnce(undefined) // INSERT edge
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await resolver.createFormalInquiry(
        validInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Inquiry');
      expect(result.status).toBe('open');
      expect(result.agree_count).toBe(0);
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

    it('should rollback on error', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockInvestigatesEdgeTypeId }] });

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        resolver.createFormalInquiry(
          validInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create inquiry targeting an edge', async () => {
      const edgeInput: CreateFormalInquiryInput = {
        targetEdgeId: 'edge-789',
        title: 'Edge Inquiry',
        content: 'Content'
      };

      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({
          targetEdgeId: 'edge-789',
          targetType: 'edge',
          title: 'Edge Inquiry',
          content: 'Content',
          status: 'open',
          createdBy: mockUserId
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockInquiryNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockInvestigatesEdgeTypeId }] });

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockInquiry] })
        .mockResolvedValueOnce(undefined) // INSERT edge
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await resolver.createFormalInquiry(
        edgeInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result.target_edge_id).toBe('edge-789');
      expect(result.target_node_id).toBeUndefined();
    });
  });

  describe('castVote() - Cast or update vote', () => {
    const validVoteInput: CastVoteInput = {
      inquiryId: mockInquiryId,
      voteType: 'agree'
    };

    it('should cast new vote successfully', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({ status: 'open', createdBy: 'user-1' })
      };

      const mockVote = {
        id: 'vote-123',
        props: JSON.stringify({ voteType: 'agree', userId: mockUserId }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiry] }) // Get inquiry
        .mockResolvedValueOnce({ rows: [{ id: mockVoteNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockVotesOnEdgeTypeId }] })
        .mockResolvedValueOnce({ rows: [] }); // No existing vote

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockVote] }) // INSERT vote
        .mockResolvedValueOnce(undefined) // INSERT edge
        .mockResolvedValueOnce(undefined) // COMMIT
        .mockResolvedValueOnce({ rows: [mockVote] }); // Get updated vote

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
        props: JSON.stringify({ status: 'open', createdBy: 'user-1' })
      };

      const existingVote = { id: 'existing-vote-123' };

      const updatedVote = {
        id: 'existing-vote-123',
        props: JSON.stringify({ voteType: 'disagree', userId: mockUserId }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiry] })
        .mockResolvedValueOnce({ rows: [{ id: mockVoteNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockVotesOnEdgeTypeId }] })
        .mockResolvedValueOnce({ rows: [existingVote] }); // Existing vote found

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // UPDATE vote
        .mockResolvedValueOnce(undefined) // COMMIT
        .mockResolvedValueOnce({ rows: [updatedVote] }); // Get updated vote

      const changeVoteInput: CastVoteInput = {
        inquiryId: mockInquiryId,
        voteType: 'disagree'
      };

      const result = await resolver.castVote(
        changeVoteInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result.vote_type).toBe('disagree');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
    });

    it('should require authentication', async () => {
      await expect(
        resolver.castVote(
          validVoteInput,
          { pool: mockPool, userId: '', pubSub: mockPubSub }
        )
      ).rejects.toThrow('Authentication required');
    });

    it('should throw error when inquiry not found', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        resolver.castVote(
          validVoteInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Formal inquiry not found');
    });

    it('should not allow voting on closed inquiries', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({ status: 'resolved', createdBy: 'user-1' })
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiry] });

      await expect(
        resolver.castVote(
          validVoteInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Inquiry is not open for voting');
    });

    it('should allow voting on evaluating status', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({ status: 'evaluating', createdBy: 'user-1' })
      };

      const mockVote = {
        id: 'vote-123',
        props: JSON.stringify({ voteType: 'agree', userId: mockUserId }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiry] })
        .mockResolvedValueOnce({ rows: [{ id: mockVoteNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockVotesOnEdgeTypeId }] })
        .mockResolvedValueOnce({ rows: [] });

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockVote] })
        .mockResolvedValueOnce(undefined) // INSERT edge
        .mockResolvedValueOnce(undefined) // COMMIT
        .mockResolvedValueOnce({ rows: [mockVote] });

      const result = await resolver.castVote(
        validVoteInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result).toBeDefined();
    });

    it('should rollback on error', async () => {
      const mockInquiry = {
        id: mockInquiryId,
        props: JSON.stringify({ status: 'open', createdBy: 'user-1' })
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiry] })
        .mockResolvedValueOnce({ rows: [{ id: mockVoteNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockVotesOnEdgeTypeId }] })
        .mockResolvedValueOnce({ rows: [] });

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Vote insert failed'));

      await expect(
        resolver.castVote(
          validVoteInput,
          { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
        )
      ).rejects.toThrow('Vote insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('removeVote() - Remove user vote', () => {
    it('should remove vote successfully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockVoteNodeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockVotesOnEdgeTypeId }] })
        .mockResolvedValueOnce({ rows: [{ id: 'vote-123' }] }); // Deleted vote

      const result = await resolver.removeVote(
        mockInquiryId,
        { pool: mockPool, userId: mockUserId }
      );

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM public."Nodes"'),
        expect.arrayContaining([mockVoteNodeTypeId, mockVotesOnEdgeTypeId, mockInquiryId, mockUserId])
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

      const mockVotes = {
        agree_count: '8',
        disagree_count: '2',
        total_votes: '10'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiry] }) // Get inquiry
        .mockResolvedValueOnce(undefined) // UPDATE inquiry
        .mockResolvedValueOnce({ rows: [mockVotes] }); // Get vote counts

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

      const mockVotes = {
        agree_count: '5',
        disagree_count: '1',
        total_votes: '6'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiry] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [mockVotes] });

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
        agree_count: '7',
        disagree_count: '3',
        total_votes: '10'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiry] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [mockVotes] });

      const result = await resolver.updateConfidenceScore(
        validScoreInput,
        { pool: mockPool, userId: mockUserId, pubSub: mockPubSub }
      );

      expect(result.agree_percentage).toBe(70);
      expect(result.disagree_percentage).toBe(30);
    });
  });
});
