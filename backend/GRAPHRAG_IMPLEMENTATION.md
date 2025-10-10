# GraphRAG Implementation Guide

## Overview

GraphRAG (Graph Retrieval Augmented Generation) is an advanced query system that combines:

1. **Vector Similarity Search** - Find semantically similar nodes using embeddings
2. **Graph Traversal** - Expand context by following relationships
3. **LLM Generation** - Generate responses with citations using retrieved context

This implementation uses:
- **pgvector** for vector similarity search
- **Ollama** for embeddings and LLM generation
- **PostgreSQL Recursive CTEs** for efficient graph traversal

## Architecture

```
User Query
    ↓
[1. Generate Embedding] (Ollama: nomic-embed-text)
    ↓
[2. Vector Search] (pgvector: cosine similarity)
    ↓
[3. Expand Subgraph] (Recursive CTE traversal)
    ↓
[4. Generate Response] (Ollama: llama3.2)
    ↓
Response with Citations
```

## Implementation Files

### Core Service: `/Users/kmk/rabbithole/backend/src/services/GraphRAGService.ts`

**Key Methods:**

1. **`findSimilarNodes(pool, query, selectedNodeIds, limit)`**
   - Generates embedding for query using Ollama
   - Performs vector similarity search using pgvector
   - Returns top-k similar nodes with similarity scores

2. **`expandSubgraph(pool, anchorNodeIds, depth)`**
   - Uses recursive CTE to traverse graph
   - Expands from anchor nodes up to specified depth
   - Prevents cycles and returns nodes with depth information

3. **`generateResponse(query, subgraph, context)`**
   - Builds context from subgraph nodes and edges
   - Calls Ollama LLM to generate answer
   - Extracts node citations from response

4. **`query(pool, graphId, query, selectedNodeIds, expansionDepth, topK)`**
   - Full GraphRAG pipeline combining all steps
   - Handles graph access control
   - Returns structured response with answer and citations

### GraphQL Types: `/Users/kmk/rabbithole/backend/src/entities/GraphRAG.ts`

**Output Types:**
- `SimilarNode` - Node with similarity score
- `SubgraphNode` - Node with depth information
- `SubgraphEdge` - Edge in subgraph
- `Subgraph` - Collection of nodes and edges
- `CitedNode` - Node referenced in answer
- `AssistantResponse` - Complete GraphRAG response

**Input Types:**
- `FindSimilarNodesInput` - Parameters for vector search
- `AskAssistantInput` - Parameters for full GraphRAG query

### Resolver: `/Users/kmk/rabbithole/backend/src/resolvers/AIAssistantResolver.ts`

**New Methods:**
- `findSimilarNodes` - Query for vector search only
- `askAssistant` - Mutation for full GraphRAG pipeline

## GraphQL API Examples

### 1. Find Similar Nodes (Vector Search Only)

```graphql
query FindSimilarNodes {
  findSimilarNodes(input: {
    graphId: "your-graph-id"
    query: "What are the root causes of customer churn?"
    selectedNodeIds: []  # Optional: search within specific nodes
    limit: 10
  }) {
    id
    nodeType
    similarity
    weight
    props
    meta
  }
}
```

**Use Cases:**
- Semantic search within a graph
- Finding related concepts
- Building context for questions

**Response:**
```json
{
  "data": {
    "findSimilarNodes": [
      {
        "id": "node-uuid-1",
        "nodeType": "Hypothesis",
        "similarity": 0.89,
        "weight": 0.75,
        "props": {
          "label": "Poor onboarding experience",
          "description": "Users struggle with initial setup"
        },
        "meta": {}
      },
      {
        "id": "node-uuid-2",
        "nodeType": "Evidence",
        "similarity": 0.82,
        "weight": 0.68,
        "props": {
          "label": "45% of churned users never completed setup",
          "source": "Analytics Dashboard"
        },
        "meta": {}
      }
    ]
  }
}
```

