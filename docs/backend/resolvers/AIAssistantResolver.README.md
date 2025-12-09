# AI Assistant Resolver Documentation

## Overview

The AIAssistantResolver provides GraphQL endpoints for AI-powered methodology guidance. It acts as the interface layer between the GraphQL API and the AIAssistantService, handling authentication, validation, and error formatting.

## Design Philosophy

### AI as Helpful Guide

The AI Assistant is designed with specific constraints to ensure it remains a helpful tool rather than an authority:

**What the AI CAN Do:**
- Suggest next steps in the workflow
- Flag potential inconsistencies for review
- Recommend evidence sources
- Answer questions about methodologies
- Provide educational explanations
- Offer multiple perspectives

**What the AI CANNOT Do:**
- Approve or reject graphs
- Block workflow progression
- Make decisions for users
- Enforce methodology rules
- Access external APIs or databases
- Share data between users

**Language Guidelines:**
- "You might consider..." ✅
- "One approach could be..." ✅
- "It may be helpful to..." ✅
- "You must..." ❌
- "This is wrong..." ❌
- "You need to..." ❌

## API Endpoints

### Queries

#### 1. getMethodologyGuidance

Get AI-powered next step suggestions based on current graph state.

```graphql
query GetGuidance($graphId: ID!) {
  getMethodologyGuidance(graphId: $graphId)
}
```

**Input:**
- `graphId` (ID!, required): Graph to analyze

**Returns:**
- `String`: Contextual guidance message

**Example Response:**
```
"Based on your progress with the 5 Whys analysis, you might consider creating
your third 'why' node. You've asked why twice, and each answer has built on
the previous one. Continuing this process will help you identify the root cause.
Would you like me to suggest what question to ask next?"
```

**Use Cases:**
- User opens a graph and wants guidance
- User completes a step and wants to know what's next
- User is stuck and needs direction

---

#### 2. detectGraphInconsistencies

Analyze graph structure for potential issues.

```graphql
query DetectIssues($graphId: ID!) {
  detectGraphInconsistencies(graphId: $graphId)
}
```

**Input:**
- `graphId` (ID!, required): Graph to analyze

**Returns:**
- `[String]`: Array of inconsistency descriptions

**Example Response:**
```javascript
[
  "You have 2 isolated nodes that aren't connected to anything. This might be
   intentional, but consider how they relate to your main investigation.",

  "A Root Cause node is missing the 'confidence' property. Adding this could help
   you track how certain you are about this being the actual root cause.",

  "Your graph structure looks logically sound. Keep up the good work!"
]
```

**Use Cases:**
- Periodic quality checks
- Before promoting to higher level
- When user requests review
- Automated background analysis

---

#### 3. suggestEvidenceSources

Get recommendations for evidence to support a node's claims.

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

**Input:**
- `nodeId` (ID!, required): Node to analyze

**Returns:**
- `[EvidenceSuggestion]`: Array of evidence recommendations

**Example Response:**
```javascript
[
  {
    type: "source",
    description: "Look for primary sources from the time period",
    searchQuery: "manufacturing defect 2023 primary source documentation",
    priority: 5,
    rationale: "Primary sources provide the most direct and credible evidence"
  },
  {
    type: "data",
    description: "Find statistical data on defect rates",
    searchQuery: "manufacturing defect rate statistics 2023",
    priority: 4,
    rationale: "Quantitative data will validate the scope of the problem"
  },
  {
    type: "expert",
    description: "Consult quality control experts",
    searchQuery: "quality control expert opinion manufacturing defects",
    priority: 3,
    rationale: "Expert analysis can identify patterns you might miss"
  }
]
```

**Use Cases:**
- User creates a claim node
- Evidence panel shows "Get AI Suggestions"
- Research planning phase
- Strengthening weak arguments

---

#### 4. checkMethodologyCompliance

