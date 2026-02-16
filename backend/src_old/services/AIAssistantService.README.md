# AI Assistant Service Documentation

## Overview

The AI Assistant Service provides intelligent, context-aware guidance for users working through investigation methodologies. It leverages OpenAI's GPT-4 to offer suggestions, detect inconsistencies, recommend evidence, and answer questions - all while maintaining a helpful, non-authoritative tone.

## Core Principles

### 1. AI as Guide, Not Authority
- **Never approves or rejects** - Only suggests and recommends
- **Cannot block progression** - Users always maintain control
- **Advisory only** - All feedback is presented as guidance

### 2. Helpful Assistant Mindset
- Uses phrases like "You might consider..." instead of "You must..."
- Explains reasoning behind suggestions
- Maintains friendly, educational tone
- Respects user autonomy

### 3. Context-Aware Intelligence
- Understands methodology-specific workflows
- Maintains conversation history per graph
- Adapts guidance based on graph state
- Provides methodology-specific prompts

## Features

### 1. Next Step Suggestions
```typescript
async getNextStepSuggestion(pool: Pool, graphId: string, methodologyId: string): Promise<string>
```

Analyzes current graph state and suggests next steps based on:
- Completed vs incomplete workflow steps
- Node and edge distribution
- Methodology best practices
- Graph completeness

**Example Response:**
```
"Based on your current progress with the 5 Whys methodology, you might consider
asking your third 'why' question. You've identified the initial problem and asked
why twice - continuing this process will help you reach the root cause. Would you
like to explore why the current answer occurred?"
```

### 2. Inconsistency Detection
```typescript
async detectInconsistencies(pool: Pool, graphId: string): Promise<string[]>
```

Flags potential issues including:
- Orphaned nodes (not connected to graph)
- Invalid edge connections per methodology
- Missing required node properties
- Logical contradictions

**Example Responses:**
```javascript
[
  "You have 2 isolated node(s) that aren't connected to anything. This might be
   intentional, but you may want to consider how they relate to your investigation.",

  "A Root Cause node is missing some recommended properties: confidence, description.
   Adding these could strengthen your analysis."
]
```

### 3. Evidence Suggestions
```typescript
async suggestEvidence(pool: Pool, nodeId: string): Promise<EvidenceSuggestion[]>
```

Recommends specific evidence types based on node claims:
- Primary sources
- Statistical data
- Expert opinions
- Documents
- Experiments

**Example Response:**
```javascript
[
  {
    type: "source",
    description: "Look for primary sources that directly support this claim",
    searchQuery: "manufacturing defect root cause primary source",
    priority: 4,
    rationale: "Primary sources provide the most direct evidence"
  },
  {
    type: "data",
    description: "Find quantitative data on defect rates",
    searchQuery: "manufacturing defect statistics 2024",
    priority: 5,
    rationale: "Data provides objective validation of the problem scale"
  }
]
```

### 4. Methodology Compliance Checking
```typescript
async validateMethodologyCompliance(pool: Pool, graphId: string): Promise<ComplianceReport>
```

Generates advisory compliance report showing:
- Compliance score (0-100)
- Missing required node types
- Invalid edge connections
- Incomplete properties
- Overall assessment

**Important:** This is purely advisory - it doesn't block or enforce anything.

### 5. Conversational AI Chat
```typescript
async askAIAssistant(
  pool: Pool,
  graphId: string,
  question: string,
  userId: string
): Promise<string>
```

Context-aware chat that:
- Maintains conversation history (last 10 messages)
- Understands graph context
- Knows methodology being used
- Provides educational responses

**Rate Limiting:**
- 10 requests per user per hour
- Prevents abuse and controls costs
- Graceful error messages

## Rate Limiting & Caching

### Rate Limiting
```typescript
private checkRateLimit(userId: string): boolean
```

- Maximum 10 AI requests per user per hour
- Uses in-memory cache (Map)
- Automatically clears expired timestamps
- User-friendly error messages

### Conversation Caching
```typescript
private getConversationHistory(graphId: string): ConversationHistory
```

- Maintains last 20 messages per graph
- 1-hour cache duration
- Automatic cleanup of old conversations
- Enables context-aware responses

### Common Query Caching
Frequently requested analyses (like methodology guidance) could be cached with:
- 5-minute TTL for dynamic content
- Cache key: `${graphId}:${methodologyId}:${nodeCount}`
- Invalidation on graph changes

## Methodology-Specific Prompts

### 5 Whys Root Cause Analysis
```javascript
const prompts = [
  'Have I asked "why" enough times to reach the root cause?',
  'Are my why questions building logically on each other?',
  'Is this really the root cause, or should I dig deeper?',
  'What evidence supports each "why" answer?'
];
```

### Fishbone (Ishikawa) Diagram
```javascript
const prompts = [
  'Have I covered all the major cause categories (6Ms)?',
  'Are there sub-causes I haven\'t explored yet?',
  'Which causes are most likely to be contributing factors?',
  'How do the different causes interact with each other?'
];
```

