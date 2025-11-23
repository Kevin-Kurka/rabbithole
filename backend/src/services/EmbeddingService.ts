import OpenAI from 'openai';
import axios from 'axios';
import { config } from '../config';

/**
 * EmbeddingService
 *
 * Handles all vector embedding generation using either OpenAI or Ollama.
 * This service provides semantic search capabilities with configurable providers.
 *
 * Features:
 * - Support for OpenAI (1536-dim) and Ollama (768-dim nomic-embed-text)
 * - Automatic retry with exponential backoff
 * - Rate limiting protection
 * - Error handling with detailed logging
 * - Input validation and sanitization
 */

export interface EmbeddingResult {
  vector: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingError {
  message: string;
  code?: string;
  retryable: boolean;
}

type EmbeddingProvider = 'openai' | 'ollama';

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private client?: OpenAI;
  private model: string;
  private maxRetries: number;
  private ollamaUrl: string;
  private expectedDimension: number;

  constructor() {
    // Determine provider based on API key availability
    if (config.openai.apiKey && config.openai.apiKey !== 'sk-your-api-key-here') {
      this.provider = 'openai';
      this.client = new OpenAI({
        apiKey: config.openai.apiKey,
        timeout: config.openai.timeout,
        maxRetries: 0, // We handle retries manually for better control
      });
      this.model = config.openai.embeddingModel;
      this.expectedDimension = 1536; // OpenAI text-embedding-3-large
      console.log(`✓ EmbeddingService initialized with OpenAI (${this.model})`);
    } else {
      // Fall back to Ollama
      this.provider = 'ollama';
      this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      this.model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
      this.expectedDimension = 768; // nomic-embed-text dimension
      console.log(`✓ EmbeddingService initialized with Ollama (${this.model}) at ${this.ollamaUrl}`);
    }

    this.maxRetries = config.openai.maxRetries;
  }

