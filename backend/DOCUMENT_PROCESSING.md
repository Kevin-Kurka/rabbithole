# Document Processing System

## Overview

The Document Processing System enables automatic text extraction, entity recognition, and AI-powered summarization of uploaded documents in the Rabbit Hole application.

## Features

### Phase 4: File Upload System ✅
- **Fixed ESM Import Issue**: Resolved graphql-upload v17 ESM compatibility by creating a custom GraphQL Upload scalar
- **File Upload Mutations**: Working GraphQL mutations for file uploads
- **Storage Integration**: Supports local, S3, and Cloudflare R2 storage providers
- **File Validation**: Size limits (100MB), MIME type validation, virus scanning hooks

### Phase 6: Document Processing Service ✅
- **PDF Text Extraction**: Extracts full text from PDF documents using pdf-parse
- **Entity Recognition**: Identifies people, organizations, locations, events, dates, and concepts
- **AI Summarization**: Generates concise summaries using Ollama (llama3.2 model)
- **Automatic Node Creation**: Creates graph nodes from extracted entities
- **Async Processing**: Ready for background job queue integration

## Architecture

### Components

1. **EvidenceFileResolver** (`/src/resolvers/EvidenceFileResolver.ts`)
   - GraphQL mutations for file upload and document processing
   - Queries for file download URLs and processing results

2. **DocumentProcessingService** (`/src/services/DocumentProcessingService.ts`)
   - Main processing orchestrator
   - Handles PDF text extraction, entity extraction, summarization
   - Creates graph nodes from entities

3. **FileStorageService** (`/src/services/FileStorageService.ts`)
   - Multi-provider file storage (local, S3, R2)
   - File deduplication via hash comparison
   - Thumbnail generation for images

4. **Database Schema**
   - `EvidenceFiles`: Stores file metadata and storage information
   - `DocumentProcessingResults`: Stores extracted text and summaries

## API Usage

### Upload a File

```graphql
mutation UploadEvidenceFile($evidenceId: ID!, $file: Upload!, $isPrimary: Boolean) {
  uploadEvidenceFile(evidenceId: $evidenceId, file: $file, isPrimary: $isPrimary) {
    id
    original_filename
    file_size
    mime_type
    processing_status
  }
}
```

### Process a Document

```graphql
mutation ProcessDocument(
  $fileId: ID!
  $graphId: ID
  $extractEntities: Boolean
  $generateSummary: Boolean
  $createNodes: Boolean
) {
  processDocument(
    fileId: $fileId
    graphId: $graphId
    extractEntities: $extractEntities
    generateSummary: $generateSummary
    createNodes: $createNodes
  ) {
    success
    extractedText
    summary
    entityCount
    entities {
      type
      value
      confidence
      context
    }
    createdNodeIds
    processingTimeMs
  }
}
```

### Get Processing Results

```graphql
query GetDocumentProcessingResult($fileId: ID!) {
  getDocumentProcessingResult(fileId: $fileId) {
    fileId
    extractedText
    summary
    extractedAt
    summaryGeneratedAt
  }
}
```

## Entity Extraction

The service extracts the following entity types:

### Pattern-Based Extraction
- **Dates**: Various formats (MM/DD/YYYY, YYYY-MM-DD, "November 22, 1963")
- **Capitalized Phrases**: Proper nouns (2 words = person, 3+ = organization)
- **URLs and Emails**: Web links and email addresses
- **Phone Numbers**: US phone number formats

### AI-Enhanced Extraction
When Ollama is available, entities are also extracted using AI with:
- **People**: Individual names
- **Organizations**: Companies, institutions, groups
- **Locations**: Cities, countries, addresses, landmarks
- **Events**: Significant occurrences, incidents
- **Concepts**: Important ideas, theories, themes

### Confidence Scores
- Pattern-based: 0.6 - 0.8 confidence
- AI-extracted: 0.7 - 0.9 confidence
- Only entities with confidence > 0.7 are used for node creation

## Configuration

### Environment Variables

```bash
# Storage Configuration
STORAGE_PROVIDER=local          # Options: local, s3, cloudflare_r2
LOCAL_STORAGE_PATH=./uploads    # Path for local file storage
MAX_FILE_SIZE=104857600         # Max file size in bytes (100MB)

# S3 Configuration (if using S3)
S3_REGION=us-east-1
S3_BUCKET=rabbithole-evidence
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Cloudflare R2 Configuration (if using R2)
R2_ACCOUNT_ID=your_account_id
R2_BUCKET=rabbithole-evidence
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret

# AI Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000
```

### Supported File Types

