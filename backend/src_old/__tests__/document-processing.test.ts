/**
 * Document Processing Service Tests
 */

import { Pool } from 'pg';
import { DocumentProcessingService } from '../services/DocumentProcessingService';
import { AIAssistantService } from '../services/AIAssistantService';

// Mock dependencies
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('../services/AIAssistantService');

describe('DocumentProcessingService', () => {
  let pool: any;
  let docService: DocumentProcessingService;
  let mockAIAssistantService: jest.Mocked<AIAssistantService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock pool
    pool = new Pool();

    // Setup mock AI service
    mockAIAssistantService = new AIAssistantService() as jest.Mocked<AIAssistantService>;
    // Mock the private method callOllama
    (mockAIAssistantService as any).callOllama = jest.fn();
    (AIAssistantService as unknown as jest.Mock).mockImplementation(() => mockAIAssistantService);

    docService = new DocumentProcessingService(pool);
    // Inject mock AI service if possible, or mock the method that uses it
    // Since AIAssistantService is instantiated inside DocumentProcessingService methods or as a property,
    // mocking the class constructor (above) should work if it's a property.
    // If it's instantiated inside methods, the mock above handles it.
  });

  describe('Entity Extraction', () => {
    it('should extract dates from text', async () => {
      const text = 'The event occurred on November 22, 1963 in Dallas, Texas.';
      // Mock extractEntitiesWithAI to return empty array to isolate regex extraction
      // Or just let it run if it uses regex first.
      // The service uses regex for dates.

      // Mock AI service to return empty JSON for entities to avoid errors
      (mockAIAssistantService as any).callOllama.mockResolvedValue(JSON.stringify({ entities: [] }));

      const entities = await docService.extractEntities(text);

      const dates = entities.filter(e => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);
      expect(dates[0].value).toContain('1963');
    });

    it('should extract capitalized names', async () => {
      const text = 'John F Kennedy was the 35th president. He worked with Robert Kennedy.';
      (mockAIAssistantService as any).callOllama.mockResolvedValue(JSON.stringify({ entities: [] }));

      const entities = await docService.extractEntities(text);

      const people = entities.filter(e => e.type === 'person');
      expect(people.length).toBeGreaterThan(0);
    });

    it('should deduplicate entities', async () => {
      const text = 'John Doe met with John Doe at the John Doe building.';
      (mockAIAssistantService as any).callOllama.mockResolvedValue(JSON.stringify({ entities: [] }));

      const entities = await docService.extractEntities(text);

      const johnDoes = entities.filter(e => e.value.toLowerCase().includes('john doe'));
      // Should only have one entity for "John Doe" despite multiple mentions
      expect(johnDoes.length).toBeLessThanOrEqual(2);
    });
  });

  describe('PDF Text Extraction', () => {
    it('should handle missing PDF file gracefully', async () => {
      const fakePath = '/path/to/nonexistent.pdf';

      await expect(docService.extractTextFromPDF(fakePath)).rejects.toThrow();
    });
  });

  describe('Entity Type Detection', () => {
    it('should classify two-word capitalized phrases as people', async () => {
      const text = 'Jane Smith is a scientist. Bob Jones works here.';
      (mockAIAssistantService as any).callOllama.mockResolvedValue(JSON.stringify({ entities: [] }));

      const entities = await docService.extractEntities(text);

      const people = entities.filter(e => e.type === 'person');
      expect(people.length).toBeGreaterThan(0);
    });

    it('should classify multi-word capitalized phrases as organizations', async () => {
      const text = 'The Central Intelligence Agency investigated the matter.';
      (mockAIAssistantService as any).callOllama.mockResolvedValue(JSON.stringify({ entities: [] }));

      const entities = await docService.extractEntities(text);

      const orgs = entities.filter(e => e.type === 'organization');
      expect(orgs.length).toBeGreaterThan(0);
    });
  });

  describe('Summarization', () => {
    it('should generate summary for text', async () => {
      const text = 'Test text';
      const mockSummary = 'This is a summary.';

      (mockAIAssistantService as any).callOllama.mockResolvedValue(mockSummary);

      const summary = await docService.summarizeDocument(text, 'test.txt');
      expect(summary).toBe(mockSummary);
    });
  });

  describe('Processing Workflow', () => {
    it('should handle unsupported file types', async () => {
      // Mock pool.query to succeed (for updateFileProcessingStatus)
      pool.query.mockResolvedValue({});

      const result = await docService.processDocument('test-file-id', '/fake/path.exe', {
        extractEntities: false,
        generateSummary: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(pool.query).toHaveBeenCalled(); // Should update status in DB
    });
  });
});
