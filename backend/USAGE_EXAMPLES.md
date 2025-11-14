# Document Processing - Usage Examples

## Quick Start Guide

### Prerequisites

1. **Start the Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Ensure Ollama is Running** (for AI features)
   ```bash
   ollama serve
   ollama pull llama3.2
   ```

3. **Access GraphQL Playground**
   ```
   http://localhost:4000/graphql
   ```

---

## Example 1: Upload and Process a PDF Document

### Step 1: Upload a PDF File

```graphql
mutation UploadPDF {
  uploadEvidenceFile(
    evidenceId: "evidence-uuid-here"
    file: # Upload via file input in GraphQL Playground
    isPrimary: true
  ) {
    id
    original_filename
    file_size
    mime_type
    processing_status
    storage_key
  }
}
```

**Response:**
```json
{
  "data": {
    "uploadEvidenceFile": {
      "id": "file-123-uuid",
      "original_filename": "warren_commission_report.pdf",
      "file_size": 5242880,
      "mime_type": "application/pdf",
      "processing_status": "completed",
      "storage_key": "evidence/evidence-uuid/a1b2c3d4/1699123456_warren_commission_report.pdf"
    }
  }
}
```

### Step 2: Process the Document

```graphql
mutation ProcessDocument {
  processDocument(
    fileId: "file-123-uuid"
    graphId: "jfk-investigation-graph"
    extractEntities: true
    generateSummary: true
    createNodes: true
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
    error
  }
}
```

**Response:**
```json
{
  "data": {
    "processDocument": {
      "success": true,
      "extractedText": "The President's Commission on the Assassination of President Kennedy...",
      "summary": "The Warren Commission Report, released in 1964, investigated the assassination of President John F. Kennedy. The commission concluded that Lee Harvey Oswald acted alone in shooting President Kennedy from the Texas School Book Depository...",
      "entityCount": 47,
      "entities": [
        {
          "type": "person",
          "value": "Lee Harvey Oswald",
          "confidence": 0.95,
          "context": "primary suspect in the assassination"
        },
        {
          "type": "person",
          "value": "Jack Ruby",
          "confidence": 0.92,
          "context": "killed Oswald on November 24"
        },
        {
          "type": "location",
          "value": "Dealey Plaza",
          "confidence": 0.88,
          "context": "location of the assassination"
        },
        {
          "type": "date",
          "value": "November 22, 1963",
          "confidence": 0.99,
          "context": null
        }
      ],
      "createdNodeIds": [
        "node-1-uuid",
        "node-2-uuid",
        "node-3-uuid",
        "node-4-uuid"
      ],
      "processingTimeMs": 12450,
      "error": null
    }
  }
}
```

### Step 3: Retrieve Processing Results Later

```graphql
query GetProcessingResult {
  getDocumentProcessingResult(fileId: "file-123-uuid") {
    fileId
    extractedText
    summary
    extractedAt
    summaryGeneratedAt
  }
}
```

---

## Example 2: Simple Text Extraction (No AI)

For cases where you just want the text without AI processing:

```graphql
mutation ExtractTextOnly {
  processDocument(
    fileId: "file-456-uuid"
    extractEntities: false
    generateSummary: false
    createNodes: false
  ) {
    success
    extractedText
    processingTimeMs
  }
}
```

**Response:**
```json
{
  "data": {
    "processDocument": {
      "success": true,
      "extractedText": "Full document text here...",
      "processingTimeMs": 1234
    }
  }
}
```

---

## Example 3: Extract Entities Without Creating Nodes

Useful for reviewing entities before committing them to the graph:

```graphql
mutation ExtractEntitiesPreview {
  processDocument(
    fileId: "file-789-uuid"
    extractEntities: true
    generateSummary: false
    createNodes: false  # Preview mode
  ) {
    success
    entityCount
    entities {
      type
      value
      confidence
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "processDocument": {
      "success": true,
      "entityCount": 23,
      "entities": [
        {
          "type": "person",
          "value": "John Doe",
          "confidence": 0.85
        },
        {
          "type": "organization",
          "value": "Federal Bureau of Investigation",
          "confidence": 0.92
        }
      ]
    }
  }
}
```

---

## Example 4: Complete Workflow with Evidence

### Step 1: Create Evidence Record

```graphql
mutation AttachLinkEvidence {
  attachLinkEvidence(
    input: {
      nodeId: "claim-node-uuid"
      url: "https://example.com/document.pdf"
      title: "Supporting Document"
      description: "Official report supporting the claim"
    }
  ) {
    id
    evidence_type
    weight
    confidence
  }
}
```

### Step 2: Upload PDF to Evidence

```graphql
mutation UploadToEvidence {
  uploadEvidenceFile(
    evidenceId: "evidence-uuid-from-step-1"
    file: # Upload file
  ) {
    id
    original_filename
  }
}
```

### Step 3: Process and Create Nodes

```graphql
mutation ProcessAndCreateNodes {
  processDocument(
    fileId: "file-uuid-from-step-2"
    graphId: "investigation-graph"
    extractEntities: true
    generateSummary: true
    createNodes: true
  ) {
    success
    createdNodeIds
    summary
  }
}
```

---

## Example 5: Batch Processing Multiple Files

