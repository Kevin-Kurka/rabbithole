# Admin Configuration System

A comprehensive system configuration management solution for the Rabbit Hole backend with security, validation, and audit logging.

## Overview

The Admin Configuration System provides centralized management of all system settings including:
- Database connection parameters
- Redis cache settings
- RabbitMQ queue configuration
- AI service credentials (OpenAI, Ollama)
- Media processing settings (FFmpeg, Whisper, Tesseract)
- Storage configuration (local, S3, R2)
- Security settings

## Features

### 1. Configuration Categories

Configurations are organized into logical categories:

- **database**: PostgreSQL connection pool settings
- **redis**: Redis cache and connection parameters
- **rabbitmq**: Message queue configuration
- **openai**: OpenAI API settings and model selection
- **ollama**: Local LLM configuration
- **docling**: Document processing service settings
- **whisper**: Audio transcription configuration
- **storage**: File storage provider settings
- **media**: FFmpeg and Tesseract configuration
- **system**: General system settings
- **security**: Security and authentication parameters

### 2. Data Type Validation

Each configuration has a typed value with automatic validation:

- **string**: Any text value
- **number**: Numeric values (validated as numbers)
- **boolean**: true/false values
- **json**: JSON objects (validated as valid JSON)
- **url**: URL strings (validated as valid URLs)
- **secret**: Sensitive values (masked in API responses)

### 3. Security Features

#### Secret Masking
Configurations marked as `is_secret: true` have their values masked in API responses:
```
Original: sk-1234567890abcdef1234567890abcdef
Returned: **************************cdef
```

#### Authentication Required
All configuration operations require authentication. Admin role checking can be easily added:

```typescript
private ensureAuthenticated(ctx: Context): void {
  if (!ctx.userId) {
    throw new Error('Authentication required. Admin access only.');
  }
  // Add admin role check here
}
```

#### Audit Logging
Every configuration change is logged with:
- Configuration key
- Old value
- New value
- User who made the change
- Timestamp
- Optional reason for change

### 4. System Protection

Configurations marked as `is_system: true` cannot be deleted, protecting critical settings.

## Database Schema

### SystemConfiguration Table

