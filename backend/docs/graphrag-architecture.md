# GraphRAG Architecture for "Connect the Dots" AI Assistant

## Executive Summary

The GraphRAG (Graph Retrieval-Augmented Generation) architecture powers the "Connect the Dots" AI assistant in Project Rabbit Hole. It combines semantic vector search with structured graph traversal to provide contextually aware, intelligent insights about complex relationships within the knowledge graph. This document outlines the technical architecture, query strategies, and optimization techniques used to deliver real-time, contextually relevant AI assistance.

## Overview

GraphRAG synthesizes two complementary approaches:
- **Vector Similarity Search**: Identifies semantically relevant nodes based on meaning and context
- **Graph Traversal**: Explores explicit structural relationships between entities

This hybrid approach delivers superior results compared to either method in isolation, as referenced in PRD Section 4.2.

## The 4-Step GraphRAG Process

### 1. Anchor Node Identification

The first step identifies the most relevant starting points for graph exploration.

**Process:**
- User query and selected nodes are embedded into 1536-dimensional vectors using OpenAI's embedding model
- Vector similarity search executed against HNSW index in PostgreSQL using pgvector
- Returns top-K semantically similar nodes from both Level 0 (verified facts) and user's Level 1 graph
- Similarity threshold (default: cosine similarity > 0.7) filters out weakly related nodes

**Key Metrics:**
- Query latency: < 50ms for top-10 retrieval
- Precision: > 85% relevance based on user feedback
- Index size: ~100MB per million nodes

### 2. Graph Traversal (Contextual Expansion)

Starting from anchor nodes, the system explores the graph to gather relevant context.

**Traversal Strategy:**
- Recursive CTE queries explore up to N degrees of separation (configurable, default: 3)
- Edge weights (veracity scores) influence traversal priority
- Traversal budget prevents runaway queries (max 500 nodes per request)
- Bi-directional exploration captures both incoming and outgoing relationships

**Traversal Modes:**
- **Breadth-First**: Default mode for general exploration
- **Depth-First**: Used for lineage/provenance queries
- **Weighted**: Prioritizes high-veracity edges for trusted path finding

### 3. Prompt Augmentation

The retrieved subgraph is transformed into an optimized prompt for the LLM.

**Serialization Format:**
```
CONTEXT:
Nodes:
- [Node ID: ABC123] Person "John Doe" (veracity: 1.0)
  Properties: {role: "CEO", company: "TechCorp"}
- [Node ID: DEF456] Organization "TechCorp" (veracity: 0.95)
  Properties: {founded: 2010, industry: "AI"}

Edges:
- [Edge ID: XYZ789] WORKS_FOR: John Doe -> TechCorp (veracity: 1.0)
  Properties: {since: 2015, position: "CEO"}

USER QUERY: {original_query}
SELECTED CONTEXT: {user_selected_nodes}
```

**Optimization Techniques:**
- Token budget management (max 8000 tokens for context)
- Node/edge prioritization based on relevance scores
- Property filtering to include only relevant attributes
- Relationship path summarization for complex traversals

### 4. Response Generation

The LLM generates insights using the augmented context.

**Response Features:**
- Natural language explanations of complex relationships
- Citation of specific nodes/edges as evidence
- Confidence scoring based on veracity of referenced data
- Suggested next exploration steps
- Identification of potential missing links

## Query Optimization Strategies

### 1. Vector Index Optimization

**HNSW Index Configuration:**
```sql
-- Optimized HNSW index for fast similarity search
CREATE INDEX idx_nodes_ai_hnsw ON public."Nodes" 
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- Separate index for Level 0 nodes (verified facts)
CREATE INDEX idx_nodes_level0_ai_hnsw ON public."Nodes" 
USING hnsw (ai vector_cosine_ops)
WHERE weight = 1.0
WITH (m = 24, ef_construction = 300);
```

