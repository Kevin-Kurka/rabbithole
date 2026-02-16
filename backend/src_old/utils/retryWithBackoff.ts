/**
 * Retry Utility with Exponential Backoff
 *
 * Provides retry logic with exponential backoff for handling transient failures
 * in external API calls, database operations, and network requests.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry attempts
 * - Custom retry conditions
 * - Circuit breaker pattern support
 * - Comprehensive error logging
 */

export interface RetryOptions {
  maxAttempts?: number; // Maximum number of retry attempts (default: 3)
  initialDelayMs?: number; // Initial delay in milliseconds (default: 1000)
  maxDelayMs?: number; // Maximum delay in milliseconds (default: 30000)
  backoffMultiplier?: number; // Backoff multiplier (default: 2)
  jitter?: boolean; // Add random jitter to delays (default: true)
  shouldRetry?: (error: any) => boolean; // Custom retry condition
  onRetry?: (attempt: number, error: any, delayMs: number) => void; // Retry callback
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

/**
 * Default retry condition - retries on network errors and 5xx server errors
 */
const defaultShouldRetry = (error: any): boolean => {
  // Retry on network errors
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNREFUSED'
  ) {
    return true;
  }

  // Retry on 429 (rate limit) and 5xx (server errors)
  if (error.response?.status) {
    const status = error.response.status;
    return status === 429 || (status >= 500 && status < 600);
  }

  // Retry on HTTP status codes in error message
  if (error.message) {
    const statusMatch = error.message.match(/status.*?(429|5\d{2})/i);
    if (statusMatch) {
      return true;
    }
  }

  return false;
};

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise<RetryResult<T>>
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitter = true,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      const totalTimeMs = Date.now() - startTime;

      return {
        success: true,
        result,
        attempts: attempt,
        totalTimeMs,
      };
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const isLastAttempt = attempt === maxAttempts;
      const shouldRetryError = shouldRetry(error);

      if (isLastAttempt || !shouldRetryError) {
        const totalTimeMs = Date.now() - startTime;

        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalTimeMs,
        };
      }

      // Calculate delay with exponential backoff
      const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      const cappedDelay = Math.min(baseDelay, maxDelayMs);

      // Add jitter to prevent thundering herd
      const delayMs = jitter
        ? cappedDelay * (0.5 + Math.random() * 0.5) // 50-100% of calculated delay
        : cappedDelay;

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  const totalTimeMs = Date.now() - startTime;
  return {
    success: false,
    error: lastError || new Error('Max retry attempts reached'),
    attempts: maxAttempts,
    totalTimeMs,
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Circuit Breaker implementation for preventing cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000, // 1 minute
    private successThreshold: number = 2
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;

      if (timeSinceFailure > this.resetTimeoutMs) {
        // Try to close circuit
        this.state = 'half-open';
        console.log('Circuit breaker: half-open (testing)');
      } else {
        throw new Error(`Circuit breaker is open. Retry after ${Math.ceil((this.resetTimeoutMs - timeSinceFailure) / 1000)}s`);
      }
    }

    try {
      const result = await fn();

      // Success - reset failure count
      if (this.state === 'half-open') {
        this.failures = Math.max(0, this.failures - 1);

        if (this.failures === 0) {
          this.state = 'closed';
          console.log('Circuit breaker: closed (recovered)');
        }
      } else {
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        console.error(`Circuit breaker: open (${this.failures} failures)`);
      }

      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}

/**
 * Retry-specific error class
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public originalError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Helper function to wrap a function with retry logic
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = await retryWithBackoff(() => fn(...args), options);

    if (!result.success) {
      throw new RetryError(
        `Failed after ${result.attempts} attempts: ${result.error?.message}`,
        result.attempts,
        result.error!
      );
    }

    return result.result as ReturnType<T>;
  };
}

/**
 * Batch retry with concurrency control
 */
export async function retryBatch<T>(
  items: T[],
  fn: (item: T) => Promise<any>,
  options: RetryOptions & { concurrency?: number } = {}
): Promise<Array<{ item: T; result: RetryResult<any> }>> {
  const { concurrency = 5, ...retryOptions } = options;
  const results: Array<{ item: T; result: RetryResult<any> }> = [];

  // Process in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const result = await retryWithBackoff(() => fn(item), retryOptions);
        return { item, result };
      })
    );

    results.push(...batchResults);
  }

  return results;
}
