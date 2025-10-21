# Content Analysis Service - Implementation Guide

## Overview

The **ContentAnalysisService** provides perceptual content fingerprinting and duplicate detection for images, videos, audio, and text content in the Project Rabbit Hole knowledge graph.

### Key Features

- **Perceptual Hashing**: Generate content fingerprints that are resilient to minor modifications
- **Duplicate Detection**: Find similar content using Hamming distance and similarity scoring
- **Multi-Format Support**: Images, videos, audio, and text documents
- **Batch Processing**: Analyze multiple nodes efficiently
- **Automatic Linking**: Update `primary_source_id` to link duplicates

## Architecture

### Technology Stack

- **Images**: `imghash` (pHash algorithm) - perceptual hashing resistant to resizing, compression
- **Videos**: `fluent-ffmpeg` - frame sampling + perceptual hashing of frames
- **Audio**: `fluent-ffmpeg` - waveform extraction + SHA256 hashing
- **Text**: `minhash` - MinHash algorithm for fuzzy text matching

### Database Schema

The service uses existing columns in the `Nodes` table:

```sql
CREATE TABLE public."Nodes" (
  id UUID PRIMARY KEY,
  content_hash TEXT,                -- Populated by analyzeContent()
  primary_source_id UUID REFERENCES public."Nodes"(id),  -- Set by findDuplicates()
  -- ... other fields
);

CREATE INDEX ON public."Nodes" (content_hash);
CREATE INDEX ON public."Nodes" (primary_source_id);
```

## Usage

### 1. Basic Content Analysis

```typescript
import { ContentAnalysisService } from './services/ContentAnalysisService';
import { FileStorageService } from './services/FileStorageService';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const fileStorage = new FileStorageService(pool);
const service = new ContentAnalysisService(pool, fileStorage);

// Analyze a single node
const result = await service.analyzeContent('node-uuid');

console.log(result);
// {
//   contentType: 'image',
//   fingerprintType: 'image_phash',
//   hash: 'a4f3c2d1e5b6...',
//   width: 1920,
//   height: 1080,
//   metadata: { channels: 3, format: 'jpeg' }
// }
```

### 2. Finding Duplicates

```typescript
// Find duplicates for a node
const duplicates = await service.findDuplicates('node-uuid');

if (duplicates.isDuplicate) {
  console.log(`Found ${duplicates.matches.length} similar items`);
  console.log(`Primary source: ${duplicates.primarySourceId}`);

  duplicates.matches.forEach(match => {
    console.log(`Node ${match.nodeId}: ${(match.similarity * 100).toFixed(1)}% similar`);
  });
}

// Custom similarity threshold
const strictDuplicates = await service.findDuplicates('node-uuid', 0.95);
```

### 3. Batch Processing

```typescript
// Analyze multiple nodes at once
const nodeIds = ['uuid-1', 'uuid-2', 'uuid-3'];
const results = await service.batchAnalyze(nodeIds);

results.forEach((result, nodeId) => {
  console.log(`Node ${nodeId}: ${result.fingerprintType} = ${result.hash}`);
});
```

### 4. Graph-Wide Duplicate Detection

```typescript
// Find all duplicates in a graph
const duplicatesMap = await service.findAllDuplicatesInGraph('graph-uuid');

console.log(`Found ${duplicatesMap.size} nodes with duplicates`);

duplicatesMap.forEach((result, nodeId) => {
  console.log(`Node ${nodeId} has ${result.matches.length} duplicates`);
});
```

## GraphQL API

### Mutations

#### analyzeContent

Analyze content and generate perceptual fingerprint.

```graphql
mutation {
  analyzeContent(nodeId: "550e8400-e29b-41d4-a716-446655440000") {
    nodeId
    contentHash
    fingerprint {
      contentType
      fingerprintType
      hash
      metadata
    }
    duplicateDetection {
      isDuplicate
      matches {
        nodeId
        similarity
        hammingDistance
        fingerprintType
      }
      primarySourceId
    }
    processedAt
  }
}
```

