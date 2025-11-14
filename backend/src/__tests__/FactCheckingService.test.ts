import { Pool } from 'pg';
import { FactCheckingService, VerificationResult, Evidence } from '../services/FactCheckingService';

// Mock axios for Ollama API calls
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FactCheckingService', () => {
  let service: FactCheckingService;
  let mockPool: jest.Mocked<Partial<Pool>>;

  beforeEach(() => {
    service = new FactCheckingService();
    mockPool = {
      query: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embeddings using Ollama', async () => {
      const mockEmbedding = Array(384).fill(0.1); // Mock embedding vector

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          embedding: mockEmbedding,
        },
      });

      // Access private method via any cast for testing
      const embedding = await (service as any).generateEmbedding('test claim');

      expect(embedding).toEqual(mockEmbedding);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/embeddings'),
        expect.objectContaining({
          model: expect.any(String),
          prompt: 'test claim',
        }),
        expect.any(Object)
      );
    });

    it('should handle Ollama connection errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        code: 'ECONNREFUSED',
      });

      await expect((service as any).generateEmbedding('test')).rejects.toThrow(
        'Ollama is not running'
      );
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];

      const similarity = (service as any).calculateCosineSimilarity(vec1, vec2);

      expect(similarity).toBe(1); // Identical vectors
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];

      const similarity = (service as any).calculateCosineSimilarity(vec1, vec2);

      expect(similarity).toBe(0);
    });

    it('should throw error for different dimension vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [1, 0, 0];

      expect(() => (service as any).calculateCosineSimilarity(vec1, vec2)).toThrow(
        'Vectors must have the same dimension'
      );
    });
  });

  describe('findSimilarNodes', () => {
    it('should find semantically similar nodes using pgvector', async () => {
      const mockEmbedding = Array(384).fill(0.1);

      mockedAxios.post.mockResolvedValueOnce({
        data: { embedding: mockEmbedding },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            title: 'Test Node',
            node_type: 'evidence',
            props: JSON.stringify({ content: 'Test content' }),
            meta: JSON.stringify({ is_level_0: false }),
            veracity_score: 0.8,
            similarity: 0.95,
            created_at: new Date(),
          },
        ],
      } as any);

      const results = await (service as any).findSimilarNodes(
        mockPool as Pool,
        'test claim',
        'graph-1',
        10
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('node-1');
      expect(results[0].similarity).toBe(0.95);
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('assessSourceReliability', () => {
    it('should return veracity score if available', () => {
      const node = {
        id: 'node-1',
        title: 'Test',
        props: {},
        meta: {},
        veracity_score: 0.9,
        similarity: 0.8,
        created_at: new Date(),
      };

      const reliability = (service as any).assessSourceReliability(node);

      expect(reliability).toBe(0.9);
    });

    it('should boost reliability for Level 0 nodes', () => {
      const node = {
        id: 'node-1',
        title: 'Test',
        props: {},
        meta: { is_level_0: true },
        veracity_score: null,
        similarity: 0.8,
        created_at: new Date(),
      };

      const reliability = (service as any).assessSourceReliability(node);

      expect(reliability).toBeGreaterThanOrEqual(0.9);
    });

    it('should apply temporal decay for old nodes', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 5); // 5 years old

      const node = {
        id: 'node-1',
        title: 'Test',
        props: {},
        meta: {},
        veracity_score: 0.9,
        similarity: 0.8,
        created_at: oldDate,
      };

      const reliability = (service as any).assessSourceReliability(node);

      expect(reliability).toBeLessThan(0.9); // Should be reduced
    });
  });

  describe('categorizeEvidence', () => {
    it('should categorize supporting evidence', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: {
            content: JSON.stringify({
              category: 'supporting',
              reasoning: 'Evidence directly confirms the claim',
            }),
          },
        },
      });

      const result = await (service as any).categorizeEvidence(
        'The sky is blue',
        'Scientific studies confirm the sky appears blue due to Rayleigh scattering'
      );

      expect(result.category).toBe('supporting');
      expect(result.reasoning).toBeTruthy();
    });

    it('should categorize conflicting evidence', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: {
            content: JSON.stringify({
              category: 'conflicting',
              reasoning: 'Evidence contradicts the claim',
            }),
          },
        },
      });

      const result = await (service as any).categorizeEvidence(
        'The moon is made of cheese',
        'NASA samples show the moon is composed of rock and regolith'
      );

      expect(result.category).toBe('conflicting');
    });

    it('should fallback to neutral on parse errors', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: {
            content: 'Invalid JSON response',
          },
        },
      });

      const result = await (service as any).categorizeEvidence('claim', 'evidence');

      expect(result.category).toBe('neutral');
    });
  });

  describe('calculateVeracity', () => {
    it('should return low confidence with no evidence', () => {
      const result = (service as any).calculateVeracity([], []);

      expect(result.score).toBe(0.5);
      expect(result.confidence).toBeLessThan(0.3);
    });

    it('should favor supporting evidence when present', () => {
      const supporting: Evidence[] = [
        {
          nodeId: '1',
          nodeTitle: 'Evidence 1',
          content: 'Supporting',
          sourceReliability: 0.9,
          semanticSimilarity: 0.8,
          evidenceType: 'supporting',
        },
      ];

      const result = (service as any).calculateVeracity(supporting, []);

      expect(result.score).toBeGreaterThan(0.8);
    });

    it('should balance conflicting evidence', () => {
      const supporting: Evidence[] = [
        {
          nodeId: '1',
          nodeTitle: 'Evidence 1',
          content: 'Supporting',
          sourceReliability: 0.8,
          semanticSimilarity: 0.8,
          evidenceType: 'supporting',
        },
      ];

      const conflicting: Evidence[] = [
        {
          nodeId: '2',
          nodeTitle: 'Evidence 2',
          content: 'Conflicting',
          sourceReliability: 0.8,
          semanticSimilarity: 0.8,
          evidenceType: 'conflicting',
        },
      ];

      const result = (service as any).calculateVeracity(supporting, conflicting);

      expect(result.score).toBeCloseTo(0.5, 1);
    });
  });

  describe('shouldCreateInquiry', () => {
    it('should create inquiry for low confidence', () => {
      const result = service.shouldCreateInquiry([], [], { score: 0.7, confidence: 0.3 });

      expect(result).toBe(true);
    });

    it('should create inquiry for contradictory evidence', () => {
      const supporting: Evidence[] = [
        {
          nodeId: '1',
          nodeTitle: 'Test',
          content: 'Content',
          sourceReliability: 0.8,
          semanticSimilarity: 0.8,
          evidenceType: 'supporting',
        },
      ];

      const conflicting: Evidence[] = [
        {
          nodeId: '2',
          nodeTitle: 'Test',
          content: 'Content',
          sourceReliability: 0.8,
          semanticSimilarity: 0.8,
          evidenceType: 'conflicting',
        },
      ];

      const result = service.shouldCreateInquiry(supporting, conflicting, {
        score: 0.5,
        confidence: 0.7,
      });

      expect(result).toBe(true);
    });

    it('should create inquiry for uncertain veracity', () => {
      const result = service.shouldCreateInquiry([], [], { score: 0.5, confidence: 0.8 });

      expect(result).toBe(true);
    });

    it('should not create inquiry for high confidence and veracity', () => {
      const supporting: Evidence[] = [
        {
          nodeId: '1',
          nodeTitle: 'Test',
          content: 'Content',
          sourceReliability: 0.9,
          semanticSimilarity: 0.9,
          evidenceType: 'supporting',
        },
      ];

      const result = service.shouldCreateInquiry(supporting, [], {
        score: 0.9,
        confidence: 0.9,
      });

      expect(result).toBe(false);
    });
  });

  describe('verifyClaim', () => {
    it('should verify a claim and return verification result', async () => {
      const mockEmbedding = Array(384).fill(0.1);

      // Mock embedding generation
      mockedAxios.post.mockResolvedValueOnce({
        data: { embedding: mockEmbedding },
      });

      // Mock vector search
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            title: 'Supporting Evidence',
            node_type: 'evidence',
            props: JSON.stringify({ content: 'This supports the claim' }),
            meta: JSON.stringify({ is_level_0: false }),
            veracity_score: 0.9,
            similarity: 0.85,
            created_at: new Date(),
          },
        ],
      } as any);

      // Mock evidence categorization
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: {
            content: JSON.stringify({
              category: 'supporting',
              reasoning: 'Evidence supports the claim',
            }),
          },
        },
      });

      // Mock reasoning generation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: {
            content: 'The claim is well-supported by reliable evidence.',
          },
        },
      });

      const result = await service.verifyClaim(
        mockPool as Pool,
        'Test claim',
        'source-node-1',
        'graph-1'
      );

      expect(result.claimText).toBe('Test claim');
      expect(result.sourceNodeId).toBe('source-node-1');
      expect(result.overallVeracity).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.supportingEvidence.length).toBeGreaterThan(0);
      expect(result.reasoning).toBeTruthy();
    });
  });

  describe('updateVeracityScore', () => {
    it('should insert new veracity score', async () => {
      // Mock check for existing score
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      } as any);

      // Mock insert
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'veracity-1' }],
      } as any);

      const verificationResult: VerificationResult = {
        claimText: 'Test',
        sourceNodeId: 'node-1',
        overallVeracity: 0.8,
        confidence: 0.9,
        supportingEvidence: [],
        conflictingEvidence: [],
        neutralEvidence: [],
        reasoning: 'Test reasoning',
        shouldCreateInquiry: false,
        suggestedInquiryQuestions: [],
        generatedAt: new Date(),
      };

      await service.updateVeracityScore(mockPool as Pool, 'node-1', verificationResult, 'user-1');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });

    it('should update existing veracity score', async () => {
      // Mock check for existing score
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'veracity-1' }],
      } as any);

      // Mock update
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'veracity-1' }],
      } as any);

      const verificationResult: VerificationResult = {
        claimText: 'Test',
        sourceNodeId: 'node-1',
        overallVeracity: 0.8,
        confidence: 0.9,
        supportingEvidence: [],
        conflictingEvidence: [],
        neutralEvidence: [],
        reasoning: 'Test reasoning',
        shouldCreateInquiry: false,
        suggestedInquiryQuestions: [],
        generatedAt: new Date(),
      };

      await service.updateVeracityScore(mockPool as Pool, 'node-1', verificationResult, 'user-1');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.any(Array)
      );
    });
  });

  describe('createInquiryFromVerification', () => {
    it('should create inquiries when needed', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 'inquiry-1' }],
      } as any);

      const verificationResult: VerificationResult = {
        claimText: 'Test',
        sourceNodeId: 'node-1',
        overallVeracity: 0.5,
        confidence: 0.4,
        supportingEvidence: [],
        conflictingEvidence: [],
        neutralEvidence: [],
        reasoning: 'Uncertain',
        shouldCreateInquiry: true,
        suggestedInquiryQuestions: ['Question 1', 'Question 2'],
        generatedAt: new Date(),
      };

      const inquiryIds = await service.createInquiryFromVerification(
        mockPool as Pool,
        verificationResult,
        'user-1'
      );

      expect(inquiryIds).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should not create inquiries when not needed', async () => {
      const verificationResult: VerificationResult = {
        claimText: 'Test',
        sourceNodeId: 'node-1',
        overallVeracity: 0.9,
        confidence: 0.9,
        supportingEvidence: [],
        conflictingEvidence: [],
        neutralEvidence: [],
        reasoning: 'Well supported',
        shouldCreateInquiry: false,
        suggestedInquiryQuestions: [],
        generatedAt: new Date(),
      };

      const inquiryIds = await service.createInquiryFromVerification(
        mockPool as Pool,
        verificationResult,
        'user-1'
      );

      expect(inquiryIds).toHaveLength(0);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('findRelationshipPath', () => {
    it('should find path between connected nodes', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            full_path: ['source-node', 'intermediate-node', 'target-node'],
          },
        ],
      } as any);

      const path = await (service as any).findRelationshipPath(
        mockPool as Pool,
        'source-node',
        'target-node'
      );

      expect(path).toEqual(['source-node', 'intermediate-node', 'target-node']);
    });

    it('should return undefined for unconnected nodes', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      } as any);

      const path = await (service as any).findRelationshipPath(
        mockPool as Pool,
        'source-node',
        'target-node'
      );

      expect(path).toBeUndefined();
    });
  });
});
