import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  InputType,
  Field,
} from "type-graphql";
import { GraphQLJSON } from "graphql-type-json";
import {
  Configuration,
  ConfigurationResponse,
  ConfigurationsResponse,
  ConnectionTestResponse,
  ImportConfigurationsResponse,
} from "../entities/Configuration";
import { ConfigurationService } from "../services/ConfigurationService";
import { Pool } from "pg";
import { Redis } from "ioredis";

/**
 * Input type for configuration updates
 */
@InputType()
class ConfigurationInput {
  @Field()
  key!: string;

  @Field(() => GraphQLJSON)
  value!: any;
}

/**
 * Context type for resolvers
 */
interface Context {
  pool: Pool;
  redis: Redis;
  userId?: string;
}

/**
 * Configuration Resolver
 * Handles all GraphQL operations for system configuration management
 */
@Resolver()
export class ConfigurationResolver {
  /**
   * Get all configurations, optionally filtered by category
   */
  @Query(() => [Configuration])
  async getAllConfigurations(
    @Arg("category", { nullable: true }) category: string | undefined,
    @Ctx() { pool, redis }: Context
  ): Promise<Configuration[]> {
    const service = new ConfigurationService(pool, redis);
    return service.getAllConfigurations(category);
  }

  /**
   * Get a single configuration by key
   */
  @Query(() => Configuration, { nullable: true })
  async getConfiguration(
    @Arg("key") key: string,
    @Ctx() { pool, redis }: Context
  ): Promise<Configuration | null> {
    const service = new ConfigurationService(pool, redis);
    return service.getConfiguration(key);
  }

  /**
   * Update a single configuration
   */
  @Mutation(() => ConfigurationResponse)
  async updateConfiguration(
    @Arg("key") key: string,
    @Arg("value", () => GraphQLJSON) value: any,
    @Ctx() { pool, redis, userId }: Context
  ): Promise<ConfigurationResponse> {
    try {
      const service = new ConfigurationService(pool, redis);
      const configuration = await service.updateConfiguration(
        key,
        value,
        userId
      );

      return {
        success: true,
        message: "Configuration updated successfully",
        configuration,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Batch update multiple configurations
   */
  @Mutation(() => ConfigurationsResponse)
  async updateConfigurations(
    @Arg("configurations", () => [ConfigurationInput])
    configurations: ConfigurationInput[],
    @Ctx() { pool, redis, userId }: Context
  ): Promise<ConfigurationsResponse> {
    try {
      const service = new ConfigurationService(pool, redis);
      const updated = await service.updateConfigurations(
        configurations,
        userId
      );

      return {
        success: true,
        message: `${updated.length} configuration(s) updated successfully`,
        configurations: updated,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test database connection
   */
  @Mutation(() => ConnectionTestResponse)
  async testDatabaseConnection(
    @Ctx() { pool }: Context
  ): Promise<ConnectionTestResponse> {
    const startTime = Date.now();

    try {
      await pool.query("SELECT 1");
      const latency = Date.now() - startTime;

      return {
        success: true,
        message: "Database connection successful",
        latency,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Database connection failed",
      };
    }
  }

  /**
   * Test Redis connection
   */
  @Mutation(() => ConnectionTestResponse)
  async testRedisConnection(
    @Ctx() { redis }: Context
  ): Promise<ConnectionTestResponse> {
    const startTime = Date.now();

    try {
      await redis.ping();
      const latency = Date.now() - startTime;

      return {
        success: true,
        message: "Redis connection successful",
        latency,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Redis connection failed",
      };
    }
  }

  /**
   * Test RabbitMQ connection
   */
  @Mutation(() => ConnectionTestResponse)
  async testRabbitMQConnection(): Promise<ConnectionTestResponse> {
    const startTime = Date.now();

    try {
      // Try to connect to RabbitMQ
      const amqp = require("amqplib");
      const connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://rabbitmq:5672"
      );
      await connection.close();

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: "RabbitMQ connection successful",
        latency,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "RabbitMQ connection failed",
      };
    }
  }

  /**
   * Test Ollama connection
   */
  @Mutation(() => ConnectionTestResponse)
  async testOllamaConnection(): Promise<ConnectionTestResponse> {
    const startTime = Date.now();

    try {
      const ollamaUrl =
        process.env.OLLAMA_BASE_URL || "http://ollama:11434";
      const response = await fetch(`${ollamaUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      const availableModels = data.models?.map((m: any) => m.name) || [];

      return {
        success: true,
        message: "Ollama connection successful",
        latency,
        availableModels,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Ollama connection failed",
      };
    }
  }

  /**
   * Test Docling service connection
   */
  @Mutation(() => ConnectionTestResponse)
  async testDoclingConnection(): Promise<ConnectionTestResponse> {
    const startTime = Date.now();

    try {
      const doclingUrl = process.env.DOCLING_URL || "http://docling:5000";
      const response = await fetch(`${doclingUrl}/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: "Docling connection successful",
        latency,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Docling connection failed",
      };
    }
  }

  /**
   * Export all configurations as JSON
   */
  @Query(() => GraphQLJSON)
  async exportConfigurations(
    @Ctx() { pool, redis }: Context
  ): Promise<any> {
    const service = new ConfigurationService(pool, redis);
    return service.exportConfigurations();
  }

  /**
   * Import configurations from JSON
   */
  @Mutation(() => ImportConfigurationsResponse)
  async importConfigurations(
    @Arg("data", () => GraphQLJSON) data: any,
    @Ctx() { pool, redis, userId }: Context
  ): Promise<ImportConfigurationsResponse> {
    try {
      const service = new ConfigurationService(pool, redis);
      const result = await service.importConfigurations(data, userId);

      return {
        success: true,
        message: "Configurations imported successfully",
        imported: result.imported,
        skipped: result.skipped,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
        imported: 0,
        skipped: 0,
      };
    }
  }
}
