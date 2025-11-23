import { Pool } from 'pg';
import { AIAssistantService } from './AIAssistantService';
import { MessageQueueService } from './MessageQueueService';
import { FileStorageService } from './FileStorageService';
import { promises as fs } from 'fs';

// pdf-parse uses CommonJS, need to require it
const pdfParse = require('pdf-parse');

// ============================================================================
// INTERFACES
// ============================================================================

export interface Entity {
  type: 'person' | 'organization' | 'location' | 'event' | 'date' | 'concept';
  value: string;
  context?: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

export interface ProcessingResult {
  fileId: string;
  success: boolean;
  extractedText?: string;
  entities?: Entity[];
  summary?: string;
  createdNodeIds?: string[];
  error?: string;
  processingTimeMs: number;
}

export interface DocumentMetadata {
  pageCount?: number;
  title?: string;
  author?: string;
  creationDate?: Date;
  wordCount?: number;
}

// ============================================================================
// DOCUMENT PROCESSING SERVICE
// ============================================================================

export class DocumentProcessingService {
  private pool: Pool;
  private aiService: AIAssistantService;
  private messageQueueService: MessageQueueService;

  constructor(
    pool: Pool,
    aiService?: AIAssistantService,
    messageQueueService?: MessageQueueService
  ) {
    this.pool = pool;
    this.aiService = aiService || new AIAssistantService();
    this.messageQueueService = messageQueueService || new MessageQueueService();
  }

