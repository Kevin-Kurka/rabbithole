/**
 * GraphQL Queries for Admin Configuration
 *
 * Centralized GraphQL queries and mutations for system configuration management.
 */

import { gql } from '@apollo/client';

/**
 * Get all system configurations, optionally filtered by category
 */
export const GET_ALL_CONFIGURATIONS = gql`
  query GetAllConfigurations($category: ConfigurationCategory) {
    getAllConfigurations(category: $category) {
      id
      key
      value
      category
      description
      data_type
      is_secret
      is_system
      updated_by
      updated_at
    }
  }
`;

/**
 * Get a single configuration by key
 */
export const GET_CONFIGURATION = gql`
  query GetConfiguration($key: String!) {
    getConfiguration(key: $key) {
      id
      key
      value
      category
      description
      data_type
      is_secret
      is_system
      updated_by
      updated_at
    }
  }
`;

/**
 * Update a configuration value
 */
export const UPDATE_CONFIGURATION = gql`
  mutation UpdateConfiguration($input: UpdateConfigurationInput!) {
    updateConfiguration(input: $input) {
      success
      message
      configuration {
        id
        key
        value
        category
        description
        data_type
        is_secret
        is_system
        updated_by
        updated_at
      }
    }
  }
`;

/**
 * Create a new configuration
 */
export const CREATE_CONFIGURATION = gql`
  mutation CreateConfiguration($input: CreateConfigurationInput!) {
    createConfiguration(input: $input) {
      success
      message
      configuration {
        id
        key
        value
        category
        description
        data_type
        is_secret
        is_system
        updated_by
        updated_at
      }
    }
  }
`;

/**
 * Reset configuration to default value
 */
export const RESET_CONFIGURATION = gql`
  mutation ResetConfiguration($key: String!) {
    resetConfiguration(key: $key) {
      success
      message
      configuration {
        id
        key
        value
        category
        description
        data_type
        is_secret
        is_system
        updated_by
        updated_at
      }
    }
  }
`;

/**
 * Delete a configuration
 */
export const DELETE_CONFIGURATION = gql`
  mutation DeleteConfiguration($key: String!) {
    deleteConfiguration(key: $key) {
      success
      message
    }
  }
`;

/**
 * Get configuration categories
 */
export const GET_CONFIGURATION_CATEGORIES = gql`
  query GetConfigurationCategories {
    getConfigurationCategories
  }
`;

/**
 * Get configuration audit log
 */
export const GET_CONFIGURATION_AUDIT_LOG = gql`
  query GetConfigurationAuditLog($configKey: String, $limit: Int) {
    getConfigurationAuditLog(configKey: $configKey, limit: $limit) {
      id
      config_key
      old_value
      new_value
      changed_by
      changed_at
      change_reason
    }
  }
`;

/**
 * Validate configuration value
 */
export const VALIDATE_CONFIGURATION = gql`
  query ValidateConfiguration($key: String!, $value: String!, $dataType: ConfigurationDataType!) {
    validateConfiguration(key: $key, value: $value, dataType: $dataType) {
      is_valid
      errors
      warnings
    }
  }
`;

/**
 * TypeScript types for configuration data
 */
export interface Configuration {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  data_type: 'string' | 'number' | 'boolean' | 'json' | 'url' | 'secret';
  is_secret: boolean;
  is_system: boolean;
  updated_by?: string;
  updated_at: string;
}

export interface UpdateConfigurationInput {
  key: string;
  value: string;
  change_reason?: string;
}

export interface CreateConfigurationInput {
  key: string;
  value: string;
  category: string;
  description?: string;
  data_type?: string;
  is_secret?: boolean;
}

export interface ConfigurationOperationResponse {
  success: boolean;
  message?: string;
  configuration?: Configuration;
}

export interface ConfigurationAuditLog {
  id: string;
  config_key: string;
  old_value?: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
  change_reason?: string;
}

export interface ConfigurationValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}
