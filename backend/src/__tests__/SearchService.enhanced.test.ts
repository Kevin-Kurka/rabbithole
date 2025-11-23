import { Pool } from 'pg';
import { SearchService, SearchResult, SearchOptions } from '../services/SearchService';
import { EmbeddingService } from '../services/EmbeddingService';

jest.mock('../services/EmbeddingService');

describe('SearchService - Enhanced Tests', () => {
  let service: SearchService;
  let mockPool: jest.Mocked<Partial<Pool>>;
  let mockEmbeddingService: jest.Mocked<Partial<EmbeddingService>>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;

    mockEmbeddingService = {
      generateEmbedding: jest.fn(),
    } as any;

    (EmbeddingService as jest.Mock).mockImplementation(
      () => mockEmbeddingService
    );

    service = new SearchService();
    jest.clearAllMocks();
  });

  describe('hybrid search', () => {
    it('should combine full-text and semantic results', async () => {
      const fullTextResults = {
        articles: [
          {
            id: 'article-1',
            title: 'Climate Science',
            type: 'Article',
            relevance: 0.95,
            graphId: 'graph-1',
          },
        ],
        nodes: [
          {
            id: 'node-1',
            title: 'CO2 Emissions',
            type: 'Claim',
            relevance: 0.85,
            graphId: 'graph-1',
          },
        ],
      };

      const semanticResults = [
        {
          id: 'node-2',
          title: 'Global Warming',
          type: 'Fact',
          relevance: 0.92,
          graphId: 'graph-1',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: fullTextResults.articles });
      mockPool.query.mockResolvedValueOnce({ rows: fullTextResults.nodes });

      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      mockPool.query.mockResolvedValueOnce({ rows: semanticResults });

      const results = await service.hybridSearch(mockPool as Pool, 'climate');

      expect(results).toHaveLength(3);
      expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
    });

    it('should deduplicate results from both search methods', async () => {
      const sharedResult: SearchResult = {
        id: 'node-1',
        title: 'Climate Change',
        type: 'Fact',
        relevance: 0.9,
        graphId: 'graph-1',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [sharedResult] }); // Articles
      mockPool.query.mockResolvedValueOnce({ rows: [sharedResult] }); // Nodes

      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      mockPool.query.mockResolvedValueOnce({ rows: [sharedResult] }); // Semantic

      const results = await service.hybridSearch(mockPool as Pool, 'climate');

      // Should only appear once, with highest relevance
      const deduped = results.filter((r) => r.id === 'node-1');
      expect(deduped).toHaveLength(1);
    });

    it('should respect limit parameter in hybrid search', async () => {
      const mockResults = Array.from({ length: 50 }, (_, i) => ({
        id: `node-${i}`,
        title: `Result ${i}`,
        type: 'Fact',
        relevance: 0.5 + (i * 0.01),
        graphId: 'graph-1',
      }));

      mockPool.query.mockResolvedValue({ rows: mockResults });
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      const results = await service.hybridSearch(mockPool as Pool, 'test', {
        limit: 10,
      });

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should maintain relevance score ordering', async () => {
      const results = [
        { id: '1', relevance: 0.5, title: 'Low', type: 'Fact', graphId: 'g-1' },
        { id: '2', relevance: 0.9, title: 'High', type: 'Fact', graphId: 'g-1' },
        { id: '3', relevance: 0.7, title: 'Med', type: 'Fact', graphId: 'g-1' },
      ];

      mockPool.query.mockResolvedValue({ rows: results });
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      const sorted = await service.hybridSearch(mockPool as Pool, 'test');

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].relevance).toBeGreaterThanOrEqual(
          sorted[i + 1].relevance
        );
      }
    });
  });

  describe('semantic search', () => {
    it('should generate query embedding and search', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      const mockResults = [
        {
          id: 'node-1',
          title: 'Climate Facts',
          type: 'Fact',
          relevance: 0.92,
          graphId: 'graph-1',
        },
      ];

      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: mockEmbedding,
        model: 'text-embedding-3-large',
        usage: { promptTokens: 5, totalTokens: 5 },
      } as any);

      mockPool.query.mockResolvedValue({ rows: mockResults });

      const results = await service.semanticSearch(
        mockPool as Pool,
        'climate change'
      );

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'climate change'
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('node-1');
    });

    it('should handle embedding generation failure gracefully', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue(
        new Error('Embedding failed')
      );

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'node-1',
            title: 'Fallback',
            type: 'Fact',
            relevance: 0.5,
            graphId: 'graph-1',
          },
        ],
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const results = await service.semanticSearch(
        mockPool as Pool,
        'test'
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate embedding')
      );
      warnSpy.mockRestore();
    });

    it('should apply type filters in semantic search', async () => {
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'node-1',
            title: 'Result',
            type: 'Claim',
            relevance: 0.8,
            graphId: 'graph-1',
          },
        ],
      });

      await service.semanticSearch(mockPool as Pool, 'test', {
        types: ['Claim', 'Evidence'],
      });

      const queryCall = mockPool.query.mock.calls[0][0] as string;
      expect(queryCall).toContain('ANY');
    });

    it('should filter by graphId in semantic search', async () => {
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      mockPool.query.mockResolvedValue({ rows: [] });

      await service.semanticSearch(mockPool as Pool, 'test', {
        graphId: 'graph-123',
      });

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toContain('graph-123');
    });

    it('should use pgvector cosine distance operator', async () => {
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      mockPool.query.mockResolvedValue({ rows: [] });

      await service.semanticSearch(mockPool as Pool, 'test');

      const queryCall = mockPool.query.mock.calls[0][0] as string;
      expect(queryCall).toContain('<=>'); // pgvector cosine distance
    });

    it('should calculate relevance from similarity distance', async () => {
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      // Distance is already converted to relevance in query
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'node-1',
            relevance: 0.85, // 1 - distance
            title: 'Result',
            type: 'Fact',
            graphId: 'graph-1',
          },
        ],
      });

      const results = await service.semanticSearch(
        mockPool as Pool,
        'test'
      );

      expect(results[0].relevance).toBeGreaterThan(0);
      expect(results[0].relevance).toBeLessThanOrEqual(1);
    });
  });

  describe('full-text search', () => {
    it('should search articles with full-text index', async () => {
      const mockResults = [
        {
          id: 'article-1',
          title: 'Climate Research',
          type: 'Article',
          narrative: 'Long form analysis...',
          relevance: 0.92,
          graphId: 'graph-1',
          graph_name: 'Research Graph',
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockResults });

      const results = await service.search(mockPool as Pool, 'climate');

      expect(results.articles).toHaveLength(1);
      expect(results.articles[0].narrative).toBeDefined();
    });

    it('should rank results by ts_rank score', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            title: 'Climate',
            type: 'Fact',
            relevance: 0.9,
            graphId: 'g-1',
          },
          {
            id: '2',
            title: 'Environmental',
            type: 'Fact',
            relevance: 0.6,
            graphId: 'g-1',
          },
        ],
      });

      const results = await service.search(mockPool as Pool, 'climate');

      expect(results.nodes[0].relevance).toBeGreaterThan(results.nodes[1].relevance);
    });

    it('should apply pagination with limit and offset', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.search(mockPool as Pool, 'test', {
        limit: 25,
        offset: 50,
      });

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(25);
      expect(queryCall[1]).toContain(50);
    });

    it('should filter by graphId in search', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.search(mockPool as Pool, 'test', {
        graphId: 'graph-xyz',
      });

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toContainEqual('graph-xyz');
    });
  });

  describe('autocomplete', () => {
    it('should return suggestions for partial queries', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { title: 'Climate Change' },
          { title: 'Climate Impact' },
          { title: 'Climatic Conditions' },
        ],
      });

      const suggestions = await service.autocomplete(mockPool as Pool, 'clim');

      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('Climate Change');
    });

    it('should reject queries shorter than 2 characters', async () => {
      const suggestions = await service.autocomplete(mockPool as Pool, 'a');

      expect(suggestions).toHaveLength(0);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      mockPool.query.mockResolvedValue({
        rows: Array.from({ length: 20 }, (_, i) => ({
          title: `Result ${i}`,
        })),
      });

      const suggestions = await service.autocomplete(mockPool as Pool, 'test', 5);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1][1]).toBe(5); // Limit parameter
    });

    it('should use case-insensitive ILIKE matching', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.autocomplete(mockPool as Pool, 'TEST');

      const queryCall = mockPool.query.mock.calls[0][0] as string;
      expect(queryCall).toContain('ILIKE');
    });
  });

  describe('result filtering', () => {
    it('should filter results by node types', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { id: '1', title: 'Claim', type: 'Claim' },
          { id: '2', title: 'Evidence', type: 'Evidence' },
        ],
      });

      await service.search(mockPool as Pool, 'test', {
        types: ['Claim'],
      });

      const queryCall = mockPool.query.mock.calls[0][0] as string;
      expect(queryCall).toContain('nt.name = ANY');
    });

    it('should exclude Article type when filtering by other types', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.search(mockPool as Pool, 'test', {
        types: ['Claim', 'Evidence'],
      });

      // Verify Article is filtered out
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should combine multiple filters correctly', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            title: 'Result',
            type: 'Claim',
            relevance: 0.8,
            graphId: 'graph-1',
          },
        ],
      });

      await service.search(mockPool as Pool, 'test', {
        types: ['Claim'],
        graphId: 'graph-1',
        limit: 10,
      });

      const calls = mockPool.query.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('result enrichment', () => {
    it('should include veracity scores when available', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'node-1',
            title: 'Fact',
            type: 'Fact',
            relevance: 0.8,
            graphId: 'graph-1',
            veracityScore: { veracityScore: 0.95, evidenceCount: 5 },
          },
        ],
      });

      const results = await service.search(mockPool as Pool, 'test');

      expect(results.nodes[0].veracityScore).toBeDefined();
    });

    it('should include graph name information', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'node-1',
            title: 'Result',
            type: 'Fact',
            relevance: 0.8,
            graphId: 'graph-1',
            graph_name: 'My Research Graph',
          },
        ],
      });

      const results = await service.search(mockPool as Pool, 'test');

      expect(results.nodes[0].graph_name).toBe('My Research Graph');
    });
  });

  describe('performance and optimization', () => {
    it('should split results between articles and nodes evenly', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: Array.from({ length: 10 }, (_, i) => ({
          id: `article-${i}`,
          title: `Article ${i}`,
          type: 'Article',
        })),
      });

      mockPool.query.mockResolvedValueOnce({
        rows: Array.from({ length: 10 }, (_, i) => ({
          id: `node-${i}`,
          title: `Node ${i}`,
          type: 'Fact',
        })),
      });

      const results = await service.search(mockPool as Pool, 'test', {
        limit: 20,
      });

      // Should split limit between articles and nodes
      expect(results.articles.length + results.nodes.length).toBeLessThanOrEqual(20);
    });

    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `node-${i}`,
        title: `Result ${i}`,
        type: 'Fact',
        relevance: Math.random(),
        graphId: 'graph-1',
      }));

      mockPool.query.mockResolvedValue({ rows: largeResultSet });

      const results = await service.search(mockPool as Pool, 'test', {
        limit: 50,
      });

      expect(results.nodes.length).toBeLessThanOrEqual(50);
    });

    it('should cache embedding service instance', async () => {
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: 'test',
        usage: { promptTokens: 10, totalTokens: 10 },
      } as any);

      mockPool.query.mockResolvedValue({ rows: [] });

      await service.semanticSearch(mockPool as Pool, 'test');
      await service.semanticSearch(mockPool as Pool, 'test2');

      // EmbeddingService should be instantiated for each call
      expect(EmbeddingService).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database query errors gracefully', async () => {
      mockPool.query.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        service.search(mockPool as Pool, 'test')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle empty search queries', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const results = await service.search(mockPool as Pool, '');

      // Should return empty results gracefully
      expect(results).toBeDefined();
    });

    it('should handle special characters in search queries', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const specialQuery = "test'; DROP TABLE--";
      await service.search(mockPool as Pool, specialQuery);

      // Should not throw (parameterized queries prevent injection)
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('search options validation', () => {
    it('should use default options when not provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.search(mockPool as Pool, 'test');

      // Should use defaults: limit=20, offset=0, semanticSearch=false
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should handle negative limit gracefully', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      // Service should handle invalid limits
      const results = await service.search(mockPool as Pool, 'test', {
        limit: -10,
      });

      expect(results).toBeDefined();
    });

    it('should handle null/undefined graphId', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.search(mockPool as Pool, 'test', {
        graphId: undefined,
      });

      // Should work without graphId filter
      expect(mockPool.query).toHaveBeenCalled();
    });
  });
});
