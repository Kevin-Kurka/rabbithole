# Evidence Management System Documentation

## Overview

The Evidence Management System provides comprehensive file storage, metadata management, and community review capabilities for evidence attached to nodes and edges in the knowledge graph. It supports multiple storage providers (AWS S3, Cloudflare R2, local storage) with automatic deduplication, virus scanning, and thumbnail generation.

## Architecture

### Components

1. **FileStorageService** - Multi-provider file storage abstraction
2. **EvidenceFileResolver** - GraphQL API for file operations
3. **Entity Types** - TypeGraphQL entities for Evidence files, metadata, and reviews
4. **Database Schema** - PostgreSQL tables with full-text search and audit logging

### Storage Providers

#### Local Storage (Development)
```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
```

#### AWS S3
```env
STORAGE_PROVIDER=s3
S3_BUCKET=rabbithole-evidence
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

#### Cloudflare R2
```env
STORAGE_PROVIDER=cloudflare_r2
R2_ACCOUNT_ID=your_account_id
R2_BUCKET=rabbithole-evidence
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
```

## API Reference

### Queries

#### `getEvidenceFiles(evidenceId: ID!): [EvidenceFile!]!`
Returns all files attached to an evidence item.

**Example:**
```graphql
query {
  getEvidenceFiles(evidenceId: "uuid-here") {
    id
    original_filename
    file_size
    mime_type
    storage_key
    file_hash
    dimensions { width height }
    thumbnail_cdn_url
    virus_scan_status
    created_at
  }
}
```

#### `getFileDownloadUrl(fileId: ID!, expiresIn: Int = 3600): String!`
Returns a signed URL for downloading a file (default 1-hour expiry).

**Example:**
```graphql
query {
  getFileDownloadUrl(fileId: "file-uuid", expiresIn: 7200)
}
```

#### `getEvidenceReviews(evidenceId: ID!, limit: Int = 50, offset: Int = 0): [EvidenceReview!]!`
Returns community reviews for an evidence item.

**Example:**
```graphql
query {
  getEvidenceReviews(evidenceId: "uuid-here", limit: 10) {
    id
    reviewer_id
    quality_score
    credibility_score
    relevance_score
    overall_rating
    review_text
    flags
    helpful_count
    created_at
  }
}
```

#### `getEvidenceMetadata(evidenceId: ID!): EvidenceMetadata`
Returns rich metadata for an evidence item.

**Example:**
```graphql
query {
  getEvidenceMetadata(evidenceId: "uuid-here") {
    authors
    publication_date
    keywords
    abstract
    doi
    journal
    methodology
    sample_size
    peer_reviewed
  }
}
```

#### `getEvidenceQualityStats(evidenceId: ID!): EvidenceQualityStats!`
Returns quality metrics and statistics.

**Example:**
```graphql
query {
  getEvidenceQualityStats(evidenceId: "uuid-here") {
    file_count
    total_file_size
    review_count
    avg_quality_score
    avg_credibility_score
    calculated_quality_score
  }
}
```

### Mutations

#### `uploadEvidenceFile(evidenceId: ID!, file: Upload!, isPrimary: Boolean = false): EvidenceFile!`
Uploads a file to evidence with automatic processing.

**Features:**
- Virus scanning (placeholder for ClamAV integration)
- SHA256 hash calculation for deduplication
- Thumbnail generation for images
- Metadata extraction (dimensions, EXIF data)
- MIME type validation
- File size limits (default 100MB)

**Example:**
```graphql
mutation($file: Upload!) {
  uploadEvidenceFile(
    evidenceId: "uuid-here"
    file: $file
    isPrimary: true
  ) {
    id
    storage_key
    file_hash
    file_size
    dimensions { width height }
    thumbnail_storage_key
    processing_status
    virus_scan_status
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/graphql \
  -F operations='{"query":"mutation($file: Upload!) { uploadEvidenceFile(evidenceId: \"uuid\", file: $file) { id } }","variables":{"file":null}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@/path/to/file.pdf
```

#### `attachLinkEvidence(input: AttachLinkInput!): Evidence!`
Attaches a URL/link as evidence.

**Input:**
```typescript
{
  nodeId?: string;
  edgeId?: string;
  url: string;
  title: string;
  description?: string;
}
```

**Example:**
```graphql
mutation {
  attachLinkEvidence(input: {
    nodeId: "node-uuid"
    url: "https://example.com/article"
    title: "Research Article on Climate"
    description: "Peer-reviewed study showing..."
  }) {
    id
    source_id
    content
    evidence_type
  }
}
```

#### `reviewEvidence(input: ReviewEvidenceInput!): EvidenceReview!`
Submits a community review for evidence.

**Input:**
```typescript
{
  evidenceId: string;
  overallRating?: number; // 1-5
  qualityScore?: number; // 0-1
  credibilityScore?: number; // 0-1
  relevanceScore?: number; // 0-1
  reviewText?: string;
  strengths?: string;
  weaknesses?: string;
  recommendation?: string; // accept, accept_with_revisions, etc.
  flags?: string[]; // high_quality, needs_verification, outdated, etc.
  expertiseLevel?: string; // expert, professional, knowledgeable, general
}
```

**Example:**
```graphql
mutation {
  reviewEvidence(input: {
    evidenceId: "uuid-here"
    overallRating: 4
    qualityScore: 0.8
    credibilityScore: 0.85
    relevanceScore: 0.9
    reviewText: "Well-researched study with clear methodology"
    strengths: "Large sample size, peer-reviewed"
    weaknesses: "Limited geographic scope"
    recommendation: "accept"
    flags: ["high_quality"]
    expertiseLevel: "professional"
  }) {
    id
    overall_rating
    quality_score
  }
}
```

#### `updateEvidenceMetadata(input: UpdateEvidenceMetadataInput!): EvidenceMetadata!`
Updates metadata for evidence.

**Example:**
```graphql
mutation {
  updateEvidenceMetadata(input: {
    evidenceId: "uuid-here"
    authors: ["Smith, J.", "Johnson, A."]
    publicationDate: "2023-05-15"
    keywords: ["climate", "research", "emissions"]
    abstract: "This study examines..."
    doi: "10.1234/example"
    methodology: "Randomized controlled trial"
    sampleSize: 1500
  }) {
    id
    authors
    publication_date
    keywords
  }
}
```

#### `deleteEvidenceFile(fileId: ID!, reason: String): Boolean!`
Soft deletes a file (marks as deleted, keeps in storage temporarily).

**Example:**
```graphql
mutation {
  deleteEvidenceFile(
    fileId: "file-uuid"
    reason: "Duplicate file"
  )
}
```

#### `voteOnReview(reviewId: ID!, isHelpful: Boolean!): Boolean!`
Votes on the helpfulness of a review.

**Example:**
```graphql
mutation {
  voteOnReview(reviewId: "review-uuid", isHelpful: true)
}
```

## Security Features

### File Validation
- MIME type whitelist (documents, images, videos, audio, datasets)
- Executable file blocking
- File size limits (configurable, default 100MB)
- Extension validation

### Virus Scanning
Placeholder for ClamAV integration:
```typescript
// TODO: Integrate with ClamAV
const NodeClam = require('clamscan');
const clamscan = await new NodeClam().init();
const { is_infected, viruses } = await clamscan.scan_stream(buffer);
```

### Access Control
- Signed URLs with expiration (default 1 hour)
- Authentication required for uploads
- Quarantine for infected files
- Soft deletion with audit trail

### Deduplication
Files with identical SHA256 hashes are automatically deduplicated:
```typescript
const existingKey = await deduplicateFile(fileHash, evidenceId);
if (existingKey) {
  // Reuse existing file storage
  return { storage_key: existingKey, ... };
}
```

## File Processing Pipeline

### Image Files
1. Hash calculation (SHA256)
2. Deduplication check
3. Virus scan
4. Metadata extraction (dimensions, EXIF)
5. Thumbnail generation (300x300 max)
6. Upload to storage provider
7. Database record creation

### Video Files
1. Hash calculation
2. Deduplication check
3. Virus scan
4. Duration extraction (TODO: FFmpeg integration)
5. Thumbnail generation from first frame (TODO)
6. Upload to storage provider
7. Database record creation

### Document Files
1. Hash calculation
2. Deduplication check
3. Virus scan
4. Text extraction for indexing (TODO)
5. PDF thumbnail generation (TODO)
6. Upload to storage provider
7. Database record creation

## Database Schema

### EvidenceFiles Table
- `id` - UUID primary key
- `evidence_id` - Foreign key to Evidence
- `file_type` - Enum: document, image, video, audio, etc.
- `storage_provider` - Enum: local, s3, cloudflare_r2
- `storage_key` - Unique key in storage provider
- `file_hash` - SHA256 hash for deduplication
- `file_size` - Size in bytes
- `mime_type` - MIME type
- `virus_scan_status` - Enum: pending, clean, infected
- `processing_status` - Enum: pending, processing, completed, failed
- `uploaded_by` - User ID
- `created_at`, `updated_at`, `deleted_at`

### EvidenceMetadata Table
- Rich metadata fields (authors, DOI, keywords, etc.)
- Publication information
- Research methodology details
- Geographic context
- Licensing information

### EvidenceReviews Table
- Quality scores (0-1)
- Overall rating (1-5)
- Review text and recommendations
- Flags (high_quality, needs_verification, etc.)
- Helpfulness voting

### EvidenceAuditLog Table
- Complete audit trail of all operations
- Actor tracking
- Change history
- IP address and user agent logging

## Performance Considerations

### Caching Strategy
- Signed URLs are valid for 1 hour
- Cache frequently accessed file metadata
- Use CDN for public files

### Scalability
- Horizontal scaling: Multiple storage providers
- Database partitioning: Partition by date for large datasets
- Async processing: Background jobs for thumbnails and virus scanning
- Connection pooling: PostgreSQL connection pool

### Cost Optimization
- Deduplication reduces storage costs
- Lifecycle policies: Archive old files to cold storage
- Access tracking: Identify rarely accessed files
- Storage tier optimization: Hot/warm/cold storage

## Monitoring & Metrics

### Key Metrics to Track
- File upload success rate
- Average processing time
- Storage costs per month
- Virus scan detection rate
- Duplicate file percentage
- Review submission rate
- Search query performance

### Logging
All operations are logged with:
- Timestamp
- User ID
- File ID/Evidence ID
- Operation type
- Success/failure status
- Error messages (if any)

**Never logged:**
- File contents
- User passwords
- API keys
- Sensitive metadata

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Example Test Cases
1. File upload with valid file
2. File upload exceeding size limit
3. Executable file rejection
4. Deduplication detection
5. Signed URL generation
6. Review submission with validation
7. Metadata update

## Future Enhancements

### Phase 1 (Current)
- [x] Multi-provider storage
- [x] File upload and download
- [x] Basic metadata management
- [x] Review system
- [x] Deduplication

### Phase 2 (Planned)
- [ ] ClamAV virus scanning integration
- [ ] FFmpeg video processing
- [ ] PDF text extraction and indexing
- [ ] Image perceptual hashing
- [ ] Automated thumbnail generation for videos
- [ ] OCR for scanned documents

### Phase 3 (Future)
- [ ] ML-based quality assessment
- [ ] Automated fact-checking integration
- [ ] Blockchain-based file verification
- [ ] Advanced search with filters
- [ ] Collaborative annotation
- [ ] Version control for evidence

## Troubleshooting

### File Upload Fails
1. Check file size: `MAX_FILE_SIZE` in .env
2. Verify MIME type is allowed
3. Check storage provider credentials
4. Review server logs for errors

### Signed URLs Not Working
1. Verify storage provider credentials
2. Check bucket permissions
3. Ensure file exists and is not deleted
4. Verify expiration time is valid

### Virus Scan Issues
Currently using placeholder. To integrate ClamAV:
```bash
# Install ClamAV
brew install clamav  # macOS
apt-get install clamav  # Ubuntu

# Update virus definitions
freshclam

# Install Node.js library
npm install clamscan
```

## Support

For issues or questions:
1. Check logs: `LOG_LEVEL=debug` in .env
2. Review database audit logs
3. Test with local storage provider first
4. Verify environment variables are set correctly

## License

Part of the Rabbithole project. See main repository LICENSE file.