### SWOT Analysis
```javascript
const prompts = [
  'Have I identified both internal and external factors?',
  'Are my strengths truly unique or just table stakes?',
  'What opportunities am I not considering?',
  'How do my threats relate to my weaknesses?'
];
```

### Timeline Analysis
```javascript
const prompts = [
  'Is the chronological order correct?',
  'Are there gaps in the timeline I should fill?',
  'What causal relationships exist between events?',
  'Are the dates and timeframes accurate?'
];
```

### Systems Thinking Causal Loop
```javascript
const prompts = [
  'Have I identified all the feedback loops?',
  'Which loops are reinforcing vs. balancing?',
  'Where are the critical delays in the system?',
  'What are the leverage points for intervention?'
];
```

### Decision Tree
```javascript
const prompts = [
  'Have I identified all possible choices?',
  'Are my probability estimates realistic?',
  'What\'s the expected value of each path?',
  'Should I gather more information before deciding?'
];
```

### Mind Mapping
```javascript
const prompts = [
  'Are my main branches comprehensive?',
  'What connections am I missing between branches?',
  'Should I break down any branches further?',
  'How does this relate to my central idea?'
];
```

### Concept Mapping
```javascript
const prompts = [
  'Are the relationships between concepts clear?',
  'What key concepts am I missing?',
  'How do these concepts build on each other?',
  'Are there contradictions in my concept relationships?'
];
```

## System Prompt Engineering

The AI uses methodology-aware system prompts:

```typescript
const basePrompt = `You are a helpful AI assistant guiding users through their
investigation workflow. Your role is to:

1. SUGGEST, never command or require
2. GUIDE, not dictate or enforce
3. FLAG potential issues, not reject or block
4. EDUCATE and explain your reasoning
5. BE TRANSPARENT about your suggestions

IMPORTANT CONSTRAINTS:
- You CANNOT approve or reject anything
- You CANNOT make decisions for the user
- You CANNOT block workflow progression
- You MUST use phrases like "You might consider...", "It could be helpful to..."
- You MUST explain WHY you're suggesting something

Your tone should be friendly, educational, and supportive.`;
```

Plus methodology-specific context:
```typescript
const methodologyPrompt = `
METHODOLOGY CONTEXT:
Name: ${methodology.name}
Category: ${methodology.category}
Description: ${methodology.description}

Node Types Available: ...
Edge Types Available: ...
Workflow Instructions: ...

Remember: These are GUIDELINES, not strict rules.`;
```

## Error Handling

### Graceful Degradation
```typescript
constructor() {
  try {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (error) {
    console.warn('AI Assistant Service initialization failed:', error);
    // Service will be unavailable but won't crash the server
  }
}
```

### User-Friendly Error Messages
```typescript
// Rate limit error
throw new Error(
  `You've reached the maximum of ${this.MAX_REQUESTS_PER_HOUR} AI requests per hour.`
);

// Generic API error
throw new Error('Unable to generate response. Please try again later.');
```

### API Failure Handling
- Catches OpenAI API errors
- Logs errors for debugging
- Returns helpful fallback messages
- Never exposes internal errors to users

## Usage Examples

### GraphQL Queries

#### Get Next Step Guidance
```graphql
query GetGuidance($graphId: ID!) {
  getMethodologyGuidance(graphId: $graphId)
}
```

#### Detect Inconsistencies
```graphql
query DetectIssues($graphId: ID!) {
  detectGraphInconsistencies(graphId: $graphId)
}
```

#### Check Compliance
```graphql
query CheckCompliance($graphId: ID!) {
  checkMethodologyCompliance(graphId: $graphId) {
    complianceScore
    isCompliant
    methodologyName
    issues {
      type
      severity
      message
      suggestion
    }
    overallAssessment
  }
}
```

#### Get Evidence Suggestions
```graphql
query SuggestEvidence($nodeId: ID!) {
  suggestEvidenceSources(nodeId: $nodeId) {
    type
    description
    searchQuery
    priority
    rationale
  }
}
```

#### Ask AI Assistant
```graphql
mutation AskAI($graphId: ID!, $question: String!) {
  askAIAssistant(graphId: $graphId, question: $question)
}
```

#### Get Prompt Suggestions
```graphql
query GetPrompts($graphId: ID!) {
  getMethodologyPromptSuggestions(graphId: $graphId)
}
```

#### Check Rate Limit
```graphql
query CheckLimit {
  getRemainingAIRequests
}
```

## Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-your-api-key-here

# Optional (with defaults)
OPENAI_MODEL=gpt-4-turbo          # Model to use
AI_MAX_TOKENS=1000                 # Max response length
AI_TEMPERATURE=0.7                 # Creativity (0-1)
```

### Rate Limiting Configuration
```typescript
private readonly MAX_REQUESTS_PER_HOUR = 10;
private readonly CACHE_DURATION_MS = 3600000; // 1 hour
```

### Conversation Configuration
```typescript
private readonly MAX_CONVERSATION_LENGTH = 20; // Messages to keep
```

## Testing Considerations