- **Documents**: PDF, TXT, DOCX (DOCX processing not yet implemented)
- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM, QuickTime
- **Audio**: MP3, WAV, OGG
- **Data**: JSON, CSV, XLSX

## Database Schema

### EvidenceFiles Table

```sql
CREATE TABLE public."EvidenceFiles" (
    id UUID PRIMARY KEY,
    evidence_id UUID REFERENCES public."Evidence"(id),
    file_type VARCHAR(50) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    file_hash VARCHAR(128) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'pending',
    virus_scan_status VARCHAR(50) DEFAULT 'pending',
    -- ... additional fields
);
```

### DocumentProcessingResults Table

```sql
CREATE TABLE public."DocumentProcessingResults" (
    id UUID PRIMARY KEY,
    file_id UUID UNIQUE REFERENCES public."EvidenceFiles"(id),
    extracted_text TEXT,
    extracted_at TIMESTAMPTZ,
    summary TEXT,
    summary_generated_at TIMESTAMPTZ,
    metadata JSONB,
    processing_stats JSONB
);
```

## Processing Workflow

1. **File Upload**
   - User uploads file via GraphQL mutation
   - File is validated (size, type, virus scan)
   - File is stored in configured storage provider
   - Database record created with metadata

2. **Document Processing** (triggered manually or automatically)
   - Text extraction from file based on MIME type
   - Pattern-based entity extraction
   - AI-enhanced entity extraction (if Ollama available)
   - AI summarization (if requested)
   - Results stored in database

3. **Node Creation** (optional)
   - High-confidence entities (>0.7) are filtered
   - Graph's methodology node types are matched to entity types
   - Nodes created with entity data
   - Vectorization jobs published for semantic search

## Testing

Run the test suite:

```bash
npm test -- document-processing.test.ts
```

### Test Coverage

- ✅ Entity extraction (dates, names, organizations)
- ✅ Entity deduplication
- ✅ Entity type classification
- ✅ Error handling for missing files
- ⚠️  AI summarization (requires Ollama)
- ⚠️  Full workflow (requires test database setup)

## Performance Considerations

- **Large Documents**: Text is truncated to 8000 chars for summarization, 4000 for entity extraction
- **Async Processing**: Consider using RabbitMQ for large batches
- **Storage Costs**: File deduplication reduces storage by sharing identical files
- **Rate Limiting**: AI operations are rate-limited (10 requests/hour per user)

## Future Enhancements

### Planned Features
- [ ] DOCX document processing
- [ ] Image OCR text extraction
- [ ] Audio transcription
- [ ] Video subtitle extraction
- [ ] Batch processing via RabbitMQ
- [ ] Progress tracking for long operations
- [ ] Custom entity type training
- [ ] Multi-language support

### Integration Points
- **Message Queue**: RabbitMQ for async processing
- **Vector Search**: Automatic vectorization of extracted text
- **Graph Analysis**: Entity relationship mapping
- **Evidence Linking**: Auto-link documents to graph nodes

## Troubleshooting

### Common Issues

**File upload fails with "File type not allowed"**
- Check MIME type is in allowed list
- Update `FileStorageService.validateFile()` to add new types

**PDF extraction returns empty text**
- Verify PDF is text-based, not scanned image
- Consider adding OCR for image-based PDFs

**AI summarization fails**
- Ensure Ollama is running: `ollama serve`
- Check model is installed: `ollama pull llama3.2`
- Verify OLLAMA_URL environment variable

**Entity extraction finds too few entities**
- AI extraction requires Ollama
- Adjust confidence thresholds in code
- Add custom patterns for domain-specific entities

## Examples

### Processing a JFK Assassination Document

```typescript
// 1. Upload PDF
const file = await uploadEvidenceFile({
  evidenceId: "evidence-123",
  file: jfk_warren_commission.pdf,
  isPrimary: true
});

// 2. Process document
const result = await processDocument({
  fileId: file.id,
  graphId: "jfk-investigation-graph",
  extractEntities: true,
  generateSummary: true,
  createNodes: true
});

// Result:
// - Extracted text: 500,000+ characters
// - Entities found: 150+ (people, locations, dates, events)
// - Summary: 5 paragraph overview
// - Nodes created: 45 (Lee Harvey Oswald, Jack Ruby, Dealey Plaza, etc.)
// - Processing time: ~30 seconds
```

## Security

- ✅ File type validation
- ✅ File size limits
- ✅ Virus scanning hooks
- ✅ SQL injection prevention (parameterized queries)
- ✅ Authentication required for all operations
- ✅ Soft delete (no permanent data loss)
- ⚠️ Virus scanning not yet implemented (placeholder)

## License

See main project LICENSE file.
