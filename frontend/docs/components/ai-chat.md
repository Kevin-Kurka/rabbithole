# AIChat Component - GraphRAG Integration

## Overview

The `AIChat` component provides an AI-powered chat interface integrated with the GraphRAG (Graph Retrieval Augmented Generation) backend. It enables users to ask questions about their knowledge graph and receive contextual answers with specific node citations.

## Features

### Core Capabilities

1. **GraphRAG Question Answering**
   - Asks questions using selected node context
   - Receives answers citing specific nodes in the graph
   - Supports complex queries with graph traversal

2. **Node Citations**
   - Displays referenced nodes inline with AI responses
   - Clickable citations to navigate to nodes
   - Shows relevance explanation for each citation

3. **Vector Similarity Search**
   - Find semantically similar nodes
   - Powered by embeddings and vector search
   - Useful for exploration and discovery

4. **Methodology-Aware Prompts**
   - Suggested questions based on current methodology
   - Context-aware guidance
   - Best practice recommendations

5. **Rate Limiting**
   - Visual indicator of remaining requests
   - 10 requests per hour per user
   - Graceful error handling

## Usage

### Basic Usage

```tsx
import { AIChat } from '@/components/AIChat';

function MyGraph() {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  return (
    <AIChat
      graphId="graph-123"
      selectedNodeIds={selectedNodeIds}
      onNodeClick={(nodeId) => console.log('Navigate to:', nodeId)}
      onNodeHighlight={(nodeId) => console.log('Highlight:', nodeId)}
    />
  );
}
```

### With GraphCanvas Integration

See `/components/examples/GraphWithAIChat.tsx` for a complete example of integrating AIChat with GraphCanvas.

```tsx
import { GraphWithAIChat } from '@/components/examples/GraphWithAIChat';

function InvestigationPage() {
  return (
    <GraphWithAIChat
      graphId="my-graph-id"
      methodologyId="5-whys"
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `graphId` | `string` | Yes | ID of the graph to query |
| `selectedNodeIds` | `string[]` | No | IDs of selected nodes for context |
| `onNodeClick` | `(nodeId: string) => void` | No | Called when user clicks a cited node |
| `onNodeHighlight` | `(nodeId: string) => void` | No | Called when AI cites a node |
| `className` | `string` | No | Additional CSS classes |

## useAIAssistant Hook

The underlying `useAIAssistant` hook provides the core functionality:

```tsx
import { useAIAssistant } from '@/hooks/useAIAssistant';

