# AI Chat Quick Start Guide

## Getting Started in 5 Minutes

### 1. Prerequisites

Ensure backend services are running:

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start backend
cd backend
npm run dev
```

### 2. Add AI Chat to Your Graph Page

```tsx
import { AIChat } from '@/components/AIChat';

export default function GraphPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-screen">
      {/* Your existing graph */}
      <div className="flex-1">
        <GraphCanvas graphId={params.id} />
      </div>

      {/* Add AI chat sidebar */}
      <div className="w-96 border-l border-gray-800">
        <AIChat graphId={params.id} />
      </div>
    </div>
  );
}
```

### 3. Test It

1. Open your graph page
2. Type a question: "What are the main issues in this graph?"
3. Press Enter
4. See AI response with cited nodes

That's it! You now have AI-powered chat.

## Common Use Cases

### Use Case 1: Context-Aware Questions

Pass selected nodes for better answers:

```tsx
function SmartGraph() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <>
      <GraphCanvas
        onSelectionChange={(nodes) => setSelectedIds(nodes.map(n => n.id))}
      />
      <AIChat
        graphId="graph-123"
        selectedNodeIds={selectedIds}  // AI uses these for context
      />
    </>
  );
}
```

### Use Case 2: Navigate to Cited Nodes

Handle node clicks to navigate the graph:

```tsx
function InteractiveGraph() {
  const graphRef = useRef<GraphCanvasRef>(null);

  return (
    <AIChat
      graphId="graph-123"
      onNodeClick={(nodeId) => {
        // Pan to the cited node
        graphRef.current?.focusNode(nodeId);
      }}
    />
  );
}
```

### Use Case 3: Highlight Cited Nodes

Temporarily highlight nodes the AI references:

```tsx
function HighlightGraph() {
  const [highlighted, setHighlighted] = useState<string[]>([]);

  return (
    <>
      <GraphCanvas highlightedNodes={highlighted} />
      <AIChat
        graphId="graph-123"
        onNodeHighlight={(nodeId) => {
          setHighlighted([nodeId]);
          // Clear after 5 seconds
          setTimeout(() => setHighlighted([]), 5000);
        }}
      />
    </>
  );
}
```

### Use Case 4: Programmatic Queries

Use the hook directly for custom UIs:

```tsx
import { useAIAssistant } from '@/hooks/useAIAssistant';

