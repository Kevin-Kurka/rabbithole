import { Pool } from 'pg';
import { AIAssistantService } from '../services/AIAssistantService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AIAssistantService', () => {
  let service: AIAssistantService;
  let mockPool: jest.Mocked<Partial<Pool>>;

  beforeEach(() => {
    service = new AIAssistantService();
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    } as any;

    jest.clearAllMocks();
    process.env.OLLAMA_URL = 'http://localhost:11434';
    process.env.OLLAMA_MODEL = 'llama3.2';
    process.env.AI_TEMPERATURE = '0.7';
    process.env.AI_MAX_TOKENS = '1000';
  });

  describe('initialization', () => {
    it('should initialize with Ollama configuration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service = new AIAssistantService();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI Assistant initialized with Ollama')
      );
      consoleSpy.mockRestore();
    });

    it('should initialize internal cache maps', () => {
      service = new AIAssistantService();

      expect(service['conversationCache']).toBeDefined();
      expect(service['rateLimitCache']).toBeDefined();
    });
  });

  describe('askAIAssistant', () => {
    it('should return AI response for user question', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          model: 'llama3.2',
          message: {
            role: 'assistant',
            content: 'This is an AI response to your question.',
          },
        },
      });

      const response = await service.askAIAssistant(
        mockPool as Pool,
        'graph-1',
        'What should I do next?',
        'user-1'
      );

      expect(response).toBe('This is an AI response to your question.');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should enforce rate limiting', async () => {
      const userId = 'user-rate-limit';

      // Mock multiple requests to hit rate limit
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Response' },
        },
      });

      // Make 10 requests (max allowed per hour)
      for (let i = 0; i < 10; i++) {
        await service.askAIAssistant(
          mockPool as Pool,
          `graph-${i}`,
          'Question',
          userId
        );
      }

      // 11th request should be rejected
      const remaining = service.getRemainingRequests(userId);
      expect(remaining).toBe(0);

      await expect(
        service.askAIAssistant(mockPool as Pool, 'graph-11', 'Question', userId)
      ).rejects.toThrow('reached the maximum');
    });

    it('should return fallback response on empty AI response', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: '' },
        },
      });

      const response = await service.askAIAssistant(
        mockPool as Pool,
        'graph-1',
        'Question?',
        'user-1'
      );

      expect(response).toContain('trouble generating');
    });

    it('should handle Ollama API errors', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      await expect(
        service.askAIAssistant(mockPool as Pool, 'graph-1', 'Question', 'user-1')
      ).rejects.toThrow('Ollama is not running');
    });

    it('should maintain conversation history', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Response 1' },
        },
      });

      const graphId = 'graph-history';

      // First question
      await service.askAIAssistant(
        mockPool as Pool,
        graphId,
        'First question',
        'user-1'
      );

      // Second question
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Response 2' },
        },
      });

      await service.askAIAssistant(
        mockPool as Pool,
        graphId,
        'Second question',
        'user-1'
      );

      // History should include both messages
      const call = mockedAxios.post.mock.calls[1][1] as any;
      expect(call.messages).toContainEqual(
        expect.objectContaining({
          role: 'user',
          content: 'First question',
        })
      );
      expect(call.messages).toContainEqual(
        expect.objectContaining({
          role: 'assistant',
          content: 'Response 1',
        })
      );
    });

    it('should truncate conversation history to MAX_CONVERSATION_LENGTH', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Response' },
        },
      });

      const graphId = 'graph-long-history';
      const maxLength = (service as any).MAX_CONVERSATION_LENGTH;

      // Add messages exceeding max length
      for (let i = 0; i < maxLength + 5; i++) {
        await service.askAIAssistant(
          mockPool as Pool,
          graphId,
          `Question ${i}`,
          'user-1'
        );
      }

      // Get final call to check message count
      const lastCall = mockedAxios.post.mock.calls[mockedAxios.post.mock.calls.length - 1][1] as any;

      // Should only contain recent messages
      const userAssistantMessages = lastCall.messages.filter(
        (m: any) => m.role === 'user' || m.role === 'assistant'
      );
      expect(userAssistantMessages.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('getNextStepSuggestion', () => {
    it('should suggest next steps for methodology-based graph', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            title: 'Test Node',
            node_type: 'Claim',
            props: { graphId: 'graph-1' },
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'edge-1',
            source_node_id: 'node-1',
            target_node_id: 'node-2',
            edge_type: 'supports',
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'graph-1',
            methodology: 'Scientific Method',
            methodology_id: 'method-1',
            methodology_name: 'Scientific Method',
            methodology_description: 'Test methodology',
            methodology_category: 'science',
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Node types
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Edge types
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Workflow

      mockedAxios.post.mockResolvedValue({
        data: {
          message: {
            role: 'assistant',
            content: 'You might consider adding more supporting evidence.',
          },
        },
      });

      const suggestion = await service.getNextStepSuggestion(
        mockPool as Pool,
        'graph-1',
        'method-1'
      );

      expect(suggestion).toContain('might consider');
    });

    it('should handle graphs without methodology', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Nodes
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Edges
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'graph-1', methodology: null }],
      });

      const suggestion = await service.getNextStepSuggestion(
        mockPool as Pool,
        'graph-1',
        ''
      );

      expect(suggestion).toContain('free-form');
    });
  });

  describe('detectInconsistencies', () => {
    it('should detect orphaned nodes', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'node-1', node_type: 'Claim' },
          { id: 'node-2', node_type: 'Evidence' },
          { id: 'node-3', node_type: 'Claim' }, // Orphaned
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'edge-1',
            source_node_id: 'node-1',
            target_node_id: 'node-2',
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'graph-1' }],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Methodology

      const inconsistencies = await service.detectInconsistencies(
        mockPool as Pool,
        'graph-1'
      );

      expect(inconsistencies).toContainEqual(
        expect.stringContaining('isolated node')
      );
    });

    it('should provide helpful inconsistency messages', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No nodes
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No edges
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'graph-1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No methodology

      const inconsistencies = await service.detectInconsistencies(
        mockPool as Pool,
        'graph-1'
      );

      // Should return positive feedback when no issues
      expect(inconsistencies[0]).toContain('logically sound');
    });

    it('should detect invalid edge connections for methodology', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'node-1', node_type: 'Claim' },
          { id: 'node-2', node_type: 'Evidence' },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'edge-1',
            source_node_id: 'node-1',
            target_node_id: 'node-2',
            edge_type: 'refutes',
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'graph-1',
            methodology_id: 'method-1',
            methodology_name: 'Test',
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            name: 'Claim',
            display_name: 'Claim',
            required_properties: [],
          },
          {
            name: 'Evidence',
            display_name: 'Evidence',
            required_properties: [],
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            name: 'refutes',
            display_name: 'Refutes',
            is_directed: true,
            valid_source_types: ['Evidence'], // Only Evidence can be source
            valid_target_types: ['Claim'],
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Workflow

      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'No logical issues found.' },
        },
      });

      const inconsistencies = await service.detectInconsistencies(
        mockPool as Pool,
        'graph-1'
      );

      expect(inconsistencies).toBeDefined();
    });
  });

  describe('suggestEvidence', () => {
    it('should suggest evidence for a node', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            node_type: 'Claim',
            node_type_display: 'Claim',
            props: JSON.stringify({
              title: 'Climate change is real',
              description: 'Evidence supporting climate change',
            }),
          },
        ],
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          message: {
            role: 'assistant',
            content: `[
              {
                "type": "source",
                "description": "Scientific reports on climate",
                "searchQuery": "climate change IPCC report",
                "priority": 5,
                "rationale": "Primary source evidence"
              }
            ]`,
          },
        },
      });

      const suggestions = await service.suggestEvidence(mockPool as Pool, 'node-1');

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        type: 'source',
        priority: 5,
      });
    });

    it('should handle unparseable AI response with fallback', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            node_type: 'Claim',
            node_type_display: 'Claim',
            props: JSON.stringify({ title: 'Test Claim' }),
          },
        ],
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          message: {
            role: 'assistant',
            content: 'Invalid response that is not JSON',
          },
        },
      });

      const suggestions = await service.suggestEvidence(mockPool as Pool, 'node-1');

      // Should provide fallback suggestions
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('type');
      expect(suggestions[0]).toHaveProperty('searchQuery');
    });

    it('should throw error when node not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.suggestEvidence(mockPool as Pool, 'node-not-found')).rejects.toThrow(
        'Node not found'
      );
    });
  });

  describe('validateMethodologyCompliance', () => {
    it('should return 100% compliance for graphs without methodology', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Nodes
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Edges
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'graph-1', methodology: null }],
      }); // Graph

      const report = await service.validateMethodologyCompliance(
        mockPool as Pool,
        'graph-1'
      );

      expect(report.complianceScore).toBe(100);
      expect(report.isCompliant).toBe(true);
    });

    it('should detect missing required node types', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'node-1', node_type: 'Claim' }],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Edges

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'graph-1',
            methodology_id: 'method-1',
            methodology_name: 'Test Method',
            methodology_description: 'Test',
            methodology_category: 'test',
          },
        ],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          { name: 'Claim', display_name: 'Claim', required_properties: [] },
        ],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Edge types

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            steps: [
              {
                type: 'NODE_CREATION',
                title: 'Add Evidence',
                config: { nodeType: 'Evidence' },
                description: 'Add supporting evidence',
              },
            ],
          },
        ],
      });

      const report = await service.validateMethodologyCompliance(
        mockPool as Pool,
        'graph-1'
      );

      expect(report.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing_node_type',
          severity: 'warning',
        })
      );
    });

    it('should provide clear compliance assessment message', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Nodes
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Edges
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'graph-1', methodology: null }],
      });

      const report = await service.validateMethodologyCompliance(
        mockPool as Pool,
        'graph-1'
      );

      expect(report.overallAssessment).toBeDefined();
      expect(report.overallAssessment).toContain('recommendation');
    });
  });

  describe('clearConversation', () => {
    it('should clear conversation history for a graph', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Response' },
        },
      });

      const graphId = 'graph-to-clear';

      // Add some messages
      await service.askAIAssistant(
        mockPool as Pool,
        graphId,
        'Question',
        'user-1'
      );

      // Clear
      service.clearConversation(graphId);

      // Next request should have empty history
      mockedAxios.post.mockClear();
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Fresh response' },
        },
      });

      await service.askAIAssistant(
        mockPool as Pool,
        graphId,
        'New question',
        'user-1'
      );

      const call = mockedAxios.post.mock.calls[0][1] as any;
      const userMessages = call.messages.filter((m: any) => m.role === 'user');

      // Should only have the new question
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].content).toBe('New question');
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining requests', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Response' },
        },
      });

      const userId = 'user-remaining';

      expect(service.getRemainingRequests(userId)).toBe(10); // Initial max

      await service.askAIAssistant(
        mockPool as Pool,
        'graph-1',
        'Q1',
        userId
      );

      expect(service.getRemainingRequests(userId)).toBe(9);

      await service.askAIAssistant(
        mockPool as Pool,
        'graph-2',
        'Q2',
        userId
      );

      expect(service.getRemainingRequests(userId)).toBe(8);
    });

    it('should return 0 when rate limit reached', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Response' },
        },
      });

      const userId = 'user-limited';
      const maxRequests = (service as any).MAX_REQUESTS_PER_HOUR;

      // Make max requests
      for (let i = 0; i < maxRequests; i++) {
        await service.askAIAssistant(
          mockPool as Pool,
          `graph-${i}`,
          'Question',
          userId
        );
      }

      expect(service.getRemainingRequests(userId)).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle Ollama timeout gracefully', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'Request timeout',
      });

      await expect(
        service.askAIAssistant(mockPool as Pool, 'graph-1', 'Question', 'user-1')
      ).rejects.toThrow();
    });

    it('should handle non-axios errors', async () => {
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);
      mockedAxios.post.mockRejectedValue(new Error('Generic error'));

      await expect(
        service.askAIAssistant(mockPool as Pool, 'graph-1', 'Question', 'user-1')
      ).rejects.toThrow('Generic error');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should create educational system prompt', async () => {
      const prompt = (service as any).buildSystemPrompt();

      expect(prompt).toContain('SUGGEST');
      expect(prompt).toContain('GUIDE');
      expect(prompt).toContain('CANNOT');
      expect(prompt).toContain('You might consider');
    });
  });

  describe('conversation cache expiration', () => {
    it('should expire conversation after cache duration', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message: { role: 'assistant', content: 'Response' },
        },
      });

      const graphId = 'graph-expiring';
      const cacheDuration = (service as any).CACHE_DURATION_MS;

      // Add message
      await service.askAIAssistant(
        mockPool as Pool,
        graphId,
        'Question',
        'user-1'
      );

      // Fast-forward time (mock would be needed for proper testing)
      // This is more of an integration test concept
      expect(service['conversationCache'].has(graphId)).toBe(true);
    });
  });
});
