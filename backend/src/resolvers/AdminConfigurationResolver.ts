import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  ID,
  Field,
  InputType,
  ObjectType
} from 'type-graphql';
import { Pool } from 'pg';
import {
  SystemConfiguration,
  MaskedConfiguration,
  ConfigurationCategory,
  ConfigurationDataType,
  ConfigurationAuditLog
} from '../entities/SystemConfiguration';

/**
 * Context interface for resolvers
 */
interface Context {
  pool: Pool;
  userId?: string;
  isAuthenticated?: boolean;
}

/**
 * Input type for updating configuration
 */
@InputType()
class UpdateConfigurationInput {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: string;

  @Field(() => String, { nullable: true })
  change_reason?: string;
}

/**
 * Input type for creating new configuration
 */
@InputType()
class CreateConfigurationInput {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: string;

  @Field(() => ConfigurationCategory)
  category!: ConfigurationCategory;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => ConfigurationDataType, { defaultValue: ConfigurationDataType.STRING })
  data_type!: ConfigurationDataType;

  @Field(() => Boolean, { defaultValue: false })
  is_secret!: boolean;
}

/**
 * Response type for configuration operations
 */
@ObjectType()
class ConfigurationOperationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => MaskedConfiguration, { nullable: true })
  configuration?: MaskedConfiguration;
}

/**
 * Configuration validation result
 */
@ObjectType()
class ConfigurationValidationResult {
  @Field(() => Boolean)
  is_valid!: boolean;

  @Field(() => [String])
  errors!: string[];

  @Field(() => [String])
  warnings!: string[];
}

/**
 * AdminConfigurationResolver
 * Handles all system configuration operations with security and validation
 */
@Resolver()
export class AdminConfigurationResolver {
  /**
   * Mask secret values by showing only last 4 characters
   */
  private maskSecretValue(value: string): string {
    if (!value || value.length <= 4) {
      return '****';
    }
    return '*'.repeat(value.length - 4) + value.slice(-4);
  }

  /**
   * Transform raw configuration to masked version
   */
  private toMaskedConfiguration(config: SystemConfiguration): MaskedConfiguration {
    const masked: MaskedConfiguration = {
      id: config.id,
      key: config.key,
      value: config.is_secret ? this.maskSecretValue(config.value) : config.value,
      category: config.category,
      description: config.description,
      data_type: config.data_type,
      is_secret: config.is_secret,
      is_system: config.is_system,
      updated_by: config.updated_by,
      updated_at: config.updated_at
    };
    return masked;
  }

  /**
   * Ensure user is authenticated (admin check would be added here)
   */
  private ensureAuthenticated(ctx: Context): void {
    if (!ctx.userId) {
      throw new Error('Authentication required. Admin access only.');
    }
    // TODO: Add role-based access control check
    // const isAdmin = await this.checkUserRole(ctx.userId, 'admin');
    // if (!isAdmin) throw new Error('Admin privileges required');
  }

  /**
   * Validate configuration value based on data type
   */
  private validateConfigurationValue(
    key: string,
    value: string,
    dataType: ConfigurationDataType
  ): ConfigurationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      switch (dataType) {
        case ConfigurationDataType.NUMBER:
          if (isNaN(Number(value))) {
            errors.push(`Value must be a valid number for key: ${key}`);
          }
          break;

        case ConfigurationDataType.BOOLEAN:
          if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
            errors.push(`Value must be a boolean (true/false) for key: ${key}`);
          }
          break;

        case ConfigurationDataType.JSON:
          try {
            JSON.parse(value);
          } catch {
            errors.push(`Value must be valid JSON for key: ${key}`);
          }
          break;

        case ConfigurationDataType.URL:
          try {
            new URL(value);
          } catch {
            errors.push(`Value must be a valid URL for key: ${key}`);
          }
          break;

        case ConfigurationDataType.SECRET:
          if (value.length < 8) {
            warnings.push(`Secret value for ${key} is shorter than recommended (8 chars)`);
          }
          break;

