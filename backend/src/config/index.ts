import dotenv from 'dotenv';
dotenv.config();

/**
 * Configuration Module
 *
 * Centralizes all environment variable configuration with sensible defaults
 * and validation. This module should be imported at the start of the application
 * to ensure all required configuration is present.
 */

interface DatabaseConfig {
  url: string;
}

interface RedisConfig {
  host: string;
  port: number;
  url?: string;
}

interface RabbitMQConfig {
  url: string;
  queueName: string;
}

interface OpenAIConfig {
  apiKey: string;
  embeddingModel: string;
  maxRetries: number;
  timeout: number;
}

interface ServerConfig {
  port: number;
  nodeEnv: string;
}

interface AppConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  rabbitmq: RabbitMQConfig;
  openai: OpenAIConfig;
  server: ServerConfig;
}

/**
 * Validates that required environment variables are set
 * Throws an error if critical configuration is missing
 */
function validateConfig(): void {
  const required = [
    'DATABASE_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Main configuration object
 * All configuration values should be accessed through this export
 */
export const config: AppConfig = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rabbithole_db',
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    url: process.env.REDIS_URL,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
    queueName: process.env.VECTORIZATION_QUEUE_NAME || 'vectorization_queue',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10), // 30 seconds
  },

  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};

// Validate configuration on module load
validateConfig();

// Log configuration (sanitized) in development
if (config.server.nodeEnv === 'development') {
  console.log('Configuration loaded:');
  console.log(`- Database: ${config.database.url.replace(/:([^@]+)@/, ':***@')}`);
  console.log(`- Redis: ${config.redis.host}:${config.redis.port}`);
  console.log(`- RabbitMQ: ${config.rabbitmq.url.replace(/:([^@]+)@/, ':***@')}`);
  console.log(`- OpenAI: ${config.openai.apiKey ? '✓ API Key configured' : '✗ API Key missing'}`);
  console.log(`- OpenAI Model: ${config.openai.embeddingModel}`);
  console.log(`- Queue: ${config.rabbitmq.queueName}`);
}

export default config;