**Performance Tuning:**
- `m` parameter: 16-24 for balanced speed/accuracy
- `ef_construction`: 200-300 for quality build
- `ef_search`: Dynamic based on query requirements (10-100)
- Partial indexes for frequently queried subsets

### 2. Graph Traversal Optimization

**Recursive CTE Optimization:**
```sql
-- Materialized path for frequently traversed relationships
WITH RECURSIVE graph_traversal AS (
  -- Anchor nodes from vector search
  SELECT n.*, 0 as depth, ARRAY[n.id] as path
  FROM "Nodes" n
  WHERE n.id = ANY($1::uuid[])
  
  UNION ALL
  
  -- Recursive expansion
  SELECT n.*, gt.depth + 1, gt.path || n.id
  FROM graph_traversal gt
  JOIN "Edges" e ON (e.source_node_id = gt.id OR e.target_node_id = gt.id)
  JOIN "Nodes" n ON (
    CASE 
      WHEN e.source_node_id = gt.id THEN e.target_node_id
      ELSE e.source_node_id
    END = n.id
  )
  WHERE gt.depth < $2  -- max depth
    AND NOT n.id = ANY(gt.path)  -- prevent cycles
    AND e.weight >= $3  -- minimum veracity threshold
)
SELECT DISTINCT * FROM graph_traversal;
```

**Optimization Techniques:**
- Path arrays prevent infinite cycles
- Early termination on depth limits
- Veracity thresholds reduce noise
- Prepared statements for query plan caching

### 3. Combined Query Optimization

**Single-Pass Vector + Graph Query:**
```sql
-- Combined vector similarity and graph traversal in one query
WITH vector_anchors AS (
  -- Vector similarity search
  SELECT id, 1 - (ai <=> $1::vector) as similarity
  FROM "Nodes"
  WHERE ai <=> $1::vector < 0.3  -- cosine distance threshold
  ORDER BY ai <=> $1::vector
  LIMIT 10
),
graph_expansion AS (
  -- Graph traversal from anchors
  WITH RECURSIVE traversal AS (
    SELECT n.*, va.similarity, 0 as depth
    FROM vector_anchors va
    JOIN "Nodes" n ON n.id = va.id
    
    UNION ALL
    
    SELECT n.*, t.similarity * 0.8, t.depth + 1
    FROM traversal t
    JOIN "Edges" e ON e.source_node_id = t.id
    JOIN "Nodes" n ON n.id = e.target_node_id
    WHERE t.depth < 2
      AND e.weight > 0.5
  )
  SELECT * FROM traversal
)
SELECT * FROM graph_expansion
ORDER BY similarity DESC, depth ASC;
```

## Caching Strategies

### 1. Multi-Level Cache Architecture

**L1 - Application Memory Cache:**
- In-memory cache for frequently accessed nodes/edges
- LRU eviction policy with 1000 item capacity
- TTL: 5 minutes for Level 1 data, 1 hour for Level 0 data
- Hit ratio target: > 40%

**L2 - Redis Cache:**
- Distributed cache for vector embeddings
- Key pattern: `embed:{content_hash}:{model_version}`
- TTL: 24 hours for embeddings
- Compression: LZ4 for vector data

**L3 - PostgreSQL Materialized Views:**
- Pre-computed graph statistics
- Common traversal patterns
- Refresh strategy: Incremental for active graphs, batch for cold data

### 2. Query Result Caching

**Vector Search Results:**
```typescript
interface VectorSearchCache {
  key: string;  // Hash of query vector + parameters
  results: string[];  // Node IDs
  similarity_scores: number[];
  timestamp: number;
  ttl: number;  // 300 seconds default
}
```

**Graph Traversal Results:**
```typescript
interface TraversalCache {
  anchor_nodes: string[];
  max_depth: number;
  veracity_threshold: number;
  subgraph: {
    nodes: Node[];
    edges: Edge[];
  };
  cache_key: string;
  expires_at: number;
}
```

### 3. Cache Invalidation Strategy

**Event-Driven Invalidation:**
- Node/Edge updates trigger cache invalidation
- Cascade invalidation for dependent cache entries
- Async invalidation to prevent blocking

