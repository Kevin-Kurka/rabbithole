import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';

/**
 * Configuration categories for organizing system settings
 */
export enum ConfigurationCategory {
  DATABASE = 'database',
  REDIS = 'redis',
  RABBITMQ = 'rabbitmq',
  OPENAI = 'openai',
  OLLAMA = 'ollama',
  DOCLING = 'docling',
  WHISPER = 'whisper',
  STORAGE = 'storage',
  MEDIA = 'media',
  SYSTEM = 'system',
  SECURITY = 'security'
}

registerEnumType(ConfigurationCategory, {
  name: 'ConfigurationCategory',
  description: 'Categories for system configuration settings'
});

/**
 * Data types for configuration values
 */
export enum ConfigurationDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  URL = 'url',
  SECRET = 'secret' // Will be masked in queries
}

registerEnumType(ConfigurationDataType, {
  name: 'ConfigurationDataType',
  description: 'Data type of the configuration value'
});

/**
 * SystemConfiguration entity
 * Stores application-wide configuration settings
 */
@ObjectType()
export class SystemConfiguration {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: string; // Stored as JSON string, will be parsed based on data_type

  @Field(() => ConfigurationCategory)
  category!: ConfigurationCategory;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => ConfigurationDataType)
  data_type!: ConfigurationDataType;

  @Field(() => Boolean, { defaultValue: false })
  is_secret!: boolean;

  @Field(() => Boolean, { defaultValue: false })
  is_system!: boolean; // System configs cannot be deleted

  @Field(() => ID, { nullable: true })
  updated_by?: string;

  @Field(() => Date)
  created_at!: Date;

  @Field(() => Date)
  updated_at!: Date;
}

/**
 * Masked configuration value for API responses
 */
@ObjectType()
export class MaskedConfiguration {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: string; // Masked if is_secret = true

  @Field(() => ConfigurationCategory)
  category!: ConfigurationCategory;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => ConfigurationDataType)
  data_type!: ConfigurationDataType;

  @Field(() => Boolean)
  is_secret!: boolean;

  @Field(() => Boolean)
  is_system!: boolean;

  @Field(() => ID, { nullable: true })
  updated_by?: string;

  @Field(() => Date)
  updated_at!: Date;
}

/**
 * Input type for updating configuration
 */
@ObjectType()
export class ConfigurationInput {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: string;
}

/**
 * Audit log entry for configuration changes
 */
@ObjectType()
export class ConfigurationAuditLog {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  config_key!: string;

  @Field(() => String, { nullable: true })
  old_value?: string;

  @Field(() => String)
  new_value!: string;

  @Field(() => ID)
  changed_by!: string;

  @Field(() => Date)
  changed_at!: Date;

  @Field(() => String, { nullable: true })
  change_reason?: string;
}
