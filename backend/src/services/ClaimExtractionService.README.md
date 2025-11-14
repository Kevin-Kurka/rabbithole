# ClaimExtractionService

Advanced document analysis service for extracting verifiable claims, matching them to existing knowledge graph nodes, identifying primary sources, detecting duplicates, and scoring credibility.

## Features

- **AI-Powered Claim Extraction**: Uses Ollama LLM to identify verifiable factual claims from document text
- **Semantic Similarity Matching**: Leverages pgvector for finding semantically similar nodes in the knowledge graph
- **Primary Source Detection**: Extracts citations, references, DOIs, ISBNs, and URLs
- **Duplicate Detection**: Content hashing and semantic similarity to prevent duplicate uploads
- **Multi-Factor Credibility Scoring**: Evaluates claims based on source quality, citations, consensus, and recency
- **Document Chunking**: Handles large documents by intelligently splitting into processable chunks
- **Integration with Docling**: Seamless processing of PDFs, DOCX, and other document formats

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ClaimExtractionService                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  extractClaims()           matchClaimsToNodes()                │
│       ↓                            ↓                            │
│  [Ollama LLM]              [pgvector Search]                   │
│       ↓                            ↓                            │
│  JSON Parsing              Similarity Ranking                  │
│                                                                 │
│  identifyPrimarySources()  checkForDuplicates()                │
│       ↓                            ↓                            │
│  [AI + Regex]              [SHA-256 + Embedding]               │
│       ↓                            ↓                            │
│  Citation Extraction        Content Comparison                 │
│                                                                 │
│  scoreCredibility()                                            │
│       ↓                                                        │
│  [Multi-Factor Analysis]                                       │
│       ↓                                                        │
│  Weighted Score (0.0-1.0)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

The service is already integrated into the Rabbithole backend. Ensure these dependencies are installed:

```bash
npm install axios pg
```

## Environment Variables

```env
# Ollama Configuration (required)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Database Configuration (required)
DATABASE_URL=postgresql://user:pass@localhost:5432/rabbithole_db

# Optional: Adjust similarity threshold
CLAIM_SIMILARITY_THRESHOLD=0.75
```

## API Reference

### Types

#### `ExtractedClaim`
```typescript
{
  id: string;                    // Unique claim identifier
  text: string;                  // Claim statement
  supportingEvidence: string[];  // Supporting evidence snippets
  confidence: number;            // AI confidence (0.0-1.0)
  sourceLocation?: {
    page?: number;
    section?: string;
    paragraph?: number;
  };
  claimType?: 'factual' | 'statistical' | 'causal' | 'predictive' | 'normative';
  keywords: string[];            // Extracted key terms
}
```

#### `NodeMatch`
```typescript
{
  nodeId: string;                // Matched node ID
  title: string;                 // Node title
  similarity: number;            // Cosine similarity (0.0-1.0)
  nodeType?: string;             // Node type from methodology
  props: any;                    // Node properties
  isLevel0: boolean;             // Immutable truth layer flag
  matchReason: 'semantic' | 'keyword' | 'exact';
}
```

#### `PrimarySource`
```typescript
{
  title?: string;
  author?: string;
  publicationDate?: Date;
  sourceType: 'book' | 'article' | 'report' | 'website' | 'dataset' | 'interview' | 'unknown';
  citation?: string;
  url?: string;
  doi?: string;                  // Digital Object Identifier
  isbn?: string;                 // International Standard Book Number
  confidence: number;            // Extraction confidence (0.0-1.0)
}
```

#### `CredibilityScore`
```typescript
{
  overall: number;               // Overall credibility (0.0-1.0)
  factors: {
    sourceType: number;          // Source quality weight
    citationCount: number;       // Number of citations
    verificationStatus: number;  // Verification level
    consensusLevel: number;      // Multi-source agreement
    recency: number;             // Information freshness
    authorCredibility: number;   // Author reputation
  };
  reasoning: string;             // Human-readable explanation
}
```

### Methods

#### `extractClaims(documentText, metadata?)`

Extract all verifiable claims from document text.

**Parameters:**
- `documentText: string` - Raw text content
- `metadata?: Partial<DoclingProcessingResult>` - Optional document metadata

**Returns:** `Promise<ClaimExtractionResult>`

**Example:**
```typescript
const result = await claimExtractionService.extractClaims(documentText);
console.log(`Extracted ${result.claims.length} claims`);
```

---

#### `matchClaimsToNodes(claims, pool, graphId?)`

Match extracted claims to existing nodes using semantic similarity.

**Parameters:**
- `claims: ExtractedClaim[]` - Array of claims to match
- `pool: Pool` - PostgreSQL connection pool
- `graphId?: string` - Optional: limit search to specific graph

**Returns:** `Promise<ClaimMatchingResult[]>`

**Example:**
```typescript
const matches = await claimExtractionService.matchClaimsToNodes(
  claims,
  pool,
  'graph-uuid'
);

matches.forEach(match => {
  console.log(`Action: ${match.suggestedAction}`);
  console.log(`Confidence: ${match.confidence}`);
});
```