Generate advisory compliance report for methodology alignment.

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
      nodeId
      edgeId
      suggestion
    }
    totalNodes
    totalEdges
    missingRequiredNodeTypes
    invalidEdgeConnections
    overallAssessment
    generatedAt
  }
}
```

**Input:**
- `graphId` (ID!, required): Graph to check

**Returns:**
- `ComplianceReport`: Detailed compliance analysis

**Example Response:**
```javascript
{
  complianceScore: 85,
  isCompliant: true,
  methodologyName: "5 Whys Root Cause Analysis",
  issues: [
    {
      type: "missing_node_type",
      severity: "warning",
      message: "Consider adding a Solution node",
      suggestion: "The workflow recommends creating a solution after identifying the root cause"
    }
  ],
  totalNodes: 7,
  totalEdges: 6,
  missingRequiredNodeTypes: 1,
  invalidEdgeConnections: 0,
  overallAssessment: "Your graph shows 85% alignment with the 5 Whys methodology...",
  generatedAt: "2024-10-09T12:00:00Z"
}
```

**Important Notes:**
- This is **advisory only** - does not block actions
- High compliance score is encouraged but not required
- Users can deviate from methodology as needed
- Used for education, not enforcement

**Use Cases:**
- Before graph promotion
- Periodic self-assessment
- Learning methodology best practices
- Quality improvement feedback

---

#### 5. getMethodologyPromptSuggestions

Get helpful question templates based on methodology.

```graphql
query GetPrompts($graphId: ID!) {
  getMethodologyPromptSuggestions(graphId: $graphId)
}
```

**Input:**
- `graphId` (ID!, required): Graph to get prompts for

**Returns:**
- `[String]`: Array of suggested questions

**Example Response (5 Whys):**
```javascript
[
  "Have I asked 'why' enough times to reach the root cause?",
  "Are my why questions building logically on each other?",
  "Is this really the root cause, or should I dig deeper?",
  "What evidence supports each 'why' answer?",
  "How can I validate that this is the true root cause?"
]
```

**Use Cases:**
- AI chat interface shows quick prompts
- User is unsure what to ask
- Methodology onboarding
- Help panel suggestions

---

#### 6. getRemainingAIRequests

Check how many AI requests user has remaining.

```graphql
query CheckLimit {
  getRemainingAIRequests
}
```

**Input:**
- None (uses userId from context)

**Returns:**
- `Int`: Number of requests remaining (0-10)

**Example Response:**
```javascript
7
```

**Use Cases:**
- Display in UI: "7 AI requests remaining this hour"
- Warn user before running out
- Disable AI features when at 0
- Show countdown in UI

---

### Mutations

#### 1. askAIAssistant

Ask the AI assistant a question about the graph or methodology.

```graphql
mutation AskAI($graphId: ID!, $question: String!) {
  askAIAssistant(graphId: $graphId, question: $question)
}
```

**Input:**
- `graphId` (ID!, required): Graph context
- `question` (String!, required): Question to ask (max 1000 chars)

**Returns:**
- `String`: AI-generated response

**Example Request:**
```graphql
mutation {
  askAIAssistant(
    graphId: "graph-123"
    question: "I'm stuck on identifying the root cause. What should I look for?"
  )
}
```

**Example Response:**
```
"When identifying the root cause in a 5 Whys analysis, you're looking for the
point where asking 'why' one more time either:

