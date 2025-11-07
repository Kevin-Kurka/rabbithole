# AI Features - Rabbit Hole

## Overview

The Rabbit Hole project has a comprehensive AI system powered by **Ollama** for local AI inference. This enables privacy-focused AI features without sending data to external APIs.

## Architecture

### Services

1. **AIAssistantService** (`backend/src/services/AIAssistantService.ts`)
   - Conversational AI assistant with context awareness
   - Graph-aware suggestions and guidance
   - Methodology-specific recommendations
   - Evidence suggestions
   - Inconsistency detection

2. **AIOrchestrator** (`backend/src/services/AIOrchestrator.ts`)
   - Multi-agent coordination system
   - Specialized agents for different tasks:
     - Evidence Validator (Federal Rules of Evidence)
     - Deduplication Specialist
     - Legal Reasoning Expert
     - Source Credibility Assessor
     - Inconsistency Detector
     - Promotion Evaluator (for Level 0 promotion)
     - Fallacy Detector

3. **EmbeddingService** (`backend/src/services/EmbeddingService.ts`)
   - Vector embeddings for semantic search
   - pgvector integration for similarity queries

## GraphQL API

### Mutations

```graphql
# Ask AI a question about your graph
mutation AskAI {
  askAI(input: {
    graphId: "your-graph-id"
    question: "What should I investigate next?"
    userId: "your-user-id"
  }) {
    message
    success
    error
  }
}

# Clear conversation history
mutation ClearConversation {
  clearAIConversation(graphId: "your-graph-id")
}
```

### Queries

```graphql
# Detect inconsistencies in graph
query DetectInconsistencies {
  detectInconsistencies(graphId: "your-graph-id")
}

# Get next step suggestion
query GetNextStep {
  getNextStepSuggestion(
    graphId: "your-graph-id"
    methodologyId: "your-methodology-id"
  )
}

# Suggest evidence for a node
query SuggestEvidence {
  suggestEvidence(nodeId: "your-node-id") {
    type
    description
    searchQuery
    priority
    rationale
  }
}

# Check remaining AI requests (rate limiting)
query RemainingRequests {
  getAIRemainingRequests(userId: "your-user-id")
}
```

## Setup & Requirements

### 1. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Or visit https://ollama.com for manual download
```

### 2. Pull Required Models

```bash
# Chat model (default: llama3.2)
ollama pull llama3.2

# Embedding model (for vector search)
ollama pull nomic-embed-text

# Alternative models
ollama pull mistral  # Smaller, faster
ollama pull llama3.1 # More capable
```

### 3. Start Ollama Service

```bash
ollama serve
```

### 4. Configure Environment Variables

Add to your `.env` file:

```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# AI Settings
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000
```

### 5. Test Ollama Connection

```bash
cd backend
node test-ollama.js
```

## Features

### 1. **Conversational AI Assistant**
- Context-aware conversations about your investigation
- Remembers conversation history (per graph)
- Rate limited to 10 requests per hour per user
- Methodology-aware guidance

### 2. **Evidence Validation**
- Validates evidence against Federal Rules of Evidence (FRE)
- Checks relevance, authenticity, hearsay, etc.
- Provides compliance scores and suggestions

### 3. **Deduplication Detection**
- Identifies duplicate or near-duplicate content
- Uses exact matching, perceptual hashing, and semantic similarity
- Recommends merge, link, or keep separate

### 4. **Legal Reasoning Analysis**
- Supports Toulmin, IRAC, and CRAC argumentation structures
- Evaluates argument strength
- Identifies logical gaps

### 5. **Source Credibility Assessment**
- Evaluates source reliability
- Checks author expertise, publication quality, methodology
- Provides credibility scores

### 6. **Inconsistency Detection**
- Finds logical contradictions in graph
- Identifies temporal impossibilities
- Detects mutually exclusive claims

### 7. **Fallacy Detection**
- Identifies common logical fallacies
- Ad hominem, straw man, appeal to authority, etc.
- Provides severity ratings and explanations

### 8. **Level 0 Promotion Evaluation**
- Determines if claim is ready for verified truth status
- Checks methodology completion, consensus, evidence quality
- 99% threshold requirement

## Frontend Integration

### Example: AI Chat in Homepage

The AI chat input on the homepage (`frontend/src/app/page.tsx`) can be connected to the GraphQL API:

```typescript
const handleAiSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!aiQuery.trim()) return;

  try {
    const { data } = await client.mutate({
      mutation: gql`
        mutation AskAI($input: AIQueryInput!) {
          askAI(input: $input) {
            message
            success
            error
          }
        }
      `,
      variables: {
        input: {
          graphId: 'current-graph-id',
          question: aiQuery,
          userId: session?.user?.id || 'anonymous',
        },
      },
    });

    if (data.askAI.success) {
      // Display AI response
      console.log('AI Response:', data.askAI.message);
    } else {
      console.error('AI Error:', data.askAI.error);
    }
  } catch (error) {
    console.error('Failed to query AI:', error);
  }

  setAiQuery('');
};
```

## Performance Considerations

- **Model Size**: Larger models (llama3.1) provide better results but require more RAM
- **Response Time**: First request is slower (model loading), subsequent requests are faster
- **Rate Limiting**: 10 requests per hour per user to prevent abuse
- **Caching**: Conversation history cached for 1 hour
- **Embeddings**: Use dedicated embedding model (nomic-embed-text) for vector search

## Troubleshooting

### Ollama Not Running
```
Error: Ollama is not running. Please start Ollama with: ollama serve
```
**Solution**: Run `ollama serve` in a separate terminal

### Model Not Found
```
Error: Model "llama3.2" not found
```
**Solution**: Run `ollama pull llama3.2`

### Slow Responses
- Try a smaller model: `ollama pull llama3.2:1b`
- Reduce `AI_MAX_TOKENS` in `.env`
- Increase system RAM allocation

### Out of Memory
- Use smaller model
- Reduce concurrent requests
- Increase system swap space

## Future Enhancements

- [ ] Streaming responses for real-time feedback
- [ ] Multi-modal support (images, documents)
- [ ] Custom agent training for domain-specific tasks
- [ ] Agent-to-agent collaboration
- [ ] Proactive suggestions based on user behavior
- [ ] Integration with external knowledge bases

## Resources

- [Ollama Documentation](https://ollama.com/docs)
- [Llama 3.2 Model Card](https://ollama.com/library/llama3.2)
- [Federal Rules of Evidence](https://www.law.cornell.edu/rules/fre)
- [Toulmin Model](https://en.wikipedia.org/wiki/Toulmin_model_of_argumentation)
