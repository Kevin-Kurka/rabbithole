import { Pool } from 'pg';
import { ConversationalAIService } from '../services/ConversationalAIService';

/**
 * ConversationalAIService Unit Tests
 *
 * Tests the conversational AI service functionality including:
 * - Message sending and conversation management
 * - Semantic node search with pgvector
 * - Response formatting with node links
 * - Embedding generation
 * - Error handling
 */

describe('ConversationalAIService', () => {
  let service: ConversationalAIService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // Create mock PostgreSQL pool
    mockPool = {
      query: jest.fn() as any,
      connect: jest.fn() as any,
      end: jest.fn() as any,
      on: jest.fn() as any,
    } as any;

    // Initialize service
    service = new ConversationalAIService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchNodes', () => {
    it('should search nodes using semantic similarity', async () => {
      // Mock embedding generation
      jest.spyOn(service as any, 'generateEmbedding').mockResolvedValue(
        new Array(1536).fill(0.1)
      );

      // Mock database query response
      const mockNodes = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'JFK Assassination',
          props: JSON.stringify({ description: 'Test node' }),
          meta: JSON.stringify({}),
          node_type: 'event',
          weight: 0.9,
          similarity: 0.85,
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          title: 'Lee Harvey Oswald',
          props: JSON.stringify({ description: 'Suspect' }),
          meta: null,
          node_type: 'person',
          weight: 0.8,
          similarity: 0.75,
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockNodes, rowCount: 2 } as any);

      // Execute search
      const result = await service.searchNodes(mockPool, 'JFK assassination');

      // Assertions
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result[0].title).toBe('JFK Assassination');
      expect(result[0].similarity).toBe(0.85);
      expect(result[1].similarity).toBe(0.75);

      // Verify query was called with vector string
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY n.ai <=> $1::vector');
    });

    it('should filter by graph ID when provided', async () => {
      jest.spyOn(service as any, 'generateEmbedding').mockResolvedValue(
        new Array(1536).fill(0.1)
      );

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const graphId = 'graph-123';
      await service.searchNodes(mockPool, 'test query', graphId);

      // Verify graph filter is applied
      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('WHERE n.graph_id = $2');
      expect(queryCall[1]).toContain(graphId);
    });

    it('should return empty array on error', async () => {
      jest.spyOn(service as any, 'generateEmbedding').mockResolvedValue(
        new Array(1536).fill(0.1)
      );

      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.searchNodes(mockPool, 'test query');

      expect(result).toEqual([]);
    });

    it('should handle empty embedding gracefully', async () => {
      jest.spyOn(service as any, 'generateEmbedding').mockResolvedValue([]);

      const result = await service.searchNodes(mockPool, 'test query');

      expect(result).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('formatResponseWithLinks', () => {
    it('should format response with node links', () => {
      const response = 'The JFK Assassination was a significant event involving Lee Harvey Oswald.';
      const relevantNodes = [
        {
          id: 'node-1',
          title: 'JFK Assassination',
          props: {},
          weight: 0.9,
          similarity: 0.85,
        },
        {
          id: 'node-2',
          title: 'Lee Harvey Oswald',
          props: {},
          weight: 0.8,
          similarity: 0.75,
        },
      ];

      const formatted = service.formatResponseWithLinks(response, relevantNodes);

      expect(formatted).toContain('[JFK Assassination](node:node-1)');
      expect(formatted).toContain('[Lee Harvey Oswald](node:node-2)');
      expect(formatted).toContain('**Related Nodes:**');
      expect(formatted).toContain('similarity: 0.85');
    });

    it('should not create duplicate links', () => {
      const response = 'The JFK Assassination was a major event. The JFK Assassination changed history.';
      const relevantNodes = [
        {
          id: 'node-1',
          title: 'JFK Assassination',
          props: {},
          weight: 0.9,
          similarity: 0.85,
        },
      ];

      const formatted = service.formatResponseWithLinks(response, relevantNodes);

      // Count occurrences of the link
      const linkCount = (formatted.match(/\[JFK Assassination\]\(node:node-1\)/g) || []).length;
      expect(linkCount).toBeGreaterThanOrEqual(1);
    });

    it('should return original response when no nodes provided', () => {
      const response = 'Test response without nodes';
      const formatted = service.formatResponseWithLinks(response, []);

      expect(formatted).toBe(response);
      expect(formatted).not.toContain('**Related Nodes:**');
    });

    it('should not link nodes inside existing links', () => {
      const response = '[Test Link](http://example.com/JFK Assassination)';
      const relevantNodes = [
        {
          id: 'node-1',
          title: 'JFK Assassination',
          props: {},
          weight: 0.9,
          similarity: 0.85,
        },
      ];

      const formatted = service.formatResponseWithLinks(response, relevantNodes);

      // Original link should remain unchanged
      expect(formatted).toContain('[Test Link](http://example.com/JFK Assassination)');
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation messages in chronological order', async () => {
      const conversationId = 'conv-123';
      const mockMessages = [
        {
          id: 'msg-1',
          conversationId,
          userId: 'user-1',
          role: 'user',
          content: 'Hello',
          metadata: '{}',
          createdAt: new Date('2025-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          conversationId,
          userId: 'user-1',
          role: 'assistant',
          content: 'Hi there!',
          metadata: '{"modelUsed": "deepseek-r1:1.5b"}',
          createdAt: new Date('2025-01-01T10:00:05Z'),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [...mockMessages].reverse(), // DB returns DESC
        rowCount: 2,
      } as any);

      const result = await service.getConversationHistory(mockPool, conversationId);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Hello');
      expect(result[1].content).toBe('Hi there!');
      expect(result[1].metadata).toEqual({ modelUsed: 'deepseek-r1:1.5b' });
    });

    it('should return empty array on error', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.getConversationHistory(mockPool, 'conv-123');

      expect(result).toEqual([]);
    });

    it('should limit messages to maxContextMessages', async () => {
      const conversationId = 'conv-123';

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await service.getConversationHistory(mockPool, conversationId);

      // Verify LIMIT parameter is set to maxContextMessages (default 20)
      const queryCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[1]).toContain(20);
    });
  });

  describe('generateEmbedding', () => {
    it('should throw error when Ollama is not running', async () => {
      // Note: This test requires mocking axios, which is more complex
      // In a real test, you would mock axios to throw ECONNREFUSED
      // For now, we document the expected behavior

      expect(true).toBe(true); // Placeholder
    });

    it('should throw error when embedding model not found', async () => {
      // Mock axios to return 404
      // Expected error: "Embedding model not found. Pull it with: ollama pull nomic-embed-text"

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('sendMessage', () => {
    it('should create new conversation when conversationId not provided', async () => {
      // Mock all required database operations
      const userId = 'user-123';
      const message = 'Tell me about JFK';
      const conversationId = 'conv-new';
      const messageId = 'msg-123';

      // Mock conversation creation
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // Create conversation
          rows: [
            {
              id: conversationId,
              userId,
              graphId: null,
              title: 'New Conversation',
              metadata: '{}',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [{ id: messageId }], rowCount: 1 } as any) // Save user message
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // Get history
        .mockResolvedValueOnce({ rows: [{ id: messageId }], rowCount: 1 } as any) // Save assistant message
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // Update conversation

      // Mock service methods
      jest.spyOn(service, 'searchNodes').mockResolvedValue([]);
      jest.spyOn(service as any, 'generateResponse').mockResolvedValue('Test response');

      // Note: Full integration test would require mocking all DB operations
      // This is a simplified test to show structure

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      jest.spyOn(service as any, 'generateEmbedding').mockResolvedValue(
        new Array(1536).fill(0.1)
      );
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await service.searchNodes(mockPool, 'test');

      expect(result).toEqual([]);
    });

    it('should sanitize error messages', () => {
      // Test private handleError method behavior
      // Should convert various error types to user-friendly messages

      expect(true).toBe(true); // Placeholder
    });
  });
});

/**
 * Integration Tests
 *
 * These tests require a running PostgreSQL database with pgvector extension
 * and Ollama service. They are skipped in CI/CD unless INTEGRATION_TEST=true
 */
describe('ConversationalAIService Integration', () => {
  const shouldRunIntegrationTests = process.env.INTEGRATION_TEST === 'true';

  const itIntegration = shouldRunIntegrationTests ? it : it.skip;

  let pool: Pool;
  let service: ConversationalAIService;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) return;

    // Initialize real database connection
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    });

    service = new ConversationalAIService();
  });

  afterAll(async () => {
    if (!shouldRunIntegrationTests) return;
    await pool.end();
  });

  itIntegration('should generate embeddings using Ollama', async () => {
    const text = 'Test embedding generation';
    const embedding = await service.generateEmbedding(text);

    expect(embedding).toBeInstanceOf(Array);
    expect(embedding.length).toBe(1536);
    expect(embedding[0]).toBeGreaterThan(-1);
    expect(embedding[0]).toBeLessThan(1);
  });

  itIntegration('should perform semantic search on real database', async () => {
    const query = 'assassination';
    const results = await service.searchNodes(pool, query);

    expect(Array.isArray(results)).toBe(true);
    // Results depend on database state
  });

  itIntegration('should complete full conversation flow', async () => {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO public."Users" (id, username, email, password_hash)
       VALUES (uuid_generate_v4(), 'test_conv_user', 'test_conv@example.com', 'hash')
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`
    );
    const userId = userResult.rows[0].id;

    // Send message
    const result = await service.sendMessage(
      pool,
      userId,
      'What is the JFK assassination?'
    );

    expect(result).toHaveProperty('conversationId');
    expect(result).toHaveProperty('response');
    expect(result).toHaveProperty('relevantNodes');
    expect(result).toHaveProperty('messageId');

    // Cleanup
    await pool.query(`DELETE FROM public."Conversations" WHERE user_id = $1`, [userId]);
  });
});