  /**
   * Process a document file (main entry point)
   */
  async processDocument(
    fileId: string,
    filePath: string,
    options: {
      graphId?: string;
      evidenceId?: string;
      createNodes?: boolean;
      extractEntities?: boolean;
      generateSummary?: boolean;
    } = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      console.log(`Starting document processing for file ${fileId}`);

      // Update processing status
      await this.updateFileProcessingStatus(fileId, 'processing');

      // Get file metadata from database
      const fileMetadata = await this.getFileMetadata(fileId);

      if (!fileMetadata) {
        throw new Error(`File ${fileId} not found`);
      }

      // Extract text based on file type
      let extractedText = '';

      if (fileMetadata.mime_type === 'application/pdf') {
        extractedText = await this.extractTextFromPDF(filePath);
      } else if (fileMetadata.mime_type === 'text/plain') {
        extractedText = await fs.readFile(filePath, 'utf-8');
      } else if (
        fileMetadata.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // For DOCX files, we'd need mammoth or docx library
        console.warn('DOCX processing not yet implemented, skipping text extraction');
      } else {
        throw new Error(`Unsupported file type: ${fileMetadata.mime_type}`);
      }

      console.log(`Extracted ${extractedText.length} characters of text`);

      // Store extracted text in database
      await this.storeExtractedText(fileId, extractedText);

      const result: ProcessingResult = {
        fileId,
        success: true,
        extractedText,
        processingTimeMs: 0,
      };

      // Extract entities if requested
      if (options.extractEntities && extractedText.length > 0) {
        console.log('Extracting entities from text...');
        const entities = await this.extractEntities(extractedText);
        result.entities = entities;

        console.log(`Extracted ${entities.length} entities`);
      }

      // Generate summary if requested
      if (options.generateSummary && extractedText.length > 0) {
        console.log('Generating AI summary...');
        const summary = await this.summarizeDocument(extractedText, fileMetadata.original_filename);
        result.summary = summary;

        // Store summary in database
        await this.storeSummary(fileId, summary);
      }

      // Create nodes from entities if requested
      if (options.createNodes && options.graphId && result.entities && result.entities.length > 0) {
        console.log('Creating nodes from entities...');
        const nodeIds = await this.createNodesFromEntities(
          result.entities,
          options.graphId,
          fileId
        );
        result.createdNodeIds = nodeIds;

        console.log(`Created ${nodeIds.length} nodes`);
      }

      // Update processing status
      await this.updateFileProcessingStatus(fileId, 'completed');

      result.processingTimeMs = Date.now() - startTime;

      console.log(`Document processing completed in ${result.processingTimeMs}ms`);

      return result;
    } catch (error) {
      console.error('Error processing document:', error);

      // Update processing status to failed
      await this.updateFileProcessingStatus(
        fileId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return {
        fileId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract entities from text using pattern matching and AI
   */
  async extractEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Basic pattern-based entity extraction
    const patterns = {
      date: /\b(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})/gi,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /\b(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi,
      phone: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
      capitalized: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, // Likely proper nouns (people, places, organizations)
    };

    // Extract dates
    let match;
    while ((match = patterns.date.exec(text)) !== null) {
      entities.push({
        type: 'date',
        value: match[0],
        confidence: 0.8,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Extract capitalized phrases (potential people, places, organizations)
    const capitalizedMatches = text.match(patterns.capitalized) || [];
    const uniqueCapitalized = [...new Set(capitalizedMatches)];

    for (const phrase of uniqueCapitalized) {
      // Skip common words
      const skipWords = ['The', 'This', 'That', 'These', 'Those'];
      if (skipWords.includes(phrase)) continue;

      // Heuristic: 2 words = person, 3+ words = organization
      const wordCount = phrase.split(/\s+/).length;

      entities.push({
        type: wordCount === 2 ? 'person' : 'organization',
        value: phrase,
        confidence: 0.6,
      });
    }

    // Use AI for more sophisticated entity extraction (if available)
    try {
      const aiEntities = await this.extractEntitiesWithAI(text);
      entities.push(...aiEntities);
    } catch (error) {
      console.warn('AI entity extraction failed, using pattern-based only:', error);
    }

    // Remove duplicates and sort by confidence
    const uniqueEntities = this.deduplicateEntities(entities);

    return uniqueEntities.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract entities using AI (Ollama)
   */
  private async extractEntitiesWithAI(text: string): Promise<Entity[]> {
    // Truncate text if too long (max ~4000 chars for better performance)
    const truncatedText = text.substring(0, 4000);

    const prompt = `Extract named entities from the following text. Identify:
- People (names of individuals)
- Organizations (companies, institutions, groups)
- Locations (cities, countries, addresses, landmarks)
- Events (significant occurrences, incidents)
- Dates (specific times or time periods)
- Concepts (important ideas, theories, or themes)

Text:
${truncatedText}

Return a JSON array of entities with the format:
[{"type": "person", "value": "John Doe", "confidence": 0.9, "context": "brief context"}]

Only return valid JSON, no additional text.`;

    try {
      const response = await this.aiService['callOllama'](
        [
          {
            role: 'system',
            content: 'You are an expert at named entity recognition. Extract entities accurately and return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        1000
      );

      // Try to parse JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((e: any) => ({
          type: e.type || 'concept',
          value: e.value || '',
          confidence: e.confidence || 0.7,
          context: e.context,
        }));
      }

      return [];
    } catch (error) {
      console.error('AI entity extraction error:', error);
      return [];
    }
  }

  /**
   * Deduplicate entities by value and type
   */
  private deduplicateEntities(entities: Entity[]): Entity[] {
    const seen = new Map<string, Entity>();

    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;

      if (!seen.has(key) || (seen.get(key)!.confidence < entity.confidence)) {
        seen.set(key, entity);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Create graph nodes from extracted entities
   */
  async createNodesFromEntities(
    entities: Entity[],
    graphId: string,
    sourceFileId: string
  ): Promise<string[]> {
    const createdNodeIds: string[] = [];

    // Check if graph exists and get methodology
    const graphResult = await this.pool.query(
      `SELECT id, methodology FROM public."Graphs" WHERE id = $1`,
      [graphId]
    );

    if (graphResult.rows.length === 0) {
      throw new Error(`Graph ${graphId} not found`);
    }

    // Get appropriate node types based on methodology
    const nodeTypeMap = await this.getNodeTypeMapping(graphId);

    // Filter entities with confidence > 0.7
    const highConfidenceEntities = entities.filter((e) => e.confidence > 0.7);

    for (const entity of highConfidenceEntities) {
      try {
        // Determine node type ID
        const nodeTypeId = nodeTypeMap[entity.type];

        if (!nodeTypeId) {
          console.warn(`No node type mapping for entity type: ${entity.type}`);
          continue;
        }

        // Check if node with same title already exists
        const existingNode = await this.pool.query(
          `SELECT id FROM public."Nodes"
           WHERE props->>'graphId' = $1
           AND title = $2
           AND deleted_at IS NULL`,
          [graphId, entity.value]
        );

        if (existingNode.rows.length > 0) {
          console.log(`Node "${entity.value}" already exists, skipping`);
          continue;
        }

        // Create node
        const nodeResult = await this.pool.query(
          `INSERT INTO public."Nodes" (
            node_type_id, title, props, meta
          ) VALUES ($1, $2, $3, $4)
          RETURNING id`,
          [
            nodeTypeId,
            entity.value,
            JSON.stringify({
              graphId: graphId,
              source: 'document_processing',
              file_id: sourceFileId,
              entity_type: entity.type,
              confidence: entity.confidence,
              context: entity.context,
              weight: entity.confidence,
            }),
            JSON.stringify({
              auto_generated: true,
              extracted_at: new Date().toISOString(),
            }),
          ]
        );

        const nodeId = nodeResult.rows[0].id;
        createdNodeIds.push(nodeId);

        console.log(`Created node: ${entity.value} (${nodeId})`);

        // Publish vectorization job for the new node
        try {
          await this.messageQueueService.publishVectorizationJob(
            'node',
            nodeId,
            entity.value + (entity.context ? ` ${entity.context}` : '')
          );
        } catch (error) {
          console.warn('Failed to publish vectorization job:', error);
          // Don't fail the whole process if vectorization fails
        }
      } catch (error) {
        console.error(`Error creating node for entity "${entity.value}":`, error);
        // Continue with other entities
      }
    }

    return createdNodeIds;
  }

  /**
   * Generate AI summary of document
   */
  async summarizeDocument(text: string, filename: string): Promise<string> {
    // Truncate text if too long
    const maxLength = 8000;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    const prompt = `Summarize the following document in 3-5 concise paragraphs. Focus on:
1. Main topic and purpose
2. Key findings or arguments
3. Important people, places, or events mentioned
4. Overall significance or conclusions

Document: ${filename}

Text:
${truncatedText}

Provide a clear, factual summary.`;

    try {
      const summary = await this.aiService['callOllama'](
        [
          {
            role: 'system',
            content: 'You are a professional document analyst. Create clear, concise summaries that capture the essence of documents.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        800
      );

      return summary || 'Unable to generate summary.';
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate AI summary');
    }
  }

  /**
   * Queue document for async processing
   */
  async queueDocumentProcessing(
    fileId: string,
    filePath: string,
    options: any
  ): Promise<void> {
    // For now, just call processDocument directly
    // In future, this could publish to RabbitMQ for true async processing
    console.log('Queuing document processing (synchronous mode)');

    // Run in background (don't await)
    this.processDocument(fileId, filePath, options)
      .then(() => console.log(`Background processing completed for ${fileId}`))
      .catch((error) => console.error(`Background processing failed for ${fileId}:`, error));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get file metadata from database
   */
  private async getFileMetadata(fileId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT * FROM public."EvidenceFiles" WHERE id = $1 AND deleted_at IS NULL`,
      [fileId]
    );

    return result.rows[0];
  }

  /**
   * Update file processing status
   */
  private async updateFileProcessingStatus(
    fileId: string,
    status: string,
    error?: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE public."EvidenceFiles"
       SET processing_status = $1, processing_error = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, error, fileId]
    );
  }

  /**
   * Store extracted text in database
   */
  private async storeExtractedText(fileId: string, text: string): Promise<void> {
    // Store in a separate table or JSONB field
    await this.pool.query(
      `INSERT INTO public."DocumentProcessingResults" (
        file_id, extracted_text, extracted_at
      ) VALUES ($1, $2, NOW())
      ON CONFLICT (file_id) DO UPDATE
      SET extracted_text = EXCLUDED.extracted_text, extracted_at = NOW()`,
      [fileId, text]
    );

    console.log(`Stored ${text.length} characters of extracted text`);
  }

  /**
   * Store document summary
   */
  private async storeSummary(fileId: string, summary: string): Promise<void> {
    await this.pool.query(
      `UPDATE public."DocumentProcessingResults"
       SET summary = $1, summary_generated_at = NOW()
       WHERE file_id = $2`,
      [summary, fileId]
    );
  }

  /**
   * Get node type mapping for a graph's methodology
   */
  private async getNodeTypeMapping(graphId: string): Promise<Record<string, string>> {
    // Get graph's methodology
    const graphResult = await this.pool.query(
      `SELECT methodology FROM public."Graphs" WHERE id = $1`,
      [graphId]
    );

    if (graphResult.rows.length === 0) {
      return {};
    }

    const methodologyName = graphResult.rows[0].methodology;

    if (!methodologyName) {
      // No methodology, return empty mapping
      return {};
    }

    // Get methodology node types
    const nodeTypesResult = await this.pool.query(
      `SELECT mnt.id, mnt.name
       FROM public."MethodologyNodeTypes" mnt
       INNER JOIN public."Methodologies" m ON mnt.methodology_id = m.id
       WHERE m.name = $1`,
      [methodologyName]
    );

    const mapping: Record<string, string> = {};

    // Create mappings based on entity types to node types
    for (const row of nodeTypesResult.rows) {
      const nodeTypeName = row.name.toLowerCase();

      if (nodeTypeName.includes('person') || nodeTypeName.includes('suspect') || nodeTypeName.includes('witness')) {
        mapping.person = row.id;
      } else if (nodeTypeName.includes('organization') || nodeTypeName.includes('group')) {
        mapping.organization = row.id;
      } else if (nodeTypeName.includes('location') || nodeTypeName.includes('place')) {
        mapping.location = row.id;
      } else if (nodeTypeName.includes('event') || nodeTypeName.includes('incident')) {
        mapping.event = row.id;
      } else if (nodeTypeName.includes('date') || nodeTypeName.includes('timeline')) {
        mapping.date = row.id;
      } else if (nodeTypeName.includes('concept') || nodeTypeName.includes('evidence') || nodeTypeName.includes('claim')) {
        mapping.concept = row.id;
      }
    }

    // If no specific mappings, use first available node type for all entities
    if (Object.keys(mapping).length === 0 && nodeTypesResult.rows.length > 0) {
      const defaultNodeTypeId = nodeTypesResult.rows[0].id;
      mapping.person = defaultNodeTypeId;
      mapping.organization = defaultNodeTypeId;
      mapping.location = defaultNodeTypeId;
      mapping.event = defaultNodeTypeId;
      mapping.date = defaultNodeTypeId;
      mapping.concept = defaultNodeTypeId;
    }

    return mapping;
  }
}
