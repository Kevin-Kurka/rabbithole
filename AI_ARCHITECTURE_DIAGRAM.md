# AI Chat Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                                                                  │
│  ┌────────────────┐         ┌──────────────────┐               │
│  │  GraphCanvas   │────────▶│    AIChat        │               │
│  │                │         │  Component       │               │
│  │ - Node Select  │  nodes  │                  │               │
│  │ - Highlight    │◀────────│  - Messages      │               │
│  │ - Navigate     │  cite   │  - Input         │               │
│  └────────────────┘         │  - Citations     │               │
│                              └────────┬─────────┘               │
│                                       │                         │
│                              ┌────────▼─────────┐               │
│                              │ useAIAssistant   │               │
│                              │     Hook         │               │
│                              │                  │               │
│                              │ - askQuestion()  │               │
│                              │ - findSimilar()  │               │
│                              │ - clearHistory() │               │
│                              │ - messages[]     │               │
│                              │ - loading        │               │
│                              └────────┬─────────┘               │
│                                       │                         │
│                              ┌────────▼─────────┐               │
│                              │ Apollo Client    │               │
│                              │ GraphQL          │               │
│                              └────────┬─────────┘               │
└───────────────────────────────────────┼─────────────────────────┘
                                        │
                                        │ HTTP/WebSocket
                                        │
┌───────────────────────────────────────▼─────────────────────────┐
│                         BACKEND                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           AIAssistantResolver (GraphQL)                   │  │
│  │                                                            │  │
│  │  askAssistant(input) ──▶ Returns AssistantResponse       │  │
│  │  findSimilarNodes(input) ──▶ Returns SimilarNode[]       │  │
│  │  getMethodologyGuidance() ──▶ Returns String             │  │
│  └─────────────┬────────────────────────┬───────────────────┘  │
│                │                        │                       │
│       ┌────────▼────────┐     ┌────────▼──────────┐           │
│       │ GraphRAGService │     │ AIAssistantService │           │
│       │                 │     │                    │           │
│       │ 1. Vector Search│     │ - Ollama API       │           │
│       │ 2. Expand Graph │     │ - Rate Limiting    │           │
│       │ 3. Build Context│     │ - Chat History     │           │
│       │ 4. Generate LLM │     │ - Prompts          │           │
│       │ 5. Cite Nodes   │     └────────────────────┘           │
│       └─────────┬───────┘                                       │
│                 │                                               │
│       ┌─────────▼────────┐                                     │
│       │   PostgreSQL     │                                     │
│       │  + pgvector      │                                     │
│       │                  │                                     │
│       │  - Nodes         │                                     │
│       │  - Edges         │                                     │
│       │  - Embeddings    │                                     │
│       └──────────────────┘                                     │
│                                                                 │
└───────────────────────────────────────┬─────────────────────────┘
                                        │
                                        │
                                ┌───────▼────────┐
                                │     Ollama     │
                                │                │
                                │  - llama3.2    │
                                │  - Embeddings  │
                                │  - Generation  │
                                └────────────────┘
```

## Data Flow: Ask Question

```
1. USER TYPES QUESTION
   │
   ▼
2. AIChat Component
   - Validates input (max 1000 chars)
   - Shows loading spinner
   │
   ▼
3. useAIAssistant Hook
   - Adds user message to history
   - Checks rate limit
   │
   ▼
4. Apollo Client
   - Sends ASK_ASSISTANT mutation
   - Variables: { graphId, query, selectedNodeIds }
   │
   ▼
5. AIAssistantResolver
   - Validates authentication
   - Validates graph access
   - Calls GraphRAGService.query()
   │
   ▼
6. GraphRAGService Pipeline
   ┌─────────────────────────────────────┐
   │ a) Generate query embedding         │
   │    (Ollama embedding model)         │
   │                                     │
   │ b) Vector similarity search         │
   │    (PostgreSQL pgvector)            │
   │    Returns top K similar nodes      │
   │                                     │
   │ c) Expand graph context             │
   │    Traverse N hops from similar     │
   │    Build subgraph of relevant nodes │
   │                                     │
   │ d) Assemble context                 │
   │    Combine node properties          │
   │    Include edge relationships       │
   │    Add methodology info             │
   │                                     │
   │ e) Generate answer                  │
   │    Call Ollama LLM with context     │
   │    Extract node citations           │
   │    Return structured response       │
   └─────────────────────────────────────┘
   │
   ▼
7. Response Structure
   {
     answer: "The root cause appears to be...",
     citedNodes: [
       { id: "node-123", props: {...}, relevance: "..." }
     ],
     subgraph: {
       nodes: [...],
       edges: [...],
       anchorNodeIds: [...]
     }
   }
   │
   ▼
8. useAIAssistant Hook
   - Adds assistant message to history
   - Triggers onNodeCited callbacks
   - Updates state
   │
   ▼
9. AIChat Component
   - Renders message with citations
   - Makes citations clickable
   - Hides loading spinner
   │
   ▼
10. USER SEES RESPONSE
    - Can click citations to navigate
    - Can see relevance explanations
    - Can ask follow-up questions
