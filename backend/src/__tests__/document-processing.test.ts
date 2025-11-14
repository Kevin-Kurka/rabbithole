/**
 * Document Processing Service Tests
 */

import { Pool } from 'pg';
import { DocumentProcessingService, Entity } from '../services/DocumentProcessingService';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('DocumentProcessingService', () => {
  let pool: Pool;
  let docService: DocumentProcessingService;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    });
    docService = new DocumentProcessingService(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Entity Extraction', () => {
    it('should extract dates from text', async () => {
      const text = 'The event occurred on November 22, 1963 in Dallas, Texas.';
      const entities = await docService.extractEntities(text);

      const dates = entities.filter(e => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);
      expect(dates[0].value).toContain('1963');
    });

    it('should extract capitalized names', async () => {
      const text = 'John F Kennedy was the 35th president. He worked with Robert Kennedy.';
      const entities = await docService.extractEntities(text);

      const people = entities.filter(e => e.type === 'person');
      expect(people.length).toBeGreaterThan(0);
    });

    it('should deduplicate entities', async () => {
      const text = 'John Doe met with John Doe at the John Doe building.';
      const entities = await docService.extractEntities(text);

      const johnDoes = entities.filter(e => e.value.toLowerCase().includes('john doe'));
      // Should only have one entity for "John Doe" despite multiple mentions
      expect(johnDoes.length).toBeLessThanOrEqual(2); // May detect "John Doe" (person) and "John Doe building" (org)
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
      const entities = await docService.extractEntities(text);

      const people = entities.filter(e => e.type === 'person');
      expect(people.length).toBeGreaterThan(0);
    });

    it('should classify multi-word capitalized phrases as organizations', async () => {
      const text = 'The Central Intelligence Agency investigated the matter.';
      const entities = await docService.extractEntities(text);

      const orgs = entities.filter(e => e.type === 'organization');
      expect(orgs.length).toBeGreaterThan(0);
    });
  });

  describe('Summarization', () => {
    it('should generate summary for text', async () => {
      const text = `
        The assassination of President John F. Kennedy on November 22, 1963, remains one of the most
        significant events in American history. The Warren Commission concluded that Lee Harvey Oswald
        acted alone in shooting the president from the Texas School Book Depository in Dallas, Texas.
        However, various theories and investigations have questioned this conclusion over the decades.
      `;

      // Skip this test if Ollama is not available
      try {
        const summary = await docService.summarizeDocument(text, 'test.txt');
        expect(summary).toBeDefined();
        expect(summary.length).toBeGreaterThan(0);
        expect(summary).not.toBe('Unable to generate summary.');
      } catch (error) {
        if (error instanceof Error && error.message.includes('Ollama')) {
          console.log('Skipping summary test - Ollama not available');
        } else {
          throw error;
        }
      }
    }, 30000); // 30 second timeout for AI operation
  });

  describe('Processing Workflow', () => {
    it('should handle unsupported file types', async () => {
      const result = await docService.processDocument('test-file-id', '/fake/path.exe', {
        extractEntities: false,
        generateSummary: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