You can process multiple files in parallel:

```graphql
mutation ProcessMultipleDocuments {
  doc1: processDocument(fileId: "file-1", extractEntities: true) {
    success
    entityCount
  }

  doc2: processDocument(fileId: "file-2", extractEntities: true) {
    success
    entityCount
  }

  doc3: processDocument(fileId: "file-3", extractEntities: true) {
    success
    entityCount
  }
}
```

---

## Example 6: Error Handling

### Handling Missing Files

```graphql
mutation ProcessNonexistent {
  processDocument(fileId: "invalid-uuid") {
    success
    error
  }
}
```

**Response:**
```json
{
  "data": {
    "processDocument": {
      "success": false,
      "error": "File invalid-uuid not found"
    }
  }
}
```

### Handling Unsupported File Types

```graphql
# Upload an unsupported file type
mutation UploadExecutable {
  uploadEvidenceFile(
    evidenceId: "evidence-uuid"
    file: # Upload .exe file
  ) {
    id
  }
}
```

**Response:**
```json
{
  "errors": [
    {
      "message": "File type application/x-msdownload is not allowed",
      "path": ["uploadEvidenceFile"]
    }
  ]
}
```

---

## Example 7: Query All Files for Evidence

```graphql
query GetEvidenceFiles {
  getEvidenceFiles(evidenceId: "evidence-uuid") {
    id
    original_filename
    file_size
    mime_type
    processing_status
    created_at
    is_primary
  }
}
```

---

## Example 8: Get Download URL for a File

```graphql
query GetDownloadUrl {
  getFileDownloadUrl(
    fileId: "file-uuid"
    expiresIn: 3600  # 1 hour
  )
}
```

**Response:**
```json
{
  "data": {
    "getFileDownloadUrl": "/files/evidence/evidence-uuid/a1b2c3d4/1699123456_document.pdf"
  }
}
```

---

## Example 9: Search Processed Documents

Using PostgreSQL full-text search:

```sql
-- Direct SQL query (not GraphQL)
SELECT
  dpr.file_id,
  ef.original_filename,
  ts_headline('english', dpr.extracted_text, q) AS snippet
FROM public."DocumentProcessingResults" dpr
JOIN public."EvidenceFiles" ef ON dpr.file_id = ef.id
CROSS JOIN plainto_tsquery('english', 'assassination conspiracy') AS q
WHERE to_tsvector('english', dpr.extracted_text) @@ q
ORDER BY ts_rank(to_tsvector('english', dpr.extracted_text), q) DESC
LIMIT 10;
```

---

## Example 10: Integration with Graph Traversal

```graphql
# 1. Process document and create nodes
mutation ProcessDoc {
  processDocument(
    fileId: "file-uuid"
    graphId: "investigation-graph"
    createNodes: true
  ) {
    createdNodeIds
  }
}

# 2. Traverse from created nodes
query TraverseFromDocument {
  traverseGraph(
    graphId: "investigation-graph"
    startNodeIds: ["node-uuid-from-doc"]
    depth: 2
  ) {
    nodes {
      id
      title
      props
    }
    edges {
      source_node_id
      target_node_id
      edge_type
    }
  }
}
```

---

## Performance Tips

### 1. Large Documents
For documents over 100 pages:
- Set `createNodes: false` initially
- Review entities first
- Create nodes selectively

### 2. Batch Operations
Process multiple documents in sequence:
```javascript
const files = ['file-1', 'file-2', 'file-3'];

for (const fileId of files) {
  await client.mutate({
    mutation: PROCESS_DOCUMENT,
    variables: { fileId, createNodes: false }
  });
}
```

### 3. Monitoring Progress
Check processing status:
```graphql
query CheckStatus {
  getEvidenceFiles(evidenceId: "evidence-uuid") {
    id
    original_filename
    processing_status
  }
}
```

---

## Common Use Cases

### Academic Research
- Upload research papers (PDF)
- Extract authors, institutions, citations
- Create nodes for each paper
- Link related papers automatically

### Legal Discovery
- Upload court documents
- Extract parties, dates, case numbers
- Summarize key arguments
- Create timeline nodes automatically

### Historical Investigation
- Upload archival documents
- Extract people, places, events
- Generate narrative summaries
- Build chronological graph

### News Analysis
- Upload news articles
- Extract entities and topics
- Identify connections
- Track story evolution

---

## Troubleshooting

### Issue: "Ollama is not running"
**Solution:**
```bash
ollama serve
# In another terminal:
ollama pull llama3.2
```

### Issue: "File type not allowed"
**Solution:** Check `/backend/src/services/FileStorageService.ts` line 413-437 for allowed MIME types

### Issue: "Processing takes too long"
**Solution:**
- Set `generateSummary: false` for faster processing
- Use `createNodes: false` to skip node creation
- Consider async processing via RabbitMQ (future enhancement)

### Issue: "Not enough entities extracted"
**Solution:**
- Ensure Ollama is running (AI extraction finds more entities)
- Lower confidence threshold in code
- Add custom patterns for domain-specific entities

---

## Next Steps

After processing documents:
1. Review created nodes in graph
2. Manually adjust node properties
3. Create edges between related nodes
4. Use AI assistant to analyze relationships
5. Generate compliance reports