```

## Component Hierarchy

```
GraphWithAIChat (Example Integration)
│
├── GraphCanvas
│   ├── ReactFlow
│   ├── GraphNode (custom)
│   ├── GraphEdge (custom)
│   └── ContextMenu
│
└── AIChat
    ├── Header
    │   ├── Title + Icon
    │   └── Rate Limit Display
    │
    ├── Messages List
    │   ├── AIMessage
    │   │   ├── Content
    │   │   └── CitedNodes (clickable)
    │   │       └── NodeCard
    │   │           ├── Label
    │   │           └── Relevance
    │   │
    │   ├── UserMessage
    │   │   └── Content
    │   │
    │   ├── LoadingIndicator
    │   └── ErrorMessage
    │       └── RetryButton
    │
    ├── Suggested Prompts (collapsible)
    │   └── PromptButton[]
    │
    └── Input Area
        ├── PromptsButton
        ├── TextInput
        ├── SendButton
        └── CharacterCount
```

## State Management

```
┌──────────────────────────────────────┐
│      useAIAssistant Hook State       │
├──────────────────────────────────────┤
│                                      │
│  messages: AIMessage[]               │
│  ├─ id: string                       │
│  ├─ role: 'user' | 'assistant'       │
│  ├─ content: string                  │
│  ├─ citedNodes?: CitedNode[]         │
│  └─ timestamp: number                │
│                                      │
│  loading: boolean                    │
│  error: string | null                │
│  lastQuery: string                   │
│  remainingRequests: number           │
│  suggestedPrompts: string[]          │
│                                      │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│         AIChat Component State       │
├──────────────────────────────────────┤
│                                      │
│  inputValue: string                  │
│  showPrompts: boolean                │
│                                      │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│       GraphCanvas Integration        │
├──────────────────────────────────────┤
│                                      │
│  selectedNodes: GraphCanvasNode[]    │
│  highlightedNodeIds: Set<string>     │
│                                      │
└──────────────────────────────────────┘
```

## GraphQL Schema Integration

```graphql
# Input Types
input AskAssistantInput {
  graphId: ID!
  query: String!
  selectedNodeIds: [ID!]
  expansionDepth: Int = 2
  topK: Int = 5
}

input FindSimilarNodesInput {
  graphId: ID!
  query: String!
  selectedNodeIds: [ID!]
  limit: Int = 10
}

# Output Types
type AssistantResponse {
  answer: String!
  citedNodes: [CitedNode!]!
  subgraph: Subgraph!
}

type CitedNode {
  id: ID!
  props: JSON!
  relevance: String!
}

type SimilarNode {
  id: ID!
  props: JSON!
  nodeType: String!
  similarity: Float!
  weight: Float!
}

# Operations
type Mutation {
  askAssistant(input: AskAssistantInput!): AssistantResponse!
}

type Query {
  findSimilarNodes(input: FindSimilarNodesInput!): [SimilarNode!]!
  getMethodologyPromptSuggestions(graphId: ID!): [String!]!
  getRemainingAIRequests: Int!
}
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Apollo Client)                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Query Results Cache (in-memory)                    │
│  - Suggested prompts: Until methodology changes     │
│  - Remaining requests: 60 second polling            │
│  - Similar nodes: Session-based                     │
│                                                      │
│  Optimistic Updates                                 │
│  - User messages: Immediate UI update               │
│  - Before API response received                     │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│            Backend (AIAssistantService)              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Conversation History (in-memory Map)                │
│  - Key: graphId                                      │
│  - Value: ConversationHistory                        │
│  - TTL: 1 hour                                       │
│  - Max messages: 20                                  │
│                                                      │
│  Rate Limit Tracker (in-memory Map)                 │
│  - Key: userId                                       │
│  - Value: timestamp[]                                │
│  - TTL: 1 hour rolling                               │
│  - Limit: 10 requests                                │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         Database (PostgreSQL + pgvector)             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Node Embeddings (persistent)                        │
│  - Indexed with IVFFlat                              │
│  - Cosine similarity search                          │
│  - Updated when nodes change                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
User Action
    │
    ▼
┌───────────────────┐
│  Frontend Check   │  ──▶ Empty query? → Show validation error
│                   │  ──▶ Too long? → Show length error
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   Rate Limit      │  ──▶ Exceeded? → "Try again in X minutes"
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  GraphQL Call     │  ──▶ Network error? → Show retry button
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Backend Check    │  ──▶ Auth failed? → "Login required"
│                   │  ──▶ Graph access? → "No permission"
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Ollama Call      │  ──▶ Not running? → "Service unavailable"
│                   │  ──▶ Timeout? → "Try again"
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Success          │  ──▶ Display response with citations
└───────────────────┘
```

## Performance Metrics

```
┌─────────────────────────────────────────────────────┐
│              Frontend Performance                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Component Render: < 16ms (60 FPS maintained)       │
│  Message Add: < 5ms (optimistic update)             │
│  Auto-scroll: < 100ms (smooth animation)            │
│  Input Typing: < 1ms (no debouncing needed)         │
│  Citation Click: < 10ms (instant feedback)          │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Network Performance                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  GraphQL Request: ~5KB                               │
│  GraphQL Response: ~5-10KB (with citations)          │
│  Latency: 100-200ms (local) / 500ms+ (remote)       │
│  Total Query Time: 2-5 seconds (includes LLM)       │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Backend Performance                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Vector Search: 50-200ms (depending on graph size)  │
│  Graph Expansion: 10-100ms                           │
│  Context Assembly: < 10ms                            │
│  Ollama LLM: 1-4 seconds (model dependent)          │
│  Total: 2-5 seconds end-to-end                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

This architecture provides:
- ✓ Clean separation of concerns
- ✓ Reusable components and hooks
- ✓ Type-safe GraphQL integration
- ✓ Efficient caching strategies
- ✓ Graceful error handling
- ✓ Optimal performance