### 2. Ask Assistant (Full GraphRAG)

```graphql
mutation AskAssistant {
  askAssistant(input: {
    graphId: "your-graph-id"
    query: "Based on the evidence, what are the top 3 reasons for customer churn?"
    selectedNodeIds: []  # Optional: focus on specific nodes
    expansionDepth: 2    # How many hops to expand (1-5)
    topK: 5              # Number of similar nodes to find (1-20)
  }) {
    answer
    citedNodes {
      id
      relevance
      props
    }
    subgraph {
      anchorNodeIds
      nodes {
        id
        nodeType
        depth
        weight
        props
      }
      edges {
        id
        sourceNodeId
        targetNodeId
        edgeType
        props
      }
    }
  }
}
```

**Use Cases:**
- Asking questions about your graph
- Getting AI-generated insights
- Finding connections between concepts
- Validating hypotheses with evidence

**Response:**
```json
{
  "data": {
    "askAssistant": {
      "answer": "Based on the evidence in your graph, the top 3 reasons for customer churn are:\n\n1. **Poor Onboarding Experience** [Node: node-uuid-1] - 45% of churned users never completed the initial setup process, suggesting significant friction in the onboarding flow.\n\n2. **Lack of Feature Awareness** [Node: node-uuid-3] - Users who churned used an average of only 2 out of 10 available features, indicating they didn't understand the product's full value.\n\n3. **Slow Support Response Times** [Node: node-uuid-5] - 68% of churned users had open support tickets that took over 48 hours to receive initial response.\n\nThese findings are supported by [Node: node-uuid-2] showing analytics data and [Node: node-uuid-4] containing customer feedback surveys.",
      "citedNodes": [
        {
          "id": "node-uuid-1",
          "relevance": "Direct match",
          "props": {
            "label": "Poor onboarding experience",
            "description": "Users struggle with initial setup"
          }
        },
        {
          "id": "node-uuid-2",
          "relevance": "Related (depth 1)",
          "props": {
            "label": "45% of churned users never completed setup",
            "source": "Analytics Dashboard"
          }
        }
      ],
      "subgraph": {
        "anchorNodeIds": ["node-uuid-1", "node-uuid-3", "node-uuid-5"],
        "nodes": [
          {
            "id": "node-uuid-1",
            "nodeType": "Hypothesis",
            "depth": 0,
            "weight": 0.75,
            "props": { "label": "Poor onboarding experience" }
          }
        ],
        "edges": [
          {
            "id": "edge-uuid-1",
            "sourceNodeId": "node-uuid-1",
            "targetNodeId": "node-uuid-2",
            "edgeType": "SupportedBy",
            "props": { "confidence": "high" }
          }
        ]
      }
    }
  }
}
```

### 3. Context-Focused Query

```graphql
mutation AskWithContext {
  askAssistant(input: {
    graphId: "your-graph-id"
    query: "How does the onboarding process relate to retention rates?"
    selectedNodeIds: [
      "node-onboarding-1",
      "node-onboarding-2",
      "node-retention-1"
    ]
    expansionDepth: 1
    topK: 3
  }) {
    answer
    citedNodes {
      id
      relevance
      props
    }
  }
}
```

**Use Case:**
When you want to focus the AI's attention on specific nodes and their immediate neighbors.

## Setup Requirements

### 1. Database (Already Configured)

The database already has pgvector extension installed:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Vector columns exist on:
- `Nodes.ai` - VECTOR(1536)
- `Edges.ai` - VECTOR(1536)
- `NodeTypes.ai` - VECTOR(1536)
- `EdgeTypes.ai` - VECTOR(1536)

### 2. Ollama Setup

Install Ollama and required models:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull embedding model (for vector search)
ollama pull nomic-embed-text

# Pull chat model (for response generation)
ollama pull llama3.2

# Verify models are installed
ollama list
```

### 3. Environment Variables

Add to `/Users/kmk/rabbithole/backend/.env`:

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_MODEL=llama3.2
```

