import { Pool } from "pg";
import { Redis } from "ioredis";
import { Configuration, ConfigDataType } from "../entities/Configuration";

/**
 * Configuration Service
 * Manages system configurations stored in both PostgreSQL and environment variables
 */
export class ConfigurationService {
  private pool: Pool;
  private redis: Redis;

  // Default configurations with metadata
  private defaultConfigs: Configuration[] = [
    // Database configurations
    {
      key: "DATABASE_URL",
      value: process.env.DATABASE_URL || "postgresql://postgres:password@postgres:5432/rabbithole_db",
      category: "database",
      description: "PostgreSQL connection string",
      dataType: ConfigDataType.STRING,
      isSecret: true,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "DATABASE_MAX_CONNECTIONS",
      value: process.env.DATABASE_MAX_CONNECTIONS || "20",
      category: "database",
      description: "Maximum number of database connections in pool",
      dataType: ConfigDataType.NUMBER,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },

    // Redis configurations
    {
      key: "REDIS_URL",
      value: process.env.REDIS_URL || "redis://redis:6379",
      category: "redis",
      description: "Redis connection URL",
      dataType: ConfigDataType.STRING,
      isSecret: true,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "REDIS_TTL",
      value: process.env.REDIS_TTL || "3600",
      category: "redis",
      description: "Default TTL for Redis cache entries (seconds)",
      dataType: ConfigDataType.NUMBER,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },

    // RabbitMQ configurations
    {
      key: "RABBITMQ_URL",
      value: process.env.RABBITMQ_URL || "amqp://rabbitmq:5672",
      category: "redis",
      description: "RabbitMQ connection URL",
      dataType: ConfigDataType.STRING,
      isSecret: true,
      updatedAt: new Date().toISOString(),
    },

    // AI Model configurations
    {
      key: "OPENAI_API_KEY",
      value: process.env.OPENAI_API_KEY || "",
      category: "ai",
      description: "OpenAI API key for embeddings and chat",
      dataType: ConfigDataType.STRING,
      isSecret: true,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "OPENAI_MODEL",
      value: process.env.OPENAI_MODEL || "gpt-4",
      category: "ai",
      description: "OpenAI model to use for chat completions",
      dataType: ConfigDataType.STRING,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "OPENAI_EMBEDDING_MODEL",
      value: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002",
      category: "ai",
      description: "OpenAI model for generating embeddings",
      dataType: ConfigDataType.STRING,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "OLLAMA_BASE_URL",
      value: process.env.OLLAMA_BASE_URL || "http://ollama:11434",
      category: "ai",
      description: "Ollama service base URL",
      dataType: ConfigDataType.STRING,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "OLLAMA_MODEL",
      value: process.env.OLLAMA_MODEL || "llama2",
      category: "ai",
      description: "Ollama model to use for local inference",
      dataType: ConfigDataType.STRING,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "AI_ENABLED",
      value: process.env.AI_ENABLED === "true" ? "true" : "false",
      category: "ai",
      description: "Enable AI features (embeddings, chat)",
      dataType: ConfigDataType.BOOLEAN,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },

    // Document processing configurations
    {
      key: "DOCLING_URL",
      value: process.env.DOCLING_URL || "http://docling:5000",
      category: "document",
      description: "Docling service URL for document processing",
      dataType: ConfigDataType.STRING,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "DOCLING_ENABLED",
      value: process.env.DOCLING_ENABLED === "true" ? "true" : "false",
      category: "document",
      description: "Enable Docling document processing",
      dataType: ConfigDataType.BOOLEAN,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "WHISPER_URL",
      value: process.env.WHISPER_URL || "http://whisper:5001",
      category: "document",
      description: "Whisper service URL for audio transcription",
      dataType: ConfigDataType.STRING,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "WHISPER_ENABLED",
      value: process.env.WHISPER_ENABLED === "true" ? "true" : "false",
      category: "document",
      description: "Enable Whisper audio transcription",
      dataType: ConfigDataType.BOOLEAN,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },

    // Storage configurations
    {
      key: "UPLOAD_DIR",
      value: process.env.UPLOAD_DIR || "/uploads",
      category: "storage",
      description: "Directory for uploaded files",
      dataType: ConfigDataType.STRING,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "MAX_FILE_SIZE",
      value: process.env.MAX_FILE_SIZE || "52428800",
      category: "storage",
      description: "Maximum file size for uploads (bytes)",
      dataType: ConfigDataType.NUMBER,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
    {
      key: "ALLOWED_FILE_TYPES",
      value: process.env.ALLOWED_FILE_TYPES || '["pdf","docx","txt","md","jpg","png","mp3","mp4"]',
      category: "storage",
      description: "Allowed file types for uploads (JSON array)",
      dataType: ConfigDataType.JSON,
      isSecret: false,
      updatedAt: new Date().toISOString(),
    },
  ];

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
    this.initializeConfigTable();
  }

