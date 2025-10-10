# Evidence Management File Storage Strategy

## Overview

This document outlines the file storage strategy for the Evidence Management system, covering local development, production S3 storage, cost optimization, and scalability considerations.

---

## Storage Architecture

### Multi-Provider Support

The system supports multiple storage providers through the `storage_provider` enum:

- **local**: Local filesystem (development/testing)
- **s3**: AWS S3 (production primary)
- **gcs**: Google Cloud Storage (alternative)
- **azure**: Azure Blob Storage (alternative)
- **cloudflare_r2**: Cloudflare R2 (cost-effective alternative)
- **cdn**: CDN for public assets

### Storage Decision Tree

```
┌─────────────────────┐
│   File Upload       │
└──────────┬──────────┘
           │
           ▼
     ┌─────────┐
     │ Dev Env?│
     └────┬────┘
          │
    ┌─────┴─────┐
    │           │
   Yes         No
    │           │
    ▼           ▼
  LOCAL    ┌─────────┐
           │ Public? │
           └────┬────┘
                │
          ┌─────┴─────┐
          │           │
         Yes         No
          │           │
          ▼           ▼
     CDN + S3      S3 Only
```

---

## Local Development Setup

### Configuration

```env
# .env.development
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/var/rabbithole/evidence
STORAGE_LOCAL_MAX_SIZE_MB=100
STORAGE_LOCAL_ALLOWED_TYPES=pdf,png,jpg,jpeg,gif,mp4,mp3,csv,json,zip
```

### Directory Structure

```
/var/rabbithole/evidence/
├── uploads/
│   ├── {year}/
│   │   ├── {month}/
│   │   │   ├── {day}/
│   │   │   │   ├── {uuid}.{ext}
│   │   │   │   └── {uuid}_thumb.{ext}
├── processing/
│   └── {uuid}.tmp
├── quarantine/
│   └── {uuid}.quarantine
└── metadata/
    └── {uuid}.json
```

### Implementation

```typescript
// src/services/storage/LocalStorageProvider.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export class LocalStorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async uploadFile(
    file: Express.Multer.File,
    evidenceId: string
  ): Promise<{ storageKey: string; fileHash: string }> {
    // Calculate file hash
    const fileHash = await this.calculateHash(file.buffer);

    // Check for duplicates
    const existing = await this.findByHash(fileHash);
    if (existing) {
      return { storageKey: existing.storageKey, fileHash };
    }

    // Generate storage path
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const dir = path.join(this.basePath, 'uploads', `${year}`, month, day);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `${evidenceId}${ext}`;
    const storageKey = path.join(`${year}`, month, day, filename);
    const fullPath = path.join(dir, filename);

    // Write file
    await fs.writeFile(fullPath, file.buffer);

    // Generate thumbnail if image
    if (this.isImage(file.mimetype)) {
      await this.generateThumbnail(fullPath, `${fullPath}_thumb${ext}`);
    }

    return { storageKey, fileHash };
  }

  private async calculateHash(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private async generateThumbnail(source: string, dest: string): Promise<void> {
    // Use sharp for image processing
    const sharp = require('sharp');
    await sharp(source)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .toFile(dest);
  }

  async getFileUrl(storageKey: string): Promise<string> {
    // For local dev, return localhost URL
    return `http://localhost:4000/evidence/files/${storageKey}`;
  }

  async deleteFile(storageKey: string): Promise<void> {
    const fullPath = path.join(this.basePath, 'uploads', storageKey);
    await fs.unlink(fullPath).catch(() => {});
  }
}
```

---

## Production S3 Setup

### AWS S3 Configuration

```env
# .env.production
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=rabbithole-evidence-prod
AWS_S3_BUCKET_PRIVATE=rabbithole-evidence-private
AWS_CLOUDFRONT_DISTRIBUTION=d1234567890.cloudfront.net
AWS_ACCESS_KEY_ID=<from-secrets-manager>
AWS_SECRET_ACCESS_KEY=<from-secrets-manager>
```

### S3 Bucket Structure

```
rabbithole-evidence-prod/
├── evidence/
│   ├── documents/
│   │   └── {uuid}.{ext}
│   ├── images/
│   │   └── {uuid}.{ext}
│   ├── videos/
│   │   └── {uuid}.{ext}
│   └── datasets/
│       └── {uuid}.{ext}
├── thumbnails/
│   └── {uuid}_thumb.{ext}
├── processed/
│   └── {uuid}_processed.{ext}
└── archives/
    └── {year}/{month}/
