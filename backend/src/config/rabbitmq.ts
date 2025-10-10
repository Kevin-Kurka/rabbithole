/**
 * RabbitMQ Configuration
 *
 * Centralized configuration for RabbitMQ connection and queue settings.
 * Configuration values are loaded from environment variables with sensible defaults.
 */

/**
 * RabbitMQ connection URL
 * Default: amqp://localhost
 */
export const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

/**
 * Name of the queue for vectorization jobs
 * Default: vectorization_jobs
 */
export const VECTORIZATION_QUEUE_NAME = process.env.VECTORIZATION_QUEUE_NAME || 'vectorization_jobs';

/**
 * Connection retry configuration
 */
export const RABBITMQ_RETRY_CONFIG = {
  /**
   * Maximum number of connection retry attempts
   */
  maxRetries: parseInt(process.env.RABBITMQ_MAX_RETRIES || '10'),

  /**
   * Initial delay between retry attempts in milliseconds
   */
  retryDelayMs: parseInt(process.env.RABBITMQ_RETRY_DELAY_MS || '3000'),

  /**
   * Maximum delay between retry attempts in milliseconds
   */
  maxRetryDelayMs: parseInt(process.env.RABBITMQ_MAX_RETRY_DELAY_MS || '30000'),
};

/**
 * Queue configuration options
 */
export const QUEUE_OPTIONS = {
  /**
   * Queue will survive broker restart
   */
  durable: true,

  /**
   * Queue won't be deleted when last consumer unsubscribes
   */
  autoDelete: false,
};

/**
 * Consumer configuration options
 */
export const CONSUMER_OPTIONS = {
  /**
   * Messages will be acknowledged manually
   */
  noAck: false,

  /**
   * Fair dispatch - one message at a time to each consumer
   */
  prefetch: 1,
};
