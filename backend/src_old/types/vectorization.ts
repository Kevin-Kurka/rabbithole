/**
 * Vectorization Job Types
 *
 * Defines the structure for vectorization jobs and results used in the
 * message queue pipeline for node and edge content vectorization.
 */

/**
 * Represents a vectorization job to be processed
 */
export interface VectorizationJob {
  /**
   * Type of entity to vectorize
   */
  entityType: 'node' | 'edge';

  /**
   * Unique identifier of the entity
   */
  entityId: string;

  /**
   * Content to be vectorized
   */
  content: string;

  /**
   * Timestamp when job was created
   */
  timestamp: number;

  /**
   * Optional metadata for additional context
   */
  metadata?: {
    graphId?: string;
    userId?: string;
    priority?: 'low' | 'normal' | 'high';
  };
}

/**
 * Represents the result of a vectorization operation
 */
export interface VectorizationResult {
  /**
   * Type of entity that was vectorized
   */
  entityType: 'node' | 'edge';

  /**
   * Unique identifier of the entity
   */
  entityId: string;

  /**
   * Generated embedding vector
   */
  embedding: number[];

  /**
   * Timestamp when vectorization completed
   */
  timestamp: number;

  /**
   * Indicates if vectorization was successful
   */
  success: boolean;

  /**
   * Error message if vectorization failed
   */
  error?: string;

  /**
   * Additional metadata about the vectorization process
   */
  metadata?: {
    model?: string;
    dimensions?: number;
    processingTimeMs?: number;
  };
}
