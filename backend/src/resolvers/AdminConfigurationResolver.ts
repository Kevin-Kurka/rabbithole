import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
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
 * Helper to parse JSONB props safely
 */
function parseProps(props: any): Record<string, any> {
  if (!props) return {};
  return typeof props === 'string' ? JSON.parse(props) : props;
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
 *
 * Handles all system configuration operations with security and validation.
 * Uses node/edge pattern - SystemConfiguration and ConfigurationAuditLog are NodeTypes.
 */
@Resolver()
export class AdminConfigurationResolver {
  // Cache for node type IDs
  private nodeTypeCache: Map<string, string> = new Map();
  private edgeTypeCache: Map<string, string> = new Map();

  /**
   * Get node type ID by name (cached)
   */
  private async getNodeTypeId(pool: Pool, name: string): Promise<string | null> {
    if (this.nodeTypeCache.has(name)) {
      return this.nodeTypeCache.get(name)!;
    }

    const result = await pool.query(
      `SELECT id FROM node_types WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    this.nodeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

  /**
   * Get edge type ID by name (cached)
   */
  private async getEdgeTypeId(pool: Pool, name: string): Promise<string | null> {
    if (this.edgeTypeCache.has(name)) {
      return this.edgeTypeCache.get(name)!;
    }

    const result = await pool.query(
      `SELECT id FROM edge_types WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    this.edgeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

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
   * Transform node row to SystemConfiguration
   */
  private nodeToConfiguration(row: any): SystemConfiguration {
    const props = parseProps(row.props);
    return {
      id: row.id,
      key: props.key,
      value: props.value,
      category: props.category,
      description: props.description,
      data_type: props.dataType || props.data_type || ConfigurationDataType.STRING,
      is_secret: props.isSecret || props.is_secret || false,
      is_system: props.isSystem || props.is_system || false,
      updated_by: props.updatedBy || props.updated_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
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
   * Log configuration change to audit log (as a node)
   */
  private async logConfigurationChange(
    pool: Pool,
    configKey: string,
    configNodeId: string,
    oldValue: string | null,
    newValue: string,
    userId: string,
    changeReason?: string
  ): Promise<void> {
    try {
      const auditLogTypeId = await this.getNodeTypeId(pool, 'ConfigurationAuditLog');
      const auditsConfigEdgeTypeId = await this.getEdgeTypeId(pool, 'AUDITS_CONFIG');

      if (!auditLogTypeId) {
        console.warn('ConfigurationAuditLog node type not found, skipping audit');
        return;
      }

      // Create audit log node
      const auditProps = {
        configKey,
        previousValue: oldValue,
        newValue,
        changedBy: userId,
        changeReason,
        changedAt: new Date().toISOString()
      };

      const result = await pool.query(
        `INSERT INTO nodes (node_type_id, props, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id`,
        [auditLogTypeId, JSON.stringify(auditProps)]
      );

      // Create edge to configuration node if we have the edge type
      if (auditsConfigEdgeTypeId && configNodeId) {
        await pool.query(
          `INSERT INTO edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
           VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
          [auditsConfigEdgeTypeId, result.rows[0].id, configNodeId]
        );
      }

      console.log('Configuration change logged:', {
        key: configKey,
        changed_by: userId,
        has_old_value: !!oldValue,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log configuration change:', error);
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

    const configTypeId = await this.getNodeTypeId(ctx.pool, 'SystemConfiguration');
    if (!configTypeId) {
      return null;
    }

    const result = await ctx.pool.query(
      `SELECT id, props, created_at, updated_at FROM nodes
       WHERE node_type_id = $1
         AND (props->>'key')::text = $2
         AND archived_at IS NULL`,
      [configTypeId, key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.toMaskedConfiguration(this.nodeToConfiguration(result.rows[0]));
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

    const configTypeId = await this.getNodeTypeId(ctx.pool, 'SystemConfiguration');
    if (!configTypeId) {
      return [];
    }

    const query = category
      ? `SELECT id, props, created_at, updated_at FROM nodes
         WHERE node_type_id = $1
           AND (props->>'category')::text = $2
           AND archived_at IS NULL
         ORDER BY (props->>'category')::text, (props->>'key')::text`
      : `SELECT id, props, created_at, updated_at FROM nodes
         WHERE node_type_id = $1
           AND archived_at IS NULL
         ORDER BY (props->>'category')::text, (props->>'key')::text`;

    const params = category ? [configTypeId, category] : [configTypeId];
    const result = await ctx.pool.query(query, params);

    return result.rows.map(row => this.toMaskedConfiguration(this.nodeToConfiguration(row)));
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

    const auditLogTypeId = await this.getNodeTypeId(ctx.pool, 'ConfigurationAuditLog');
    if (!auditLogTypeId) {
      return [];
    }

    const query = configKey
      ? `SELECT id, props, created_at FROM nodes
         WHERE node_type_id = $1
           AND (props->>'configKey')::text = $2
           AND archived_at IS NULL
         ORDER BY created_at DESC
         LIMIT $3`
      : `SELECT id, props, created_at FROM nodes
         WHERE node_type_id = $1
           AND archived_at IS NULL
         ORDER BY created_at DESC
         LIMIT $2`;

    const params = configKey ? [auditLogTypeId, configKey, limit] : [auditLogTypeId, limit];
    const result = await ctx.pool.query(query, params);

    return result.rows.map(row => {
      const props = parseProps(row.props);
      return {
        id: row.id,
        config_key: props.configKey,
        old_value: props.previousValue,
        new_value: props.newValue,
        changed_by: props.changedBy,
        changed_at: props.changedAt || row.created_at,
        change_reason: props.changeReason
      };
    });
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
      const configTypeId = await this.getNodeTypeId(ctx.pool, 'SystemConfiguration');
      if (!configTypeId) {
        return {
          success: false,
          message: 'SystemConfiguration node type not found'
        };
      }

      // Check if key already exists
      const existing = await ctx.pool.query(
        `SELECT id FROM nodes
         WHERE node_type_id = $1
           AND (props->>'key')::text = $2
           AND archived_at IS NULL`,
        [configTypeId, input.key]
      );

      if (existing.rows.length > 0) {
        return {
          success: false,
          message: `Configuration with key '${input.key}' already exists. Use updateConfiguration instead.`
        };
      }

      // Create configuration node
      const configProps = {
        key: input.key,
        value: input.value,
        category: input.category,
        description: input.description,
        dataType: input.data_type,
        isSecret: input.is_secret,
        isSystem: false,
        updatedBy: ctx.userId
      };

      const result = await ctx.pool.query(
        `INSERT INTO nodes (node_type_id, props, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING *`,
        [configTypeId, JSON.stringify(configProps)]
      );

      // Log the creation
      await this.logConfigurationChange(
        ctx.pool,
        input.key,
        result.rows[0].id,
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
        configuration: this.toMaskedConfiguration(this.nodeToConfiguration(result.rows[0]))
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
      const configTypeId = await this.getNodeTypeId(ctx.pool, 'SystemConfiguration');
      if (!configTypeId) {
        return {
          success: false,
          message: 'SystemConfiguration node type not found'
        };
      }

      // Get existing configuration
      const existingResult = await ctx.pool.query(
        `SELECT id, props, created_at, updated_at FROM nodes
         WHERE node_type_id = $1
           AND (props->>'key')::text = $2
           AND archived_at IS NULL`,
        [configTypeId, input.key]
      );

      if (existingResult.rows.length === 0) {
        return {
          success: false,
          message: `Configuration with key '${input.key}' not found`
        };
      }

      const existing = this.nodeToConfiguration(existingResult.rows[0]);

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

      // Update configuration - merge new value into props
      const existingProps = parseProps(existingResult.rows[0].props);
      const updatedProps = {
        ...existingProps,
        value: input.value,
        updatedBy: ctx.userId
      };

      const result = await ctx.pool.query(
        `UPDATE nodes
         SET props = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(updatedProps), existingResult.rows[0].id]
      );

      // Log the change
      await this.logConfigurationChange(
        ctx.pool,
        input.key,
        existingResult.rows[0].id,
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
        configuration: this.toMaskedConfiguration(this.nodeToConfiguration(result.rows[0]))
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
   */
  @Mutation(() => ConfigurationOperationResponse)
  async resetConfiguration(
    @Arg('key', () => String) key: string,
    @Ctx() ctx: Context
  ): Promise<ConfigurationOperationResponse> {
    this.ensureAuthenticated(ctx);

    try {
      const configTypeId = await this.getNodeTypeId(ctx.pool, 'SystemConfiguration');
      if (!configTypeId) {
        return {
          success: false,
          message: 'SystemConfiguration node type not found'
        };
      }

      // Get current value for audit log
      const current = await ctx.pool.query(
        `SELECT id, props FROM nodes
         WHERE node_type_id = $1
           AND (props->>'key')::text = $2
           AND archived_at IS NULL`,
        [configTypeId, key]
      );

      if (current.rows.length === 0) {
        return {
          success: false,
          message: `Configuration with key '${key}' not found`
        };
      }

      const currentProps = parseProps(current.rows[0].props);
      const defaultValue = await this.getDefaultValue(key);

      if (!defaultValue) {
        return {
          success: false,
          message: `No default value defined for configuration '${key}'`
        };
      }

      // Update to default value
      const updatedProps = {
        ...currentProps,
        value: defaultValue,
        updatedBy: ctx.userId
      };

      const result = await ctx.pool.query(
        `UPDATE nodes
         SET props = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(updatedProps), current.rows[0].id]
      );

      // Log the reset
      await this.logConfigurationChange(
        ctx.pool,
        key,
        current.rows[0].id,
        currentProps.value,
        defaultValue,
        ctx.userId!,
        'Configuration reset to default'
      );

      return {
        success: true,
        message: 'Configuration reset to default value',
        configuration: this.toMaskedConfiguration(this.nodeToConfiguration(result.rows[0]))
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
      const configTypeId = await this.getNodeTypeId(ctx.pool, 'SystemConfiguration');
      if (!configTypeId) {
        return {
          success: false,
          message: 'SystemConfiguration node type not found'
        };
      }

      // Check if configuration exists and is not a system config
      const existing = await ctx.pool.query(
        `SELECT id, props FROM nodes
         WHERE node_type_id = $1
           AND (props->>'key')::text = $2
           AND archived_at IS NULL`,
        [configTypeId, key]
      );

      if (existing.rows.length === 0) {
        return {
          success: false,
          message: `Configuration with key '${key}' not found`
        };
      }

      const existingProps = parseProps(existing.rows[0].props);

      if (existingProps.isSystem || existingProps.is_system) {
        return {
          success: false,
          message: `Cannot delete system configuration '${key}'`
        };
      }

      // Soft delete configuration (archive it)
      await ctx.pool.query(
        `UPDATE nodes SET archived_at = NOW() WHERE id = $1`,
        [existing.rows[0].id]
      );

      // Log the deletion
      await this.logConfigurationChange(
        ctx.pool,
        key,
        existing.rows[0].id,
        existingProps.value,
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
   */
  private async getDefaultValue(key: string): Promise<string | null> {
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
