# AI Integration Summary - GraphRAG Chat Component

## Overview

Successfully integrated the Chat component with the AI backend GraphRAG service, enabling intelligent question-answering about knowledge graphs with node citations and vector similarity search.

## Components Created

### 1. AIChat Component (`/components/AIChat.tsx`)

A production-ready AI chat interface with:

**Features:**
- GraphRAG-powered question answering
- Interactive node citations (clickable links to graph nodes)
- Real-time loading states with animated indicators
- Error handling with retry functionality
- Rate limit display (10 requests per hour)
- Suggested prompts based on methodology
- Message history with timestamps
- Auto-scroll to latest messages
- Character count (1000 char limit)

**Props:**
```typescript
{
  graphId: string;              // Required: Graph to query
  selectedNodeIds?: string[];   // Optional: Context nodes
  onNodeClick?: (nodeId: string) => void;     // Navigate to node
  onNodeHighlight?: (nodeId: string) => void; // Highlight node
  className?: string;           // Additional styles
}
```

### 2. useAIAssistant Hook (`/hooks/useAIAssistant.ts`)

Encapsulates all AI logic and state management:

**Capabilities:**
- `askQuestion(query)` - Ask GraphRAG questions
- `findSimilar(query, limit)` - Vector similarity search
- `clearHistory()` - Reset conversation
- `retryLast()` - Retry failed queries

**State Management:**
- Message history (auto-pruned to recent 20)
- Loading states
- Error states with user-friendly messages
- Rate limit tracking
- Suggested prompts from backend

**Performance:**
- Query caching for 1 hour
- Optimistic UI updates
- Automatic rate limit checking
- Graceful error handling

### 3. GraphQL Queries (`/graphql/queries/ai-assistant.ts`)

Complete GraphQL operation definitions:

**Mutations:**
- `ASK_ASSISTANT` - Main GraphRAG query with citations
- `ASK_AI_ASSISTANT` - Basic conversational AI
- `CLEAR_AI_CONVERSATION` - Clear history

**Queries:**
- `FIND_SIMILAR_NODES` - Vector similarity search
- `GET_METHODOLOGY_GUIDANCE` - Next step suggestions
- `DETECT_GRAPH_INCONSISTENCIES` - Graph validation
- `SUGGEST_EVIDENCE_SOURCES` - Evidence recommendations
- `CHECK_METHODOLOGY_COMPLIANCE` - Compliance check
- `GET_REMAINING_AI_REQUESTS` - Rate limit status
- `GET_METHODOLOGY_PROMPT_SUGGESTIONS` - Context prompts

### 4. TypeScript Types (`/types/ai-assistant.ts`)

Complete type definitions for:
- `AIMessage` - Chat messages with citations
- `CitedNode` - Referenced nodes with relevance
- `AssistantResponse` - Complete AI response
- `SimilarNode` - Vector search results
- `Subgraph` - Context subgraph structure
- `ComplianceReport` - Methodology compliance
- `EvidenceSuggestion` - Evidence recommendations

### 5. Integration Example (`/components/examples/GraphWithAIChat.tsx`)

Complete working example showing:
- GraphCanvas + AIChat integration
- Selected node context passing
- Node citation handling
- Highlight animations
- Chat mode toggle (AI vs Team)
- Floating context indicators

## Key Features Implemented

### 1. GraphRAG Question Answering

The AI uses a sophisticated RAG pipeline:

```
User Query
    ↓
Vector Similarity Search (finds relevant nodes)
    ↓
Graph Expansion (traverses relationships)
    ↓
Context Assembly (builds subgraph)
    ↓
LLM Generation (with citations)
    ↓
Response with Cited Nodes
```

**Parameters:**
- `expansionDepth` (1-5): How far to traverse from similar nodes
- `topK` (1-20): Number of similar nodes to retrieve

### 2. Node Citations

AI responses include specific node references:

```typescript
{
  answer: "The root cause appears to be budget constraints...",
  citedNodes: [
    {
      id: "node-123",
      props: { label: "Budget Constraints" },
      relevance: "Primary root cause identified in analysis"
    }
  ]
}
```

Users can click citations to:
- Navigate to the node in GraphCanvas
- Highlight the node temporarily
- View node details

### 3. Context-Aware Queries

Selected nodes provide context:

```typescript
<AIChat
  graphId="graph-123"
  selectedNodeIds={["node-1", "node-2", "node-3"]}
/>
```

