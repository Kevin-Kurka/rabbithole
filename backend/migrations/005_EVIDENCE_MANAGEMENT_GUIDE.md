# Evidence Management System - Complete Guide

## Overview

The Evidence Management System provides a comprehensive solution for storing, managing, and reviewing evidence attached to nodes and edges in the knowledge graph. This guide covers installation, usage, API integration, and best practices.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Database Schema](#database-schema)
5. [API Implementation](#api-implementation)
6. [File Storage](#file-storage)
7. [Search Implementation](#search-implementation)
8. [Community Reviews](#community-reviews)
9. [Best Practices](#best-practices)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)

---

## Features

### Core Capabilities

- **Multi-Type Evidence**: Documents, images, videos, audio, datasets, links, citations
- **File Storage**: Local development, S3 production, multi-cloud support
- **Rich Metadata**: Authors, publications, DOI, keywords, geolocation, methodology
- **Community Reviews**: Quality scoring, credibility assessment, peer review
- **Duplicate Detection**: Hash-based file deduplication, fuzzy matching
- **Full-Text Search**: PostgreSQL FTS with GIN indexes, keyword search
- **Audit Logging**: Complete history of evidence operations
- **Virus Scanning**: Integration with ClamAV or cloud scanners
- **Access Control**: Public/private evidence, signed URLs
- **Cost Tracking**: Storage cost estimation and optimization

---

## Architecture

### System Components

```
┌──────────────┐
│   Client     │
│  (Browser)   │
└──────┬───────┘
       │
       │ HTTPS
       ▼
┌──────────────┐     ┌─────────────┐
│   GraphQL    │────▶│  Evidence   │
│     API      │     │  Service    │
└──────┬───────┘     └──────┬──────┘
       │                    │
       │                    ▼
       │            ┌─────────────┐     ┌─────────────┐
       │            │  Storage    │────▶│   AWS S3    │
       │            │  Provider   │     │  Cloudflare │
       │            └─────────────┘     └─────────────┘
       │
       ▼
┌──────────────┐
│  PostgreSQL  │
│   Database   │
└──────────────┘
```

### Data Flow

```
Upload Request → Validation → Virus Scan → Storage → Metadata Extraction
                                                              │
                                                              ▼
                                            Update Search Index + Audit Log
```

---

## Installation

### Step 1: Apply Migration

```bash
cd /Users/kmk/rabbithole/backend/migrations

# Check database connection
psql -h localhost -U postgres -d rabbithole -c "SELECT version();"

# Apply migration
psql -h localhost -U postgres -d rabbithole -f 005_evidence_management.sql

# Verify tables created
psql -h localhost -U postgres -d rabbithole -c "\dt public.\"Evidence*\""
```

### Step 2: Run Tests

```bash
# Run test suite
psql -h localhost -U postgres -d rabbithole -f 005_evidence_management_test.sql

# Check for any errors
echo $?  # Should return 0
```

### Step 3: Configure Storage

#### Local Development

```bash
# Create storage directories
mkdir -p /var/rabbithole/evidence/{uploads,processing,quarantine,metadata}

# Set permissions
chmod 755 /var/rabbithole/evidence
chown -R $(whoami) /var/rabbithole/evidence
```

```.env
# .env.development
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/var/rabbithole/evidence
STORAGE_MAX_FILE_SIZE_MB=100
```

#### Production (S3)

```bash
# Install AWS CLI
npm install @aws-sdk/client-s3

# Configure AWS credentials
aws configure
```

```.env
# .env.production
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=rabbithole-evidence-prod
AWS_CLOUDFRONT_DISTRIBUTION=d1234567890.cloudfront.net
```

### Step 4: Install Dependencies

```bash
cd /Users/kmk/rabbithole/backend

# Core dependencies
npm install \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  multer \
  sharp \
  crypto

# Optional: virus scanning
npm install clamav.js
```

---

## Database Schema

### Key Tables

#### EvidenceFiles
Stores file metadata and storage locations.

```sql
-- Example: Insert evidence file
INSERT INTO public."EvidenceFiles" (
    evidence_id,
    file_type,
    storage_provider,
    storage_key,
    file_hash,
    file_size,
    mime_type,
    original_filename,
    uploaded_by
) VALUES (
    '<evidence-uuid>',
    'document',
    's3',
    'evidence/documents/abc123.pdf',
    'sha256_hash_here',
    1048576,  -- 1MB
    'application/pdf',
    'research_paper.pdf',
    '<user-uuid>'
);
```

#### EvidenceMetadata
Rich metadata for evidence.

```sql
-- Example: Add metadata
INSERT INTO public."EvidenceMetadata" (
    evidence_id,
    authors,
    publication_date,
    doi,
    keywords,
    abstract,
    language
) VALUES (
    '<evidence-uuid>',
    ARRAY['John Doe', 'Jane Smith'],
    '2024-01-15',
    '10.1234/example.2024.001',
    ARRAY['climate', 'research', 'data'],
    'Comprehensive study of climate impacts...',
    'en'
);
```

#### EvidenceAttachments
Links evidence to multiple nodes/edges.

```sql
-- Example: Attach evidence to node
INSERT INTO public."EvidenceAttachments" (
    evidence_id,
    target_node_id,
    relevance_score,
    relevance_note,
    attached_by
) VALUES (
    '<evidence-uuid>',
    '<node-uuid>',
    0.95,
    'Primary supporting evidence for claim',
    '<user-uuid>'
);
```

#### EvidenceReviews
Community reviews and ratings.

```sql
-- Example: Submit review
INSERT INTO public."EvidenceReviews" (
    evidence_id,
    reviewer_id,
    quality_score,
    credibility_score,
    relevance_score,
    overall_rating,
    recommendation,
    review_text,
    reviewer_expertise_level
) VALUES (
    '<evidence-uuid>',
    '<reviewer-uuid>',
    0.85,
    0.90,
    0.88,
    5,
    'accept',
    'High-quality evidence with proper methodology',
    'expert'
);
```

### Key Functions

#### calculate_evidence_quality_score
Aggregates community reviews into quality score.

```sql
SELECT calculate_evidence_quality_score('<evidence-uuid>');
-- Returns: 0.82 (weighted average with confidence adjustment)
```

#### update_evidence_search_index
Updates full-text search index.

```sql
SELECT update_evidence_search_index('<evidence-uuid>');
-- Rebuilds search vector for evidence
```

#### detect_duplicate_evidence
Finds potential duplicates by file hash.

```sql
SELECT * FROM detect_duplicate_evidence('<evidence-uuid>', 'file_hash_here');
-- Returns: List of potentially duplicate evidence items
```

---

## API Implementation

### GraphQL Schema

```graphql
type EvidenceFile {
  id: ID!
  evidenceId: ID!
  fileType: EvidenceFileType!
  storageProvider: StorageProvider!
  fileSize: Int!
  mimeType: String!
  originalFilename: String!
  cdnUrl: String
  thumbnailUrl: String
  processingStatus: ProcessingStatus!
  virusScanStatus: VirusScanStatus!
  uploadedBy: User!
  uploadedAt: DateTime!
}

type EvidenceMetadata {
  id: ID!
  evidenceId: ID!
  authors: [String!]
  publicationDate: Date
  doi: String
  keywords: [String!]
  topics: [String!]
  abstract: String
  language: String
  geolocation: JSONObject
  sampleSize: Int
  peerReviewed: Boolean
  citationCount: Int
}

type EvidenceReview {
  id: ID!
  evidenceId: ID!
  reviewer: User!
  qualityScore: Float
  credibilityScore: Float
  relevanceScore: Float
  overallRating: Int
  recommendation: ReviewRecommendation
  reviewText: String
  helpfulCount: Int!
  notHelpfulCount: Int!
  createdAt: DateTime!
}

enum EvidenceFileType {
  DOCUMENT
  IMAGE
  VIDEO
  AUDIO
  LINK
  CITATION
  DATASET
  ARCHIVE
  PRESENTATION
  SPREADSHEET
  CODE
  OTHER
}

enum ReviewRecommendation {
  ACCEPT
  ACCEPT_WITH_REVISIONS
  NEEDS_VERIFICATION
  REJECT
  FLAG_FOR_REMOVAL
}

type Query {
  # Get evidence with full details
  evidence(id: ID!): Evidence

  # Search evidence by text
  searchEvidence(
    query: String!
    fileTypes: [EvidenceFileType!]
    limit: Int = 20
    offset: Int = 0
  ): [Evidence!]!

  # Get evidence for a node/edge
  nodeEvidence(nodeId: ID!): [Evidence!]!
  edgeEvidence(edgeId: ID!): [Evidence!]!

  # Get evidence reviews
  evidenceReviews(evidenceId: ID!): [EvidenceReview!]!

  # Get evidence quality report
  evidenceQualityReport(evidenceId: ID!): EvidenceQualityReport!
}

type Mutation {
  # Upload evidence file
  uploadEvidenceFile(
    input: UploadEvidenceFileInput!
  ): EvidenceFile!

  # Attach evidence to node/edge
  attachEvidence(
    input: AttachEvidenceInput!
  ): EvidenceAttachment!

  # Add/update evidence metadata
  updateEvidenceMetadata(
    input: UpdateEvidenceMetadataInput!
  ): EvidenceMetadata!

  # Submit evidence review
  submitEvidenceReview(
    input: SubmitEvidenceReviewInput!
  ): EvidenceReview!

  # Vote on review helpfulness
  voteOnReview(
    reviewId: ID!
    voteType: VoteType!
  ): EvidenceReview!

  # Delete evidence file
  deleteEvidenceFile(id: ID!): Boolean!
}
```

### Resolver Implementation

```typescript
// src/resolvers/evidenceResolvers.ts
import { GraphQLUpload } from 'graphql-upload';
import { S3StorageProvider } from '../services/storage/S3StorageProvider';
import { EvidenceService } from '../services/EvidenceService';

export const evidenceResolvers = {
  Upload: GraphQLUpload,

  Query: {
    evidence: async (_: any, { id }: { id: string }, context: Context) => {
      return context.services.evidence.getEvidenceById(id);
    },

    searchEvidence: async (
      _: any,
      { query, fileTypes, limit, offset }: SearchArgs,
      context: Context
    ) => {
      return context.services.evidence.searchEvidence({
        query,
        fileTypes,
        limit,
        offset,
      });
    },

    nodeEvidence: async (_: any, { nodeId }: { nodeId: string }, context: Context) => {
      return context.services.evidence.getEvidenceForNode(nodeId);
    },

    evidenceReviews: async (
      _: any,
      { evidenceId }: { evidenceId: string },
      context: Context
    ) => {
      return context.services.evidence.getReviews(evidenceId);
    },
  },

  Mutation: {
    uploadEvidenceFile: async (
      _: any,
      { input }: { input: UploadEvidenceFileInput },
      context: Context
    ) => {
      const { file, evidenceId, isPublic } = input;

      // Validate file
      await context.services.evidence.validateFile(file);

      // Scan for viruses
      const scanResult = await context.services.security.scanFile(file);
      if (scanResult.status === 'infected') {
        throw new Error('File contains malicious content');
      }

      // Upload to storage
      const storageResult = await context.services.storage.uploadFile(
        file,
        evidenceId,
        isPublic
      );

      // Save to database
      return context.services.evidence.createEvidenceFile({
        evidenceId,
        ...storageResult,
        uploadedBy: context.user.id,
      });
    },

    attachEvidence: async (
      _: any,
      { input }: { input: AttachEvidenceInput },
      context: Context
    ) => {
      return context.services.evidence.attachToTarget(input, context.user.id);
    },

    updateEvidenceMetadata: async (
      _: any,
      { input }: { input: UpdateEvidenceMetadataInput },
      context: Context
    ) => {
      return context.services.evidence.updateMetadata(input);
    },

    submitEvidenceReview: async (
      _: any,
      { input }: { input: SubmitEvidenceReviewInput },
      context: Context
    ) => {
      return context.services.evidence.submitReview(input, context.user.id);
    },

    voteOnReview: async (
      _: any,
      { reviewId, voteType }: { reviewId: string; voteType: string },
      context: Context
    ) => {
      return context.services.evidence.voteOnReview(
        reviewId,
        voteType,
        context.user.id
      );
    },
  },
};
```

### Service Implementation

```typescript
// src/services/EvidenceService.ts
import { Pool } from 'pg';
import { S3StorageProvider } from './storage/S3StorageProvider';
import { LocalStorageProvider } from './storage/LocalStorageProvider';

export class EvidenceService {
  private db: Pool;
  private storage: S3StorageProvider | LocalStorageProvider;

  constructor(db: Pool, storage: any) {
    this.db = db;
    this.storage = storage;
  }

  async getEvidenceById(id: string) {
    const result = await this.db.query(
      `SELECT * FROM public."EvidenceFullDetails" WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async searchEvidence({
    query,
    fileTypes,
    limit,
    offset,
  }: {
    query: string;
    fileTypes?: string[];
    limit: number;
    offset: number;
  }) {
    let sql = `
      SELECT
        esi.evidence_id,
        e.*,
        ts_rank(esi.search_vector, plainto_tsquery('english', $1)) AS rank
      FROM public."EvidenceSearchIndex" esi
      JOIN public."Evidence" e ON esi.evidence_id = e.id
      WHERE esi.search_vector @@ plainto_tsquery('english', $1)
    `;

    const params: any[] = [query];

    if (fileTypes && fileTypes.length > 0) {
      sql += ` AND esi.file_types && $${params.length + 1}`;
      params.push(fileTypes);
    }

    sql += ` ORDER BY rank DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(sql, params);
    return result.rows;
  }

  async createEvidenceFile(data: any) {
    const result = await this.db.query(
      `
      INSERT INTO public."EvidenceFiles" (
        evidence_id,
        file_type,
        storage_provider,
        storage_key,
        storage_bucket,
        file_hash,
        file_size,
        mime_type,
        original_filename,
        cdn_url,
        uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        data.evidenceId,
        data.fileType,
        data.storageProvider,
        data.storageKey,
        data.storageBucket,
        data.fileHash,
        data.fileSize,
        data.mimeType,
        data.originalFilename,
        data.cdnUrl,
        data.uploadedBy,
      ]
    );

    return result.rows[0];
  }

  async getEvidenceForNode(nodeId: string) {
    const result = await this.db.query(
      `
      SELECT DISTINCT e.*
      FROM public."Evidence" e
      LEFT JOIN public."EvidenceAttachments" ea ON e.id = ea.evidence_id
      WHERE e.target_node_id = $1
         OR (ea.target_node_id = $1 AND ea.detached_at IS NULL)
      ORDER BY e.created_at DESC
      `,
      [nodeId]
    );

    return result.rows;
  }

  async attachToTarget(
    input: AttachEvidenceInput,
    userId: string
  ) {
    const result = await this.db.query(
      `
      INSERT INTO public."EvidenceAttachments" (
        evidence_id,
        target_node_id,
        target_edge_id,
        relevance_score,
        relevance_note,
        attached_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        input.evidenceId,
        input.targetNodeId,
        input.targetEdgeId,
        input.relevanceScore,
        input.relevanceNote,
        userId,
      ]
    );

    return result.rows[0];
  }

  async submitReview(input: SubmitEvidenceReviewInput, userId: string) {
    const result = await this.db.query(
      `
      INSERT INTO public."EvidenceReviews" (
        evidence_id,
        reviewer_id,
        quality_score,
        credibility_score,
        relevance_score,
        clarity_score,
        overall_rating,
        recommendation,
        review_text,
        reviewer_expertise_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        input.evidenceId,
        userId,
        input.qualityScore,
        input.credibilityScore,
        input.relevanceScore,
        input.clarityScore,
        input.overallRating,
        input.recommendation,
        input.reviewText,
        input.expertiseLevel,
      ]
    );

    return result.rows[0];
  }

  async validateFile(file: any) {
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (file.size > maxSize) {
      throw new Error('File size exceeds maximum allowed (100MB)');
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'video/mp4',
      'audio/mp3',
      'text/csv',
      'application/json',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} not allowed`);
    }
  }
}
```

---

## File Storage

See [005_file_storage_strategy.md](./005_file_storage_strategy.md) for comprehensive file storage implementation.

### Quick Start

```typescript
// Initialize storage provider
const storage = process.env.NODE_ENV === 'production'
  ? new S3StorageProvider(
      process.env.AWS_REGION,
      process.env.AWS_S3_BUCKET,
      process.env.AWS_CLOUDFRONT_DISTRIBUTION
    )
  : new LocalStorageProvider(process.env.STORAGE_LOCAL_PATH);

// Upload file
const result = await storage.uploadFile(file, evidenceId, isPublic);
// Returns: { storageKey, fileHash, cdnUrl? }
```

---

## Search Implementation

### Full-Text Search

```typescript
// Search evidence by text
async function searchEvidence(query: string): Promise<Evidence[]> {
  const result = await db.query(
    `
    SELECT
      esi.evidence_id,
      e.*,
      ts_rank(esi.search_vector, plainto_tsquery('english', $1)) AS rank
    FROM public."EvidenceSearchIndex" esi
    JOIN public."Evidence" e ON esi.evidence_id = e.id
    WHERE esi.search_vector @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT 50
    `,
    [query]
  );

  return result.rows;
}
```

### Faceted Search

```typescript
// Search with filters
async function facetedSearch({
  query,
  fileTypes,
  authors,
  yearRange,
}: SearchFilters): Promise<Evidence[]> {
  let sql = `
    SELECT
      esi.evidence_id,
      e.*,
      ts_rank(esi.search_vector, plainto_tsquery('english', $1)) AS rank
    FROM public."EvidenceSearchIndex" esi
    JOIN public."Evidence" e ON esi.evidence_id = e.id
    WHERE esi.search_vector @@ plainto_tsquery('english', $1)
  `;

  const params = [query];

  if (fileTypes?.length > 0) {
    sql += ` AND esi.file_types && $2`;
    params.push(fileTypes);
  }

  if (authors?.length > 0) {
    sql += ` AND esi.authors && $${params.length + 1}`;
    params.push(authors);
  }

  if (yearRange) {
    sql += ` AND $${params.length + 1} = ANY(esi.publication_years)`;
    params.push(yearRange[0]);
  }

  sql += ` ORDER BY rank DESC LIMIT 50`;

  const result = await db.query(sql, params);
  return result.rows;
}
```

---

## Community Reviews

### Submitting Reviews

```graphql
mutation SubmitReview {
  submitEvidenceReview(
    input: {
      evidenceId: "evidence-uuid"
      qualityScore: 0.85
      credibilityScore: 0.90
      relevanceScore: 0.88
      clarityScore: 0.92
      overallRating: 5
      recommendation: ACCEPT
      reviewText: "High-quality evidence with proper methodology..."
      expertiseLevel: EXPERT
    }
  ) {
    id
    qualityScore
    createdAt
  }
}
```

### Calculating Aggregate Scores

```sql
-- Get aggregate review scores
SELECT
    er.evidence_id,
    COUNT(*) AS review_count,
    AVG(er.quality_score) AS avg_quality,
    AVG(er.credibility_score) AS avg_credibility,
    AVG(er.relevance_score) AS avg_relevance,
    AVG(er.overall_rating) AS avg_rating,
    calculate_evidence_quality_score(er.evidence_id) AS calculated_quality
FROM public."EvidenceReviews" er
WHERE er.status = 'active'
GROUP BY er.evidence_id;
```

---

## Best Practices

### 1. File Uploads

- **Validate file types and sizes** before upload
- **Scan for viruses** immediately after upload
- **Generate thumbnails** asynchronously for images
- **Use signed URLs** for private file access
- **Implement rate limiting** to prevent abuse

### 2. Metadata Management

- **Extract metadata automatically** when possible (PDF title, EXIF data)
- **Validate DOI and academic identifiers**
- **Geocode locations** for geographic evidence
- **Normalize author names** for consistent attribution

### 3. Search Optimization

- **Update search index asynchronously** via queue
- **Use materialized views** for complex aggregations
- **Implement search result caching**
- **Provide autocomplete** for keywords and authors

### 4. Community Reviews

- **Require minimum expertise level** for quality assessments
- **Weight reviews** by reviewer reputation
- **Flag conflicting reviews** for moderation
- **Incentivize high-quality reviews**

### 5. Performance

- **Paginate large result sets**
- **Cache frequently accessed evidence**
- **Use CDN** for public files
- **Partition large tables** by date
- **Monitor slow queries**

---

## Monitoring

### Key Metrics

```typescript
// Track upload success rate
const uploadSuccessRate = (
  successfulUploads / totalUploadAttempts
) * 100;

// Monitor storage costs
const monthlyCost = await db.query(`
  SELECT
    storage_provider,
    SUM(estimated_monthly_cost) AS total_cost
  FROM public."EvidenceFiles"
  WHERE deleted_at IS NULL
  GROUP BY storage_provider
`);

// Track search performance
const avgSearchTime = await db.query(`
  SELECT AVG(duration_ms) FROM search_query_log
  WHERE created_at > now() - INTERVAL '24 hours'
`);

// Monitor review activity
const reviewStats = await db.query(`
  SELECT
    COUNT(*) AS total_reviews,
    AVG(quality_score) AS avg_quality,
    COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days') AS recent_reviews
  FROM public."EvidenceReviews"
  WHERE status = 'active'
`);
```

### Alerting

- Upload failure rate > 5%
- Storage costs exceed budget
- Virus detection rate > threshold
- Search response time > 1 second
- Review submission drops suddenly

---

## Troubleshooting

### Common Issues

#### 1. File Upload Fails

**Symptoms**: Upload returns 500 error

**Causes**:
- File size exceeds limit
- Invalid file type
- Storage service unavailable
- Virus scan timeout

**Solutions**:
```typescript
// Check file size
if (file.size > maxSize) {
  throw new Error('File too large');
}

// Validate MIME type
if (!allowedTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

// Test storage connection
await storage.healthCheck();
```

#### 2. Search Returns No Results

**Symptoms**: Valid queries return empty results

**Causes**:
- Search index not updated
- Wrong language configuration
- No matching documents

**Solutions**:
```sql
-- Rebuild search index
SELECT update_evidence_search_index(evidence_id)
FROM public."Evidence";

-- Check index exists
SELECT evidence_id, search_vector IS NOT NULL
FROM public."EvidenceSearchIndex"
LIMIT 10;
```

#### 3. Duplicate Detection Not Working

**Symptoms**: Same file uploaded multiple times

**Causes**:
- Trigger not firing
- Hash calculation error
- Different file modifications

**Solutions**:
```sql
-- Manually run duplicate detection
SELECT * FROM detect_duplicate_evidence(
  '<evidence-uuid>',
  '<file-hash>'
);

-- Check trigger exists
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public."EvidenceFiles"'::regclass;
```

#### 4. High Storage Costs

**Symptoms**: S3 bill exceeds budget

**Causes**:
- Too many files in Standard tier
- No lifecycle policies
- Duplicate files not cleaned

**Solutions**:
```sql
-- Find large files
SELECT
  original_filename,
  file_size,
  storage_provider,
  last_accessed_at
FROM public."EvidenceFiles"
WHERE file_size > 100000000  -- 100MB
ORDER BY file_size DESC;

-- Identify duplicates for cleanup
SELECT
  file_hash,
  COUNT(*) AS count,
  SUM(file_size) AS total_size
FROM public."EvidenceFiles"
WHERE deleted_at IS NULL
GROUP BY file_hash
HAVING COUNT(*) > 1;
```

---

## Migration Checklist

- [ ] Apply 005_evidence_management.sql migration
- [ ] Run test suite (005_evidence_management_test.sql)
- [ ] Configure storage provider (local or S3)
- [ ] Set up file upload limits
- [ ] Configure virus scanning
- [ ] Implement GraphQL resolvers
- [ ] Set up CDN for public files
- [ ] Configure lifecycle policies
- [ ] Set up monitoring and alerts
- [ ] Train users on evidence submission
- [ ] Document review guidelines
- [ ] Set up backup procedures

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review test suite for examples
3. Check audit logs for error details
4. Contact database architecture team

---

## Version History

- **v1.0.0** (2025-10-09): Initial release
  - Core evidence management tables
  - File storage support (local, S3)
  - Community review system
  - Full-text search
  - Duplicate detection
  - Audit logging
