# GraphRAG Quick Start Guide

## What is GraphRAG?

GraphRAG (Graph Retrieval Augmented Generation) allows you to ask questions about your knowledge graph and get AI-generated answers with citations.

**How it works:**
1. Converts your question into a vector embedding
2. Finds the most similar nodes in your graph
3. Expands the context by following relationships
4. Generates an answer using the retrieved context
5. Returns the answer with citations to specific nodes

## Prerequisites

### 1. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version
```

### 2. Install Required Models

```bash
# Embedding model (for vector search)
ollama pull nomic-embed-text

# Chat model (for generating answers)
ollama pull llama3.2

# Verify models are ready
ollama list
```

### 3. Configure Environment

Add to `/Users/kmk/rabbithole/backend/.env`:

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_MODEL=llama3.2
```

### 4. Start Ollama Server

```bash
# Start Ollama (if not already running)
ollama serve
```

## Generate Embeddings for Your Nodes

Nodes need vector embeddings before you can search them. You can use the vectorization worker:

```bash
# Start the vectorization worker
cd /Users/kmk/rabbithole/backend
npm run worker:dev
```

The worker will:
- Listen for node create/update events via RabbitMQ
- Generate embeddings using Ollama
- Store them in the `ai` column of the Nodes table

**Alternative:** Run a one-time batch script to embed existing nodes (see main documentation).

## Testing GraphRAG

### 1. Vector Search Only

Find semantically similar nodes:

```graphql
query FindSimilarNodes {
  findSimilarNodes(input: {
    graphId: "your-graph-id"
    query: "customer feedback analysis"
    limit: 5
  }) {
    id
    nodeType
    similarity
    props
  }
}
```

### 2. Full GraphRAG Query

Ask a question and get an answer with citations:

```graphql
mutation AskAssistant {
  askAssistant(input: {
    graphId: "your-graph-id"
    query: "What are the main causes identified in this analysis?"
    topK: 5
    expansionDepth: 2
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

### 3. Focused Analysis

Search within specific nodes:

```graphql
mutation FocusedQuery {
  askAssistant(input: {
    graphId: "your-graph-id"
    query: "How does this evidence support the hypothesis?"
    selectedNodeIds: ["hypothesis-node-id"]
    topK: 3
    expansionDepth: 2
  }) {
    answer
    citedNodes {
      id
      props
    }
    subgraph {
      nodes {
        id
        nodeType
        depth
      }
      edges {
        sourceNodeId
        targetNodeId
        edgeType
      }
    }
  }
}
```

## Common Use Cases

### 1. Root Cause Analysis

```graphql
mutation FindRootCause {
  askAssistant(input: {
    graphId: "5-whys-graph"
    query: "What is the root cause based on the 5 whys analysis?"
    topK: 8
    expansionDepth: 3
  }) {
    answer
    citedNodes { id props }
  }
}
```

### 2. Evidence Validation

```graphql
mutation ValidateHypothesis {
  askAssistant(input: {
    graphId: "investigation-graph"
    query: "What evidence supports or contradicts the main hypothesis?"
    selectedNodeIds: ["main-hypothesis-id"]
    topK: 10
    expansionDepth: 2
  }) {
    answer
    citedNodes { id relevance props }
  }
}
```

### 3. Pattern Discovery

```graphql
mutation FindPatterns {
  askAssistant(input: {
    graphId: "timeline-graph"
    query: "What temporal patterns or trends emerge from the data?"
    topK: 15
    expansionDepth: 2
  }) {
    answer
    citedNodes { id props }
  }
}
```

### 4. Methodology Compliance

```graphql
mutation CheckCompliance {
  askAssistant(input: {
    graphId: "fishbone-graph"
    query: "Are all 6Ms (Man, Machine, Material, Method, Measurement, Environment) adequately covered?"
    topK: 12
    expansionDepth: 2
  }) {
    answer
    citedNodes { id relevance props }
  }
}
```

## Parameters Explained

### `topK` (default: 5)
- Number of similar nodes to retrieve
- Range: 1-20
- Higher = more context, but slower

### `expansionDepth` (default: 2)
- How many relationship hops to expand
- Range: 1-5
- Higher = more context, but exponentially more nodes

### `selectedNodeIds` (optional)
- Restrict search to specific nodes
- Empty array = search entire graph
- Useful for focused analysis

### `limit` (for findSimilarNodes only)
- Maximum number of results
- Default: 10

## Troubleshooting

### "Cannot connect to Ollama"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve

# Verify models are installed
ollama list
```