        case ConfigurationDataType.STRING:
        default:
          // String validation passes
          break;
      }

      // Key-specific validation
      if (key.includes('DATABASE_URL') && !value.includes('://')) {
        errors.push('DATABASE_URL must be a valid connection string');
      }

      if (key.includes('REDIS_URL') && !value.startsWith('redis://')) {
        errors.push('REDIS_URL must start with redis://');
      }

      if (key.includes('RABBITMQ_URL') && !value.startsWith('amqp://')) {
        errors.push('RABBITMQ_URL must start with amqp://');
      }

      if (key.includes('API_KEY') && value.length < 16) {
        warnings.push('API key seems unusually short');
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Log configuration change to audit log
   */
  private async logConfigurationChange(
    pool: Pool,
    configKey: string,
    oldValue: string | null,
    newValue: string,
    userId: string,
    changeReason?: string
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO public."ConfigurationAuditLog"
         (id, config_key, old_value, new_value, changed_by, changed_at, change_reason)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW(), $5)`,
        [configKey, oldValue, newValue, userId, changeReason]
      );

      console.log('Configuration change logged:', {
        key: configKey,
        changed_by: userId,
        has_old_value: !!oldValue,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log configuration change:', error);
      // Don't throw - logging failure shouldn't block the operation
    }
  }

  /**
   * Query: Get a single configuration by key
   */
  @Query(() => MaskedConfiguration, { nullable: true })
  async getConfiguration(
    @Arg('key', () => String) key: string,
    @Ctx() ctx: Context
  ): Promise<MaskedConfiguration | null> {
    this.ensureAuthenticated(ctx);

    const result = await ctx.pool.query<SystemConfiguration>(
      `SELECT * FROM public."SystemConfiguration" WHERE key = $1`,
      [key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.toMaskedConfiguration(result.rows[0]);
  }

  /**
   * Query: Get all configurations, optionally filtered by category
   */
  @Query(() => [MaskedConfiguration])
  async getAllConfigurations(
    @Arg('category', () => ConfigurationCategory, { nullable: true }) category: ConfigurationCategory | null,
    @Ctx() ctx: Context
  ): Promise<MaskedConfiguration[]> {
    this.ensureAuthenticated(ctx);

    const query = category
      ? `SELECT * FROM public."SystemConfiguration" WHERE category = $1 ORDER BY category, key`
      : `SELECT * FROM public."SystemConfiguration" ORDER BY category, key`;

    const params = category ? [category] : [];
    const result = await ctx.pool.query<SystemConfiguration>(query, params);

    return result.rows.map(config => this.toMaskedConfiguration(config));
  }

  /**
   * Query: Get list of all configuration categories with counts
   */
  @Query(() => [String])
  async getConfigurationCategories(@Ctx() ctx: Context): Promise<string[]> {
    this.ensureAuthenticated(ctx);

    return Object.values(ConfigurationCategory);
  }

  /**
   * Query: Get configuration audit log
   */
  @Query(() => [ConfigurationAuditLog])
  async getConfigurationAuditLog(
    @Arg('configKey', () => String, { nullable: true }) configKey: string | null,
    @Arg('limit', () => Number, { defaultValue: 50 }) limit: number,
    @Ctx() ctx: Context
  ): Promise<ConfigurationAuditLog[]> {
    this.ensureAuthenticated(ctx);

    const query = configKey
      ? `SELECT * FROM public."ConfigurationAuditLog"
         WHERE config_key = $1
         ORDER BY changed_at DESC
         LIMIT $2`
      : `SELECT * FROM public."ConfigurationAuditLog"
         ORDER BY changed_at DESC
         LIMIT $1`;

    const params = configKey ? [configKey, limit] : [limit];
    const result = await ctx.pool.query<ConfigurationAuditLog>(query, params);

    return result.rows;
  }

  /**
   * Query: Validate a configuration value without saving
   */
  @Query(() => ConfigurationValidationResult)
  async validateConfiguration(
    @Arg('key', () => String) key: string,
    @Arg('value', () => String) value: string,
    @Arg('dataType', () => ConfigurationDataType) dataType: ConfigurationDataType,
    @Ctx() ctx: Context
  ): Promise<ConfigurationValidationResult> {
    this.ensureAuthenticated(ctx);

    return this.validateConfigurationValue(key, value, dataType);
  }

  /**
   * Mutation: Create a new configuration
   */
  @Mutation(() => ConfigurationOperationResponse)
  async createConfiguration(
    @Arg('input', () => CreateConfigurationInput) input: CreateConfigurationInput,
    @Ctx() ctx: Context
  ): Promise<ConfigurationOperationResponse> {
    this.ensureAuthenticated(ctx);

    // Validate the value
    const validation = this.validateConfigurationValue(
      input.key,
      input.value,
      input.data_type
    );

    if (!validation.is_valid) {
      return {
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    try {
      // Check if key already exists
      const existing = await ctx.pool.query(
        `SELECT id FROM public."SystemConfiguration" WHERE key = $1`,
        [input.key]
      );

      if (existing.rows.length > 0) {
        return {
          success: false,
          message: `Configuration with key '${input.key}' already exists. Use updateConfiguration instead.`
        };
      }

      // Insert new configuration
      const result = await ctx.pool.query<SystemConfiguration>(
        `INSERT INTO public."SystemConfiguration"
         (id, key, value, category, description, data_type, is_secret, is_system, updated_by, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, false, $7, NOW(), NOW())
         RETURNING *`,
        [
          input.key,
          input.value,
          input.category,
          input.description,
          input.data_type,
          input.is_secret,
          ctx.userId
        ]
      );

      // Log the creation
      await this.logConfigurationChange(
        ctx.pool,
        input.key,
        null,
        input.value,
        ctx.userId!,
        'Configuration created'
      );

      const message = validation.warnings.length > 0
        ? `Configuration created with warnings: ${validation.warnings.join(', ')}`
        : 'Configuration created successfully';

      return {
        success: true,
        message,
        configuration: this.toMaskedConfiguration(result.rows[0])
      };
    } catch (error) {
      console.error('Failed to create configuration:', error);
      return {
        success: false,
        message: `Failed to create configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Mutation: Update an existing configuration
   */
  @Mutation(() => ConfigurationOperationResponse)
  async updateConfiguration(
    @Arg('input', () => UpdateConfigurationInput) input: UpdateConfigurationInput,
    @Ctx() ctx: Context
  ): Promise<ConfigurationOperationResponse> {
    this.ensureAuthenticated(ctx);

    try {
      // Get existing configuration
      const existingResult = await ctx.pool.query<SystemConfiguration>(
        `SELECT * FROM public."SystemConfiguration" WHERE key = $1`,
        [input.key]
      );

      if (existingResult.rows.length === 0) {
        return {
          success: false,
          message: `Configuration with key '${input.key}' not found`
        };
      }

      const existing = existingResult.rows[0];

      // Validate the new value
      const validation = this.validateConfigurationValue(
        input.key,
        input.value,
        existing.data_type
      );

      if (!validation.is_valid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Update configuration
      const result = await ctx.pool.query<SystemConfiguration>(
        `UPDATE public."SystemConfiguration"
         SET value = $1, updated_by = $2, updated_at = NOW()
         WHERE key = $3
         RETURNING *`,
        [input.value, ctx.userId, input.key]
      );

      // Log the change
      await this.logConfigurationChange(
        ctx.pool,
        input.key,
        existing.value,
        input.value,
        ctx.userId!,
        input.change_reason
      );

      const message = validation.warnings.length > 0
        ? `Configuration updated with warnings: ${validation.warnings.join(', ')}`
        : 'Configuration updated successfully';

      return {
        success: true,
        message,
        configuration: this.toMaskedConfiguration(result.rows[0])
      };
    } catch (error) {
      console.error('Failed to update configuration:', error);
      return {
        success: false,
        message: `Failed to update configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Mutation: Reset configuration to default value
   * Note: This requires a separate table for default values or hardcoded defaults
   */
  @Mutation(() => ConfigurationOperationResponse)
  async resetConfiguration(
    @Arg('key', () => String) key: string,
    @Ctx() ctx: Context
  ): Promise<ConfigurationOperationResponse> {
    this.ensureAuthenticated(ctx);

    try {
      // Get current value for audit log
      const current = await ctx.pool.query<SystemConfiguration>(
        `SELECT * FROM public."SystemConfiguration" WHERE key = $1`,
        [key]
      );

      if (current.rows.length === 0) {
        return {
          success: false,
          message: `Configuration with key '${key}' not found`
        };
      }

      // Get default value (this would typically come from a defaults table)
      const defaultValue = await this.getDefaultValue(key);

      if (!defaultValue) {
        return {
          success: false,
          message: `No default value defined for configuration '${key}'`
        };
      }

      // Update to default value
      const result = await ctx.pool.query<SystemConfiguration>(
        `UPDATE public."SystemConfiguration"
         SET value = $1, updated_by = $2, updated_at = NOW()
         WHERE key = $3
         RETURNING *`,
        [defaultValue, ctx.userId, key]
      );

      // Log the reset
      await this.logConfigurationChange(
        ctx.pool,
        key,
        current.rows[0].value,
        defaultValue,
        ctx.userId!,
        'Configuration reset to default'
      );

      return {
        success: true,
        message: 'Configuration reset to default value',
        configuration: this.toMaskedConfiguration(result.rows[0])
      };
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      return {
        success: false,
        message: `Failed to reset configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Mutation: Delete a non-system configuration
   */
  @Mutation(() => ConfigurationOperationResponse)
  async deleteConfiguration(
    @Arg('key', () => String) key: string,
    @Ctx() ctx: Context
  ): Promise<ConfigurationOperationResponse> {
    this.ensureAuthenticated(ctx);

    try {
      // Check if configuration exists and is not a system config
      const existing = await ctx.pool.query<SystemConfiguration>(
        `SELECT * FROM public."SystemConfiguration" WHERE key = $1`,
        [key]
      );

      if (existing.rows.length === 0) {
        return {
          success: false,
          message: `Configuration with key '${key}' not found`
        };
      }

      if (existing.rows[0].is_system) {
        return {
          success: false,
          message: `Cannot delete system configuration '${key}'`
        };
      }

      // Delete configuration
      await ctx.pool.query(
        `DELETE FROM public."SystemConfiguration" WHERE key = $1`,
        [key]
      );

      // Log the deletion
      await this.logConfigurationChange(
        ctx.pool,
        key,
        existing.rows[0].value,
        '[DELETED]',
        ctx.userId!,
        'Configuration deleted'
      );

      return {
        success: true,
        message: 'Configuration deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      return {
        success: false,
        message: `Failed to delete configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Helper: Get default value for a configuration key
   * This would typically query a defaults table or use a hardcoded map
   */
  private async getDefaultValue(key: string): Promise<string | null> {
    // Default configuration values (hardcoded for now)
    const defaults: Record<string, string> = {
      'database.pool.max': '20',
      'database.pool.idle_timeout': '30000',
      'redis.cache.ttl': '3600',
      'openai.model': 'gpt-4-turbo-preview',
      'openai.embedding_model': 'text-embedding-3-small',
      'openai.temperature': '0.7',
      'ollama.chat_model': 'llama2',
      'ollama.embedding_model': 'llama2',
      'ollama.vision_model': 'llava',
      'docling.timeout': '30000',
      'whisper.model': 'base',
      'whisper.max_retries': '3',
      'whisper.retry_delay': '1000',
      'storage.provider': 'local',
      'media.ffmpeg.threads': '4',
      'media.tesseract.lang': 'eng'
    };

    return defaults[key] || null;
  }
}