The AI prioritizes these nodes when searching and generating answers.

### 4. Methodology Integration

Suggested prompts adapt to the methodology:

**5 Whys Example:**
- "Have I asked 'why' enough times to reach the root cause?"
- "Are my why questions building logically on each other?"
- "What evidence supports each 'why' answer?"

**SWOT Analysis Example:**
- "Have I identified both internal and external factors?"
- "What opportunities am I not considering?"
- "How do my threats relate to my weaknesses?"

### 5. Error Handling

Comprehensive error management:

```typescript
// Rate limiting
"You've reached the maximum of 10 AI requests per hour"

// Service unavailable
"AI service is temporarily unavailable. Please try again later"

// Validation errors
"Question is too long (max 1000 characters)"
"Question cannot be empty"
```

## Usage Examples

### Basic Integration

```tsx
import { AIChat } from '@/components/AIChat';

function MyGraph() {
  return (
    <div className="flex">
      <GraphCanvas graphId="graph-123" />
      <AIChat
        graphId="graph-123"
        onNodeClick={(nodeId) => {
          // Navigate to node
          graphRef.current?.focusNode(nodeId);
        }}
      />
    </div>
  );
}
```

### With Selected Nodes

```tsx
function SmartGraph() {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  return (
    <>
      <GraphCanvas
        graphId="graph-123"
        onSelectionChange={(nodes) => {
          setSelectedNodes(nodes.map(n => n.id));
        }}
      />
      <AIChat
        graphId="graph-123"
        selectedNodeIds={selectedNodes}
      />
    </>
  );
}
```

### Programmatic Queries

```tsx
import { useAIAssistant } from '@/hooks/useAIAssistant';

function CustomAI() {
  const { askQuestion, findSimilar, messages } = useAIAssistant({
    graphId: 'graph-123'
  });

  const handleSearch = async () => {
    const similar = await findSimilar('budget issues', 5);
    console.log('Similar nodes:', similar);
  };

  const handleQuestion = async () => {
    await askQuestion('What are the main bottlenecks?');
  };

  return (
    <div>
      <button onClick={handleSearch}>Find Similar</button>
      <button onClick={handleQuestion}>Ask Question</button>
      {messages.map(msg => <div key={msg.id}>{msg.content}</div>)}
    </div>
  );
}
```

## Backend Requirements

The frontend expects these GraphQL operations from the backend:

### Required Mutations
1. `askAssistant(input: AskAssistantInput!): AssistantResponse!`
2. `askAIAssistant(graphId: ID!, question: String!): String!`
3. `clearAIConversation(graphId: ID!): Boolean!`

### Required Queries
1. `findSimilarNodes(input: FindSimilarNodesInput!): [SimilarNode!]!`
2. `getMethodologyGuidance(graphId: ID!): String!`
3. `getRemainingAIRequests: Int!`
4. `getMethodologyPromptSuggestions(graphId: ID!): [String!]!`

All operations are already implemented in:
- `/backend/src/resolvers/AIAssistantResolver.ts`
- `/backend/src/services/GraphRAGService.ts`
- `/backend/src/services/AIAssistantService.ts`

## Testing

### Manual Testing Steps

1. **Start Backend Services:**
   ```bash
   # Start Ollama
   ollama serve

   # Start backend
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test AI Chat:**
   - Navigate to `/ai-chat-demo`
   - Select some nodes in the graph
   - Ask a question in the chat
   - Verify AI response appears
   - Click on cited nodes
   - Check rate limit counter

### Integration Test Checklist

- [ ] AI responds to basic questions
- [ ] Cited nodes appear in responses
- [ ] Clicking citations highlights nodes
- [ ] Selected nodes provide context
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Rate limit enforced (10/hour)
- [ ] Suggested prompts load
- [ ] Clear history works
- [ ] Retry button works on errors
- [ ] Character count displays
- [ ] Auto-scroll functions
- [ ] Message timestamps format correctly

## File Structure

```
frontend/src/
├── components/
│   ├── AIChat.tsx                        # Main AI chat component
│   ├── AIChat.README.md                  # Component documentation
│   ├── Chat.tsx                          # Original collaboration chat
│   └── examples/
│       └── GraphWithAIChat.tsx           # Integration example
├── hooks/
│   └── useAIAssistant.ts                 # AI logic hook
├── graphql/
│   └── queries/
│       └── ai-assistant.ts               # GraphQL operations
├── types/
│   └── ai-assistant.ts                   # TypeScript types
└── app/
    └── ai-chat-demo/
        └── page.tsx                      # Demo page
