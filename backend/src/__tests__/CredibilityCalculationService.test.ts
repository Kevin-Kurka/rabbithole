import { Pool } from 'pg';
import { CredibilityCalculationService, CredibilityFactors, ScoredPosition } from '../services/CredibilityCalculationService';

// Helper to create mock pool
function createMockPool(): any {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
}

describe('CredibilityCalculationService', () => {
  let service: CredibilityCalculationService;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = createMockPool();
    service = new CredibilityCalculationService(mockPool);
  });

  // ============================================================================
  // calculatePositionCredibility() - Main scoring algorithm
  // ============================================================================

  describe('calculatePositionCredibility()', () => {
    it('should calculate credibility with all factors', async () => {
      const mockPosition = {
        id: 'pos-123',
        evidence_quality_score: 0.9,  // 90% quality
        evidence_type_weight: 1.0,     // Primary document
        evidence_links: ['source-1', 'source-2'],
        coherence_score: 0.85,         // 85% coherent
        upvotes: 50,
        downvotes: 10
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPosition] }) // getPositionDetails
        .mockResolvedValueOnce({ rows: [] }); // updatePositionCredibility

      const credibility = await service.calculatePositionCredibility('pos-123');

      // Formula: 0.9 * 1.0 * 0.5 (evidence) + 0.6 * 0.25 (source) + 0.85 * 0.2 (coherence) + community * 0.05
      // = 0.45 + 0.15 + 0.17 + community ≈ 0.77-0.82 range
      expect(credibility).toBeGreaterThan(0.75);
      expect(credibility).toBeLessThanOrEqual(1.0);
    });

    it('should give highest weight to evidence quality (50%)', async () => {
      const mockPosition = {
        id: 'pos-123',
        evidence_quality_score: 1.0,   // Perfect evidence
        evidence_type_weight: 1.0,     // Primary document
        evidence_links: ['source-1'],
        coherence_score: 0.0,          // Poor coherence
        upvotes: 0,
        downvotes: 0
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPosition] })
        .mockResolvedValueOnce({ rows: [] });

      const credibility = await service.calculatePositionCredibility('pos-123');

      // Even with poor coherence and no votes, strong evidence = 50% + 15% = 65%
      expect(credibility).toBeGreaterThan(0.60);
    });

    it('should apply evidence type weight hierarchy', async () => {
      const primaryDoc = {
        id: 'pos-1',
        evidence_quality_score: 0.9,
        evidence_type_weight: 1.0,     // Primary = 100%
        evidence_links: ['src'],
        coherence_score: 0.8,
        upvotes: 10,
        downvotes: 0
      };

      const anecdote = {
        id: 'pos-2',
        evidence_quality_score: 0.9,   // Same quality
        evidence_type_weight: 0.2,     // Anecdote = 20%
        evidence_links: ['src'],
        coherence_score: 0.8,
        upvotes: 10,
        downvotes: 0
      };

      // Test primary document
      mockPool.query
        .mockResolvedValueOnce({ rows: [primaryDoc] })
        .mockResolvedValueOnce({ rows: [] });

      const primaryScore = await service.calculatePositionCredibility('pos-1');

      // Test anecdote
      mockPool.query
        .mockResolvedValueOnce({ rows: [anecdote] })
        .mockResolvedValueOnce({ rows: [] });

      const anecdoteScore = await service.calculatePositionCredibility('pos-2');

      // Primary document should score significantly higher
      expect(primaryScore).toBeGreaterThan(anecdoteScore);
      expect(primaryScore - anecdoteScore).toBeGreaterThan(0.3); // At least 30% difference
    });

    it('should limit community signal to 5% weight', async () => {
      const mockPosition = {
        id: 'pos-123',
        evidence_quality_score: 0.5,
        evidence_type_weight: 0.5,
        evidence_links: [],
        coherence_score: 0.5,
        upvotes: 1000,    // Massive upvotes
        downvotes: 0
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPosition] })
        .mockResolvedValueOnce({ rows: [] });

      const credibility = await service.calculatePositionCredibility('pos-123');

      // Max contribution from votes = 5% × 1.0 = 0.05
      // Base: 0.5 * 0.5 * 0.5 + 0.2 * 0.25 + 0.5 * 0.2 = 0.125 + 0.05 + 0.1 = 0.275
      // With max votes: 0.275 + 0.05 = 0.325
      expect(credibility).toBeLessThan(0.35);
    });

    it('should clamp credibility to [0, 1] range', async () => {
      const mockPosition = {
        id: 'pos-123',
        evidence_quality_score: 2.0,   // Invalid: > 1.0
        evidence_type_weight: 2.0,
        evidence_links: ['source'],
        coherence_score: 1.0,
        upvotes: 1000,
        downvotes: 0
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPosition] })
        .mockResolvedValueOnce({ rows: [] });

      const credibility = await service.calculatePositionCredibility('pos-123');

      expect(credibility).toBeLessThanOrEqual(1.0);
      expect(credibility).toBeGreaterThanOrEqual(0.0);
    });

    it('should throw error when position not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No position

      await expect(
        service.calculatePositionCredibility('nonexistent')
      ).rejects.toThrow('Position not found');
    });

    it('should update position in database with scores', async () => {
      const mockPosition = {
        id: 'pos-123',
        evidence_quality_score: 0.8,
        evidence_type_weight: 0.9,
        evidence_links: ['source'],
        coherence_score: 0.75,
        upvotes: 20,
        downvotes: 5
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPosition] })
        .mockResolvedValueOnce({ rows: [] }); // update

      await service.calculatePositionCredibility('pos-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE public."InquiryPositions"'),
        expect.arrayContaining([
          expect.any(Number),  // credibility_score
          0.8,                 // evidence_quality_score
          expect.any(Number),  // source_credibility_score
          0.75,                // coherence_score
          'pos-123'
        ])
      );
    });
  });

  // ============================================================================
  // calculateCommunitySignal() - Vote processing with diminishing returns
  // ============================================================================

  describe('calculateCommunitySignal()', () => {
    it('should return 0.5 for no votes (neutral)', () => {
      // Access private method via type assertion for testing
      const signal = (service as any).calculateCommunitySignal(0, 0);
      expect(signal).toBe(0.5);
    });

    it('should apply diminishing returns under 100 votes', () => {
      const signal10 = (service as any).calculateCommunitySignal(10, 0);
      const signal50 = (service as any).calculateCommunitySignal(50, 0);

      // 10 votes: 1.0 ratio × 0.1 factor = 0.1
      expect(signal10).toBeCloseTo(0.1, 2);

      // 50 votes: 1.0 ratio × 0.5 factor = 0.5
      expect(signal50).toBeCloseTo(0.5, 2);
    });

    it('should cap influence at 100 votes', () => {
      const signal100 = (service as any).calculateCommunitySignal(100, 0);
      const signal200 = (service as any).calculateCommunitySignal(200, 0);

      // Both should reach max influence
      expect(signal100).toBeCloseTo(1.0, 2);
      expect(signal200).toBeCloseTo(1.0, 2);
    });

    it('should weight vote ratio correctly', () => {
      const signal = (service as any).calculateCommunitySignal(75, 25);

      // 75/(75+25) = 0.75 ratio, 100 total = 1.0 factor
      // Result: 0.75 × 1.0 = 0.75
      expect(signal).toBeCloseTo(0.75, 2);
    });

    it('should handle negative ratio correctly', () => {
      const signal = (service as any).calculateCommunitySignal(0, 100);

      // 0/(0+100) = 0.0 ratio
      expect(signal).toBe(0.0);
    });
  });

  // ============================================================================
  // calculateSourceCredibility() - Source track record evaluation
  // ============================================================================

  describe('calculateSourceCredibility()', () => {
    it('should return 0.2 for no sources', async () => {
      const credibility = await (service as any).calculateSourceCredibility([]);
      expect(credibility).toBe(0.2);
    });

    it('should return 0.2 for null/undefined sources', async () => {
      const credibility1 = await (service as any).calculateSourceCredibility(null);
      const credibility2 = await (service as any).calculateSourceCredibility(undefined);

      expect(credibility1).toBe(0.2);
      expect(credibility2).toBe(0.2);
    });

    it('should return moderate credibility when sources provided', async () => {
      const sources = ['source-1', 'source-2', 'source-3'];
      const credibility = await (service as any).calculateSourceCredibility(sources);

      // Placeholder implementation returns 0.6
      expect(credibility).toBe(0.6);
    });

    it('should handle errors gracefully', async () => {
      // Pass invalid input
      const credibility = await (service as any).calculateSourceCredibility('invalid');

      // Should return default 0.5 on error
      expect(credibility).toBeGreaterThanOrEqual(0.0);
      expect(credibility).toBeLessThanOrEqual(1.0);
    });
  });

  // ============================================================================
  // calculateNodeCredibility() - Aggregate inquiry positions
  // ============================================================================

  describe('calculateNodeCredibility()', () => {
    it('should return 0.5 for node with no inquiries', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No inquiries

      const credibility = await service.calculateNodeCredibility('node-123');

      expect(credibility).toBe(0.5);
    });

    it('should aggregate multiple inquiry positions', async () => {
      const mockInquiries = [
        { id: 'inq-1', inclusion_threshold: 0.5 }
      ];

      const mockPositions = [
        {
          id: 'pos-1',
          credibility_score: 0.9,
          evidence_weight_value: 1.0,
          status: 'active'
        },
        {
          id: 'pos-2',
          credibility_score: 0.7,
          evidence_weight_value: 0.8,
          status: 'active'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockInquiries })
        .mockResolvedValueOnce({ rows: mockPositions });

      const credibility = await service.calculateNodeCredibility('node-123');

      // Weighted average: (0.9 × 1.0 + 0.7 × 0.8) / (1.0 + 0.8)
      // = (0.9 + 0.56) / 1.8 = 1.46 / 1.8 ≈ 0.811
      expect(credibility).toBeCloseTo(0.811, 2);
    });

    it('should exclude positions below inclusion threshold', async () => {
      const mockInquiries = [
        { id: 'inq-1', inclusion_threshold: 0.6 }
      ];

      const mockPositions = [
        {
          id: 'pos-1',
          credibility_score: 0.9,  // Above threshold
          evidence_weight_value: 1.0,
          status: 'active'
        },
        {
          id: 'pos-2',
          credibility_score: 0.4,  // Below threshold
          evidence_weight_value: 1.0,
          status: 'active'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockInquiries })
        .mockResolvedValueOnce({ rows: mockPositions });

      const credibility = await service.calculateNodeCredibility('node-123');

      // Only pos-1 included: 0.9
      expect(credibility).toBeCloseTo(0.9, 2);
    });

    it('should return 0.5 when no positions meet threshold', async () => {
      const mockInquiries = [
        { id: 'inq-1', inclusion_threshold: 0.8 }
      ];

      const mockPositions = [
        {
          id: 'pos-1',
          credibility_score: 0.5,  // Below threshold
          evidence_weight_value: 1.0,
          status: 'active'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockInquiries })
        .mockResolvedValueOnce({ rows: mockPositions });

      const credibility = await service.calculateNodeCredibility('node-123');

      expect(credibility).toBe(0.5);
    });

    it('should handle default inclusion threshold of 0.5', async () => {
      const mockInquiries = [
        { id: 'inq-1', inclusion_threshold: null } // No threshold
      ];

      const mockPositions = [
        {
          id: 'pos-1',
          credibility_score: 0.6,
          evidence_weight_value: 1.0,
          status: 'active'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockInquiries })
        .mockResolvedValueOnce({ rows: mockPositions });

      const credibility = await service.calculateNodeCredibility('node-123');

      expect(credibility).toBeCloseTo(0.6, 2);
    });

    it('should skip archived positions', async () => {
      const mockInquiries = [
        { id: 'inq-1', inclusion_threshold: 0.5 }
      ];

      const mockPositions = [
        {
          id: 'pos-1',
          credibility_score: 0.9,
          evidence_weight_value: 1.0,
          status: 'active'
        },
        {
          id: 'pos-2',
          credibility_score: 0.3,
          evidence_weight_value: 1.0,
          status: 'archived'  // Should be excluded by query
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockInquiries })
        .mockResolvedValueOnce({ rows: [mockPositions[0]] }); // Query excludes archived

      const credibility = await service.calculateNodeCredibility('node-123');

      expect(credibility).toBeCloseTo(0.9, 2);
    });
  });

  // ============================================================================
  // recalculateInquiryPositions() - Batch position scoring
  // ============================================================================

  describe('recalculateInquiryPositions()', () => {
    it('should recalculate all positions in inquiry', async () => {
      const mockPositions = [
        { id: 'pos-1' },
        { id: 'pos-2' }
      ];

      // Mock for position IDs query
      mockPool.query.mockResolvedValueOnce({ rows: mockPositions });

      // Mock for each position's calculatePositionCredibility
      for (let i = 0; i < mockPositions.length; i++) {
        const mockPosition = {
          id: `pos-${i + 1}`,
          stance: `Stance ${i + 1}`,
          argument: `Argument ${i + 1}`,
          evidence_quality_score: 0.8,
          evidence_type_weight: 0.9,
          evidence_links: ['source'],
          coherence_score: 0.75,
          upvotes: 30,
          downvotes: 10
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockPosition] })  // getPositionDetails
          .mockResolvedValueOnce({ rows: [] })              // updatePositionCredibility
          .mockResolvedValueOnce({ rows: [mockPosition] })  // getPositionDetails again
      }

      const result = await service.recalculateInquiryPositions('inq-123');

      expect(result).toHaveLength(2);
      expect(result[0].inquiryId).toBe('inq-123');
      expect(result[0].credibility).toBeGreaterThan(0);
      expect(result[0].factors).toBeDefined();
    });

    it('should assign correct status based on credibility', async () => {
      const mockPositions = [
        { id: 'pos-verified' },
        { id: 'pos-credible' },
        { id: 'pos-weak' },
        { id: 'pos-excluded' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPositions });

      // Adjust scores to reach thresholds after formula weighting:
      // Formula: evidence*weight*0.5 + source*0.25 + coherence*0.2 + community*0.05
      // Note: source=0.6 with links, source=0.2 without links
      // For verified (>=0.85): evidence=1.0, coherence=1.0 -> 1.0*1.0*0.5 + 0.6*0.25 + 1.0*0.2 = 0.85
      // For credible (>=0.60): evidence=0.8, coherence=0.8 -> 0.8*1.0*0.5 + 0.6*0.25 + 0.8*0.2 = 0.71
      // For weak (>=0.30): evidence=0.5, coherence=0.5 -> 0.5*1.0*0.5 + 0.6*0.25 + 0.5*0.2 = 0.50
      // For excluded (<0.30): evidence=0.1, coherence=0.1, no links -> 0.1*1.0*0.5 + 0.2*0.25 + 0.1*0.2 = 0.12
      const evidenceScores = [1.0, 0.8, 0.5, 0.1];
      const coherenceScores = [1.0, 0.8, 0.5, 0.1];
      const evidenceLinks = [['source'], ['source'], ['source'], []]; // Last position has no sources

      for (let i = 0; i < mockPositions.length; i++) {
        const mockPosition = {
          id: mockPositions[i].id,
          stance: `Stance ${i}`,
          argument: `Argument ${i}`,
          evidence_quality_score: evidenceScores[i],
          evidence_type_weight: 1.0,
          evidence_links: evidenceLinks[i],
          coherence_score: coherenceScores[i],
          upvotes: 0,
          downvotes: 0
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockPosition] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockPosition] });
      }

      const result = await service.recalculateInquiryPositions('inq-123');

      expect(result[0].status).toBe('verified');   // >= 0.85
      expect(result[1].status).toBe('credible');   // >= 0.60
      expect(result[2].status).toBe('weak');       // >= 0.30
      expect(result[3].status).toBe('excluded');   // < 0.30
    });

    it('should return empty array for inquiry with no positions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.recalculateInquiryPositions('inq-empty');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // recalculateAllNodeCredibility() - Batch node scoring
  // ============================================================================

  describe('recalculateAllNodeCredibility()', () => {
    it('should recalculate batch of nodes', async () => {
      const mockNodes = [
        { id: 'node-1' },
        { id: 'node-2' },
        { id: 'node-3' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockNodes });

      // Mock calculateNodeCredibility for each node
      for (const node of mockNodes) {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: 'inq-1', inclusion_threshold: 0.5 }] })
          .mockResolvedValueOnce({ rows: [{ credibility_score: 0.7, evidence_weight_value: 1.0 }] })
          .mockResolvedValueOnce({ rows: [] }); // update node
      }

      const updated = await service.recalculateAllNodeCredibility(10);

      expect(updated).toBe(3);
    });

    it('should respect limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.recalculateAllNodeCredibility(50);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [50]
      );
    });

    it('should use default limit of 100', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.recalculateAllNodeCredibility();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [100]
      );
    });

    it('should continue on individual node failures', async () => {
      const mockNodes = [
        { id: 'node-1' },
        { id: 'node-2' },
        { id: 'node-3' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockNodes });

      // Node 1 succeeds
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'inq', inclusion_threshold: 0.5 }] })
        .mockResolvedValueOnce({ rows: [{ credibility_score: 0.7, evidence_weight_value: 1.0 }] })
        .mockResolvedValueOnce({ rows: [] });

      // Node 2 fails
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      // Node 3 succeeds
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'inq', inclusion_threshold: 0.5 }] })
        .mockResolvedValueOnce({ rows: [{ credibility_score: 0.8, evidence_weight_value: 1.0 }] })
        .mockResolvedValueOnce({ rows: [] });

      const updated = await service.recalculateAllNodeCredibility();

      expect(updated).toBe(2); // Only nodes 1 and 3
    });

    it('should return 0 when no nodes to process', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const updated = await service.recalculateAllNodeCredibility();

      expect(updated).toBe(0);
    });

    it('should order nodes by last update (oldest first)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.recalculateAllNodeCredibility();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY last_credibility_update ASC NULLS FIRST'),
        expect.any(Array)
      );
    });
  });
});