#### findDuplicates

Find duplicate content by comparing fingerprints.

```graphql
mutation {
  findDuplicates(
    nodeId: "550e8400-e29b-41d4-a716-446655440000"
    threshold: 0.90
  ) {
    isDuplicate
    matches {
      nodeId
      similarity
      hammingDistance
      contentHash
    }
    primarySourceId
  }
}
```

#### batchAnalyzeContent

Batch analyze multiple nodes.

```graphql
mutation {
  batchAnalyzeContent(nodeIds: [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]) {
    nodeId
    contentHash
    fingerprint {
      contentType
      hash
    }
    duplicateDetection {
      isDuplicate
      primarySourceId
    }
    processedAt
  }
}
```

#### findAllDuplicatesInGraph

Find all duplicates in a graph.

```graphql
mutation {
  findAllDuplicatesInGraph(graphId: "550e8400-e29b-41d4-a716-446655440000") {
    nodeId
    duplicateDetection {
      isDuplicate
      matches {
        nodeId
        similarity
      }
      primarySourceId
    }
  }
}
```

### Queries

#### getContentAnalysisStatus

Check if a node has been analyzed.

```graphql
query {
  getContentAnalysisStatus(nodeId: "550e8400-e29b-41d4-a716-446655440000") {
    hasFingerprint
    contentHash
    primarySourceId
    isDuplicate
  }
}
```

#### getNodesByContentHash

Find all nodes with exact same hash.

```graphql
query {
  getNodesByContentHash(contentHash: "a4f3c2d1e5b6...") {
    id
    createdAt
    primarySourceId
  }
}
```

#### getDuplicateGroups

Get duplicate groups in a graph.

```graphql
query {
  getDuplicateGroups(graphId: "550e8400-e29b-41d4-a716-446655440000") {
    contentHash
    nodeCount
    nodeIds
    primarySourceId
  }
}
```

## Configuration

Customize fingerprinting behavior:

```typescript
import { DEFAULT_FINGERPRINT_CONFIG } from './types/fingerprinting';

const customConfig = {
  ...DEFAULT_FINGERPRINT_CONFIG,
  imageSimilarityThreshold: 0.95,  // Stricter image matching
  videoFrameSampleCount: 20,        // More frames for better accuracy
  textSimilarityThreshold: 0.80,    // More lenient text matching
};

const service = new ContentAnalysisService(pool, fileStorage, customConfig);
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `imageHashSize` | 8 | Hash size (8 = 64-bit hash) |
| `imageSimilarityThreshold` | 0.90 | Similarity threshold for images (0.0-1.0) |
| `videoFrameSampleCount` | 10 | Number of frames to sample from video |
| `videoSimilarityThreshold` | 0.85 | Similarity threshold for videos |
| `audioSampleDuration` | 30 | Seconds of audio to analyze |
| `audioSimilarityThreshold` | 0.80 | Similarity threshold for audio |
| `textMinHashSize` | 128 | MinHash signature size |
| `textShingleSize` | 3 | N-gram size for text shingles |
| `textSimilarityThreshold` | 0.85 | Similarity threshold for text |
| `maxFileSize` | 104857600 | Max file size in bytes (100MB) |
| `processingTimeout` | 60000 | Timeout in milliseconds |

## Algorithms

### Image Perceptual Hashing (pHash)

1. Resize image to 32x32 pixels
2. Convert to grayscale
3. Apply Discrete Cosine Transform (DCT)
4. Keep low-frequency components (top-left 8x8)
5. Calculate median value
6. Generate binary hash (1 if > median, 0 otherwise)

**Resilient to:**
- Resizing
- Compression (JPEG artifacts)
- Minor color adjustments
- Watermarks (if small)

### Video Fingerprinting

1. Sample N frames at regular intervals
2. Generate pHash for each frame
3. Combine frame hashes using SHA256
4. Store individual frame hashes for detailed comparison

**Resilient to:**
- Re-encoding
- Cropping (if moderate)
- Frame rate changes
- Color grading

### Audio Fingerprinting

1. Extract PCM waveform data
2. Downsample to 8kHz mono
3. Analyze first 30 seconds
4. Hash waveform with SHA256

**Note:** This is a simplified approach. For production, consider:
- **Chromaprint** (acoustid) for robust audio fingerprinting
- Spectral analysis for music identification
- Acoustic feature extraction

### Text MinHash

1. Normalize text (lowercase, trim)
2. Generate n-grams (shingles) of size 3
3. Create MinHash signature (128 hash functions)
4. Compare signatures using Jaccard similarity

**Resilient to:**
- Minor edits
- Reordering of paragraphs
- Paraphrasing (partial)

## Similarity Scoring

### Hamming Distance

For perceptual hashes (images, video frames):

```typescript
function calculateHammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    distance += popcount(xor); // Count set bits
  }
  return distance;
}
```

**Lower distance = more similar**

- Distance 0-5: Nearly identical
- Distance 6-15: Very similar
- Distance 16-30: Similar
- Distance >30: Different

### Similarity Score

Convert Hamming distance to 0.0-1.0 scale:

```typescript
similarity = 1 - (hammingDistance / maxDistance)
```

### Jaccard Similarity

For MinHash (text):

```typescript
jaccardSimilarity = matchingHashes / totalHashes
```

## Performance Considerations

### File Size Limits

- Images: Process any reasonable size (sharp handles memory efficiently)
- Videos: Limit to 100MB; larger files may cause memory issues
- Audio: Limit to 100MB; only analyze first 30 seconds
- Text: No practical limit

### Processing Time

| Content Type | Avg Time | Factors |
|--------------|----------|---------|
| Image (1MB) | 100-300ms | Size, format |
| Video (50MB) | 5-15s | Duration, resolution |
| Audio (10MB) | 2-5s | Duration, sample rate |
| Text (100KB) | 50-200ms | Length, complexity |

### Batch Processing

For large batches, consider:

1. **Queue-based processing**: Use RabbitMQ worker (existing VectorizationWorker pattern)
2. **Parallel processing**: Process multiple nodes concurrently
3. **Progress tracking**: Store processing status in database

## Error Handling

```typescript
try {
  const result = await service.analyzeContent(nodeId);
} catch (error) {
  if (error.message.includes('not found')) {
    // Node doesn't exist
  } else if (error.message.includes('Unsupported content type')) {
    // Can't determine content type from props
  } else if (error.message.includes('No content found')) {
    // No file or text content in node
  } else {
    // Processing error (ffmpeg, sharp, etc.)
    console.error('Analysis failed:', error);
  }
}
```

## Integration with Existing Services

### FileStorageService

The ContentAnalysisService uses FileStorageService to download files:

```typescript
// Files are automatically fetched from storage provider (S3, R2, local)
const buffer = await fileStorage.provider.download(storageKey);
```

### EvidenceFile Entity

Files linked to nodes via `EvidenceFiles` table:

```sql
SELECT ef.storage_key
FROM public."EvidenceFiles" ef
JOIN public."Nodes" n ON n.id = ef.evidence_id
WHERE n.id = $nodeId
```

### Veracity Scoring

Duplicate detection can influence veracity scores:

- Lower weight for duplicates
- Boost weight for original sources
- Flag suspicious duplicates for review

## Production Recommendations

### 1. Async Processing

Move analysis to background workers:

```typescript
// Publish to message queue
await amqpChannel.publish('content-analysis', {
  nodeId: 'uuid',
  operation: 'analyze'
});