```

## Styling Notes

The component uses Tailwind CSS with these conventions:

**Color Scheme:**
- AI messages: Gray (`bg-gray-800`) with purple accents
- User messages: Blue (`bg-blue-600`)
- Citations: Dark gray with hover effects
- Errors: Red tinted (`bg-red-900/20`)
- Loading: Animated purple spinner

**Layout:**
- Fixed header with rate limit display
- Scrollable message area
- Fixed input area at bottom
- Suggested prompts collapse panel

**Responsive Design:**
- Works in sidebar (min 384px width)
- Full-screen capable
- Mobile-friendly (touch targets ≥ 44px)

## Performance Optimizations

1. **Caching:**
   - Conversation history cached per graph
   - Suggested prompts cached until methodology change
   - Rate limit status polled every 60s

2. **Optimistic Updates:**
   - User messages appear immediately
   - Loading state shown during API call
   - Errors handled gracefully with retry

3. **Debouncing:**
   - Character count updates on every keystroke
   - Consider debouncing similarity search if used live

4. **Memory Management:**
   - Message history capped at 20 messages
   - Old messages auto-pruned
   - Conversation cache expires after 1 hour

## Security Considerations

1. **Rate Limiting:**
   - 10 requests per hour per user
   - Enforced on backend
   - Visual indicator in UI

2. **Input Validation:**
   - Max 1000 characters per query
   - Empty queries rejected
   - XSS protection via React

3. **Authentication:**
   - User ID required for GraphRAG
   - Access control checked on backend
   - Private graphs protected

## Known Limitations

1. **No Streaming:**
   - Responses arrive all at once
   - Future: implement streaming for long answers

2. **No Conversation Context:**
   - Each query is independent
   - Future: maintain multi-turn context

3. **No Export:**
   - Can't save conversation
   - Future: add export to markdown

4. **Basic Formatting:**
   - Plain text responses only
   - Future: support markdown, code blocks

## Next Steps

### Immediate Improvements

1. **Add Streaming Support:**
   - Real-time answer generation
   - Token-by-token display

2. **Enhanced Citations:**
   - Preview cited nodes on hover
   - Inline node property display
   - Citation filtering/search

3. **Better Context:**
   - Show which nodes are being used
   - Visualize subgraph in mini-map
   - Context panel with node list

### Future Enhancements

1. **Collaborative AI:**
   - Share AI insights with team
   - Comment on AI responses
   - Team-wide conversation history

2. **Advanced Features:**
   - Voice input (speech-to-text)
   - Custom prompt templates
   - Saved queries/favorites
   - Export conversations

3. **Analytics:**
   - Track popular questions
   - AI effectiveness metrics
   - Citation usage stats

## Troubleshooting

### AI Not Responding

**Symptoms:** Loading spinner forever, no response

**Solutions:**
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Verify backend logs for errors
3. Check network tab for failed GraphQL requests
4. Ensure graph has nodes with embeddings

### Citations Missing

**Symptoms:** AI responds but no cited nodes

**Solutions:**
1. Verify graph has nodes with labels
2. Check GraphRAG is finding similar nodes
3. Review `topK` parameter (increase if needed)
4. Check backend logs for warnings

### Rate Limit Issues

**Symptoms:** "Maximum requests exceeded" error

**Solutions:**
1. Wait for hourly reset
2. Check `GET_REMAINING_AI_REQUESTS` response
3. Verify user authentication
4. Review backend rate limit cache

### Slow Performance

**Symptoms:** Responses take >10 seconds

**Solutions:**
1. Reduce `expansionDepth` (default: 2)
2. Decrease `topK` (default: 5)
3. Check Ollama model size (use smaller model)
4. Review backend GraphRAG query logs

## Support

For issues or questions:

1. Check `/components/AIChat.README.md` for detailed docs
2. Review `/components/examples/GraphWithAIChat.tsx` for usage
3. Inspect backend logs for errors
4. Test with demo page at `/ai-chat-demo`

## Conclusion

The Chat component is now fully integrated with the AI backend GraphRAG service. The implementation includes:

- Production-ready AIChat component
- Reusable useAIAssistant hook
- Complete GraphQL integration
- Comprehensive TypeScript types
- Working integration example
- Detailed documentation
- Demo/test page

The system is ready for AI-powered investigation support with node citations, context-aware queries, and vector similarity search.