**Smart Invalidation Rules:**
- Level 0 changes: Full cache clear (rare event)
- Level 1 changes: Selective invalidation of affected subgraphs
- Veracity score changes > 0.1: Invalidate traversal cache
- New edges: Invalidate only affected node neighborhoods

## Performance Benchmarks

### Target Metrics

| Operation | Target Latency | Current Performance |
|-----------|---------------|-------------------|
| Vector Similarity Search (Top-10) | < 50ms | 35ms avg |
| Graph Traversal (Depth 3, 100 nodes) | < 200ms | 180ms avg |
| Combined GraphRAG Query | < 500ms | 420ms avg |
| LLM Response Generation | < 3000ms | 2800ms avg |
| End-to-end Assistant Response | < 4000ms | 3500ms avg |

### Scalability Targets

- Support for 10M+ nodes in Level 0
- 100K+ concurrent user graphs in Level 1
- 1000+ queries per second
- Sub-second response time for 95th percentile

## Implementation Considerations

### 1. Token Budget Management

The system must carefully manage context size for LLM prompts:
- Maximum context: 8000 tokens (~32KB text)
- Priority scoring for node/edge inclusion
- Summarization of long property values
- Path compression for deep traversals

### 2. Relevance Scoring

Multi-factor relevance scoring combines:
- Vector similarity score (0.0 - 1.0)
- Graph distance penalty (exponential decay)
- Edge veracity weights
- Node type relevance multipliers
- Recency bias for temporal data

### 3. Security Considerations

- Query depth limits prevent DoS attacks
- Rate limiting per user/IP
- Sanitization of user queries before embedding
- Access control enforcement during traversal
- PII detection and redaction in responses

## Monitoring and Observability

### Key Metrics to Track

**Performance Metrics:**
- Query latency percentiles (p50, p95, p99)
- Cache hit ratios by layer
- Vector search recall@k
- Graph traversal node counts
- Token usage per query

**Quality Metrics:**
- User feedback on relevance
- Citation accuracy rate
- False positive rate for connections
- Veracity score distribution of results

**System Health:**
- HNSW index build time
- PostgreSQL query queue depth
- Redis memory usage
- Embedding service availability
- LLM API rate limit utilization

## Future Enhancements

### Near-term (Q1 2025)
- Hybrid embeddings (text + graph structure)
- Query understanding with intent classification
- Personalized relevance ranking
- Incremental index updates

### Medium-term (Q2-Q3 2025)
- Multi-modal embeddings (text + images)
- Temporal graph queries
- Explanation generation for traversal paths
- A/B testing framework for algorithm improvements

### Long-term (Q4 2025+)
- Custom fine-tuned embedding models
- Learned traversal strategies
- Federated GraphRAG across instances
- Real-time collaborative exploration

## References

- PRD Section 4.2: AI Assistant Architecture (GraphRAG)
- PostgreSQL Recursive CTE Documentation
- pgvector HNSW Index Configuration Guide
- OpenAI Embedding Best Practices
- Graph Traversal Algorithms (Cormen et al.)

## Appendix A: Configuration Parameters

```yaml
graphrag:
  vector_search:
    index_type: "hnsw"
    m: 16
    ef_construction: 200
    ef_search: 40
    similarity_threshold: 0.7
    max_results: 10
  
  graph_traversal:
    max_depth: 3
    max_nodes: 500
    min_veracity: 0.5
    traversal_mode: "breadth_first"
    cycle_detection: true
  
  prompt_generation:
    max_tokens: 8000
    include_properties: true
    summarize_long_values: true
    citation_format: "inline"
  
  caching:
    l1_ttl_seconds: 300
    l2_ttl_seconds: 86400
    l3_refresh_interval: 3600
    max_cache_size_mb: 1024
  
  performance:
    query_timeout_ms: 5000
    max_concurrent_queries: 100
    rate_limit_per_user: 60
```
