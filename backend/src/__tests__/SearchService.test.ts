import { Pool } from 'pg';
import { SearchService } from '../services/SearchService';
import { EmbeddingService } from '../services/EmbeddingService';

// Mock EmbeddingService
jest.mock('../services/EmbeddingService');

// Mock pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('SearchService', () => {
  let service: SearchService;
  let mockEmbeddingService: jest.Mocked<EmbeddingService>;

  beforeEach(() => {
    service = new SearchService();
    jest.clearAllMocks();

    // Setup mock embedding service
    mockEmbeddingService = new EmbeddingService() as jest.Mocked<EmbeddingService>;
    (EmbeddingService as jest.Mock).mockImplementation(() => mockEmbeddingService);
  });

  describe('search (full-text)', () => {
    it('should search articles and nodes with full-text search', async () => {
      const mockArticles = [
        {
          id: '1',
          title: 'Test Article',
          type: 'Article',
          narrative: 'Test content',
          relevance: 0.9,
          graph_id: 'graph1',
          graph_name: 'Test Graph',
        },
      ];

      const mockNodes = [
        {
          id: '2',
          title: 'Test Node',
          type: 'Fact',
          relevance: 0.8,
          graph_id: 'graph1',
          graph_name: 'Test Graph',
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockArticles })
        .mockResolvedValueOnce({ rows: mockNodes });

      const result = await service.search(mockPool, 'test query');

      expect(result.articles).toEqual(mockArticles);
      expect(result.nodes).toEqual(mockNodes);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by graph ID', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.search(mockPool, 'test', { graphId: 'graph-123' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND n.graph_id ='),
        expect.arrayContaining(['graph-123'])
      );
    });

    it('should filter by node types', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.search(mockPool, 'test', { types: ['Fact', 'Claim'] });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND nt.name = ANY'),
        expect.anything()
      );
    });

    it('should respect limit and offset', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.search(mockPool, 'test', { limit: 10, offset: 20 });

      // Each search (articles and nodes) gets half the limit
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([5, 20])
      );
    });

    it('should return empty results for no matches', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.search(mockPool, 'nonexistent-term');

      expect(result.articles).toEqual([]);
      expect(result.nodes).toEqual([]);
    });
  });

  describe('semanticSearch', () => {
    it('should perform vector similarity search', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const mockResults = [
        {
          id: '1',
          title: 'Similar Node',
          type: 'Fact',
          narrative: 'Content',
          relevance: 0.95,
          graph_id: 'graph1',
          graph_name: 'Test Graph',
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockResults });

      const result = await service.semanticSearch(mockPool, 'test query');

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('test query');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('n.ai <=> $1::vector'),
        expect.arrayContaining([JSON.stringify(mockEmbedding)])
      );
      expect(result).toEqual(mockResults);
    });

    it('should fall back to full-text search if embedding fails', async () => {
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(null);

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.semanticSearch(mockPool, 'test query');

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledTimes(2); // Falls back to full-text
    });

    it('should filter by types and graphId', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await service.semanticSearch(mockPool, 'test', {
        types: ['Fact'],
        graphId: 'graph1',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/AND nt\.name = ANY.*AND n\.graph_id =/s),
        expect.anything()
      );
    });

    it('should only search nodes with embeddings', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await service.semanticSearch(mockPool, 'test');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.ai IS NOT NULL'),
        expect.anything()
      );
    });
  });

  describe('hybridSearch', () => {
    it('should combine full-text and semantic search results', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const fullTextArticle = {
        id: '1',
        title: 'Article',
        type: 'Article',
        relevance: 0.8,
        graph_id: 'graph1',
      };

      const semanticNode = {
        id: '2',
        title: 'Node',
        type: 'Fact',
        relevance: 0.9,
        graph_id: 'graph1',
      };

      // Mock full-text search (2 queries)
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [fullTextArticle] })
        .mockResolvedValueOnce({ rows: [] })
        // Mock semantic search (1 query)
        .mockResolvedValueOnce({ rows: [semanticNode] });

      const result = await service.hybridSearch(mockPool, 'test query');

      expect(result).toHaveLength(2);
      expect(result[0].relevance).toBeGreaterThanOrEqual(result[1].relevance);
    });

    it('should remove duplicate results', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const duplicateNode = {
        id: '1',
        title: 'Node',
        type: 'Fact',
        relevance: 0.8,
        graph_id: 'graph1',
      };

      // Both searches return the same node with different relevance
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...duplicateNode, relevance: 0.7 }] })
        .mockResolvedValueOnce({ rows: [{ ...duplicateNode, relevance: 0.9 }] });

      const result = await service.hybridSearch(mockPool, 'test query');

      expect(result).toHaveLength(1);
      expect(result[0].relevance).toBe(0.9); // Keeps higher relevance
    });

    it('should sort results by relevance', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const lowRelevance = {
        id: '1',
        title: 'Low',
        type: 'Fact',
        relevance: 0.5,
        graph_id: 'graph1',
      };

      const highRelevance = {
        id: '2',
        title: 'High',
        type: 'Fact',
        relevance: 0.9,
        graph_id: 'graph1',
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [lowRelevance] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [highRelevance] });

      const result = await service.hybridSearch(mockPool, 'test query');

      expect(result[0].id).toBe('2'); // High relevance first
      expect(result[1].id).toBe('1');
    });

    it('should respect limit parameter', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        title: `Node ${i}`,
        type: 'Fact',
        relevance: Math.random(),
        graph_id: 'graph1',
      }));

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: manyResults.slice(0, 10) })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: manyResults.slice(10) });

      const result = await service.hybridSearch(mockPool, 'test query', { limit: 5 });

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('autocomplete', () => {
    it('should return title suggestions', async () => {
      const mockSuggestions = ['Test Node 1', 'Test Node 2', 'Test Article'];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockSuggestions.map(title => ({ title })),
      });

      const result = await service.autocomplete(mockPool, 'test');

      expect(result).toEqual(mockSuggestions);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%test%', 5]
      );
    });

    it('should return empty array for short queries', async () => {
      const result = await service.autocomplete(mockPool, 't');

      expect(result).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await service.autocomplete(mockPool, 'test', 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10])
      );
    });

    it('should return distinct titles only', async () => {
      const mockSuggestions = ['Test', 'Test', 'Test 2'];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockSuggestions.map(title => ({ title })),
      });

      const result = await service.autocomplete(mockPool, 'test');

      // Query uses DISTINCT, so we expect unique titles
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DISTINCT'),
        expect.anything()
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(service.search(mockPool, 'test')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle embedding service errors', async () => {
      mockEmbeddingService.generateEmbedding = jest.fn().mockRejectedValue(
        new Error('Embedding failed')
      );

      await expect(service.semanticSearch(mockPool, 'test')).rejects.toThrow(
        'Embedding failed'
      );
    });
  });
});