```

### S3 Bucket Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rabbithole-evidence-prod/public/*"
    },
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::rabbithole-evidence-prod/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

### S3 Lifecycle Rules

```json
{
  "Rules": [
    {
      "Id": "archive-old-evidence",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 180,
          "StorageClass": "GLACIER"
        }
      ],
      "Filter": {
        "Prefix": "evidence/"
      }
    },
    {
      "Id": "delete-processing-temp-files",
      "Status": "Enabled",
      "Expiration": {
        "Days": 1
      },
      "Filter": {
        "Prefix": "processing/"
      }
    }
  ]
}
```

### Implementation

```typescript
// src/services/storage/S3StorageProvider.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

export class S3StorageProvider {
  private s3Client: S3Client;
  private bucket: string;
  private cdnDomain: string;

  constructor(region: string, bucket: string, cdnDomain?: string) {
    this.s3Client = new S3Client({ region });
    this.bucket = bucket;
    this.cdnDomain = cdnDomain;
  }

  async uploadFile(
    file: Express.Multer.File,
    evidenceId: string,
    isPublic: boolean = false
  ): Promise<{ storageKey: string; fileHash: string; cdnUrl?: string }> {
    // Calculate file hash
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Generate S3 key
    const fileType = this.getFileType(file.mimetype);
    const ext = path.extname(file.originalname);
    const storageKey = `evidence/${fileType}/${evidenceId}${ext}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'evidence-id': evidenceId,
        'file-hash': fileHash,
        'original-filename': file.originalname,
      },
      ACL: isPublic ? 'public-read' : 'private',
    });

    await this.s3Client.send(command);

    // Generate thumbnail if image
    let thumbnailKey: string | undefined;
    if (this.isImage(file.mimetype)) {
      thumbnailKey = await this.generateThumbnail(file, evidenceId);
    }

    // Generate CDN URL if available
    const cdnUrl = this.cdnDomain && isPublic
      ? `https://${this.cdnDomain}/${storageKey}`
      : undefined;

    return { storageKey, fileHash, cdnUrl };
  }