### 4. Generate Embeddings for Existing Nodes

Nodes need embeddings in the `ai` column for vector search to work. You have two options:

#### Option A: Use Vectorization Worker (Recommended)

The vectorization worker automatically generates embeddings for new/updated nodes:

```bash
# Start the worker
npm run worker:dev
```

#### Option B: Manual Batch Processing

Create a script to generate embeddings for existing nodes:

```typescript
// src/scripts/generate-embeddings.ts
import axios from 'axios';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await axios.post('http://localhost:11434/api/embeddings', {
    model: 'nomic-embed-text',
    prompt: text,
  });
  return response.data.embedding;
}

async function main() {
  const result = await pool.query(`
    SELECT id, props
    FROM public."Nodes"
    WHERE ai IS NULL
  `);

  console.log(`Found ${result.rows.length} nodes without embeddings`);

  for (const row of result.rows) {
    const props = row.props;
    const text = props.label || props.name || props.title || JSON.stringify(props);

    try {
      const embedding = await generateEmbedding(text);
      await pool.query(
        `UPDATE public."Nodes" SET ai = $1::vector WHERE id = $2`,
        [`[${embedding.join(',')}]`, row.id]
      );
      console.log(`Generated embedding for node ${row.id}`);
    } catch (error) {
      console.error(`Failed for node ${row.id}:`, error);
    }
  }

  console.log('Done!');
  await pool.end();
}

main();
```

Run it:
```bash
ts-node src/scripts/generate-embeddings.ts
```

## Testing

### 1. Test Vector Search

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "query { findSimilarNodes(input: { graphId: \"YOUR_GRAPH_ID\", query: \"customer feedback\", limit: 5 }) { id nodeType similarity props } }"
  }'
```

### 2. Test Full GraphRAG

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "mutation { askAssistant(input: { graphId: \"YOUR_GRAPH_ID\", query: \"What patterns do you see in the data?\", topK: 5, expansionDepth: 2 }) { answer citedNodes { id relevance props } } }"
  }'
```

### 3. Verify Ollama is Running

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Test embedding generation
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test query"
}'

