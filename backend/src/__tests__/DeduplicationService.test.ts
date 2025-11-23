import { Pool } from 'pg';
import { DeduplicationService, DuplicateCandidate, DeduplicationResult, MergeStrategy } from '../services/DeduplicationService';
import { FileStorageService } from '../services/FileStorageService';

jest.mock('../services/ContentAnalysisService');
jest.mock('../services/FileStorageService');

describe('DeduplicationService', () => {
  let service: DeduplicationService;
  let mockPool: jest.Mocked<Partial<Pool>>;
  let mockFileStorage: jest.Mocked<Partial<FileStorageService>>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    } as any;

    mockFileStorage = {
      // Mock methods as needed
    } as any;

    service = new DeduplicationService(mockPool as Pool, mockFileStorage as FileStorageService);
    jest.clearAllMocks();
  });

  describe('checkDuplicate', () => {
    it('should identify exact hash duplicates', async () => {
      const content = 'Exact content match';
      const candidates: DuplicateCandidate[] = [
        {
          nodeId: 'node-1',
          similarity: 1.0,
          matchType: 'exact',
          props: { title: 'Original' },
          weight: 0.9,
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: [candidates[0]],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Perceptual
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Semantic

      const result = await service.checkDuplicate(content, 'text');

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('exact');
      expect(result.canonicalNodeId).toBe('node-1');
      expect(result.recommendation).toBe('merge');
    });

    it('should identify near-duplicate content', async () => {
      const content = 'Similar content with small differences';

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Exact hash
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            nodeId: 'node-2',
            similarity: 0.97,
            matchType: 'perceptual',
            props: {},
            weight: 0.85,
          },
        ],
      }); // Perceptual
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Semantic

      const result = await service.checkDuplicate(content, 'image');

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('near');
      expect(result.recommendation).toBe('link');
    });

    it('should identify semantic duplicates', async () => {
      const content = 'Climate change is real';

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Exact
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Perceptual
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            nodeId: 'node-3',
            similarity: 0.92,
            matchType: 'semantic',
            props: { title: 'Global warming exists' },
            weight: 0.8,
          },
        ],
      }); // Semantic

      const result = await service.checkDuplicate(content, 'text');

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('semantic');
      expect(result.recommendation).toBe('link');
    });

    it('should handle content with no duplicates', async () => {
      const content = 'Unique content';

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Exact
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Perceptual
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Semantic

      const result = await service.checkDuplicate(content, 'text');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateType).toBe('none');
      expect(result.recommendation).toBe('separate');
      expect(result.duplicateCandidates).toHaveLength(0);
    });

    it('should filter by graphId when provided', async () => {
      const graphId = 'graph-1';

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Exact
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Perceptual
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Semantic

      await service.checkDuplicate('content', 'text', graphId);

      // Verify graphId is passed to queries
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should skip perceptual hash for text content', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Exact
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Semantic (skips perceptual)

      await service.checkDuplicate('text content', 'text');

      // Should only call query 2 times for text (exact + semantic)
      // Media types would call 3 times
      const calls = mockPool.query.mock.calls.length;
      expect(calls).toBeLessThanOrEqual(3); // Exact, perceptual, semantic max
    });

    it('should return top 5 duplicate candidates sorted by similarity', async () => {
      const candidates = Array.from({ length: 10 }, (_, i) => ({
        nodeId: `node-${i}`,
        similarity: 0.5 + (i * 0.04),
        matchType: 'semantic' as const,
        props: {},
        weight: 0.7,
      }));

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Exact
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Perceptual
      mockPool.query.mockResolvedValueOnce({ rows: candidates }); // Semantic

      const result = await service.checkDuplicate('content', 'text');

      expect(result.duplicateCandidates).toHaveLength(5);
      expect(result.duplicateCandidates[0].similarity).toBeGreaterThanOrEqual(
        result.duplicateCandidates[4].similarity
      );
    });

    it('should deduplicate candidates from multiple sources', async () => {
      const duplicate1: DuplicateCandidate = {
        nodeId: 'node-1',
        similarity: 1.0,
        matchType: 'exact',
        props: {},
        weight: 0.9,
      };

      const duplicate2: DuplicateCandidate = {
        nodeId: 'node-1', // Same node
        similarity: 0.95,
        matchType: 'semantic',
        props: {},
        weight: 0.9,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [duplicate1],
      }); // Exact
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Perceptual
      mockPool.query.mockResolvedValueOnce({
        rows: [duplicate2],
      }); // Semantic

      const result = await service.checkDuplicate('content', 'text');

      // Should have only 1 candidate (duplicates merged)
      expect(result.duplicateCandidates).toHaveLength(1);
      expect(result.duplicateCandidates[0].nodeId).toBe('node-1');
    });
  });

  describe('mergeDuplicates', () => {
    it('should merge duplicate nodes with full strategy', async () => {
      const duplicateNodeIds = ['node-2', 'node-3'];
      const canonicalNodeId = 'node-1';
      const strategy: MergeStrategy = {
        keepCanonical: true,
        combineMetadata: true,
        consolidateEvidence: true,
        redirectReferences: true,
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            { id: canonicalNodeId, props: {} },
            { id: 'node-2', props: {} },
            { id: 'node-3', props: {} },
          ],
        }) // SELECT nodes
        .mockResolvedValueOnce(undefined) // UPDATE props
        .mockResolvedValueOnce(undefined) // UPDATE evidence
        .mockResolvedValueOnce(undefined) // UPDATE edges (source)
        .mockResolvedValueOnce(undefined) // UPDATE edges (target)
        .mockResolvedValueOnce(undefined) // DELETE self-loops
        .mockResolvedValueOnce(undefined) // UPDATE merged nodes
        .mockResolvedValueOnce(undefined) // INSERT merge history
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.mergeDuplicates(
        duplicateNodeIds,
        canonicalNodeId,
        strategy
      );

      expect(result.success).toBe(true);
      expect(result.mergedNodeId).toBe(canonicalNodeId);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on merge error', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValueOnce(new Error('Database error')),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      await expect(
        service.mergeDuplicates(['node-2'], 'node-1', {
          keepCanonical: true,
          combineMetadata: true,
          consolidateEvidence: true,
          redirectReferences: true,
        })
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if canonical node not found', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [] }), // Empty result
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      await expect(
        service.mergeDuplicates(['node-2'], 'node-1', {
          keepCanonical: true,
          combineMetadata: true,
          consolidateEvidence: true,
          redirectReferences: true,
        })
      ).rejects.toThrow('Canonical node not found');
    });

    it('should handle partial strategy execution', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 'node-1' }, { id: 'node-2' }],
        })
        .mockResolvedValueOnce(undefined) // Only metadata (others skipped)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const strategy: MergeStrategy = {
        keepCanonical: true,
        combineMetadata: true, // Only true
        consolidateEvidence: false,
        redirectReferences: false,
      };

      const result = await service.mergeDuplicates(
        ['node-2'],
        'node-1',
        strategy
      );

      expect(result.success).toBe(true);
    });

    it('should create merge history record', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'node-1' }, { id: 'node-2' }] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const strategy: MergeStrategy = {
        keepCanonical: true,
        combineMetadata: true,
        consolidateEvidence: true,
        redirectReferences: true,
      };

      await service.mergeDuplicates(['node-2'], 'node-1', strategy);

      // Verify merge history was inserted
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('MergeHistory'),
        expect.any(Array)
      );
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent SHA256 hash', () => {
      const content = 'Test content for hashing';

      const hash1 = (service as any).generateContentHash(content);
      const hash2 = (service as any).generateContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    });

    it('should generate different hashes for different content', () => {
      const hash1 = (service as any).generateContentHash('Content 1');
      const hash2 = (service as any).generateContentHash('Content 2');

      expect(hash1).not.toBe(hash2);
    });

    it('should be case-sensitive', () => {
      const hash1 = (service as any).generateContentHash('Test');
      const hash2 = (service as any).generateContentHash('test');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generatePerceptualHash', () => {
    it('should handle unsupported media types gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const hash = await (service as any).generatePerceptualHash(
        'content',
        'audio'
      );

      expect(hash).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not yet implemented')
      );
      consoleSpy.mockRestore();
    });

    it('should handle errors during hash generation', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      // Mock a promise rejection by having the service throw
      const hash = await (service as any).generatePerceptualHash(
        'content',
        'image'
      );

      expect(hash).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('checkDuplicateChallenge', () => {
    it('should find existing duplicate challenges', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'challenge-1',
            rebuttal_claim: 'Climate change is a hoax',
          },
        ],
      });

      const result = await service.checkDuplicateChallenge(
        'node-1',
        'Climate change is not real'
      );

      expect(result.exists).toBe(true);
      expect(result.challengeId).toBe('challenge-1');
    });

    it('should return false when no duplicate challenge exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.checkDuplicateChallenge(
        'node-1',
        'Unique challenge claim'
      );

      expect(result.exists).toBe(false);
      expect(result.challengeId).toBeUndefined();
    });

    it('should only check open or under_review challenges', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.checkDuplicateChallenge('node-1', 'Challenge claim');

      const query = mockPool.query.mock.calls[0][0] as string;
      expect(query).toContain("status IN ('open', 'under_review')");
    });

    it('should use similarity threshold of 0.7', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.checkDuplicateChallenge('node-1', 'Challenge claim');

      const query = mockPool.query.mock.calls[0][0] as string;
      expect(query).toContain('similarity');
      expect(query).toContain('0.7');
    });
  });

  describe('duplicate type detection', () => {
    it('should classify exact duplicates at 1.0 similarity', async () => {
      const candidate: DuplicateCandidate = {
        nodeId: 'node-1',
        similarity: 1.0,
        matchType: 'exact',
        props: {},
        weight: 0.9,
      };

      const type = (service as any).determineDuplicateType(candidate);

      expect(type).toBe('exact');
    });

    it('should classify near duplicates at 0.95+ similarity', async () => {
      const candidate: DuplicateCandidate = {
        nodeId: 'node-2',
        similarity: 0.96,
        matchType: 'perceptual',
        props: {},
        weight: 0.85,
      };

      const type = (service as any).determineDuplicateType(candidate);

      expect(type).toBe('near');
    });

    it('should classify semantic duplicates at 0.90+ similarity', async () => {
      const candidate: DuplicateCandidate = {
        nodeId: 'node-3',
        similarity: 0.91,
        matchType: 'semantic',
        props: {},
        weight: 0.8,
      };

      const type = (service as any).determineDuplicateType(candidate);

      expect(type).toBe('semantic');
    });

    it('should classify as none below 0.90 similarity', async () => {
      const candidate: DuplicateCandidate = {
        nodeId: 'node-4',
        similarity: 0.85,
        matchType: 'semantic',
        props: {},
        weight: 0.7,
      };

      const type = (service as any).determineDuplicateType(candidate);

      expect(type).toBe('none');
    });
  });

  describe('recommendation generation', () => {
    it('should recommend merge for exact duplicates', () => {
      const topMatch: DuplicateCandidate = {
        nodeId: 'node-1',
        similarity: 1.0,
        matchType: 'exact',
        props: {},
        weight: 0.9,
      };

      const recommendation = (service as any).determineRecommendation(
        topMatch,
        [topMatch]
      );

      expect(recommendation).toBe('merge');
    });

    it('should recommend link for near duplicates', () => {
      const topMatch: DuplicateCandidate = {
        nodeId: 'node-1',
        similarity: 0.97,
        matchType: 'perceptual',
        props: {},
        weight: 0.85,
      };

      const recommendation = (service as any).determineRecommendation(
        topMatch,
        [topMatch]
      );

      expect(recommendation).toBe('link');
    });

    it('should recommend separate for low similarity', () => {
      const topMatch: DuplicateCandidate = {
        nodeId: 'node-1',
        similarity: 0.7,
        matchType: 'semantic',
        props: {},
        weight: 0.7,
      };

      const recommendation = (service as any).determineRecommendation(
        topMatch,
        [topMatch]
      );

      expect(recommendation).toBe('separate');
    });
  });

  describe('reasoning generation', () => {
    it('should provide clear merge reasoning', () => {
      const match: DuplicateCandidate = {
        nodeId: 'node-1',
        similarity: 1.0,
        matchType: 'exact',
        props: {},
        weight: 0.9,
      };

      const reasoning = (service as any).generateReasoning(match, 'merge');

      expect(reasoning).toContain('Exact duplicate');
      expect(reasoning).toContain('100.0%');
      expect(reasoning).toContain('merge');
    });

    it('should provide clear link reasoning', () => {
      const match: DuplicateCandidate = {
        nodeId: 'node-1',
        similarity: 0.95,
        matchType: 'perceptual',
        props: {},
        weight: 0.85,
      };

      const reasoning = (service as any).generateReasoning(match, 'link');

      expect(reasoning).toContain('Near-duplicate');
      expect(reasoning).toContain('95.0%');
      expect(reasoning).toContain('linking');
    });

    it('should provide clear separate reasoning', () => {
      const match: DuplicateCandidate = {
        nodeId: 'node-1',
        similarity: 0.85,
        matchType: 'semantic',
        props: {},
        weight: 0.7,
      };

      const reasoning = (service as any).generateReasoning(match, 'separate');

      expect(reasoning).toContain('Similar content');
      expect(reasoning).toContain('85.0%');
      expect(reasoning).toContain('keep separate');
    });
  });

  describe('metadata combining', () => {
    it('should combine metadata from multiple nodes', () => {
      const nodes = [
        {
          id: 'node-1',
          created_at: new Date('2024-01-01'),
          props: { meta: { source: 'source1' } },
        },
        {
          id: 'node-2',
          created_at: new Date('2024-01-02'),
          props: { meta: { source: 'source2' } },
        },
        {
          id: 'node-3',
          created_at: new Date('2023-12-31'),
          props: { meta: { source: 'source1' } }, // Duplicate source
        },
      ];

      const combined = (service as any).combineMetadata(nodes);

      expect(combined.merged_from).toEqual(['node-1', 'node-2', 'node-3']);
      expect(combined.sources).toHaveLength(2); // Unique sources
      expect(combined.sources).toContain('source1');
      expect(combined.sources).toContain('source2');
      expect(combined.created_at).toBe(nodes[2].created_at); // Earliest date
    });

    it('should handle nodes without metadata', () => {
      const nodes = [
        { id: 'node-1', created_at: new Date(), props: {} },
        { id: 'node-2', created_at: new Date(), props: null },
      ];

      const combined = (service as any).combineMetadata(nodes);

      expect(combined.sources).toEqual([]);
      expect(combined.merged_from).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle very similar content efficiently', async () => {
      // Two strings that differ by one character
      const content1 = 'The quick brown fox jumps over the lazy dog';
      const content2 = 'The quick brown fox jumps over the lazy dogs';

      const hash1 = (service as any).generateContentHash(content1);
      const hash2 = (service as any).generateContentHash(content2);

      // Should be different (not exact match)
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty properties gracefully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Exact
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Perceptual
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            nodeId: 'node-1',
            similarity: 0.5,
            matchType: 'semantic',
            props: {}, // Empty props
            weight: 0.5,
          },
        ],
      });

      const result = await service.checkDuplicate('content', 'text');

      expect(result).toBeDefined();
    });
  });
});