  /**
   * Generates a vector embedding for the given text
   *
   * @param text - The text content to embed
   * @returns Promise<EmbeddingResult> - The embedding vector and metadata
   * @throws Error if embedding generation fails after all retries
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Text input must be a non-empty string');
    }

    // Trim and validate text length
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      throw new Error('Text input cannot be empty after trimming');
    }

    // Warn if text is very long
    if (trimmedText.length > 30000) {
      console.warn(`Text length (${trimmedText.length} chars) may exceed token limit. Consider chunking.`);
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        const startTime = Date.now();

        let result: EmbeddingResult;

        if (this.provider === 'openai') {
          result = await this.generateOpenAIEmbedding(trimmedText);
        } else {
          result = await this.generateOllamaEmbedding(trimmedText);
        }

        const duration = Date.now() - startTime;
        console.log(
          `✓ Generated embedding in ${duration}ms ` +
          `(provider: ${this.provider}, model: ${result.model})`
        );

        return result;
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Determine if error is retryable
        const isRetryable = this.isRetryableError(error);

        // Log the error
        console.error(
          `✗ Embedding generation failed (attempt ${attempt}/${this.maxRetries + 1}): ${error.message}`
        );

        if (!isRetryable || attempt > this.maxRetries) {
          // Don't retry non-retryable errors or if we've exhausted retries
          break;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    const errorMessage = lastError?.message || 'Unknown error';
    throw new Error(`Failed to generate embedding after ${attempt} attempts: ${errorMessage}`);
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      encoding_format: 'float',
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('OpenAI API returned no embedding data');
    }

    const embedding = response.data[0];

    // Validate embedding dimension
    if (embedding.embedding.length !== this.expectedDimension) {
      throw new Error(
        `Expected ${this.expectedDimension}-dimension vector, got ${embedding.embedding.length} dimensions`
      );
    }

    return {
      vector: embedding.embedding,
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  /**
   * Generate embedding using Ollama
   */
  private async generateOllamaEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
      model: this.model,
      prompt: text,
    });

    if (!response.data || !response.data.embedding) {
      throw new Error('Ollama API returned no embedding data');
    }

    const embedding = response.data.embedding;

    // Validate embedding dimension
    if (embedding.length !== this.expectedDimension) {
      throw new Error(
        `Expected ${this.expectedDimension}-dimension vector, got ${embedding.length} dimensions`
      );
    }

    return {
      vector: embedding,
      model: this.model,
      usage: {
        promptTokens: Math.ceil(text.length / 4), // Rough estimate
        totalTokens: Math.ceil(text.length / 4),
      },
    };
  }

  /**
   * Batch generates embeddings for multiple texts
   *
   * @param texts - Array of text strings to embed
   * @returns Promise<EmbeddingResult[]> - Array of embedding results
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts input must be a non-empty array');
    }

    // OpenAI allows up to 2048 inputs per request, but we'll be conservative
    const batchSize = 100;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
          encoding_format: 'float',
        });

        // Process each embedding in the batch
        response.data.forEach((embedding) => {
          results.push({
            vector: embedding.embedding,
            model: response.model,
            usage: {
              promptTokens: response.usage.prompt_tokens / batch.length, // Approximate per-text usage
              totalTokens: response.usage.total_tokens / batch.length,
            },
          });
        });
      } catch (error: any) {
        console.error(`Failed to process batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        // Process individually on batch failure
        for (const text of batch) {
          try {
            const result = await this.generateEmbedding(text);
            results.push(result);
          } catch (individualError: any) {
            console.error(`Failed to embed individual text: ${individualError.message}`);
            throw individualError;
          }
        }
      }

      // Rate limiting: small delay between batches
      if (i + batchSize < texts.length) {
        await this.sleep(100);
      }
    }

    return results;
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // OpenAI specific retryable errors
    if (error.status) {
      // Rate limit errors (429)
      if (error.status === 429) {
        return true;
      }

      // Server errors (500, 502, 503, 504)
      if (error.status >= 500 && error.status < 600) {
        return true;
      }

      // Client errors are not retryable (400, 401, 403, etc.)
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check to verify OpenAI API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateEmbedding('health check');
      return true;
    } catch (error: any) {
      console.error(`EmbeddingService health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract text content from props and ai fields for embedding
   * This method combines relevant textual data from a node or edge
   */
  static extractTextForEmbedding(data: {
    props?: any;
    ai?: any;
    name?: string;
    description?: string;
  }): string {
    const textParts: string[] = [];

    // Add name if present
    if (data.name) {
      textParts.push(data.name);
    }

    // Add description if present
    if (data.description) {
      textParts.push(data.description);
    }

    // Extract text from props
    if (data.props && typeof data.props === 'object') {
      const propsText = this.extractTextFromObject(data.props);
      if (propsText) {
        textParts.push(propsText);
      }
    }

    const combinedText = textParts.join(' ').trim();

    if (!combinedText) {
      throw new Error('No text content found to generate embedding');
    }

    return combinedText;
  }

  /**
   * Recursively extract text from object properties
   */
  private static extractTextFromObject(obj: any, maxDepth: number = 3): string {
    if (maxDepth <= 0) return '';

    const textParts: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      // Skip null/undefined
      if (value === null || value === undefined) continue;

      // Handle strings
      if (typeof value === 'string') {
        textParts.push(`${key}: ${value}`);
      }
      // Handle numbers and booleans
      else if (typeof value === 'number' || typeof value === 'boolean') {
        textParts.push(`${key}: ${value}`);
      }
      // Handle nested objects
      else if (typeof value === 'object' && !Array.isArray(value)) {
        const nestedText = this.extractTextFromObject(value, maxDepth - 1);
        if (nestedText) {
          textParts.push(nestedText);
        }
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        const arrayText = value
          .filter(item => typeof item === 'string' || typeof item === 'number')
          .join(', ');
        if (arrayText) {
          textParts.push(`${key}: ${arrayText}`);
        }
      }
    }

    return textParts.join(' ');
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