# Test chat
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": false
}'
```

## Error Handling

### Common Errors

1. **"Cannot connect to Ollama"**
   - Ensure Ollama is running: `ollama serve`
   - Check OLLAMA_URL in .env matches Ollama address
   - Verify models are installed: `ollama list`

2. **"No similar nodes found"**
   - Nodes don't have embeddings in `ai` column
   - Run embedding generation script
   - Check query is relevant to graph content

3. **"Graph not found"**
   - Verify graphId is correct
   - Check user has access to the graph

4. **"Expansion depth must be between 1 and 5"**
   - Adjust expansionDepth parameter in request

## Performance Considerations

### Vector Search Performance

- **Index**: pgvector automatically creates HNSW index for fast similarity search
- **Optimal limit**: 5-20 nodes for good context without overwhelming LLM
- **Embedding dimension**: 1536 (matches nomic-embed-text)

### Graph Traversal Performance

- **Depth limit**: 2-3 hops recommended (exponential growth)
- **Cycle prevention**: Built into recursive CTE
- **Node limit**: Subgraph size grows exponentially with depth

### LLM Generation Performance

- **Timeout**: 60 seconds for generation
- **Context size**: Limited by LLM's context window
- **Streaming**: Not implemented (responses return complete)

## Advanced Usage

### 1. Methodology-Aware Queries

```graphql
mutation AskWithMethodology {
  askAssistant(input: {
    graphId: "fishbone-analysis-graph"
    query: "Which of the 6Ms (Man, Machine, Material, Method, Measurement, Environment) shows the strongest evidence?"
    topK: 10
    expansionDepth: 2
  }) {
    answer
    citedNodes { id relevance props }
  }
}
```

### 2. Evidence-Based Analysis

```graphql
mutation AnalyzeEvidence {
  askAssistant(input: {
    graphId: "hypothesis-graph"
    query: "What evidence supports or refutes the main hypothesis?"
    selectedNodeIds: ["main-hypothesis-id"]
    expansionDepth: 3
    topK: 8
  }) {
    answer
    citedNodes { id relevance props }
    subgraph {
      nodes { id nodeType props depth }
      edges { sourceNodeId targetNodeId edgeType }
    }
  }
}
```

### 3. Pattern Discovery

```graphql
mutation FindPatterns {
  askAssistant(input: {
    graphId: "timeline-graph"
    query: "What temporal patterns or sequences emerge from the timeline?"
    topK: 15
    expansionDepth: 2
  }) {
    answer
    citedNodes { id relevance props }
  }
}
```

## Integration with Existing Features

GraphRAG complements existing AI features:

| Feature | Purpose | When to Use |
|---------|---------|-------------|
| `askAIAssistant` | General chat with conversation history | Exploratory questions, methodology guidance |
| `findSimilarNodes` | Vector search only | Finding related content, semantic search |
| `askAssistant` (GraphRAG) | Context-aware Q&A with citations | Specific questions needing evidence, analysis |
| `suggestEvidenceSources` | Evidence recommendations | Strengthening claims, finding gaps |
| `detectGraphInconsistencies` | Logical validation | Quality assurance, peer review |

## Monitoring and Debugging

### Enable Debug Logging

The service logs key operations:

```typescript
console.log(`GraphRAG: Finding similar nodes for query: "${query}..."`);
console.log(`  Found ${similarNodes.length} similar nodes`);
console.log(`GraphRAG: Expanding subgraph from ${anchorNodeIds.length} anchor nodes`);
console.log(`  Expanded to ${subgraph.nodes.length} nodes and ${subgraph.edges.length} edges`);
console.log('GraphRAG: Generating response with LLM');
console.log('GraphRAG: Response generated successfully');
```

### Performance Metrics

Track in production:
- Vector search latency
- Subgraph expansion time
- LLM generation time
- End-to-end query time
- Cache hit rates (if implemented)

## Future Enhancements

Potential improvements:

1. **Hybrid Search** - Combine vector similarity with keyword matching
2. **Re-ranking** - Use LLM to re-rank retrieved nodes
3. **Streaming Responses** - Stream LLM output as it generates
4. **Multi-hop Reasoning** - Chain multiple GraphRAG queries
5. **Caching** - Cache embeddings and subgraphs
6. **Batch Processing** - Handle multiple queries efficiently
7. **Custom Embeddings** - Fine-tune embedding model for domain
8. **Graph Summarization** - Generate executive summaries of large graphs

## Troubleshooting

### Ollama Connection Issues

```bash
# Check if Ollama is running
ps aux | grep ollama

# Start Ollama
ollama serve

# Test connection
curl http://localhost:11434/api/tags
```

### Embedding Issues

```sql
-- Check nodes with embeddings
SELECT COUNT(*) FROM public."Nodes" WHERE ai IS NOT NULL;

-- Check nodes without embeddings
SELECT COUNT(*) FROM public."Nodes" WHERE ai IS NULL;

-- View a sample embedding
SELECT id, ai FROM public."Nodes" WHERE ai IS NOT NULL LIMIT 1;
```

### Performance Issues

```sql
-- Check index on vector column
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Nodes' AND indexdef LIKE '%ai%';

-- Create index if missing
CREATE INDEX IF NOT EXISTS idx_nodes_ai_vector
ON public."Nodes" USING hnsw (ai vector_cosine_ops);
```

## Summary

GraphRAG is now fully implemented with:

✅ Vector similarity search using pgvector and Ollama embeddings
✅ Graph traversal with recursive CTEs and cycle prevention
✅ LLM-powered response generation with node citations
✅ Full GraphQL API with input validation and error handling
✅ Access control and authentication
✅ Comprehensive documentation and examples

The system is ready for testing once Ollama is configured and node embeddings are generated.