// Worker processes in background
```

### 2. Caching

Cache fingerprint results:

```typescript
// Redis cache
const cached = await redis.get(`fingerprint:${nodeId}`);
if (cached) return JSON.parse(cached);
```

### 3. Monitoring

Track metrics:

- Processing time per content type
- Error rates
- Duplicate detection rate
- Storage usage

### 4. Duplicate Management UI

Build curator tools:

- Review duplicate matches
- Merge duplicate nodes
- Flag false positives
- Approve canonical versions

## Testing

### Unit Tests

```typescript
describe('ContentAnalysisService', () => {
  it('should fingerprint images', async () => {
    const buffer = await fs.readFile('test-image.jpg');
    const result = await service.fingerprintImage(buffer);
    expect(result.fingerprintType).toBe('image_phash');
    expect(result.hash).toHaveLength(16); // 64-bit hex
  });

  it('should detect duplicate images', async () => {
    // Upload same image twice
    const result = await service.findDuplicates(nodeId2);
    expect(result.isDuplicate).toBe(true);
    expect(result.primarySourceId).toBe(nodeId1);
  });
});
```

### Integration Tests

```typescript
it('should handle full workflow', async () => {
  // 1. Upload file
  const fileResult = await fileStorage.uploadFile(buffer, metadata, evidenceId, userId);

  // 2. Create node with file reference
  const node = await createNode({ evidenceId });

  // 3. Analyze content
  const fingerprint = await service.analyzeContent(node.id);

  // 4. Find duplicates
  const duplicates = await service.findDuplicates(node.id);

  expect(duplicates.isDuplicate).toBe(false); // First upload
});
```

## Future Enhancements

### 1. Advanced Audio Fingerprinting

Replace waveform hashing with **Chromaprint**:

```bash
npm install chromaprint
```

```typescript
import { Chromaprint } from 'chromaprint';

const fingerprint = await Chromaprint.calculateFingerprint(audioBuffer);
```

### 2. Deep Learning Perceptual Hashing

Use neural networks for semantic similarity:

```typescript
// Generate embeddings with ResNet/CLIP
const embedding = await model.encode(imageBuffer);

// Store in pgvector column
await pool.query(
  `UPDATE "Nodes" SET ai = $1 WHERE id = $2`,
  [embedding, nodeId]
);

// Find similar using cosine distance
```

### 3. Document Fingerprinting

Extract text from PDFs/Office docs:

```bash
npm install pdf-parse mammoth
```

```typescript
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// PDF
const pdfData = await pdfParse(buffer);
const fingerprint = await service.fingerprintText(pdfData.text);

// DOCX
const result = await mammoth.extractRawText({ buffer });
const fingerprint = await service.fingerprintText(result.value);
```

### 4. Blockchain Timestamping

Immutable proof of content origin:

```typescript
// Hash content
const hash = createHash('sha256').update(buffer).digest('hex');

// Submit to blockchain (e.g., Ethereum)
const tx = await contract.timestampContent(hash);

// Store transaction ID
await pool.query(
  `UPDATE "Nodes" SET blockchain_tx = $1 WHERE id = $2`,
  [tx.hash, nodeId]
);
```

## Troubleshooting

### FFmpeg Not Found

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt-get install ffmpeg

# Docker
FROM node:20
RUN apt-get update && apt-get install -y ffmpeg
```

### Memory Issues with Large Files

```typescript
// Increase Node.js heap size
node --max-old-space-size=4096 index.js

// Or stream processing for very large files
```

### Slow Video Processing

```typescript
// Reduce frame sample count
const config = {
  videoFrameSampleCount: 5, // Instead of 10
};

// Or skip video analysis for large files
if (fileSize > 50 * 1024 * 1024) {
  throw new Error('Video file too large for analysis');
}
```

## Support

For issues or questions:
- Check logs: `docker logs rabbithole-api-1`
- Enable debug mode: `DEBUG=content-analysis npm start`
- Review error messages in GraphQL response

## License

Part of Project Rabbit Hole - see root LICENSE file.
