# Admin Settings Page

## Overview

The Admin Settings page provides a comprehensive interface for managing system configuration across all services and components of the Rabbit Hole platform.

## Location

- **Frontend**: `/Users/kmk/rabbithole/frontend/src/app/admin/settings/page.tsx`
- **Backend Resolver**: `/Users/kmk/rabbithole/backend/src/resolvers/AdminConfigurationResolver.ts`
- **Backend Entity**: `/Users/kmk/rabbithole/backend/src/entities/SystemConfiguration.ts`
- **Database Migration**: `/Users/kmk/rabbithole/backend/migrations/017_system_configuration.sql`

## Features

### Configuration Management

- **Categorized Settings**: Configurations organized by service category
  - Database (PostgreSQL)
  - Redis & RabbitMQ
  - AI Models (OpenAI, Ollama)
  - Document Processing (Docling, Whisper)
  - Storage & Media
  - Security
  - System

- **Type-Aware Inputs**: Different input types based on data type
  - String: Text input
  - Number: Number input with validation
  - Boolean: Toggle switch
  - JSON: Textarea with JSON validation
  - URL: Text input with URL validation
  - Secret: Password input with show/hide toggle

### Security Features

- **Secret Masking**: Sensitive values (API keys, passwords) are masked by default
- **Audit Logging**: All configuration changes are logged with user, timestamp, and reason
- **Validation**: Real-time validation based on data type and key-specific rules
- **System Protection**: System-critical configs cannot be deleted

### User Experience

- **Real-time Search**: Filter configurations by key or description
- **Unsaved Changes Warning**: Warns before leaving page with unsaved changes
- **Batch Operations**: Save or discard multiple changes at once
- **Responsive Design**: Works on desktop and tablet
- **Dark Mode**: Full dark mode support

## GraphQL API

### Queries

```graphql
# Get all configurations (optionally filtered by category)
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

# Get single configuration by key
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

# Get audit log
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

# Validate configuration value
query ValidateConfiguration(
  $key: String!
  $value: String!
  $dataType: ConfigurationDataType!
) {
  validateConfiguration(key: $key, value: $value, dataType: $dataType) {
    is_valid
    errors
    warnings
  }
}
```

### Mutations

```graphql
# Update existing configuration
mutation UpdateConfiguration($input: UpdateConfigurationInput!) {
  updateConfiguration(input: $input) {
    success
    message
    configuration {
      id
      key
      value
      updated_at
    }
  }
}

# Create new configuration
mutation CreateConfiguration($input: CreateConfigurationInput!) {
  createConfiguration(input: $input) {
    success
    message
    configuration {
      id
      key
      value
    }
  }
}

# Reset to default value
mutation ResetConfiguration($key: String!) {
  resetConfiguration(key: $key) {
    success
    message
    configuration {
      id
      key
      value
    }
  }
}

# Delete configuration (non-system only)
mutation DeleteConfiguration($key: String!) {
  deleteConfiguration(key: $key) {
    success
    message
  }
}
```

## Database Schema

### SystemConfiguration Table

```sql
CREATE TABLE public."SystemConfiguration" (
    id uuid PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL,
    is_secret BOOLEAN NOT NULL DEFAULT false,
    is_system BOOLEAN NOT NULL DEFAULT false,
    updated_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### ConfigurationAuditLog Table

```sql
CREATE TABLE public."ConfigurationAuditLog" (
    id uuid PRIMARY KEY,
    config_key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by uuid NOT NULL REFERENCES public."Users"(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason TEXT
);
```

### ConfigurationDefaults Table

```sql
CREATE TABLE public."ConfigurationDefaults" (
    id uuid PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    default_value TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Connect to PostgreSQL
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# Run migration
\i /backend/migrations/017_system_configuration.sql

# Verify tables
\dt public."System*"
\dt public."Configuration*"
```

### 2. Initialize Default Configurations

The migration automatically seeds default configurations. To populate system configurations from defaults:

```sql
INSERT INTO public."SystemConfiguration" (key, value, category, description, data_type, is_system)
SELECT key, default_value, category, description, data_type, is_required
FROM public."ConfigurationDefaults"
WHERE is_required = true
ON CONFLICT (key) DO NOTHING;
```

### 3. Access the Admin Page

Navigate to: `http://localhost:3000/admin/settings`

Note: You must be authenticated with admin privileges to access this page.

## Usage Examples

### Adding a New Configuration

1. Navigate to the appropriate tab (e.g., "AI Models")
2. Click "+ Add Configuration" (if implemented)
3. Enter key (e.g., `openai.max_tokens`)
4. Enter value (e.g., `4000`)
5. Select category and data type
6. Add description
7. Mark as secret if needed
8. Click "Save"

### Updating a Configuration

1. Find the configuration using search or tabs
2. Modify the value in the input field
3. The card will show "(Modified)" badge
4. Click "Save" on the individual card, or
5. Click "Save All" to batch update all changes

### Resetting to Default

1. Find the configuration
2. Click "Reset" button
3. Confirm the action
4. Value will revert to default from ConfigurationDefaults table

## Security Considerations

- All mutations require authentication
- TODO: Add role-based access control (admin only)
- Secret values are masked in queries (show last 4 characters only)
- Audit log tracks all changes with user ID
- System configurations cannot be deleted
- Input validation prevents invalid values

## Future Enhancements

- [ ] Test connection buttons for each service
- [ ] Export/import configuration as JSON
- [ ] Bulk edit mode
- [ ] Configuration templates
- [ ] Environment-specific configs (dev/staging/prod)
- [ ] Configuration versioning with rollback
- [ ] Real-time config updates (pub/sub)
- [ ] Configuration dependencies and validation rules
- [ ] Configuration groups and permissions

## Troubleshooting

### Configurations Not Loading

1. Check database connection
2. Verify migration has been run
3. Check browser console for GraphQL errors
4. Verify authentication token

### Unable to Save Changes

1. Check validation errors displayed below input
2. Verify user has admin privileges
3. Check if configuration is system-protected
4. Review audit log for conflicts

### Secret Values Not Masking

1. Verify `is_secret` flag is set in database
2. Check resolver masking logic
3. Ensure GraphQL returns MaskedConfiguration type

## Related Documentation

- [GraphQL Schema](../backend/src/entities/SystemConfiguration.ts)
- [Database Migration](../backend/migrations/017_system_configuration.sql)
- [Admin Resolver](../backend/src/resolvers/AdminConfigurationResolver.ts)
- [GraphQL Queries](../frontend/src/graphql/queries/admin-config.ts)