### "No similar nodes found"

Nodes don't have embeddings yet:

```sql
-- Check embedding coverage
SELECT
  COUNT(*) FILTER (WHERE ai IS NOT NULL) as with_embeddings,
  COUNT(*) FILTER (WHERE ai IS NULL) as without_embeddings
FROM public."Nodes";
```

Start the vectorization worker or run batch embedding script.

### "Graph not found"

Verify the graphId:

```graphql
query GetGraphs {
  graphs {
    id
    name
    description
  }
}
```

### Performance is slow

- Reduce `topK` (try 3-5)
- Reduce `expansionDepth` (try 1-2)
- Check Ollama model performance
- Ensure pgvector index exists

## Architecture Overview

```
┌─────────────┐
│ User Query  │
└──────┬──────┘
       ↓
┌──────────────────────────────┐
│ 1. Generate Query Embedding  │ ← Ollama (nomic-embed-text)
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ 2. Vector Similarity Search  │ ← pgvector (cosine similarity)
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ 3. Expand Subgraph           │ ← Recursive CTE (PostgreSQL)
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ 4. Generate Response         │ ← Ollama (llama3.2)
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ Answer + Citations + Subgraph│
└──────────────────────────────┘
```

## Integration with Existing Features

GraphRAG complements existing AI features:

| Feature | Purpose | Best For |
|---------|---------|----------|
| **findSimilarNodes** | Vector search | Finding related content |
| **askAssistant** (GraphRAG) | Q&A with citations | Specific analysis questions |
| **askAIAssistant** | General chat | Exploratory discussions |
| **suggestEvidenceSources** | Evidence recommendations | Strengthening claims |
| **detectGraphInconsistencies** | Quality check | Validation and review |

## Performance Tips

1. **Start Small**: Use `topK: 3` and `expansionDepth: 1` initially
2. **Iterate**: Increase parameters if more context is needed
3. **Focus Search**: Use `selectedNodeIds` to narrow scope
4. **Cache**: Consider implementing response caching for common queries
5. **Monitor**: Track query latency and adjust parameters

## Next Steps

1. ✅ Install Ollama and models
2. ✅ Configure environment variables
3. ✅ Start vectorization worker
4. ✅ Test with sample queries
5. ⬜ Integrate into your workflow
6. ⬜ Build UI components for GraphRAG
7. ⬜ Monitor and optimize performance

## Example Workflow

```bash
# 1. Start Ollama
ollama serve

# 2. Start the backend
cd /Users/kmk/rabbithole/backend
npm run start

# 3. Start vectorization worker (in another terminal)
npm run worker:dev

# 4. Test via GraphQL playground
open http://localhost:4000/graphql
```

## Sample Response

When you ask: *"What are the main findings in this investigation?"*

You get:
```json
{
  "answer": "Based on the evidence in your graph, there are 3 main findings:\n\n1. **Customer onboarding is a critical pain point** [Node: abc-123] - Analysis shows 45% of churned users never completed the initial setup, indicating significant friction.\n\n2. **Feature awareness is low** [Node: def-456] - Users who churned utilized only 2 out of 10 available features on average, suggesting poor discoverability.\n\n3. **Support response times impact retention** [Node: ghi-789] - 68% of churned users had support tickets that exceeded 48-hour response SLA.\n\nThese findings are interconnected through [Node: jkl-012] which shows the correlation between onboarding completion and long-term retention.",
  "citedNodes": [
    {
      "id": "abc-123",
      "relevance": "Direct match",
      "props": {
        "label": "Onboarding completion rate",
        "value": "55% completion"
      }
    }
  ],
  "subgraph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

## Support

For issues or questions:
1. Check troubleshooting section
2. Review main documentation: `GRAPHRAG_IMPLEMENTATION.md`
3. Verify Ollama is running and models are installed
4. Check backend logs for detailed error messages

---

**Happy GraphRAG querying! 🚀**
