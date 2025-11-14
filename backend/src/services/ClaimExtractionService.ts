import axios from 'axios';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import { embeddingService } from './EmbeddingService';
import { DoclingProcessingResult } from './DoclingProcessingService';

/**
 * ClaimExtractionService
 *
 * Advanced service for extracting verifiable claims from documents,
 * matching claims to existing knowledge graph nodes, identifying
 * primary sources, detecting duplicates, and scoring credibility.
 *
 * Features:
 * - AI-powered claim extraction using Ollama
 * - Semantic similarity matching with pgvector
 * - Citation and source reference detection
 * - Content deduplication via hashing and similarity
 * - Multi-factor credibility scoring
 * - Support for multiple document formats via Docling
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExtractedClaim {
  id: string;
  text: string;
  supportingEvidence: string[];
  confidence: number; // 0.0-1.0: AI's confidence in extracting this as a claim
  sourceLocation?: {
    page?: number;
    section?: string;
    paragraph?: number;
  };
  claimType?: 'factual' | 'statistical' | 'causal' | 'predictive' | 'normative';
  keywords: string[];
}

export interface NodeMatch {
  nodeId: string;
  title: string;
  similarity: number; // 0.0-1.0: Cosine similarity score
  nodeType?: string;
  props: any;
  isLevel0: boolean;
  matchReason: 'semantic' | 'keyword' | 'exact';
}

export interface PrimarySource {
  title?: string;
  author?: string;
  publicationDate?: Date;
  sourceType: 'book' | 'article' | 'report' | 'website' | 'dataset' | 'interview' | 'unknown';
  citation?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  confidence: number; // 0.0-1.0: Confidence in source extraction
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  matchedNodeId?: string;
  matchScore?: number; // 0.0-1.0: Similarity to existing content
  duplicateType?: 'exact' | 'near' | 'semantic';
  contentHash?: string;
}

export interface CredibilityScore {
  overall: number; // 0.0-1.0: Overall credibility
  factors: {
    sourceType: number; // Weight based on source type (peer-reviewed > blog)
    citationCount: number; // Number of citations found
    verificationStatus: number; // Has the claim been verified?
    consensusLevel: number; // Do multiple sources agree?
    recency: number; // How recent is the information?
    authorCredibility: number; // Known author reputation
  };
  reasoning: string; // Human-readable explanation
}

export interface ClaimExtractionResult {
  claims: ExtractedClaim[];
  primarySources: PrimarySource[];
  documentMetadata: {
    title?: string;
    author?: string;
    publicationDate?: Date;
    pageCount: number;
    wordCount: number;
    contentHash: string;
  };
  processingTime: number;
  error?: string;
}

export interface ClaimMatchingResult {
  claim: ExtractedClaim;
  matches: NodeMatch[];
  suggestedAction: 'create_new' | 'link_existing' | 'merge' | 'update';
  confidence: number;
}

// ============================================================================
// ClaimExtractionService Class
// ============================================================================

export class ClaimExtractionService {
  private ollamaUrl: string;
  private model: string;
  private embeddingModel: string;
  private maxRetries: number;
  private similarityThreshold: number;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
    this.embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
    this.maxRetries = 3;
    this.similarityThreshold = 0.75; // Cosine similarity threshold for matches

    console.log(
      `✓ ClaimExtractionService initialized with Ollama (${this.model}) at ${this.ollamaUrl}`
    );
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Extract all verifiable claims from document text
   *
   * @param documentText - Raw text content from document
   * @param metadata - Document metadata from Docling
   * @returns Promise<ClaimExtractionResult>
   */
  async extractClaims(
    documentText: string,
    metadata?: Partial<DoclingProcessingResult>
  ): Promise<ClaimExtractionResult> {
    const startTime = Date.now();

    try {
      console.log(`Extracting claims from document (${documentText.length} chars)`);

      // Validate input
      if (!documentText || documentText.trim().length === 0) {
        throw new Error('Document text cannot be empty');
      }

      // Generate content hash
      const contentHash = this.generateContentHash(documentText);

      // Chunk document if too large (LLM context window limits)
      const chunks = this.chunkDocument(documentText, 8000);
      console.log(`Document split into ${chunks.length} chunk(s) for processing`);

      // Extract claims from each chunk
      const allClaims: ExtractedClaim[] = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);
        const chunkClaims = await this.extractClaimsFromChunk(chunks[i], i);
        allClaims.push(...chunkClaims);
      }

      // Extract primary sources
      const primarySources = await this.identifyPrimarySources(documentText);

      // Calculate word count
      const wordCount = documentText.split(/\s+/).filter(w => w.length > 0).length;

      const result: ClaimExtractionResult = {
        claims: allClaims,
        primarySources,
        documentMetadata: {
          title: metadata?.metadata?.title,
          author: metadata?.metadata?.author,
          publicationDate: metadata?.metadata?.creationDate
            ? new Date(metadata.metadata.creationDate)
            : undefined,
          pageCount: metadata?.pageCount || 0,
          wordCount,
          contentHash,
        },
        processingTime: Date.now() - startTime,
      };

      console.log(
        `✓ Extracted ${allClaims.length} claims and ${primarySources.length} sources in ${result.processingTime}ms`
      );

      return result;
    } catch (error: any) {
      console.error(`✗ Claim extraction failed: ${error.message}`);
      return {
        claims: [],
        primarySources: [],
        documentMetadata: {
          pageCount: 0,
          wordCount: 0,
          contentHash: this.generateContentHash(documentText),
        },
        processingTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Match extracted claims to existing nodes in the knowledge graph
   *
   * @param claims - Array of extracted claims
   * @param pool - PostgreSQL connection pool
   * @param graphId - Optional: limit search to specific graph
   * @returns Promise<ClaimMatchingResult[]>
   */
  async matchClaimsToNodes(
    claims: ExtractedClaim[],
    pool: Pool,
    graphId?: string
  ): Promise<ClaimMatchingResult[]> {
    console.log(`Matching ${claims.length} claims to existing nodes`);

    const results: ClaimMatchingResult[] = [];

    for (const claim of claims) {
      try {
        // Generate embedding for claim text
        const embedding = await embeddingService.generateEmbedding(claim.text);

        // Search for similar nodes using pgvector
        const matches = await this.findSimilarNodes(
          pool,
          embedding.vector,
          claim.keywords,
          graphId
        );

        // Determine suggested action based on matches
        let suggestedAction: ClaimMatchingResult['suggestedAction'] = 'create_new';
        let confidence = 0.5;

        if (matches.length > 0) {
          const topMatch = matches[0];

          if (topMatch.similarity > 0.95) {
            suggestedAction = 'merge';
            confidence = topMatch.similarity;
          } else if (topMatch.similarity > this.similarityThreshold) {
            suggestedAction = 'link_existing';
            confidence = topMatch.similarity;
          } else if (topMatch.similarity > 0.6) {
            suggestedAction = 'update';
            confidence = topMatch.similarity * 0.8;
          }
        }

        results.push({
          claim,
          matches,
          suggestedAction,
          confidence,
        });
      } catch (error: any) {
        console.error(`Failed to match claim: ${error.message}`);
        results.push({
          claim,
          matches: [],
          suggestedAction: 'create_new',
          confidence: 0.3,
        });
      }
    }

    console.log(`✓ Matched claims: ${results.length} results`);
    return results;
  }

  /**
   * Identify primary sources and citations within document
   *
   * @param documentText - Document text content
   * @returns Promise<PrimarySource[]>
   */
  async identifyPrimarySources(documentText: string): Promise<PrimarySource[]> {
    console.log('Identifying primary sources and citations');

    try {
      // Use AI to extract structured citations
      const prompt = `Analyze this document and extract all primary sources, citations, and references.
For each source found, provide:
- title
- author
- publication_date (ISO format if available)
- source_type (book, article, report, website, dataset, interview, or unknown)
- citation (full citation text)
- url (if mentioned)
- doi (if mentioned)
- isbn (if mentioned)

Format as JSON array. Be thorough and extract ALL citations.

Document text:
${documentText.substring(0, 12000)} ${documentText.length > 12000 ? '...(truncated)' : ''}`;

      const response = await this.callOllama([
        {
          role: 'system',
          content:
            'You are an expert bibliographic assistant. Extract ALL citations and references from documents. Return only valid JSON array format.',
        },
        { role: 'user', content: prompt },
      ]);

      // Parse JSON response
      const sources = this.parseSourcesFromResponse(response);

      // Also use regex-based extraction as fallback/supplement
      const regexSources = this.extractSourcesWithRegex(documentText);

      // Merge and deduplicate
      const allSources = this.deduplicateSources([...sources, ...regexSources]);

      console.log(`✓ Identified ${allSources.length} primary sources`);
      return allSources;
    } catch (error: any) {
      console.error(`Source identification failed: ${error.message}`);
      // Fallback to regex-only extraction
      return this.extractSourcesWithRegex(documentText);
    }
  }

  /**
   * Check if document content already exists in the system
   *
   * @param fileHash - SHA-256 hash of file content
   * @param content - Document text content
   * @param pool - PostgreSQL connection pool
   * @returns Promise<DuplicateCheck>
   */
  async checkForDuplicates(
    fileHash: string,
    content: string,
    pool: Pool
  ): Promise<DuplicateCheck> {
    console.log(`Checking for duplicates (hash: ${fileHash.substring(0, 16)}...)`);

    try {
      // 1. Check for exact hash match in metadata
      const exactMatch = await pool.query(
        `SELECT n.id, n.title, n.props->>'content_hash' as content_hash
         FROM public."Nodes" n
         WHERE n.meta->>'content_hash' = $1
         LIMIT 1`,
        [fileHash]
      );

      if (exactMatch.rows.length > 0) {
        return {
          isDuplicate: true,
          matchedNodeId: exactMatch.rows[0].id,
          matchScore: 1.0,
          duplicateType: 'exact',
          contentHash: fileHash,
        };
      }

      // 2. Check for semantic similarity using embeddings
      const embedding = await embeddingService.generateEmbedding(
        content.substring(0, 5000) // Use first 5000 chars for comparison
      );

      const semanticMatch = await pool.query(
        `SELECT n.id, n.title, 1 - (n.ai <=> $1::vector) as similarity
         FROM public."Nodes" n
         WHERE n.ai IS NOT NULL
         ORDER BY n.ai <=> $1::vector
         LIMIT 1`,
        [JSON.stringify(embedding.vector)]
      );

      if (semanticMatch.rows.length > 0) {
        const similarity = parseFloat(semanticMatch.rows[0].similarity);

        if (similarity > 0.95) {
          return {
            isDuplicate: true,
            matchedNodeId: semanticMatch.rows[0].id,
            matchScore: similarity,
            duplicateType: 'near',
            contentHash: fileHash,
          };
        } else if (similarity > 0.85) {
          return {
            isDuplicate: true,
            matchedNodeId: semanticMatch.rows[0].id,
            matchScore: similarity,
            duplicateType: 'semantic',
            contentHash: fileHash,
          };
        }
      }

      return {
        isDuplicate: false,
        contentHash: fileHash,
      };
    } catch (error: any) {
      console.error(`Duplicate check failed: ${error.message}`);
      return {
        isDuplicate: false,
        contentHash: fileHash,
      };
    }
  }

  /**
   * Score claim credibility based on multiple factors
   *
   * @param claim - Extracted claim
   * @param sources - Associated primary sources
   * @param pool - PostgreSQL connection pool
   * @returns Promise<CredibilityScore>
   */
  async scoreCredibility(
    claim: ExtractedClaim,
    sources: PrimarySource[],
    pool?: Pool
  ): Promise<CredibilityScore> {
    console.log(`Scoring credibility for claim: "${claim.text.substring(0, 50)}..."`);

    // Calculate individual factors
    const sourceType = this.scoreSourceType(sources);
    const citationCount = Math.min(sources.length / 3, 1.0); // Normalize to 0-1
    const verificationStatus = claim.confidence; // Use AI's confidence as proxy
    const consensusLevel = this.scoreConsensusLevel(sources);
    const recency = this.scoreRecency(sources);
    const authorCredibility = this.scoreAuthorCredibility(sources);

    // Weighted average (adjust weights as needed)
    const weights = {
      sourceType: 0.25,
      citationCount: 0.15,
      verificationStatus: 0.20,
      consensusLevel: 0.20,
      recency: 0.10,
      authorCredibility: 0.10,
    };

    const overall =
      sourceType * weights.sourceType +
      citationCount * weights.citationCount +
      verificationStatus * weights.verificationStatus +
      consensusLevel * weights.consensusLevel +
      recency * weights.recency +
      authorCredibility * weights.authorCredibility;

    // Generate reasoning
    const reasoning = this.generateCredibilityReasoning(
      overall,
      {
        sourceType,
        citationCount,
        verificationStatus,
        consensusLevel,
        recency,
        authorCredibility,
      },
      sources
    );

    return {
      overall: Math.min(Math.max(overall, 0), 1), // Clamp to 0-1
      factors: {
        sourceType,
        citationCount,
        verificationStatus,
        consensusLevel,
        recency,
        authorCredibility,
      },
      reasoning,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Call Ollama API with retry logic
   */
  private async callOllama(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number = 2000
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.ollamaUrl}/api/chat`,
          {
            model: this.model,
            messages,
            stream: false,
            options: {
              temperature: 0.3, // Lower temperature for factual extraction
              num_predict: maxTokens,
            },
          },
          {
            timeout: 120000, // 2 minute timeout
          }
        );

        return response.data.message.content;
      } catch (error: any) {
        lastError = error;
        console.warn(`Ollama request failed (attempt ${attempt + 1}/${this.maxRetries})`);

        if (error.code === 'ECONNREFUSED') {
          throw new Error(
            'Ollama is not running. Please start Ollama with: ollama serve'
          );
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw new Error(
      `Ollama API failed after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Extract claims from a single text chunk
   */
  private async extractClaimsFromChunk(
    chunk: string,
    chunkIndex: number
  ): Promise<ExtractedClaim[]> {
    const prompt = `Analyze this document excerpt and extract all verifiable factual claims.

For each claim, provide:
- claim_text: The actual claim statement
- supporting_evidence: Array of text snippets that support this claim
- confidence: Your confidence level (0.0-1.0) that this is a verifiable claim
- claim_type: One of: factual, statistical, causal, predictive, normative
- keywords: Array of key terms related to this claim

Format as JSON array. Only extract claims that can be verified through evidence.

Document excerpt:
${chunk}`;

    try {
      const response = await this.callOllama([
        {
          role: 'system',
          content:
            'You are an expert fact-checker and claim extraction specialist. Extract ONLY verifiable claims. Return valid JSON array format.',
        },
        { role: 'user', content: prompt },
      ]);

      return this.parseClaimsFromResponse(response, chunkIndex);
    } catch (error: any) {
      console.error(`Failed to extract claims from chunk ${chunkIndex}: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse claims from AI response
   */
  private parseClaimsFromResponse(
    response: string,
    chunkIndex: number
  ): ExtractedClaim[] {
    try {
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in AI response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item: any, index: number) => ({
        id: `claim-${chunkIndex}-${index}`,
        text: item.claim_text || item.text || '',
        supportingEvidence: Array.isArray(item.supporting_evidence)
          ? item.supporting_evidence
          : [],
        confidence: parseFloat(item.confidence) || 0.5,
        claimType: item.claim_type || 'factual',
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        sourceLocation: {
          paragraph: chunkIndex,
        },
      }));
    } catch (error: any) {
      console.error(`Failed to parse claims: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse sources from AI response
   */
  private parseSourcesFromResponse(response: string): PrimarySource[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item: any) => ({
        title: item.title || undefined,
        author: item.author || undefined,
        publicationDate: item.publication_date
          ? new Date(item.publication_date)
          : undefined,
        sourceType: item.source_type || 'unknown',
        citation: item.citation || undefined,
        url: item.url || undefined,
        doi: item.doi || undefined,
        isbn: item.isbn || undefined,
        confidence: 0.7, // AI-extracted sources
      }));
    } catch (error: any) {
      console.error(`Failed to parse sources: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract sources using regex patterns (fallback method)
   */
  private extractSourcesWithRegex(text: string): PrimarySource[] {
    const sources: PrimarySource[] = [];

    // DOI pattern
    const doiRegex = /\b(10\.\d{4,}\/[^\s]+)\b/g;
    const dois = text.match(doiRegex);
    if (dois) {
      dois.forEach(doi => {
        sources.push({
          sourceType: 'article',
          doi,
          confidence: 0.9, // High confidence for DOI
        });
      });
    }

    // URL pattern
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex);
    if (urls) {
      urls.slice(0, 10).forEach(url => {
        // Limit to first 10
        sources.push({
          sourceType: 'website',
          url,
          confidence: 0.6,
        });
      });
    }

    // ISBN pattern
    const isbnRegex = /ISBN[:\s]*([\d-]{10,17})/gi;
    const isbns = text.match(isbnRegex);
    if (isbns) {
      isbns.forEach(isbn => {
        sources.push({
          sourceType: 'book',
          isbn: isbn.replace(/ISBN[:\s]*/i, ''),
          confidence: 0.9,
        });
      });
    }

    return sources;
  }

  /**
   * Deduplicate sources based on DOI, URL, or title similarity
   */
  private deduplicateSources(sources: PrimarySource[]): PrimarySource[] {
    const seen = new Set<string>();
    const unique: PrimarySource[] = [];

    for (const source of sources) {
      // Create unique key based on available identifiers
      const key =
        source.doi ||
        source.isbn ||
        source.url ||
        (source.title ? source.title.toLowerCase().trim() : Math.random().toString());

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(source);
      }
    }

    return unique;
  }

  /**
   * Find similar nodes using vector similarity search
   */
  private async findSimilarNodes(
    pool: Pool,
    embedding: number[],
    keywords: string[],
    graphId?: string
  ): Promise<NodeMatch[]> {
    try {
      // Build query with optional graph filter
      const graphFilter = graphId ? `AND n.graph_id = $2` : '';
      const params = graphId
        ? [JSON.stringify(embedding), graphId]
        : [JSON.stringify(embedding)];

      const result = await pool.query(
        `SELECT
          n.id,
          n.title,
          n.node_type_id,
          n.props,
          n.is_level_0,
          mnt.name as node_type,
          1 - (n.ai <=> $1::vector) as similarity
         FROM public."Nodes" n
         LEFT JOIN public."MethodologyNodeTypes" mnt ON n.node_type_id = mnt.id
         WHERE n.ai IS NOT NULL ${graphFilter}
         ORDER BY n.ai <=> $1::vector
         LIMIT 10`,
        params
      );

      return result.rows.map(row => ({
        nodeId: row.id,
        title: row.title,
        similarity: parseFloat(row.similarity),
        nodeType: row.node_type,
        props: typeof row.props === 'string' ? JSON.parse(row.props) : row.props,
        isLevel0: row.is_level_0,
        matchReason: 'semantic',
      }));
    } catch (error: any) {
      console.error(`Failed to find similar nodes: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate SHA-256 hash of content
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Chunk document into smaller pieces for processing
   */
  private chunkDocument(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);

    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Score source type (higher = more credible)
   */
  private scoreSourceType(sources: PrimarySource[]): number {
    if (sources.length === 0) return 0.3;

    const typeScores = {
      article: 0.9, // Peer-reviewed articles
      report: 0.85, // Official reports
      book: 0.8,
      dataset: 0.75,
      interview: 0.6,
      website: 0.4,
      unknown: 0.3,
    };

    const avgScore =
      sources.reduce((sum, s) => sum + (typeScores[s.sourceType] || 0.3), 0) /
      sources.length;

    return avgScore;
  }

  /**
   * Score consensus level across sources
   */
  private scoreConsensusLevel(sources: PrimarySource[]): number {
    // More sources = higher consensus (up to a point)
    if (sources.length === 0) return 0.2;
    if (sources.length === 1) return 0.4;
    if (sources.length === 2) return 0.6;
    if (sources.length >= 3) return 0.8;
    return 0.8;
  }

  /**
   * Score recency of sources
   */
  private scoreRecency(sources: PrimarySource[]): number {
    if (sources.length === 0) return 0.5;

    const currentYear = new Date().getFullYear();
    let totalScore = 0;
    let count = 0;

    for (const source of sources) {
      if (source.publicationDate) {
        const age = currentYear - source.publicationDate.getFullYear();
        const score = Math.max(0, 1 - age / 20); // Linearly decay over 20 years
        totalScore += score;
        count++;
      }
    }

    return count > 0 ? totalScore / count : 0.5;
  }

  /**
   * Score author credibility (placeholder - could be enhanced with author database)
   */
  private scoreAuthorCredibility(sources: PrimarySource[]): number {
    // Basic heuristic: presence of author information
    const withAuthors = sources.filter(s => s.author).length;
    return sources.length > 0 ? withAuthors / sources.length : 0.5;
  }

  /**
   * Generate human-readable credibility reasoning
   */
  private generateCredibilityReasoning(
    overall: number,
    factors: CredibilityScore['factors'],
    sources: PrimarySource[]
  ): string {
    const parts: string[] = [];

    if (overall > 0.8) {
      parts.push('This claim has high credibility.');
    } else if (overall > 0.6) {
      parts.push('This claim has moderate credibility.');
    } else if (overall > 0.4) {
      parts.push('This claim has low-to-moderate credibility.');
    } else {
      parts.push('This claim requires additional verification.');
    }

    if (sources.length > 0) {
      parts.push(`Based on ${sources.length} source(s).`);
    } else {
      parts.push('No primary sources identified.');
    }

    if (factors.sourceType > 0.8) {
      parts.push('Sources are high-quality (peer-reviewed/official).');
    } else if (factors.sourceType < 0.5) {
      parts.push('Sources may lack rigorous verification.');
    }

    if (factors.consensusLevel > 0.7) {
      parts.push('Multiple sources support this claim.');
    } else if (factors.consensusLevel < 0.5) {
      parts.push('Limited corroboration from multiple sources.');
    }

    return parts.join(' ');
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const claimExtractionService = new ClaimExtractionService();