  async getSignedDownloadUrl(storageKey: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    await this.s3Client.send(command);
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'documents';
    if (mimeType.includes('csv') || mimeType.includes('json')) return 'datasets';
    return 'other';
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private async generateThumbnail(
    file: Express.Multer.File,
    evidenceId: string
  ): Promise<string> {
    const sharp = require('sharp');
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    const ext = path.extname(file.originalname);
    const thumbnailKey = `thumbnails/${evidenceId}_thumb${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
      ACL: 'public-read',
    });

    await this.s3Client.send(command);
    return thumbnailKey;
  }
}
```

---

## Cost Optimization

### Storage Tier Strategy

| Tier | Use Case | Cost | Access Time |
|------|----------|------|-------------|
| S3 Standard | Active evidence (0-90 days) | $0.023/GB | Instant |
| S3 IA | Older evidence (90-180 days) | $0.0125/GB | Instant |
| S3 Glacier | Archive (180+ days) | $0.004/GB | Minutes-Hours |
| S3 Glacier Deep | Long-term archive (1+ year) | $0.00099/GB | 12 hours |

### Cost Estimation

```typescript
// Calculate monthly storage costs
function estimateStorageCost(fileSizeBytes: number, accessFrequency: string): number {
  const sizeGB = fileSizeBytes / (1024 ** 3);

  // Storage cost
  let storageCostPerGB = 0.023; // S3 Standard
  if (accessFrequency === 'rare') storageCostPerGB = 0.0125; // S3 IA
  if (accessFrequency === 'archive') storageCostPerGB = 0.004; // Glacier

  const storageCost = sizeGB * storageCostPerGB;

  // Request costs (estimate)
  const requestCost = 0.0004; // Per 1000 GET requests

  // Data transfer costs (first GB free, then $0.09/GB)
  const transferCost = Math.max(0, (sizeGB - 1) * 0.09);

  return storageCost + requestCost + transferCost;
}
```

### Deduplication Strategy

```sql
-- Find duplicate files to save storage
SELECT
    file_hash,
    COUNT(*) AS duplicate_count,
    SUM(file_size) AS total_wasted_bytes,
    (SUM(file_size) - MAX(file_size)) AS savings_bytes,
    array_agg(id) AS evidence_file_ids
FROM public."EvidenceFiles"
WHERE deleted_at IS NULL
GROUP BY file_hash
HAVING COUNT(*) > 1
ORDER BY savings_bytes DESC;

-- Deduplicate by updating storage keys to point to same file
UPDATE public."EvidenceFiles" ef1
SET storage_key = ef2.storage_key
FROM public."EvidenceFiles" ef2
WHERE ef1.file_hash = ef2.file_hash
    AND ef1.id > ef2.id
    AND ef1.deleted_at IS NULL
    AND ef2.deleted_at IS NULL;
```

### Access Pattern Optimization

```typescript
// Track access patterns for intelligent tiering
async function trackFileAccess(evidenceFileId: string): Promise<void> {
  await db.query(`
    UPDATE public."EvidenceFiles"
    SET
      access_count = access_count + 1,
      last_accessed_at = now()
    WHERE id = $1
  `, [evidenceFileId]);
}

// Background job: Move rarely accessed files to cheaper storage
async function optimizeStorageTiers(): Promise<void> {
  // Move files not accessed in 90 days to IA
  const oldFiles = await db.query(`
    SELECT * FROM public."EvidenceFiles"
    WHERE storage_provider = 's3'
      AND last_accessed_at < now() - INTERVAL '90 days'
      AND storage_key NOT LIKE '%/ia/%'
  `);

  for (const file of oldFiles) {
    await s3Client.copyObject({
      CopySource: `${bucket}/${file.storage_key}`,
      Bucket: bucket,
      Key: file.storage_key.replace('/evidence/', '/evidence/ia/'),
      StorageClass: 'STANDARD_IA',
    });
  }
}
```

---

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Upload API  │     │ Upload API  │     │ Upload API  │
│   Server 1  │     │   Server 2  │     │   Server 3  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                  ┌────────▼────────┐
                  │   Load Balancer │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │   AWS S3 Bucket │
                  └─────────────────┘
```

### Database Partitioning

```sql
-- Partition EvidenceFiles by year for better performance
CREATE TABLE public."EvidenceFiles_2025" PARTITION OF public."EvidenceFiles"
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE public."EvidenceFiles_2026" PARTITION OF public."EvidenceFiles"
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Partition EvidenceAuditLog by month
CREATE TABLE public."EvidenceAuditLog_202510" PARTITION OF public."EvidenceAuditLog"
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

### CDN Configuration

```nginx
# CloudFront distribution settings
location /evidence/public/ {
    # Cache static evidence files for 1 year
    expires 1y;
    add_header Cache-Control "public, immutable";

    # CORS headers for cross-origin requests
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";

    # Security headers
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "DENY";
}
```

### Virus Scanning at Scale

```typescript
// Integrate with ClamAV or AWS GuardDuty
async function scanFile(storageKey: string): Promise<{ status: string; result: any }> {
  // Option 1: Use AWS Lambda with ClamAV
  const lambdaClient = new LambdaClient({ region: 'us-east-1' });
  const response = await lambdaClient.send(new InvokeCommand({
    FunctionName: 'evidence-virus-scanner',
    Payload: JSON.stringify({ storageKey }),
  }));

  const result = JSON.parse(Buffer.from(response.Payload).toString());

  // Update database
  await db.query(`
    UPDATE public."EvidenceFiles"
    SET
      virus_scan_status = $1,
      virus_scan_date = now(),
      virus_scan_result = $2,
      processing_status = CASE
        WHEN $1 = 'clean' THEN 'completed'
        WHEN $1 = 'infected' THEN 'quarantined'
        ELSE 'failed'
      END
    WHERE storage_key = $3
  `, [result.status, result, storageKey]);

  return result;
}
```

---

## Backup and Disaster Recovery

### S3 Versioning and Replication

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket rabbithole-evidence-prod \
  --versioning-configuration Status=Enabled

# Configure cross-region replication
aws s3api put-bucket-replication \
  --bucket rabbithole-evidence-prod \
  --replication-configuration file://replication-config.json
```

```json
{
  "Role": "arn:aws:iam::account-id:role/replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": "evidence/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::rabbithole-evidence-backup",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        }
      }
    }
  ]
}
```

### Database Backup

```bash
# Daily backup of evidence metadata
pg_dump -h localhost -U postgres -d rabbithole \
  -t '"EvidenceFiles"' \
  -t '"EvidenceMetadata"' \
  -t '"EvidenceAttachments"' \
  | gzip > evidence_backup_$(date +%Y%m%d).sql.gz