  /**
   * Initialize the configuration table if it doesn't exist
   */
  private async initializeConfigTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS public."Configurations" (
        key TEXT PRIMARY KEY,
        value TEXT,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        data_type TEXT NOT NULL,
        is_secret BOOLEAN NOT NULL DEFAULT false,
        updated_at TIMESTAMPTZ DEFAULT now(),
        updated_by TEXT
      );
    `;

    try {
      await this.pool.query(query);
      console.log("Configuration table initialized");
    } catch (error) {
      console.error("Failed to initialize configuration table:", error);
    }
  }

  /**
   * Get all configurations, optionally filtered by category
   */
  async getAllConfigurations(category?: string): Promise<Configuration[]> {
    // Check cache first
    const cacheKey = category ? `configs:${category}` : "configs:all";
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Merge default configs with database configs
    let configs = [...this.defaultConfigs];

    try {
      const query = category
        ? `SELECT * FROM public."Configurations" WHERE category = $1`
        : `SELECT * FROM public."Configurations"`;

      const params = category ? [category] : [];
      const result = await this.pool.query(query, params);

      // Override defaults with database values
      result.rows.forEach((row) => {
        const index = configs.findIndex((c) => c.key === row.key);
        if (index >= 0) {
          configs[index] = {
            key: row.key,
            value: row.value,
            category: row.category,
            description: row.description,
            dataType: row.data_type as ConfigDataType,
            isSecret: row.is_secret,
            updatedAt: row.updated_at,
            updatedBy: row.updated_by,
          };
        } else {
          configs.push({
            key: row.key,
            value: row.value,
            category: row.category,
            description: row.description,
            dataType: row.data_type as ConfigDataType,
            isSecret: row.is_secret,
            updatedAt: row.updated_at,
            updatedBy: row.updated_by,
          });
        }
      });
    } catch (error) {
      console.error("Failed to fetch configurations from database:", error);
    }

    // Filter by category if specified
    if (category) {
      configs = configs.filter((c) => c.category === category);
    }

    // Cache the result
    await this.redis.setex(cacheKey, 300, JSON.stringify(configs));

    return configs;
  }

  /**
   * Get a single configuration by key
   */
  async getConfiguration(key: string): Promise<Configuration | null> {
    const allConfigs = await this.getAllConfigurations();
    return allConfigs.find((c) => c.key === key) || null;
  }

  /**
   * Update a configuration value
   */
  async updateConfiguration(
    key: string,
    value: any,
    updatedBy?: string
  ): Promise<Configuration> {
    const config = await this.getConfiguration(key);
    if (!config) {
      throw new Error(`Configuration key "${key}" not found`);
    }

    // Convert value based on data type
    let processedValue = value;
    if (config.dataType === ConfigDataType.BOOLEAN) {
      processedValue = value === true || value === "true" ? "true" : "false";
    } else if (config.dataType === ConfigDataType.NUMBER) {
      processedValue = String(value);
    } else if (config.dataType === ConfigDataType.JSON) {
      processedValue = typeof value === "string" ? value : JSON.stringify(value);
    }

    const query = `
      INSERT INTO public."Configurations" (key, value, category, description, data_type, is_secret, updated_at, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
      ON CONFLICT (key) DO UPDATE
      SET value = $2, updated_at = now(), updated_by = $7
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      key,
      processedValue,
      config.category,
      config.description,
      config.dataType,
      config.isSecret,
      updatedBy || "system",
    ]);

    // Clear cache
    await this.clearConfigCache();

    return {
      key: result.rows[0].key,
      value: result.rows[0].value,
      category: result.rows[0].category,
      description: result.rows[0].description,
      dataType: result.rows[0].data_type,
      isSecret: result.rows[0].is_secret,
      updatedAt: result.rows[0].updated_at,
      updatedBy: result.rows[0].updated_by,
    };
  }

  /**
   * Batch update multiple configurations
   */
  async updateConfigurations(
    configurations: { key: string; value: any }[],
    updatedBy?: string
  ): Promise<Configuration[]> {
    const updated: Configuration[] = [];

    for (const config of configurations) {
      try {
        const result = await this.updateConfiguration(
          config.key,
          config.value,
          updatedBy
        );
        updated.push(result);
      } catch (error) {
        console.error(`Failed to update configuration ${config.key}:`, error);
      }
    }

    return updated;
  }

  /**
   * Clear configuration cache
   */
  private async clearConfigCache() {
    const keys = await this.redis.keys("configs:*");
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Export all configurations as JSON
   */
  async exportConfigurations(): Promise<any> {
    const configs = await this.getAllConfigurations();
    const exportData: any = {};

    configs.forEach((config) => {
      exportData[config.key] = {
        value: config.value,
        category: config.category,
        description: config.description,
        dataType: config.dataType,
        isSecret: config.isSecret,
      };
    });

    return exportData;
  }

  /**
   * Import configurations from JSON
   */
  async importConfigurations(
    data: any,
    updatedBy?: string
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const [key, configData] of Object.entries(data)) {
      try {
        const value = (configData as any).value;
        await this.updateConfiguration(key, value, updatedBy);
        imported++;
      } catch (error) {
        console.error(`Failed to import configuration ${key}:`, error);
        skipped++;
      }
    }

    return { imported, skipped };
  }
}