1. Takes you outside your control (external factors you can't change)
2. Becomes too abstract to be actionable
3. Repeats an earlier answer (circular reasoning)

Looking at your current graph, you've asked why 4 times. Your last answer points
to 'inadequate training procedures'. You might consider asking: Why are the
training procedures inadequate? This could reveal whether it's a resource issue,
policy gap, or oversight problem - any of which could be a true root cause."
```

**Rate Limiting:**
- 10 requests per user per hour
- Error after limit: "You've reached the maximum of 10 AI requests per hour"
- Resets on the hour

**Conversation Context:**
- Maintains last 10 messages per graph
- Context shared across same graph
- Clears after 1 hour of inactivity

**Validation:**
- Question cannot be empty
- Max 1000 characters
- Requires authentication
- Graph must exist

**Use Cases:**
- Chat interface in UI
- "Ask AI" button on nodes
- Help panel Q&A
- Methodology learning
- Troubleshooting analysis issues

---

#### 2. clearAIConversation

Reset the AI's conversation memory for a graph.

```graphql
mutation ClearChat($graphId: ID!) {
  clearAIConversation(graphId: $graphId)
}
```

**Input:**
- `graphId` (ID!, required): Graph to clear history for

**Returns:**
- `Boolean`: Success status

**Use Cases:**
- User switches to new topic
- Starting fresh analysis phase
- Conversation became off-topic
- "Reset AI" button in UI

---

## Error Handling

### Error Types

#### 1. Service Unavailable
```javascript
{
  "errors": [{
    "message": "AI Assistant is currently unavailable. Please ensure OPENAI_API_KEY is configured.",
    "extensions": { "code": "SERVICE_UNAVAILABLE" }
  }]
}
```

**Causes:**
- Missing OPENAI_API_KEY
- Invalid API key
- Service initialization failed

**Resolution:**
- Set environment variable
- Check API key validity
- Restart service

---

#### 2. Rate Limit Exceeded
```javascript
{
  "errors": [{
    "message": "You've reached the maximum of 10 AI requests per hour. Please try again later.",
    "extensions": { "code": "RATE_LIMIT_EXCEEDED" }
  }]
}
```

**Causes:**
- User exceeded 10 requests in rolling hour
- Multiple tabs/sessions with same userId

**Resolution:**
- Wait for rate limit window to reset
- Show remaining requests in UI
- Queue requests for later

---

#### 3. Authentication Required
```javascript
{
  "errors": [{
    "message": "Authentication required to use AI assistant",
    "extensions": { "code": "UNAUTHENTICATED" }
  }]
}
```

**Causes:**
- Missing userId in context
- Invalid or expired token
- Anonymous user

**Resolution:**
- Require login for AI features
- Refresh authentication
- Redirect to login

---

#### 4. Invalid Input
```javascript
{
  "errors": [{
    "message": "Question is too long (max 1000 characters)",
    "extensions": { "code": "BAD_USER_INPUT" }
  }]
}
```

**Causes:**
- Empty question
- Question > 1000 characters
- Invalid graph ID

**Resolution:**
- Validate input in frontend
- Show character count
- Truncate or split long questions

---

#### 5. Not Found
```javascript
{
  "errors": [{
    "message": "Graph not found",
    "extensions": { "code": "NOT_FOUND" }
  }]
}
```

**Causes:**
- Graph ID doesn't exist
- Graph was deleted
- User doesn't have access

**Resolution:**
- Check graph exists
- Verify permissions
- Handle gracefully in UI

---

#### 6. API Error
```javascript
{
  "errors": [{
    "message": "Unable to generate response. Please try again later.",
    "extensions": { "code": "INTERNAL_SERVER_ERROR" }
  }]
}
```

**Causes:**
- OpenAI API down
- Network timeout
- API quota exceeded
- Invalid API response

**Resolution:**
- Retry request
- Check OpenAI status
- Review API logs
- Contact support if persists

---

## Frontend Integration

### React Hook Example

```typescript
import { useMutation, useQuery } from '@apollo/client';

// Hook for AI chat
function useAIAssistant(graphId: string) {
  const [askAI, { loading, error }] = useMutation(ASK_AI_MUTATION);

  const { data: remainingRequests } = useQuery(GET_REMAINING_REQUESTS);

  const ask = async (question: string) => {
    if (remainingRequests?.getRemainingAIRequests === 0) {
      throw new Error('Rate limit exceeded');
    }

    const result = await askAI({
      variables: { graphId, question }
    });

    return result.data.askAIAssistant;
  };

  return {
    ask,
    loading,
    error,
    remainingRequests: remainingRequests?.getRemainingAIRequests || 0
  };
}
```

### Chat Component Example

```tsx
function AIChat({ graphId }: { graphId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { ask, loading, remainingRequests } = useAIAssistant(graphId);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get AI response
      const response = await ask(input);
      const aiMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // Handle error
      console.error('AI error:', error);
    }

    setInput('');
  };

  return (
    <div className="ai-chat">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask the AI assistant..."
          maxLength={1000}
        />
        <button onClick={handleSend} disabled={loading || remainingRequests === 0}>
          {loading ? 'Thinking...' : 'Send'}
        </button>
        <span className="rate-limit">
          {remainingRequests} requests remaining
        </span>
      </div>
    </div>
  );
}
```

### Guidance Panel Example

```tsx
function GuidancePanel({ graphId }: { graphId: string }) {
  const { data, loading, refetch } = useQuery(GET_METHODOLOGY_GUIDANCE, {
    variables: { graphId }
  });

  return (
    <div className="guidance-panel">
      <h3>AI Guidance</h3>

      {loading ? (
        <div>Loading suggestions...</div>
      ) : (
        <>
          <div className="suggestion">
            {data?.getMethodologyGuidance}
          </div>

          <button onClick={() => refetch()}>
            Refresh Guidance
          </button>
        </>
      )}
    </div>
  );
}
```

### Compliance Check Example

```tsx
function ComplianceCheck({ graphId }: { graphId: string }) {
  const { data, loading } = useQuery(CHECK_COMPLIANCE, {
    variables: { graphId }
  });

  if (loading) return <div>Checking compliance...</div>;

  const report = data?.checkMethodologyCompliance;
  if (!report) return null;

  return (
    <div className="compliance-report">
      <div className="score">
        Compliance Score: {report.complianceScore}%
      </div>

      <div className="status">
        {report.isCompliant ? '✓ Compliant' : '⚠ Issues Found'}
      </div>

      {report.issues.map((issue, i) => (
        <div key={i} className={`issue ${issue.severity}`}>
          <strong>{issue.type}:</strong> {issue.message}
          {issue.suggestion && (
            <div className="suggestion">{issue.suggestion}</div>
          )}
        </div>
      ))}

      <div className="assessment">
        {report.overallAssessment}
      </div>
    </div>
  );
}
```

## Testing

### Unit Tests

```typescript
import { AIAssistantResolver } from './AIAssistantResolver';