# Upload to S3 for long-term storage
aws s3 cp evidence_backup_$(date +%Y%m%d).sql.gz \
  s3://rabbithole-backups/database/evidence/
```

---

## Monitoring and Alerts

### CloudWatch Metrics

```typescript
// Track custom metrics
const cloudwatch = new CloudWatchClient({ region: 'us-east-1' });

async function trackUploadMetrics(fileSize: number, duration: number): Promise<void> {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'RabbitHole/Evidence',
    MetricData: [
      {
        MetricName: 'FileUploadSize',
        Value: fileSize,
        Unit: 'Bytes',
        Timestamp: new Date(),
      },
      {
        MetricName: 'UploadDuration',
        Value: duration,
        Unit: 'Milliseconds',
        Timestamp: new Date(),
      },
    ],
  }));
}
```

### Alert Configuration

```yaml
# cloudwatch-alarms.yaml
Alarms:
  - Name: HighStorageCost
    MetricName: EstimatedCharges
    Threshold: 1000  # USD
    ComparisonOperator: GreaterThanThreshold
    EvaluationPeriods: 1

  - Name: HighVirusDetectionRate
    MetricName: InfectedFiles
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold
    EvaluationPeriods: 1

  - Name: LowUploadSuccessRate
    MetricName: UploadSuccessRate
    Threshold: 95
    ComparisonOperator: LessThanThreshold
    EvaluationPeriods: 2
```

---

## Security Best Practices

### Encryption

- **At Rest**: S3 server-side encryption (SSE-S3 or SSE-KMS)
- **In Transit**: TLS 1.3 for all uploads/downloads
- **Application**: Encrypt sensitive metadata in database

### Access Control

```typescript
// Generate time-limited signed URLs for downloads
async function getSecureDownloadUrl(
  evidenceFileId: string,
  userId: string
): Promise<string> {
  // Check permissions
  const hasAccess = await checkUserAccess(evidenceFileId, userId);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  // Get file info
  const file = await db.query(
    'SELECT storage_key FROM public."EvidenceFiles" WHERE id = $1',
    [evidenceFileId]
  );

  // Generate signed URL (valid for 1 hour)
  return s3Provider.getSignedDownloadUrl(file.storage_key, 3600);
}
```

### Rate Limiting

```typescript
// Implement rate limiting for uploads
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: 'Too many uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/evidence/upload', uploadLimiter, uploadHandler);
```

---

## Testing Strategy

### Local Testing

```typescript
// Mock S3 for local testing
import { S3Mock } from '@aws-sdk/s3-mock';

describe('S3StorageProvider', () => {
  let s3Mock: S3Mock;
  let provider: S3StorageProvider;

  beforeEach(() => {
    s3Mock = new S3Mock();
    provider = new S3StorageProvider('us-east-1', 'test-bucket');
  });

  it('should upload file to S3', async () => {
    const file = createMockFile('test.pdf', 'application/pdf');
    const result = await provider.uploadFile(file, 'test-evidence-id');

    expect(result.storageKey).toContain('evidence/documents/');
    expect(result.fileHash).toHaveLength(64); // SHA256
  });
});
```

### Integration Testing

```bash
# Test with localstack (S3 emulator)
docker run -d -p 4566:4566 localstack/localstack

# Run integration tests
npm run test:integration
```

---

## Migration Path

### Phase 1: Development (Local Storage)
- Implement local file storage
- Test upload/download flows
- Implement virus scanning

### Phase 2: Staging (S3 with Test Bucket)
- Set up S3 test bucket
- Implement S3 provider
- Test with production-like data

### Phase 3: Production (S3 with CloudFront)
- Deploy to production S3
- Enable CloudFront CDN
- Monitor costs and performance

### Phase 4: Optimization
- Implement deduplication
- Configure lifecycle policies
- Set up cross-region replication

---

## Conclusion

This file storage strategy provides a robust, scalable, and cost-effective solution for managing evidence files. Key benefits:

- **Flexibility**: Multi-provider support
- **Performance**: CDN integration for fast delivery
- **Cost-Effective**: Intelligent tiering and deduplication
- **Secure**: Encryption, signed URLs, virus scanning
- **Scalable**: Handles millions of files with partitioning
- **Reliable**: Cross-region replication and backups

Total estimated cost for 1TB of evidence storage: **$20-30/month** (S3 Standard with CloudFront).