function CustomAI() {
  const { askQuestion, messages, loading } = useAIAssistant({
    graphId: 'graph-123'
  });

  return (
    <div>
      <button onClick={() => askQuestion('Find root causes')}>
        Analyze Graph
      </button>

      {loading && <Spinner />}

      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

## Sample Questions to Try

### For Root Cause Analysis
- "What are the root causes identified in this graph?"
- "Which causes have the most supporting evidence?"
- "Are there any gaps in the causal chain?"

### For SWOT Analysis
- "What are the main strengths identified?"
- "How do threats relate to our weaknesses?"
- "What opportunities should we prioritize?"

### For Timeline Analysis
- "What are the key events in the timeline?"
- "Which events led to the main outcome?"
- "Are there any missing time periods?"

### General Questions
- "Summarize this investigation"
- "What should I focus on next?"
- "Are there any inconsistencies?"
- "What evidence is strongest?"

## Troubleshooting

### Problem: "AI service is temporarily unavailable"

**Solution:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# If not, start it
ollama serve

# Verify model is installed
ollama list
# Should show llama3.2 or your configured model
```

### Problem: "Rate limit exceeded"

**Solution:**
- Wait 1 hour for reset
- Or increase limit in backend: `AIAssistantService.ts:76`

```typescript
private readonly MAX_REQUESTS_PER_HOUR = 20; // Change from 10
```

### Problem: No cited nodes in responses

**Solution:**
- Ensure graph has nodes with labels
- Check `topK` parameter (increase for more results)

```typescript
const { askQuestion } = useAIAssistant({
  graphId: 'graph-123',
  topK: 10  // Default is 5
});
```

### Problem: Slow responses

**Solution:**
- Reduce graph traversal depth

```typescript
const { askQuestion } = useAIAssistant({
  graphId: 'graph-123',
  expansionDepth: 1  // Default is 2
});
```

## Configuration Options

### useAIAssistant Hook Options

```typescript
const ai = useAIAssistant({
  graphId: string;           // Required
  selectedNodeIds?: string[]; // Optional: context nodes
  onNodeCited?: (id: string) => void; // Optional: citation callback
  expansionDepth?: number;   // Optional: 1-5, default 2
  topK?: number;            // Optional: 1-20, default 5
});
```

### AIChat Component Props

```typescript
<AIChat
  graphId={string}              // Required
  selectedNodeIds={string[]}    // Optional
  onNodeClick={(id) => {...}}   // Optional
  onNodeHighlight={(id) => {...}} // Optional
  className={string}            // Optional
/>
```

## Advanced Features

### Vector Similarity Search

Find semantically similar nodes:

```typescript
const { findSimilar } = useAIAssistant({ graphId: 'graph-123' });

const handleSearch = async () => {
  const similar = await findSimilar('budget constraints', 10);

  similar.forEach(node => {
    console.log(node.props.label, 'Similarity:', node.similarity);
  });
};
```

### Clear Conversation History

```typescript
const { clearHistory } = useAIAssistant({ graphId: 'graph-123' });

<button onClick={clearHistory}>
  Start Fresh
</button>
```

### Retry Failed Queries

```typescript
const { retryLast, error } = useAIAssistant({ graphId: 'graph-123' });

{error && (
  <button onClick={retryLast}>
    Try Again
  </button>
)}
```

### Monitor Rate Limits

```typescript
const { remainingRequests } = useAIAssistant({ graphId: 'graph-123' });

{remainingRequests < 3 && (
  <Warning>Only {remainingRequests} requests left!</Warning>
)}
```

## Testing

### Test with Mock Data

```typescript
// For testing without backend
const mockMessages = [
  {
    id: '1',
    role: 'assistant' as const,
    content: 'Hello! Ask me anything.',
    timestamp: Date.now(),
  }
];

// Use in development
<AIChat graphId="test" />
```

### Check Backend Connection

```bash
# Test GraphQL endpoint
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ getRemainingAIRequests }"}'
```

### Verify Ollama

```bash
# Check Ollama is responding
curl http://localhost:11434/api/tags

# Test model
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "test",
  "stream": false
}'
```

## Best Practices

### 1. Always Provide Context

```typescript
// Good: Selected nodes give context
<AIChat
  graphId={graphId}
  selectedNodeIds={selectedNodes}
/>

// Less effective: No context
<AIChat graphId={graphId} />
```

### 2. Handle Citations

```typescript
// Good: Navigate to cited nodes
<AIChat
  onNodeClick={(id) => focusNode(id)}
  onNodeHighlight={(id) => highlightNode(id)}
/>

// Missed opportunity: No handlers
<AIChat graphId={graphId} />
```

### 3. Show Loading States

```typescript
const { loading } = useAIAssistant({ graphId });

{loading && <LoadingSpinner />}
```

### 4. Display Errors

```typescript
const { error } = useAIAssistant({ graphId });

{error && (
  <ErrorMessage>
    {error}
    <RetryButton onClick={retryLast} />
  </ErrorMessage>
)}
```

## Demo Page

Visit `/ai-chat-demo` to see a complete working example:

```bash
npm run dev
# Open http://localhost:3000/ai-chat-demo
```

## Documentation

- **Component Docs:** `/components/AIChat.README.md`
- **Integration Guide:** `/AI_INTEGRATION_SUMMARY.md`
- **Backend API:** `/backend/src/resolvers/AIAssistantResolver.README.md`

## Next Steps

1. Add AI chat to your graph pages
2. Customize the UI to match your design
3. Add additional features (export, sharing, etc.)
4. Monitor usage and optimize performance

## Support

If you encounter issues:

1. Check this guide first
2. Review the detailed docs in `AIChat.README.md`
3. Test with the demo page
4. Check backend logs for errors
5. Verify Ollama is running and model is loaded

Happy building!
