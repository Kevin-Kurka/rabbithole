import { ObjectType, Field, ID, registerEnumType } from "type-graphql";

/**
 * Enum for configuration data types
 */
export enum ConfigDataType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  JSON = "json",
}

registerEnumType(ConfigDataType, {
  name: "ConfigDataType",
  description: "Data type of the configuration value",
});

/**
 * Configuration Entity
 * Represents a system configuration key-value pair
 */
@ObjectType()
export class Configuration {
  @Field(() => String)
  key!: string;

  @Field(() => String, { nullable: true })
  value?: any;

  @Field(() => String)
  category!: string;

  @Field(() => String)
  description!: string;

  @Field(() => ConfigDataType)
  dataType!: ConfigDataType;

  @Field(() => Boolean)
  isSecret!: boolean;

  @Field(() => String, { nullable: true })
  updatedAt?: string;

  @Field(() => String, { nullable: true })
  updatedBy?: string;
}

/**
 * Input type for updating configurations
 */
@ObjectType()
export class ConfigurationInput {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: any;
}

/**
 * Response type for configuration mutations
 */
@ObjectType()
export class ConfigurationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => Configuration, { nullable: true })
  configuration?: Configuration;
}

/**
 * Response type for batch configuration updates
 */
@ObjectType()
export class ConfigurationsResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => [Configuration], { nullable: true })
  configurations?: Configuration[];
}

/**
 * Response type for connection tests
 */
@ObjectType()
export class ConnectionTestResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => Number, { nullable: true })
  latency?: number;

  @Field(() => [String], { nullable: true })
  availableModels?: string[];
}

/**
 * Response type for import operations
 */
@ObjectType()
export class ImportConfigurationsResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => Number)
  imported!: number;

  @Field(() => Number)
  skipped!: number;
}