**Suggested Actions:**
- `create_new` - No similar nodes found, create new node
- `link_existing` - Similar node found (>75%), create edge/link
- `merge` - Very similar node found (>95%), consider merging
- `update` - Moderately similar node (60-75%), update existing node

---

#### `identifyPrimarySources(documentText)`

Extract citations, references, and primary sources from text.

**Parameters:**
- `documentText: string` - Document content

**Returns:** `Promise<PrimarySource[]>`

**Example:**
```typescript
const sources = await claimExtractionService.identifyPrimarySources(text);

sources.forEach(source => {
  console.log(`${source.sourceType}: ${source.title}`);
  if (source.doi) console.log(`DOI: ${source.doi}`);
});
```

**Detection Methods:**
- AI-powered citation extraction (Ollama)
- Regex patterns for DOIs, ISBNs, URLs
- Deduplication based on unique identifiers

---

#### `checkForDuplicates(fileHash, content, pool)`

Detect if document content already exists in the system.

**Parameters:**
- `fileHash: string` - SHA-256 hash of file content
- `content: string` - Document text
- `pool: Pool` - PostgreSQL connection pool

**Returns:** `Promise<DuplicateCheck>`

**Example:**
```typescript
const { createHash } = require('crypto');
const fileHash = createHash('sha256').update(content).digest('hex');

const check = await claimExtractionService.checkForDuplicates(
  fileHash,
  content,
  pool
);

if (check.isDuplicate) {
  console.log(`Duplicate type: ${check.duplicateType}`);
  console.log(`Matched node: ${check.matchedNodeId}`);
}
```

**Duplicate Types:**
- `exact` - Identical content hash (100% match)
- `near` - Semantic similarity >95%
- `semantic` - Semantic similarity >85%

---

#### `scoreCredibility(claim, sources, pool?)`

Calculate credibility score for a claim based on multiple factors.

**Parameters:**
- `claim: ExtractedClaim` - Claim to evaluate
- `sources: PrimarySource[]` - Associated sources
- `pool?: Pool` - Optional: database for additional checks

**Returns:** `Promise<CredibilityScore>`

**Example:**
```typescript
const score = await claimExtractionService.scoreCredibility(
  claim,
  sources
);

console.log(`Overall: ${(score.overall * 100).toFixed(1)}%`);
console.log(`Reasoning: ${score.reasoning}`);
```

**Scoring Factors (Weighted):**
- **Source Type (25%)**: Peer-reviewed > report > book > website
- **Citation Count (15%)**: More citations = higher credibility
- **Verification Status (20%)**: AI confidence in claim extraction
- **Consensus Level (20%)**: Agreement across multiple sources
- **Recency (10%)**: Newer information scored higher
- **Author Credibility (10%)**: Known author reputation

## Usage Examples

### Basic Workflow

```typescript
import { claimExtractionService } from './services/ClaimExtractionService';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. Extract claims from document
const result = await claimExtractionService.extractClaims(documentText);

// 2. Match claims to existing nodes
const matches = await claimExtractionService.matchClaimsToNodes(
  result.claims,
  pool,
  graphId
);

// 3. Score credibility
const scores = await Promise.all(
  result.claims.map(claim =>
    claimExtractionService.scoreCredibility(claim, result.primarySources)
  )
);

// 4. Take action based on results
matches.forEach((match, index) => {
  const credibility = scores[index];

  if (match.suggestedAction === 'create_new' && credibility.overall > 0.7) {
    // Create new node with high credibility
    createNode(match.claim, credibility);
  } else if (match.suggestedAction === 'link_existing') {
    // Link to existing node
    createEdge(sourceNode, match.matches[0].nodeId);
  }
});
```

### Integration with Docling

```typescript
import { doclingService } from './services/DoclingProcessingService';
import { claimExtractionService } from './services/ClaimExtractionService';

// Process PDF with Docling
const docResult = await doclingService.processDocument(filePath);

// Extract claims with metadata
const claimResult = await claimExtractionService.extractClaims(
  docResult.text,
  docResult
);

// Metadata is automatically included
console.log(claimResult.documentMetadata.title);
console.log(claimResult.documentMetadata.author);
console.log(claimResult.documentMetadata.pageCount);
```

### Duplicate Prevention

```typescript
import { createHash } from 'crypto';

// Calculate file hash
const fileHash = createHash('sha256')
  .update(fileBuffer)
  .digest('hex');

// Check before processing
const dupCheck = await claimExtractionService.checkForDuplicates(
  fileHash,
  documentText,
  pool
);

if (dupCheck.isDuplicate) {
  if (dupCheck.duplicateType === 'exact') {
    return { error: 'Document already exists', nodeId: dupCheck.matchedNodeId };
  } else {
    // Prompt user: "Similar document found. Continue?"
    console.warn(`Similar content: ${dupCheck.matchScore * 100}%`);
  }
}
```