```sql
CREATE TABLE public."SystemConfiguration" (
    id uuid PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    updated_by uuid REFERENCES "Users"(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ConfigurationAuditLog Table

```sql
CREATE TABLE public."ConfigurationAuditLog" (
    id uuid PRIMARY KEY,
    config_key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by uuid NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    change_reason TEXT
);
```

### ConfigurationDefaults Table

```sql
CREATE TABLE public."ConfigurationDefaults" (
    id uuid PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    default_value TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## GraphQL API

### Queries

#### Get Single Configuration
```graphql
query GetConfiguration {
  getConfiguration(key: "openai.model") {
    id
    key
    value
    category
    description
    data_type
    is_secret
    is_system
    updated_at
  }
}
```

#### Get All Configurations
```graphql
query GetAllConfigurations {
  getAllConfigurations(category: OPENAI) {
    id
    key
    value
    category
    description
    data_type
    is_secret
  }
}
```

#### Get Configuration Categories
```graphql
query GetCategories {
  getConfigurationCategories
}
```

#### Get Audit Log
```graphql
query GetAuditLog {
  getConfigurationAuditLog(configKey: "openai.api_key", limit: 50) {
    id
    config_key
    old_value
    new_value
    changed_by
    changed_at
    change_reason
  }
}
```

#### Validate Configuration
```graphql
query ValidateConfig {
  validateConfiguration(
    key: "database.pool.max"
    value: "20"
    dataType: NUMBER
  ) {
    is_valid
    errors
    warnings
  }
}
```

### Mutations

#### Create Configuration
```graphql
mutation CreateConfig {
  createConfiguration(input: {
    key: "openai.api_key"
    value: "sk-1234567890abcdef"
    category: OPENAI
    description: "OpenAI API Key"
    data_type: SECRET
    is_secret: true
  }) {
    success
    message
    configuration {
      id
      key
      value
      category
    }
  }
}
```

#### Update Configuration
```graphql
mutation UpdateConfig {
  updateConfiguration(input: {
    key: "openai.model"
    value: "gpt-4-turbo-preview"
    change_reason: "Upgrading to latest model"
  }) {
    success
    message
    configuration {
      key
      value
      updated_at
    }
  }
}
```

#### Reset Configuration
```graphql
mutation ResetConfig {
  resetConfiguration(key: "openai.temperature") {
    success
    message
    configuration {
      key
      value
    }
  }
}
```

#### Delete Configuration
```graphql
mutation DeleteConfig {
  deleteConfiguration(key: "custom.setting") {
    success
    message
  }
}
```

## Configuration Keys Reference

### Database Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `database.pool.max` | 20 | number | Maximum connections in pool |
| `database.pool.min` | 2 | number | Minimum connections in pool |
| `database.pool.idle_timeout` | 30000 | number | Idle timeout (ms) |
| `database.pool.connection_timeout` | 2000 | number | Connection timeout (ms) |
| `database.query_timeout` | 30000 | number | Query timeout (ms) |

### Redis Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `redis.cache.ttl` | 3600 | number | Default TTL (seconds) |
| `redis.cache.max_size` | 1000 | number | Max items in cache |
| `redis.connection.retry_delay` | 1000 | number | Retry delay (ms) |
| `redis.connection.max_retries` | 10 | number | Maximum retries |

### RabbitMQ Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `rabbitmq.queue.vectorization` | vectorization_queue | string | Vectorization queue name |
| `rabbitmq.queue.notifications` | notifications_queue | string | Notifications queue name |
| `rabbitmq.prefetch` | 10 | number | Prefetch count |
| `rabbitmq.connection.heartbeat` | 60 | number | Heartbeat interval (s) |

### OpenAI Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `openai.api_key` | (required) | secret | OpenAI API key |
| `openai.model` | gpt-4-turbo-preview | string | Default GPT model |
| `openai.embedding_model` | text-embedding-3-small | string | Embedding model |
| `openai.temperature` | 0.7 | number | Default temperature |
| `openai.max_tokens` | 2000 | number | Max tokens per request |
| `openai.timeout` | 30000 | number | Request timeout (ms) |

### Ollama Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `ollama.url` | http://localhost:11434 | url | Ollama server URL |
| `ollama.chat_model` | llama2 | string | Chat completion model |
| `ollama.embedding_model` | llama2 | string | Embedding model |
| `ollama.vision_model` | llava | string | Vision/image model |
| `ollama.timeout` | 60000 | number | Request timeout (ms) |

### Docling Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `docling.url` | http://localhost:8080 | url | Docling server URL |
| `docling.timeout` | 30000 | number | Request timeout (ms) |
| `docling.max_file_size` | 52428800 | number | Max file size (bytes) |

### Whisper Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `whisper.model` | base | string | Model size (tiny/base/small/medium/large) |
| `whisper.language` | en | string | Default language code |
| `whisper.max_retries` | 3 | number | Maximum retry attempts |
| `whisper.retry_delay` | 1000 | number | Delay between retries (ms) |

### Storage Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `storage.provider` | local | string | Provider (local/s3/r2) |
| `storage.local.path` | /app/storage | string | Local storage path |
| `storage.s3.bucket` | (optional) | string | S3 bucket name |
| `storage.s3.region` | (optional) | string | S3 region |
| `storage.s3.access_key` | (optional) | secret | S3 access key |
| `storage.s3.secret_key` | (optional) | secret | S3 secret key |
| `storage.max_upload_size` | 104857600 | number | Max upload (bytes) |
| `storage.allowed_types` | ["image/*",...] | json | Allowed MIME types |

### Media Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `media.ffmpeg.path` | /usr/bin/ffmpeg | string | FFmpeg binary path |
| `media.ffmpeg.threads` | 4 | number | Processing threads |
| `media.tesseract.config` | --oem 3 --psm 3 | string | Tesseract config |
| `media.tesseract.lang` | eng | string | Language packs |
| `media.image.max_dimension` | 4096 | number | Max image size (px) |

### Security Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `security.jwt.expiry` | 86400 | number | JWT expiry (seconds) |
| `security.jwt.secret` | (required) | secret | JWT signing secret |
| `security.password.min_length` | 8 | number | Min password length |
| `security.rate_limit.window` | 900000 | number | Rate limit window (ms) |
| `security.rate_limit.max_requests` | 100 | number | Max requests/window |

### System Configuration

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `system.environment` | development | string | Environment name |
| `system.log_level` | info | string | Logging level |
| `system.enable_metrics` | true | boolean | Enable metrics |
| `system.enable_tracing` | false | boolean | Enable tracing |

## Usage Examples

### TypeScript/Node.js Service Integration

```typescript
import { Pool } from 'pg';

class ConfigurationService {
  constructor(private pool: Pool) {}

  async getConfig<T>(key: string): Promise<T | null> {
    const result = await this.pool.query(
      'SELECT value, data_type FROM public."SystemConfiguration" WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) return null;

    const { value, data_type } = result.rows[0];

    switch (data_type) {
      case 'number':
        return Number(value) as T;
      case 'boolean':
        return (value === 'true' || value === '1') as T;
      case 'json':
        return JSON.parse(value) as T;
      default:
        return value as T;
    }
  }

  async getOpenAIModel(): Promise<string> {
    return await this.getConfig<string>('openai.model') ?? 'gpt-4-turbo-preview';
  }

  async getDatabasePoolMax(): Promise<number> {
    return await this.getConfig<number>('database.pool.max') ?? 20;
  }
}
```

### Frontend Admin Panel Example (React)

```typescript
import { useMutation, useQuery } from '@apollo/client';
import { GET_ALL_CONFIGURATIONS, UPDATE_CONFIGURATION } from './queries';

function AdminConfigPanel() {
  const { data, loading } = useQuery(GET_ALL_CONFIGURATIONS, {
    variables: { category: 'OPENAI' }
  });

  const [updateConfig] = useMutation(UPDATE_CONFIGURATION);

  const handleUpdate = async (key: string, value: string) => {
    await updateConfig({
      variables: {
        input: { key, value, change_reason: 'Admin panel update' }
      }
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>OpenAI Configuration</h2>
      {data.getAllConfigurations.map(config => (
        <ConfigItem
          key={config.key}
          config={config}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}
```

## Security Best Practices

1. **Always authenticate requests**: Ensure only admin users can access configuration endpoints
2. **Use secret type for sensitive data**: API keys, passwords, tokens should use `data_type: SECRET`
3. **Review audit logs regularly**: Monitor for unauthorized changes
4. **Validate before saving**: Use the validation endpoint before updating
5. **Use change_reason field**: Document why configurations were changed
6. **Rotate secrets regularly**: Update API keys and secrets periodically
7. **Limit configuration access**: Implement role-based access control

## Installation & Setup

1. **Run the migration**:
```bash
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/017_system_configuration.sql
```

2. **Verify tables created**:
```sql
SELECT * FROM public."SystemConfiguration";
SELECT * FROM public."ConfigurationDefaults";
```

3. **Initialize required configurations**:
```sql
INSERT INTO public."SystemConfiguration" (key, value, category, description, data_type, is_system)
SELECT key, default_value, category, description, data_type, is_required
FROM public."ConfigurationDefaults"
WHERE is_required = true;
```

4. **Test GraphQL endpoint**:
```bash
# Navigate to http://localhost:4000/graphql
# Run test query:
query {
  getConfigurationCategories
}
```

## Troubleshooting

### Issue: "Authentication required" error
**Solution**: Ensure `x-user-id` header is set in GraphQL requests or implement proper JWT authentication.

### Issue: Configuration not found
**Solution**: Check if the configuration exists in the database. Create it using `createConfiguration` mutation.

### Issue: Validation errors
**Solution**: Review the `validateConfiguration` query response for specific errors. Ensure the value matches the expected `data_type`.

### Issue: Cannot delete configuration
**Solution**: System configurations (`is_system: true`) cannot be deleted. Use `updateConfiguration` instead.

## Future Enhancements

- [ ] Role-based access control (RBAC) for configuration management
- [ ] Configuration versioning with rollback capability
- [ ] Encrypted storage for secret values
- [ ] Configuration import/export functionality
- [ ] Real-time configuration updates via subscriptions
- [ ] Configuration templates for different environments
- [ ] Bulk update operations
- [ ] Configuration dependencies and validation rules
- [ ] Automatic configuration backup before changes
- [ ] Integration with external secret managers (Vault, AWS Secrets Manager)

## Contributing

When adding new configuration keys:

1. Add to `ConfigurationDefaults` table
2. Document in this README
3. Add validation rules if needed
4. Update service integration examples
5. Test configuration retrieval and updates

## License

Part of the Project Rabbit Hole backend system.