describe('AIAssistantResolver', () => {
  let resolver: AIAssistantResolver;
  let mockPool: any;
  let mockContext: any;

  beforeEach(() => {
    resolver = new AIAssistantResolver();
    mockPool = {
      query: jest.fn()
    };
    mockContext = {
      pool: mockPool,
      userId: 'test-user-123'
    };
  });

  it('should require authentication for askAIAssistant', async () => {
    const contextNoAuth = { pool: mockPool };

    await expect(
      resolver.askAIAssistant('graph-id', 'question', contextNoAuth)
    ).rejects.toThrow('Authentication required');
  });

  it('should validate question length', async () => {
    const longQuestion = 'a'.repeat(1001);

    await expect(
      resolver.askAIAssistant('graph-id', longQuestion, mockContext)
    ).rejects.toThrow('too long');
  });

  it('should validate empty questions', async () => {
    await expect(
      resolver.askAIAssistant('graph-id', '', mockContext)
    ).rejects.toThrow('cannot be empty');
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import { app } from '../app';

describe('AI Assistant Integration', () => {
  it('should get methodology guidance', async () => {
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', 'Bearer test-token')
      .send({
        query: `
          query {
            getMethodologyGuidance(graphId: "test-graph")
          }
        `
      });

    expect(response.body.data.getMethodologyGuidance).toBeTruthy();
    expect(response.body.data.getMethodologyGuidance).toContain('might consider');
  });

  it('should enforce rate limits', async () => {
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer test-token')
        .send({
          query: `
            mutation {
              askAIAssistant(
                graphId: "test-graph"
                question: "test question ${i}"
              )
            }
          `
        });
    }

    // 11th should fail
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', 'Bearer test-token')
      .send({
        query: `
          mutation {
            askAIAssistant(
              graphId: "test-graph"
              question: "one too many"
            )
          }
        `
      });

    expect(response.body.errors[0].message).toContain('maximum');
  });
});
```

## Best Practices

### For Frontend Developers

1. **Always check rate limits** before making AI requests
2. **Show loading states** - AI responses take 2-10 seconds
3. **Handle errors gracefully** - OpenAI API can fail
4. **Cache responses** when appropriate
5. **Provide suggested prompts** to help users
6. **Show conversation history** for context
7. **Validate input** before sending to API

### For Backend Developers

1. **Never expose API keys** in responses
2. **Log all AI interactions** for debugging
3. **Monitor API costs** and adjust rate limits
4. **Implement proper error handling**
5. **Use appropriate token limits** to control costs
6. **Cache common queries** when possible
7. **Test with mocked OpenAI responses**

### For Product Managers

1. **AI is advisory only** - communicate this clearly
2. **Set user expectations** about response times
3. **Educate about rate limits** proactively
4. **Collect feedback** on suggestion quality
5. **Monitor usage patterns** to optimize prompts
6. **Consider tiered access** for power users
7. **Track which features are most valuable**

## Performance Considerations

- **Response Time**: 2-10 seconds typical
- **Cost**: ~$0.01-0.03 per request (GPT-4 Turbo)
- **Rate Limit**: 10 requests/hour/user
- **Cache Hit Rate**: Aim for >30% for common queries
- **Token Usage**: 300-1000 tokens per response average

## Monitoring Dashboard Queries

```graphql
# Total AI requests in last hour
query AIUsageStats {
  aiAssistantStats {
    totalRequests
    uniqueUsers
    averageResponseTime
    errorRate
    totalCost
  }
}

# User's AI usage
query UserAIUsage($userId: ID!) {
  userAIUsage(userId: $userId) {
    requestsThisHour
    remainingRequests
    totalRequestsAllTime
    favoriteFeatures
  }
}
```

## Changelog

### v1.0.0 (2024-10-09)
- Initial release
- 6 query endpoints
- 2 mutation endpoints
- Rate limiting (10/hour)
- Conversation history
- Methodology-specific prompts
- Evidence suggestions
- Compliance checking