function MyComponent() {
  const {
    messages,
    loading,
    error,
    remainingRequests,
    suggestedPrompts,
    askQuestion,
    findSimilar,
    clearHistory,
    retryLast,
  } = useAIAssistant({
    graphId: 'graph-123',
    selectedNodeIds: ['node-1', 'node-2'],
    onNodeCited: (nodeId) => console.log('Cited:', nodeId),
    expansionDepth: 2,
    topK: 5,
  });

  return (
    <div>
      <button onClick={() => askQuestion('What are the root causes?')}>
        Ask Question
      </button>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

### Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `graphId` | `string` | Required | Graph to query |
| `selectedNodeIds` | `string[]` | `[]` | Selected nodes for context |
| `onNodeCited` | `(nodeId: string) => void` | - | Citation callback |
| `expansionDepth` | `number` | `2` | Graph traversal depth |
| `topK` | `number` | `5` | Top similar nodes to retrieve |

### Hook Return Values

| Value | Type | Description |
|-------|------|-------------|
| `messages` | `AIMessage[]` | Conversation history |
| `loading` | `boolean` | Query in progress |
| `error` | `string \| null` | Error message |
| `remainingRequests` | `number` | Requests left in quota |
| `suggestedPrompts` | `string[]` | Methodology-based prompts |
| `askQuestion` | `(query: string) => Promise<void>` | Ask a question |
| `findSimilar` | `(query: string, limit?: number) => Promise<SimilarNode[]>` | Similarity search |
| `clearHistory` | `() => void` | Clear messages |
| `retryLast` | `() => Promise<void>` | Retry failed query |

## GraphQL Operations

### Mutations

#### askAssistant

Main GraphRAG query mutation:

```graphql
mutation AskAssistant($input: AskAssistantInput!) {
  askAssistant(input: $input) {
    answer
    citedNodes {
      id
      props
      relevance
    }
    subgraph {
      nodes { ... }
      edges { ... }
      anchorNodeIds
    }
  }
}
```

Input:
- `graphId`: ID of the graph
- `query`: Question to ask
- `selectedNodeIds`: Optional context nodes
- `expansionDepth`: Graph traversal depth (1-5)
- `topK`: Number of similar nodes to retrieve (1-20)

### Queries

#### findSimilarNodes

Vector similarity search:

```graphql
query FindSimilarNodes($input: FindSimilarNodesInput!) {
  findSimilarNodes(input: $input) {
    id
    props
    nodeType
    similarity
    weight
  }
}
```

## Message Format

### AIMessage Type

```typescript
interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citedNodes?: CitedNode[];
  timestamp: number;
}
```

### CitedNode Type

```typescript
interface CitedNode {
  id: string;
  props: Record<string, any>;
  relevance: string;
}
```

## Styling

The component uses Tailwind CSS with a dark theme optimized for the investigation UI:

- AI messages: Gray background with purple accents
- User messages: Blue background
- Cited nodes: Interactive cards with hover effects
- Loading states: Animated spinner
- Error states: Red tinted background

## Best Practices

### 1. Provide Context

Always pass selected nodes when available:

```tsx
<AIChat
  graphId={graphId}
  selectedNodeIds={selectedNodes.map(n => n.id)}
/>
```

### 2. Handle Citations

Implement node click handlers to navigate the graph:

```tsx
const handleNodeClick = (nodeId: string) => {
  // Pan to node in GraphCanvas
  graphRef.current?.focusNode(nodeId);

  // Highlight the node
  setHighlightedNodes([nodeId]);
};
```

### 3. Show Context Indicators

Let users know which nodes are being used for context:

```tsx
{selectedNodes.length > 0 && (
  <div className="context-indicator">
    AI using {selectedNodes.length} nodes for context
  </div>
)}
```

### 4. Monitor Rate Limits

Display remaining requests to avoid surprises:

```tsx
const { remainingRequests } = useAIAssistant({ graphId });

{remainingRequests < 3 && (
  <div className="warning">
    Only {remainingRequests} AI requests remaining
  </div>
)}
```

## Error Handling

The component handles several error cases:

1. **Rate Limiting**: Shows user-friendly message when quota exceeded
2. **Network Errors**: Displays retry button
3. **Empty Queries**: Validates input before sending
4. **Service Unavailable**: Graceful degradation message

```tsx
// Errors are automatically displayed in the chat
// Users can retry with the retry button
{error && (
  <div className="error-message">
    {error}
    <button onClick={retryLast}>Retry</button>
  </div>
)}
```

## Performance Considerations

### Caching

The hook implements intelligent caching:
- Recent queries are cached for 1 hour
- Conversation history limited to 20 messages
- Suggested prompts refreshed on methodology change

### Optimistic Updates

User messages appear immediately:

```tsx
// Message added to UI before API call completes
setMessages(prev => [...prev, userMessage]);
await askQuestion(query);
```

### Debouncing

Consider debouncing for similarity search:

```tsx
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSearch = useMemo(
  () => debounce((query: string) => findSimilar(query), 500),
  [findSimilar]
);
```

## Testing

### Mock Data

For testing without backend:

```tsx
const mockMessages: AIMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! How can I help?',
    timestamp: Date.now(),
  },
  {
    id: '2',
    role: 'user',
    content: 'What are the root causes?',
    timestamp: Date.now(),
  },
  {
    id: '3',
    role: 'assistant',
    content: 'Based on your graph...',
    citedNodes: [
      {
        id: 'node-1',
        props: { label: 'Budget Constraints' },
        relevance: 'Primary root cause identified',
      },
    ],
    timestamp: Date.now(),
  },
];
```

### Integration Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { AIChat } from './AIChat';

const mocks = [
  {
    request: {
      query: ASK_ASSISTANT,
      variables: {
        input: {
          graphId: 'test-graph',
          query: 'test question',
        },
      },
    },
    result: {
      data: {
        askAssistant: {
          answer: 'Test answer',
          citedNodes: [],
          subgraph: { nodes: [], edges: [], anchorNodeIds: [] },
        },
      },
    },
  },
];

test('sends question on enter', async () => {
  render(
    <MockedProvider mocks={mocks}>
      <AIChat graphId="test-graph" />
    </MockedProvider>
  );

  const input = screen.getByPlaceholderText('Ask about your graph...');
  fireEvent.change(input, { target: { value: 'test question' } });
  fireEvent.keyDown(input, { key: 'Enter' });

  expect(await screen.findByText('test question')).toBeInTheDocument();
});
```

## Troubleshooting

### AI Not Responding

1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Verify backend logs for GraphRAG errors
3. Check rate limits haven't been exceeded
4. Ensure graph has nodes with embeddings

### Citations Not Appearing

1. Verify nodes have proper labels in props
2. Check GraphRAG service is finding relevant nodes
3. Review expansion depth settings
4. Ensure selected nodes are valid

### Slow Responses

1. Reduce `topK` parameter (default: 5)
2. Decrease `expansionDepth` (default: 2)
3. Check Ollama model performance
4. Review backend GraphRAG service logs

## Future Enhancements

Potential improvements:

1. **Streaming Responses**: Real-time answer generation
2. **Multi-turn Context**: Maintain conversation context across queries
3. **Custom Prompts**: User-defined prompt templates
4. **Export Chat**: Save conversation history
5. **Voice Input**: Speech-to-text for queries
6. **Collaborative AI**: Share AI insights with team

## Related Components

- `Chat` - Basic collaboration chat
- `GraphCanvas` - Main graph visualization
- `GraphSidebar` - Graph properties panel
- `MethodologySelector` - Methodology selection

## Related Files

- `/hooks/useAIAssistant.ts` - Core AI logic
- `/graphql/queries/ai-assistant.ts` - GraphQL operations
- `/types/ai-assistant.ts` - TypeScript types
- `/components/examples/GraphWithAIChat.tsx` - Integration example