### Unit Tests
```typescript
describe('AIAssistantService', () => {
  it('should check rate limits correctly', () => {
    const service = new AIAssistantService();
    const userId = 'test-user';

    // Make 10 requests (should succeed)
    for (let i = 0; i < 10; i++) {
      expect(service['checkRateLimit'](userId)).toBe(true);
    }

    // 11th request should fail
    expect(service['checkRateLimit'](userId)).toBe(false);
  });

  it('should maintain conversation history', () => {
    const service = new AIAssistantService();
    const graphId = 'test-graph';

    service['addToConversation'](graphId, 'user', 'Hello');
    service['addToConversation'](graphId, 'assistant', 'Hi there!');

    const history = service['getConversationHistory'](graphId);
    expect(history.messages.length).toBe(2);
  });
});
```

### Integration Tests
```typescript
describe('AI Assistant Integration', () => {
  it('should generate methodology guidance', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `
          query {
            getMethodologyGuidance(graphId: "test-graph-id")
          }
        `
      });

    expect(response.body.data.getMethodologyGuidance).toContain('might consider');
  });
});
```

### Mocking OpenAI
```typescript
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock response' } }]
        })
      }
    }
  }))
}));
```

## Performance Optimization

### Caching Strategy
1. **Conversation History**: In-memory cache with 1-hour TTL
2. **Rate Limit Tracking**: In-memory with automatic cleanup
3. **Common Queries**: Could add Redis cache for frequently requested guidance

### Cost Management
1. **Rate Limiting**: 10 requests per user per hour
2. **Token Limits**: 500-1000 tokens per response
3. **Model Selection**: Use gpt-4-turbo (cheaper than gpt-4)
4. **Context Pruning**: Keep only last 10 messages in conversation

### Scaling Considerations
- In-memory caching works for single-server deployments
- For multi-server: migrate to Redis for shared cache
- Monitor OpenAI API costs and adjust rate limits
- Consider queuing for high-traffic periods

## Security & Privacy

### Data Handling
- **No PII Logging**: Never log sensitive user data
- **API Key Security**: Use environment variables only
- **Graph Data**: Minimal data sent to OpenAI (only necessary context)
- **Conversation Privacy**: Separate cache per graph

### Rate Limiting
- Prevents abuse
- Controls costs
- Per-user limits
- Graceful error messages

### Input Validation
```typescript
if (!question || question.trim().length === 0) {
  throw new Error('Question cannot be empty');
}

if (question.length > 1000) {
  throw new Error('Question is too long (max 1000 characters)');
}
```

## Future Enhancements

### Potential Features
1. **Custom System Prompts**: Let users define their own AI persona
2. **Evidence Auto-Collection**: Automatically fetch suggested sources
3. **Collaborative AI**: AI suggestions visible to all graph collaborators
4. **Learning from Feedback**: Track which suggestions users find helpful
5. **Multi-language Support**: Detect user language and respond accordingly
6. **Voice Integration**: Voice-to-text for AI questions
7. **Export Conversations**: Download chat history as PDF/Markdown
8. **AI-Powered Search**: Find similar graphs or methodologies

### Technical Improvements
1. **Redis Caching**: For distributed deployments
2. **Response Streaming**: Stream AI responses for better UX
3. **Fallback Models**: Use gpt-3.5-turbo if gpt-4 unavailable
4. **Batch Processing**: Combine multiple checks into single API call
5. **Webhook Integration**: Notify users when AI detects issues
6. **A/B Testing**: Test different system prompts for effectiveness

## Troubleshooting

### Common Issues

**"AI Assistant is currently unavailable"**
- Check OPENAI_API_KEY is set in .env
- Verify API key is valid
- Check OpenAI API status

**"You've reached the maximum of 10 AI requests per hour"**
- Wait for rate limit window to reset
- Consider increasing MAX_REQUESTS_PER_HOUR
- Check if multiple users share same userId

**"Unable to generate response"**
- OpenAI API might be down
- Check internet connectivity
- Review API usage limits (may have exceeded quota)
- Check error logs for specific error

**Slow Responses**
- gpt-4-turbo can take 5-10 seconds
- Consider using gpt-3.5-turbo for faster responses
- Reduce AI_MAX_TOKENS for shorter responses
- Check if rate limiting is causing retries

## Monitoring & Metrics

### Key Metrics to Track
1. **Request Volume**: AI requests per hour/day
2. **Response Time**: Average time for AI responses
3. **Error Rate**: Failed requests / total requests
4. **Cost per Request**: OpenAI API costs
5. **User Engagement**: Unique users using AI features
6. **Suggestion Acceptance**: How often users follow AI suggestions

### Logging
```typescript
console.log('AI Request:', {
  userId,
  graphId,
  queryType: 'nextStep',
  responseTime: 2.3,
  tokensUsed: 450
});
```

### Alerts
- Alert if error rate > 5%
- Alert if response time > 15 seconds
- Alert if daily cost > budget
- Alert if rate limit hit frequently

## License & Attribution

This implementation uses:
- OpenAI GPT-4 Turbo API
- Type-GraphQL for schema generation
- PostgreSQL for data persistence
- Node.js/TypeScript runtime

All AI responses are generated by OpenAI and should include attribution where appropriate.
