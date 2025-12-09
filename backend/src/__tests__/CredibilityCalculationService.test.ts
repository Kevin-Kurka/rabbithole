import { Pool } from 'pg';
import { CredibilityCalculationService, ScoredPosition } from '../services/CredibilityCalculationService';

// Mock pg
jest.mock('pg');

describe('CredibilityCalculationService', () => {
  let service: CredibilityCalculationService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = new Pool() as jest.Mocked<Pool>;
    mockPool.query = jest.fn() as any;
    service = new CredibilityCalculationService(mockPool);
  });

  describe('calculatePositionCredibility (Intrinsic)', () => {
    const mockPositionDetails = {
      id: 'pos-123',
      evidence_quality_score: 0.8,
      evidence_type_weight: '1.0',
      evidence_links: ['source1'],
      coherence_score: 0.7,
      author_reputation: 0.9
    };

    it('should calculate pure intrinsic score (Objective 50/50)', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockPositionDetails] })
        .mockResolvedValueOnce({ rows: [] });

      const score = await service.calculatePositionCredibility('pos-123');
      expect(score).toBeCloseTo(0.75, 2);
    });
  });

  describe('calculateNodeCredibility (Dynamic with Threshold)', () => {
    it('should filter out low-score children and calculate average of passing ones', async () => {
      // Mock Inquiries (Intrinsic)
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'inq1', inclusion_threshold: 0.5 }] })
        .mockResolvedValueOnce({ rows: [{ credibility_score: 0.8, evidence_weight_value: '1.0' }] }) // Intrinsic = 0.8
        // Mock Children (Structural)
        .mockResolvedValueOnce({
          rows: [
            { child_score: 1.0, edge_score: 1.0 }, // Effective 1.0
            { child_score: 0.4, edge_score: 1.0 }, // Fail
          ]
        })
        // Mock Inquiries (None)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const score = await service.calculateNodeCredibility('node-filter');

      // Intrinsic: 0.8
      // Structural: 1.0
      // Inquiry: 1.0 (None)
      // Final: 0.8

      expect(score).toBeCloseTo(0.8, 1);
    });

    it('should default multiplier to 1.0 if all children are filtered out', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'inq1', inclusion_threshold: 0.5 }] })
        .mockResolvedValueOnce({ rows: [{ credibility_score: 0.9, evidence_weight_value: '1.0' }] })
        // Mock Children (All Fail)
        .mockResolvedValueOnce({ rows: [{ child_score: 0.4, edge_score: 1.0 }] })
        // Mock Inquiries (None)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const score = await service.calculateNodeCredibility('node-all-fail');
      // Intrinsic: 0.9 * 1.0 * 1.0 = 0.9
      expect(score).toBeCloseTo(0.9, 1);
    });
  });

  describe('calculateInvestigationMultiplier (LogicLens)', () => {
    it('should reduce score based on High Confidence Fallacy', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'inq1', inclusion_threshold: 0.5 }] })
        .mockResolvedValueOnce({ rows: [{ credibility_score: 1.0, evidence_weight_value: '1.0' }] })
        .mockResolvedValueOnce({ rows: [] })
        // Inquiry 1: Confidence 0.9, Determination 'Slippery Slope', Weight 1.0
        // Impact = 0.9 * 1.0 = 0.9
        .mockResolvedValueOnce({
          rows: [
            { consensus_score: '0.9', ai_determination: 'Slippery Slope', edge_weight: 1.0 }
          ]
        })
        .mockResolvedValueOnce({ rows: [] });

      const score = await service.calculateNodeCredibility('node-fallacy');

      // Multiplier = 1.0 - 0.9 = 0.1
      // Final: 1.0 * 1.0 * 0.1 = 0.1
      expect(score).toBeCloseTo(0.1, 2);
    });

    it('should ignore Low Confidence Fallacies', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'inq1', inclusion_threshold: 0.5 }] })
        .mockResolvedValueOnce({ rows: [{ credibility_score: 1.0, evidence_weight_value: '1.0' }] })
        .mockResolvedValueOnce({ rows: [] })
        // Inquiry 1: Confidence 0.3 (Low), Determination 'Strawman' -> IGNORED
        .mockResolvedValueOnce({
          rows: [
            { consensus_score: '0.3', ai_determination: 'Strawman', edge_weight: 1.0 }
          ]
        })
        .mockResolvedValueOnce({ rows: [] });

      const score = await service.calculateNodeCredibility('node-weak-fallacy');

      // Multiplier = 1.0 - 0.0 = 1.0
      expect(score).toBeCloseTo(1.0, 2);
    });

    it('should ignore Valid Determinations', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'inq1', inclusion_threshold: 0.5 }] })
        .mockResolvedValueOnce({ rows: [{ credibility_score: 1.0, evidence_weight_value: '1.0' }] })
        .mockResolvedValueOnce({ rows: [] })
        // Inquiry 1: Confidence 1.0, Determination 'Valid' -> IGNORED (No Penalty)
        .mockResolvedValueOnce({
          rows: [
            { consensus_score: '1.0', ai_determination: 'Valid', edge_weight: 1.0 }
          ]
        })
        .mockResolvedValueOnce({ rows: [] });

      const score = await service.calculateNodeCredibility('node-valid-inquiry');

      // Multiplier = 1.0
      expect(score).toBeCloseTo(1.0, 2);
    });
  });
});