## Performance Considerations

### Document Size

- **Small (< 5,000 chars)**: Single-shot processing (~2-5 seconds)
- **Medium (5,000-20,000 chars)**: Chunked processing (~10-30 seconds)
- **Large (> 20,000 chars)**: Multiple chunks (~30-120 seconds)

### Optimization Tips

1. **Batch Processing**: Process multiple documents in parallel
2. **Caching**: Store embeddings to avoid recomputation
3. **Selective Extraction**: Use `extractSections: true` in Docling to target specific parts
4. **Rate Limiting**: Ollama has no built-in rate limits, but consider your hardware

### Database Queries

- pgvector similarity search: **O(log n)** with HNSW index
- Exact hash lookup: **O(1)** with B-tree index
- Ensure `ai` column has HNSW index:

```sql
CREATE INDEX IF NOT EXISTS nodes_ai_hnsw_idx
ON public."Nodes"
USING hnsw (ai vector_cosine_ops);
```

## Error Handling

The service implements comprehensive error handling:

```typescript
try {
  const result = await claimExtractionService.extractClaims(text);

  if (result.error) {
    console.error(`Extraction failed: ${result.error}`);
    // Handle partial results
    console.log(`Partial claims: ${result.claims.length}`);
  }
} catch (error) {
  if (error.message.includes('Ollama is not running')) {
    // Ollama connection failed
    notifyUser('AI service unavailable. Please try again later.');
  } else if (error.message.includes('Database')) {
    // Database error
    logError(error);
  }
}
```

## Testing

Run the example file to test functionality:

```bash
cd backend
npx ts-node src/services/__examples__/ClaimExtractionService.example.ts
```

Or run individual examples:

```typescript
import { example1_extractClaims } from './services/__examples__/ClaimExtractionService.example';

await example1_extractClaims();
```

## Integration Points

### Evidence Upload Flow

```typescript
// In EvidenceFileResolver or similar
async uploadEvidence(file: File, nodeId: string) {
  // 1. Process with Docling
  const docResult = await doclingService.processDocument(file.path);

  // 2. Check duplicates
  const dupCheck = await claimExtractionService.checkForDuplicates(
    fileHash,
    docResult.text,
    pool
  );

  if (dupCheck.isDuplicate) {
    throw new Error('Document already exists');
  }

  // 3. Extract claims
  const claims = await claimExtractionService.extractClaims(
    docResult.text,
    docResult
  );

  // 4. Create evidence nodes
  for (const claim of claims.claims) {
    const credibility = await claimExtractionService.scoreCredibility(
      claim,
      claims.primarySources
    );

    if (credibility.overall > 0.6) {
      await createEvidenceNode(nodeId, claim, credibility);
    }
  }
}
```

### GraphQL Resolver

```typescript
@Mutation(() => ClaimExtractionResult)
async analyzeDocument(
  @Arg('text') text: string,
  @Ctx() { pool }: Context
): Promise<ClaimExtractionResult> {
  return await claimExtractionService.extractClaims(text);
}

@Query(() => [NodeMatch])
async findSimilarClaims(
  @Arg('claimText') claimText: string,
  @Arg('graphId', { nullable: true }) graphId: string,
  @Ctx() { pool }: Context
): Promise<NodeMatch[]> {
  const claim: ExtractedClaim = {
    id: 'temp',
    text: claimText,
    supportingEvidence: [],
    confidence: 1.0,
    keywords: [],
  };

  const matches = await claimExtractionService.matchClaimsToNodes(
    [claim],
    pool,
    graphId
  );

  return matches[0].matches;
}
```

## Debugging

Enable verbose logging:

```typescript
// In service constructor or method
console.log('=== ClaimExtractionService Debug ===');
console.log('Ollama URL:', this.ollamaUrl);
console.log('Model:', this.model);
console.log('Similarity threshold:', this.similarityThreshold);
```

Check Ollama connectivity:

```bash
curl http://localhost:11434/api/tags
```

Test pgvector search:

```sql
SELECT id, title, 1 - (ai <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM public."Nodes"
WHERE ai IS NOT NULL
ORDER BY ai <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

## Future Enhancements

- [ ] **Claim Verification**: Cross-reference claims against fact-checking databases
- [ ] **Multi-Language Support**: Detect and process non-English documents
- [ ] **Temporal Analysis**: Track how claims evolve over time
- [ ] **Contradiction Detection**: Flag contradictory claims within the knowledge graph
- [ ] **Automated Evidence Linking**: Automatically create edges between related claims
- [ ] **Citation Network Analysis**: Build citation graphs from extracted sources
- [ ] **Quality Metrics**: Track service accuracy with human validation feedback

## License

Part of Project Rabbit Hole - See root LICENSE file.

## Support

For issues or questions:
1. Check examples in `__examples__/ClaimExtractionService.example.ts`
2. Review debug logs in console output
3. Verify Ollama is running: `ollama serve`
4. Check database connectivity: `psql $DATABASE_URL`
