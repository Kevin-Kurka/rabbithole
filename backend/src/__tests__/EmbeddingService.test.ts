import { EmbeddingService } from '../services/EmbeddingService';
import OpenAI from 'openai';
import axios from 'axios';

jest.mock('openai');
jest.mock('axios');

const mockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_URL;
    delete process.env.OLLAMA_EMBEDDING_MODEL;
  });

  describe('initialization', () => {
    it('should initialize with OpenAI provider when API key is available', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-12345';
      process.env.OPENAI_EMBEDDING_MODEL = 'text-embedding-3-large';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      service = new EmbeddingService();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('EmbeddingService initialized with OpenAI')
      );
      consoleSpy.mockRestore();
    });

    it('should fallback to Ollama when OpenAI key is not available', () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      process.env.OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      service = new EmbeddingService();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('EmbeddingService initialized with Ollama')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('generateEmbedding with OpenAI', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.OPENAI_EMBEDDING_MODEL = 'text-embedding-3-large';
    });

    it('should generate embedding successfully', async () => {
      service = new EmbeddingService();
      const mockEmbedding = Array(1536).fill(0.1);
      const mockResponse = {
        data: [
          {
            embedding: mockEmbedding,
            index: 0,
          },
        ],
        model: 'text-embedding-3-large',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10,
        },
      };

      const mockClient = {
        embeddings: {
          create: jest.fn().mockResolvedValue(mockResponse),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      const result = await service.generateEmbedding('test query');

      expect(result).toEqual({
        vector: mockEmbedding,
        model: 'text-embedding-3-large',
        usage: {
          promptTokens: 10,
          totalTokens: 10,
        },
      });
    });

    it('should reject empty strings', async () => {
      service = new EmbeddingService();

      await expect(service.generateEmbedding('')).rejects.toThrow(
        'Text input cannot be empty after trimming'
      );
    });

    it('should reject non-string input', async () => {
      service = new EmbeddingService();

      await expect(service.generateEmbedding(null as any)).rejects.toThrow(
        'Text input must be a non-string'
      );
    });

    it('should warn on very long text (>30000 chars)', async () => {
      service = new EmbeddingService();
      const longText = 'a'.repeat(35000);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockClient = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: Array(1536).fill(0.1) }],
            model: 'text-embedding-3-large',
            usage: { prompt_tokens: 100, total_tokens: 100 },
          }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      await service.generateEmbedding(longText);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Text length')
      );
      warnSpy.mockRestore();
    });

    it('should handle invalid embedding dimension', async () => {
      service = new EmbeddingService();
      const mockResponse = {
        data: [
          {
            embedding: Array(768).fill(0.1), // Wrong dimension
            index: 0,
          },
        ],
        model: 'text-embedding-3-large',
        usage: { prompt_tokens: 10, total_tokens: 10 },
      };

      const mockClient = {
        embeddings: {
          create: jest.fn().mockResolvedValue(mockResponse),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'Expected 1536-dimension vector'
      );
    });

    it('should retry on rate limit errors', async () => {
      service = new EmbeddingService();
      const mockClient = {
        embeddings: {
          create: jest.fn()
            .mockRejectedValueOnce({
              status: 429, // Rate limit
              message: 'Rate limited',
            })
            .mockResolvedValueOnce({
              data: [{ embedding: Array(1536).fill(0.1) }],
              model: 'text-embedding-3-large',
              usage: { prompt_tokens: 10, total_tokens: 10 },
            }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      const result = await service.generateEmbedding('test');

      expect(result.vector).toHaveLength(1536);
      expect(mockClient.embeddings.create).toHaveBeenCalledTimes(2);
    });

    it('should fail immediately on non-retryable errors (4xx)', async () => {
      service = new EmbeddingService();
      const mockClient = {
        embeddings: {
          create: jest.fn().mockRejectedValue({
            status: 401, // Unauthorized
            message: 'Invalid API key',
          }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      await expect(service.generateEmbedding('test')).rejects.toThrow();
    });
  });

  describe('generateEmbedding with Ollama', () => {
    beforeEach(() => {
      delete process.env.OPENAI_API_KEY;
      process.env.OLLAMA_URL = 'http://localhost:11434';
      process.env.OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';
    });

    it('should generate embedding via Ollama', async () => {
      service = new EmbeddingService();
      const mockEmbedding = Array(768).fill(0.2);

      mockedAxios.post.mockResolvedValue({
        data: {
          embedding: mockEmbedding,
          model: 'nomic-embed-text',
        },
      });

      const result = await service.generateEmbedding('test query');

      expect(result.vector).toEqual(mockEmbedding);
      expect(result.model).toBe('nomic-embed-text');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/embeddings'),
        expect.objectContaining({ prompt: 'test query' }),
        expect.any(Object)
      );
    });

    it('should handle Ollama connection errors', async () => {
      service = new EmbeddingService();

      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      await expect(service.generateEmbedding('test')).rejects.toThrow();
    });

    it('should validate Ollama embedding dimensions', async () => {
      service = new EmbeddingService();

      mockedAxios.post.mockResolvedValue({
        data: {
          embedding: Array(1536).fill(0.1), // Wrong dimension
        },
      });

      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'Expected 768-dimension vector'
      );
    });

    it('should trim whitespace before embedding', async () => {
      service = new EmbeddingService();

      mockedAxios.post.mockResolvedValue({
        data: {
          embedding: Array(768).fill(0.1),
        },
      });

      await service.generateEmbedding('  test with spaces  ');

      const callArgs = mockedAxios.post.mock.calls[0][1];
      expect(callArgs.prompt).toBe('test with spaces');
    });
  });

  describe('generateBatchEmbeddings', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
    });

    it('should reject empty array', async () => {
      service = new EmbeddingService();

      await expect(service.generateBatchEmbeddings([])).rejects.toThrow(
        'Texts input must be a non-empty array'
      );
    });

    it('should reject non-array input', async () => {
      service = new EmbeddingService();

      await expect(service.generateBatchEmbeddings(null as any)).rejects.toThrow(
        'Texts input must be a non-empty array'
      );
    });

    it('should process batches of embeddings', async () => {
      service = new EmbeddingService();
      const texts = Array(150).fill('test text');
      const mockEmbeddings = Array(150).fill(Array(1536).fill(0.1));

      const mockClient = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: mockEmbeddings.map((e, i) => ({
              embedding: e,
              index: i,
            })),
            model: 'text-embedding-3-large',
            usage: {
              prompt_tokens: 1000,
              total_tokens: 1000,
            },
          }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      const results = await service.generateBatchEmbeddings(texts);

      expect(results).toHaveLength(150);
      expect(results[0].vector).toHaveLength(1536);
      // Should be called twice (batch size 100)
      expect(mockClient.embeddings.create).toHaveBeenCalledTimes(2);
    });

    it('should fallback to individual embedding on batch failure', async () => {
      service = new EmbeddingService();
      const texts = ['test1', 'test2'];

      const mockClient = {
        embeddings: {
          create: jest.fn()
            .mockRejectedValueOnce({
              status: 500,
              message: 'Server error',
            })
            .mockResolvedValue({
              data: [{ embedding: Array(1536).fill(0.1), index: 0 }],
              model: 'text-embedding-3-large',
              usage: { prompt_tokens: 10, total_tokens: 10 },
            }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      const results = await service.generateBatchEmbeddings(texts);

      expect(results.length).toBeGreaterThan(0);
      expect(mockClient.embeddings.create).toHaveBeenCalled();
    });
  });

  describe('extractTextForEmbedding', () => {
    it('should extract text from name and description', () => {
      const data = {
        name: 'Test Node',
        description: 'Test description',
      };

      const text = EmbeddingService.extractTextForEmbedding(data);

      expect(text).toContain('Test Node');
      expect(text).toContain('Test description');
    });

    it('should extract text from nested props', () => {
      const data = {
        name: 'Test',
        props: {
          title: 'Prop Title',
          content: 'Content text',
        },
      };

      const text = EmbeddingService.extractTextForEmbedding(data);

      expect(text).toContain('Prop Title');
      expect(text).toContain('Content text');
    });

    it('should handle arrays in props', () => {
      const data = {
        props: {
          tags: ['tag1', 'tag2', 'tag3'],
        },
      };

      const text = EmbeddingService.extractTextForEmbedding(data);

      expect(text).toContain('tag1');
      expect(text).toContain('tag2');
    });

    it('should throw error when no text content found', () => {
      const data = {
        props: {
          empty: '',
          null: null,
        },
      };

      expect(() => EmbeddingService.extractTextForEmbedding(data)).toThrow(
        'No text content found to generate embedding'
      );
    });

    it('should skip null and undefined values', () => {
      const data = {
        name: 'Test',
        props: {
          nullField: null,
          undefinedField: undefined,
          validField: 'Valid',
        },
      };

      const text = EmbeddingService.extractTextForEmbedding(data);

      expect(text).toContain('Test');
      expect(text).toContain('Valid');
      expect(text).not.toContain('null');
    });

    it('should respect max depth in nested objects', () => {
      const data = {
        props: {
          level1: {
            level2: {
              level3: {
                level4: {
                  deep: 'Should be ignored',
                },
              },
            },
          },
        },
      };

      // Should not throw, just stop at max depth
      expect(() => EmbeddingService.extractTextForEmbedding(data)).toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return true when embedding works', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      service = new EmbeddingService();

      const mockClient = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: Array(1536).fill(0.1) }],
            model: 'text-embedding-3-large',
            usage: { prompt_tokens: 5, total_tokens: 5 },
          }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false on embedding failure', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      service = new EmbeddingService();

      const mockClient = {
        embeddings: {
          create: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('error handling and retries', () => {
    it('should implement exponential backoff for retries', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      service = new EmbeddingService();

      const mockClient = {
        embeddings: {
          create: jest.fn()
            .mockRejectedValueOnce({ status: 500 })
            .mockRejectedValueOnce({ status: 500 })
            .mockResolvedValueOnce({
              data: [{ embedding: Array(1536).fill(0.1) }],
              model: 'text-embedding-3-large',
              usage: { prompt_tokens: 10, total_tokens: 10 },
            }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      const startTime = Date.now();
      const result = await service.generateEmbedding('test');
      const duration = Date.now() - startTime;

      expect(result.vector).toBeDefined();
      // Should take at least 1000ms + 2000ms = 3000ms due to exponential backoff
      expect(duration).toBeGreaterThanOrEqual(2500); // Allow some tolerance
    });

    it('should handle network errors (ECONNREFUSED, ETIMEDOUT)', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      service = new EmbeddingService();

      const mockClient = {
        embeddings: {
          create: jest.fn()
            .mockRejectedValueOnce({
              code: 'ECONNREFUSED',
              message: 'Connection refused',
            })
            .mockResolvedValueOnce({
              data: [{ embedding: Array(1536).fill(0.1) }],
              model: 'text-embedding-3-large',
              usage: { prompt_tokens: 10, total_tokens: 10 },
            }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      const result = await service.generateEmbedding('test');

      expect(result.vector).toBeDefined();
      expect(mockClient.embeddings.create).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      service = new EmbeddingService();

      const mockClient = {
        embeddings: {
          create: jest.fn().mockRejectedValue({
            status: 500,
            message: 'Server error',
          }),
        },
      };

      mockedOpenAI.mockImplementation(() => mockClient as any);
      service = new EmbeddingService();

      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding after'
      );
    });
  });
});
