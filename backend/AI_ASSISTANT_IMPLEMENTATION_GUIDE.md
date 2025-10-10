# AI Assistant Implementation Guide

## Quick Start

### 1. Environment Setup

Add to your `.env` file:

```bash
# Required - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-actual-api-key-here

# Optional - Defaults shown
OPENAI_MODEL=gpt-4-turbo
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7
```

### 2. Install Dependencies

The OpenAI SDK is already installed:

```bash
npm install openai
```

### 3. Start the Server

```bash
npm start
```

The AI Assistant resolver is automatically registered and available at `/graphql`.

### 4. Test with GraphQL Playground

Navigate to `http://localhost:4000/graphql` and try:

```graphql
query TestAI {
  getMethodologyGuidance(graphId: "your-graph-id")
}
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  - Chat Interface                                                │
│  - Guidance Panel                                                │
│  - Compliance Dashboard                                          │
│  - Evidence Suggestions                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ GraphQL API
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    AIAssistantResolver                           │
│  - Validates input                                               │
│  - Checks authentication                                         │
│  - Handles errors                                                │
│  - Formats responses                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    AIAssistantService                            │
│  - OpenAI integration                                            │
│  - Conversation management                                       │
│  - Rate limiting                                                 │
│  - Context building                                              │
│  - Prompt engineering                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
┌───────────────▼──────────┐   ┌──────────▼─────────────┐
│   PostgreSQL Database    │   │   OpenAI GPT-4 API     │
│   - Graph data           │   │   - Text generation    │
│   - Methodology rules    │   │   - Analysis           │
│   - Node/Edge metadata   │   │   - Suggestions        │
└──────────────────────────┘   └────────────────────────┘
```

## Core Components

### 1. ComplianceReport Entity

Defines the structure of compliance analysis results.

**Location:** `/Users/kmk/rabbithole/backend/src/entities/ComplianceReport.ts`

**Key Types:**
- `ComplianceReport`: Overall analysis results
- `ComplianceIssue`: Individual issues found
- `EvidenceSuggestion`: Evidence recommendations
- `AIConversationMessage`: Chat history item

### 2. AIAssistantService

Core business logic for AI interactions.

**Location:** `/Users/kmk/rabbithole/backend/src/services/AIAssistantService.ts`

**Key Methods:**
```typescript
class AIAssistantService {
  // Get workflow guidance
  async getNextStepSuggestion(pool, graphId, methodologyId): Promise<string>

  // Detect issues
  async detectInconsistencies(pool, graphId): Promise<string[]>

  // Suggest evidence
  async suggestEvidence(pool, nodeId): Promise<EvidenceSuggestion[]>

  // Check compliance
  async validateMethodologyCompliance(pool, graphId): Promise<ComplianceReport>

  // Chat interface
  async askAIAssistant(pool, graphId, question, userId): Promise<string>

  // Utility methods
  clearConversation(graphId): void
  getRemainingRequests(userId): number
}
```

**Features:**
- In-memory caching for conversations
- Rate limiting (10 requests/hour/user)
- Methodology-aware prompts
- Error handling with fallbacks

### 3. AIAssistantResolver

GraphQL API layer.

**Location:** `/Users/kmk/rabbithole/backend/src/resolvers/AIAssistantResolver.ts`

**Queries:**
- `getMethodologyGuidance(graphId)`
- `detectGraphInconsistencies(graphId)`
- `suggestEvidenceSources(nodeId)`
- `checkMethodologyCompliance(graphId)`
- `getMethodologyPromptSuggestions(graphId)`
- `getRemainingAIRequests()`

**Mutations:**
- `askAIAssistant(graphId, question)`
- `clearAIConversation(graphId)`

## Usage Examples

### Example 1: Next Step Guidance

**Scenario:** User has created a 5 Whys graph with 2 "why" nodes and wants to know what to do next.

```graphql
query {
  getMethodologyGuidance(graphId: "5whys-graph-123")
}
```

**Response:**
```
"You're making great progress with your 5 Whys analysis! You've asked 'why' twice,
and each answer has helped narrow down the issue. You might consider creating a
third 'why' node to continue drilling down toward the root cause.

The typical guideline is to ask 'why' 5 times, but the real goal is to reach the
point where further 'why' questions either:
- Take you outside your control
- Become too abstract to act on
- Start repeating previous answers

Based on your last answer about 'inconsistent maintenance schedules,' you could ask:
'Why are maintenance schedules inconsistent?' This might reveal process gaps,
resource issues, or communication problems."
```

---

### Example 2: Inconsistency Detection

**Scenario:** User has built a complex graph and wants to check for issues before sharing.

```graphql
query {
  detectGraphInconsistencies(graphId: "complex-graph-456")
}
```

**Response:**
```json
[
  "You have 3 isolated nodes that aren't connected to the main graph. This might be
   intentional if you're exploring multiple angles, but consider whether these relate
   to your central investigation.",

  "There's a 'causes' edge connecting a Strength to a Threat, which is unusual in
   SWOT analysis. Typically, strengths and threats are separate categories. You may
   want to review if this relationship is intentional or if a different edge type
   would be more appropriate.",

  "One of your Problem Statement nodes is missing a 'description' property. While
   not required, adding this would help others understand the full context."
]
```

---

### Example 3: Evidence Suggestions

**Scenario:** User has created a claim node and wants to know what evidence would support it.

```graphql
query {
  suggestEvidenceSources(nodeId: "claim-node-789") {
    type
    description
    searchQuery
    priority
    rationale
  }
}
```

**Response:**
```json
[
  {
    "type": "source",
    "description": "Look for official documentation or reports from the time period",
    "searchQuery": "software bug report CVE-2023-12345 official disclosure",
    "priority": 5,
    "rationale": "Official security disclosures provide authoritative evidence of the vulnerability"
  },
  {
    "type": "data",
    "description": "Find statistics on how many systems were affected",
    "searchQuery": "CVE-2023-12345 affected systems statistics",
    "priority": 4,
    "rationale": "Quantitative data shows the scope and impact of the issue"
  },
  {
    "type": "expert",
    "description": "Consult security researchers who analyzed the vulnerability",
    "searchQuery": "CVE-2023-12345 security analysis expert opinion",
    "priority": 4,
    "rationale": "Expert analysis can reveal technical details and implications"
  },
  {
    "type": "document",
    "description": "Review patch notes or fix documentation",
    "searchQuery": "CVE-2023-12345 patch notes security fix",
    "priority": 3,
    "rationale": "Fix documentation confirms the nature of the vulnerability"
  }
]
```

---

### Example 4: Compliance Check

**Scenario:** User wants to see how well their graph follows methodology best practices.

```graphql
query {
  checkMethodologyCompliance(graphId: "fishbone-graph-101") {
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

**Response:**
```json
{
  "complianceScore": 78,
  "isCompliant": true,
  "methodologyName": "Fishbone (Ishikawa) Diagram",
  "issues": [
    {
      "type": "missing_node_type",
      "severity": "warning",
      "message": "You might want to consider exploring the 'Measurement' category",
      "suggestion": "Fishbone diagrams typically use the 6Ms framework. You've covered People, Process, Equipment, and Materials, but haven't added Measurement or Environment categories yet. These might reveal additional causes."
    },
    {
      "type": "missing_properties",
      "severity": "warning",
      "message": "A Potential Cause node is missing the 'likelihood' property",
      "suggestion": "Adding likelihood assessments helps prioritize which causes to investigate first"
    },
    {
      "type": "invalid_edge_connection",
      "severity": "suggestion",
      "message": "You have a 'causes' edge from a sub-cause directly to the main effect",
      "suggestion": "In Fishbone methodology, sub-causes typically connect to their parent cause first, then the parent connects to the effect. Consider restructuring for clarity."
    }
  ],
  "overallAssessment": "Your Fishbone diagram shows 78% alignment with standard methodology practices. You've done a good job identifying causes across multiple categories. The suggestions above are meant to help strengthen your analysis, but remember that every investigation is unique - feel free to adapt the methodology to your needs."
}
```

---

### Example 5: Conversational AI Chat

**Scenario:** User is stuck and wants personalized help.

```graphql
mutation {
  askAIAssistant(
    graphId: "timeline-graph-202"
    question: "I'm not sure if I should add more events or focus on connecting the ones I have. What would you recommend?"
  )
}
```

**Response:**
```
"That's a great question, and the answer really depends on your investigation goals!

Let me look at your timeline... I see you have 8 events spanning 3 months. Here are
some factors to consider:

ADDING MORE EVENTS might be helpful if:
- There are significant time gaps (I notice a 3-week gap between events 4 and 5)
- You're missing context that would explain cause-and-effect relationships
- Stakeholders have mentioned other relevant events you haven't captured
- The timeline feels incomplete when you review it

FOCUSING ON CONNECTIONS might be better if:
- You have the major milestones covered
- The relationships between events are unclear
- You need to understand causality, not just chronology
- You're preparing to present findings and need the story to flow

Looking at your specific timeline, I notice you have good chronological coverage, but
only 2 'causes' edges connecting events. You might consider:

1. First, add 'causes' or 'relates_to' edges between events that influenced each other
2. Then, identify if any critical events are missing from those gaps
3. Use the 'during' edge type to group related events into periods

This approach ensures your timeline tells a coherent story. What aspect would you like
to explore first - the connections or filling gaps?"
```

**Follow-up Question:**
```graphql
mutation {
  askAIAssistant(
    graphId: "timeline-graph-202"
    question: "Let's focus on connections. How do I identify which events caused which?"
  )
}
```

**Response:**
```
"Great choice! Identifying causal relationships in timelines can be tricky. Here's a
practical approach:

1. TEMPORAL PRECEDENCE (necessary but not sufficient)
   - Event A must occur before Event B to cause it
   - Look at your dates - I see Event 3 (Jan 15) and Event 4 (Jan 18)
   - The 3-day gap suggests possible causation

2. ASK THESE QUESTIONS:
   - Would Event B have happened if Event A didn't occur?
   - Was Event A sufficient to cause Event B, or were other factors needed?
   - Is there evidence linking them (documents, testimony, logic)?

3. DISTINGUISH TYPES OF RELATIONSHIPS:
   - 'causes': Direct causal link (A made B happen)
   - 'precedes': Just sequential (A before B, but didn't cause B)
   - 'relates_to': Associated but unclear if causal

4. PRACTICAL TIPS FOR YOUR TIMELINE:
   - Start with the most obvious causes (e.g., "meeting decision" → "policy change")
   - Add supporting evidence to edge properties
   - Don't force causality - correlation isn't causation
   - Multiple events can contribute to one outcome

For your timeline specifically, I'd suggest looking at:
- Event 2 (system failure) and Event 3 (emergency meeting) - likely causal
- Event 5 (new procedure) and Event 6 (incident decrease) - possible causation

Would you like me to help analyze any specific pair of events in more detail?"
```

---

### Example 6: Getting Prompt Suggestions

**Scenario:** User opens chat and wants helpful prompts to get started.

```graphql
query {
  getMethodologyPromptSuggestions(graphId: "swot-graph-303")
}
```

**Response (SWOT-specific):**
```json
[
  "Have I identified both internal and external factors?",
  "Are my strengths truly unique or just table stakes?",
  "What opportunities am I not considering?",
  "How do my threats relate to my weaknesses?",
  "What strategies leverage my strengths against threats?",
  "Am I being honest about weaknesses or just listing minor issues?",
  "Which opportunities have the highest probability and impact?",
  "What early warning signs exist for my identified threats?"
]
```

These prompts appear as quick-select buttons in the UI.

---

### Example 7: Rate Limit Check

**Scenario:** User wants to know how many AI requests they have left.

```graphql
query {
  getRemainingAIRequests
}
```

**Response:**
```json
7
```

Display in UI: "7 AI requests remaining this hour ⏳"

---

### Example 8: Clearing Conversation

**Scenario:** User wants to start a fresh conversation about a different aspect of their graph.

```graphql
mutation {
  clearAIConversation(graphId: "mind-map-404")
}
```

**Response:**
```json
true
```

Conversation history is reset. Next AI query will have no context from previous conversation.

## Integration Patterns

### Pattern 1: Automatic Guidance Panel

Show guidance automatically when user opens a graph:

```typescript
function GraphView({ graphId }) {
  const { data } = useQuery(GET_METHODOLOGY_GUIDANCE, {
    variables: { graphId },
    // Refresh guidance when graph changes
    pollInterval: 30000 // Every 30 seconds
  });

  return (
    <div>
      <GraphCanvas graphId={graphId} />

      {data?.getMethodologyGuidance && (
        <GuidancePanel>
          <AIIcon />
          <p>{data.getMethodologyGuidance}</p>
        </GuidancePanel>
      )}
    </div>
  );
}
```

---

### Pattern 2: Contextual Evidence Suggestions

Show evidence suggestions when user clicks a node:

```typescript
function NodeDetailsPanel({ nodeId }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data, loading } = useQuery(SUGGEST_EVIDENCE, {
    variables: { nodeId },
    skip: !showSuggestions // Only fetch when user requests
  });

  return (
    <div>
      <h3>Node Details</h3>
      {/* Node properties */}

      <button onClick={() => setShowSuggestions(true)}>
        Get Evidence Suggestions 🤖
      </button>

      {loading && <Spinner />}

      {data?.suggestEvidenceSources.map(suggestion => (
        <EvidenceSuggestion
          key={suggestion.searchQuery}
          suggestion={suggestion}
          onSearchClick={() => window.open(
            `https://google.com/search?q=${suggestion.searchQuery}`,
            '_blank'
          )}
        />
      ))}
    </div>
  );
}
```

---

### Pattern 3: Pre-Promotion Compliance Check

Check compliance before allowing graph promotion:

```typescript
function PromoteGraphButton({ graphId }) {
  const [checkCompliance] = useLazyQuery(CHECK_COMPLIANCE);
  const [promoteGraph] = useMutation(PROMOTE_GRAPH);

  const handlePromote = async () => {
    // Check compliance first
    const { data } = await checkCompliance({ variables: { graphId } });
    const report = data?.checkMethodologyCompliance;

    // Show compliance report
    const proceed = await showComplianceDialog(report);

    if (proceed) {
      // User can proceed even with low compliance
      await promoteGraph({ variables: { graphId } });
    }
  };

  return <button onClick={handlePromote}>Promote to Level 1</button>;
}

function showComplianceDialog(report) {
  return new Promise(resolve => {
    Modal.show({
      title: 'Compliance Check',
      content: (
        <div>
          <p>Compliance Score: {report.complianceScore}%</p>
          {report.issues.map(issue => (
            <div key={issue.message}>{issue.message}</div>
          ))}
          <p>{report.overallAssessment}</p>
        </div>
      ),
      buttons: [
        {
          text: 'Review Issues',
          onClick: () => resolve(false)
        },
        {
          text: 'Promote Anyway',
          onClick: () => resolve(true)
        }
      ]
    });
  });
}
```

---

### Pattern 4: Floating AI Chat Widget

Persistent chat widget across all graph views:

```typescript
function AppWithAIChat() {
  const [chatOpen, setChatOpen] = useState(false);
  const { graphId } = useCurrentGraph();

  return (
    <div>
      <Router>
        {/* App routes */}
      </Router>

      {/* Floating chat button */}
      <button
        className="ai-chat-fab"
        onClick={() => setChatOpen(true)}
      >
        🤖 Ask AI
      </button>

      {/* Chat modal */}
      {chatOpen && (
        <Modal onClose={() => setChatOpen(false)}>
          <AIChat graphId={graphId} />
        </Modal>
      )}
    </div>
  );
}
```

---

### Pattern 5: Inconsistency Notifications

Automatically detect and notify about issues:

```typescript
function useInconsistencyMonitor(graphId) {
  const { data } = useQuery(DETECT_INCONSISTENCIES, {
    variables: { graphId },
    pollInterval: 60000, // Check every minute
  });

  useEffect(() => {
    const issues = data?.detectGraphInconsistencies || [];

    // Filter out the "looks good" message
    const realIssues = issues.filter(
      issue => !issue.toLowerCase().includes('looks logically sound')
    );

    if (realIssues.length > 0) {
      // Show notification
      toast.info(
        `AI detected ${realIssues.length} potential issue(s) in your graph`,
        {
          action: {
            label: 'Review',
            onClick: () => showIssuesModal(realIssues)
          }
        }
      );
    }
  }, [data]);
}
```

## Testing the AI Assistant

### Manual Testing Checklist

**Basic Functionality:**
- [ ] Can get methodology guidance for a graph
- [ ] Can detect inconsistencies
- [ ] Can suggest evidence for a node
- [ ] Can check compliance
- [ ] Can ask questions in chat
- [ ] Can clear conversation
- [ ] Can check remaining requests

**Rate Limiting:**
- [ ] Making 10 requests succeeds
- [ ] 11th request returns rate limit error
- [ ] Counter resets after 1 hour
- [ ] Different users have separate limits

**Error Handling:**
- [ ] Missing API key shows friendly error
- [ ] Invalid graph ID returns error
- [ ] Empty question is rejected
- [ ] Question > 1000 chars is rejected
- [ ] Unauthenticated requests are rejected

**Methodology-Specific:**
- [ ] Guidance appropriate for 5 Whys
- [ ] Guidance appropriate for Fishbone
- [ ] Guidance appropriate for SWOT
- [ ] Guidance appropriate for Timeline
- [ ] Prompts match methodology type

### Automated Testing

```bash
# Run unit tests
npm test -- AIAssistantService.test.ts
npm test -- AIAssistantResolver.test.ts

# Run integration tests
npm test -- ai-assistant.integration.test.ts

# Check test coverage
npm run test:coverage
```

### Load Testing

```javascript
// test/load/ai-assistant-load.test.js
const autocannon = require('autocannon');

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:4000/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      query: `query { getMethodologyGuidance(graphId: "test-graph") }`
    }),
    connections: 10, // Concurrent users
    duration: 30, // 30 seconds
  });

  console.log('Load Test Results:');
  console.log(`Requests: ${result.requests.total}`);
  console.log(`Throughput: ${result.throughput.mean} req/sec`);
  console.log(`Latency: ${result.latency.mean}ms avg`);
  console.log(`Errors: ${result.errors}`);
}

runLoadTest();
```

## Cost Management

### Estimating Costs

**GPT-4 Turbo Pricing (as of 2024):**
- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens

**Average Request:**
- System prompt: ~300 tokens
- Graph context: ~200 tokens
- User question: ~50 tokens
- AI response: ~400 tokens
- **Total cost per request: ~$0.025**

**Monthly Cost Estimate:**
```
Users: 100
Requests per user per day: 5
Days per month: 30

Total requests: 100 × 5 × 30 = 15,000
Total cost: 15,000 × $0.025 = $375/month
```

### Cost Optimization Strategies

1. **Reduce Token Usage**
   ```typescript
   // Instead of sending full graph
   const graphSummary = {
     nodeCount: nodes.length,
     edgeCount: edges.length,
     // ... minimal data only
   };
   ```

2. **Cache Common Queries**
   ```typescript
   const cacheKey = `guidance:${graphId}:${nodeCount}`;
   const cached = await redis.get(cacheKey);
   if (cached) return cached;
   ```

3. **Use Cheaper Model for Simple Tasks**
   ```typescript
   // gpt-3.5-turbo for prompts/suggestions
   // gpt-4-turbo only for analysis
   const model = isComplexTask ? 'gpt-4-turbo' : 'gpt-3.5-turbo';
   ```

4. **Batch Requests**
   ```typescript
   // Combine multiple checks into one API call
   const prompt = `
     1. Suggest next step
     2. Check for inconsistencies
     3. Rate compliance
   `;
   ```

5. **Tighter Rate Limits**
   ```typescript
   // Reduce from 10 to 5 requests/hour if costs too high
   private readonly MAX_REQUESTS_PER_HOUR = 5;
   ```

## Monitoring & Analytics

### Key Metrics to Track

```typescript
// Log AI interactions for analysis
interface AIMetrics {
  timestamp: Date;
  userId: string;
  graphId: string;
  queryType: 'guidance' | 'inconsistency' | 'evidence' | 'compliance' | 'chat';
  responseTime: number;
  tokensUsed: number;
  cost: number;
  userSatisfaction?: 'helpful' | 'unhelpful';
}

// Log after each AI call
await logAIMetric({
  timestamp: new Date(),
  userId: context.userId,
  graphId,
  queryType: 'guidance',
  responseTime: 2.3,
  tokensUsed: 850,
  cost: 0.0212,
});
```

### Analytics Dashboard Queries

```sql
-- Total AI usage by day
SELECT
  DATE(timestamp) as date,
  COUNT(*) as requests,
  SUM(cost) as total_cost,
  AVG(response_time) as avg_response_time
FROM ai_metrics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Most active users
SELECT
  user_id,
  COUNT(*) as total_requests,
  SUM(cost) as total_cost
FROM ai_metrics
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_requests DESC
LIMIT 10;

-- Query type distribution
SELECT
  query_type,
  COUNT(*) as count,
  AVG(response_time) as avg_time
FROM ai_metrics
GROUP BY query_type;

-- User satisfaction
SELECT
  user_satisfaction,
  COUNT(*) as count
FROM ai_metrics
WHERE user_satisfaction IS NOT NULL
GROUP BY user_satisfaction;
```

## Troubleshooting Guide

### Issue: "AI Assistant is currently unavailable"

**Cause:** Missing or invalid OPENAI_API_KEY

**Solution:**
1. Check `.env` file has `OPENAI_API_KEY=sk-...`
2. Verify key is valid at https://platform.openai.com/api-keys
3. Restart server: `npm start`

---

### Issue: "Rate limit exceeded"

**Cause:** User made more than 10 requests in last hour

**Solution:**
1. Wait for rate limit window to reset
2. Check `getRemainingAIRequests` to see when resets
3. Consider increasing limit in production

---

### Issue: Slow responses (>15 seconds)

**Cause:** GPT-4 can be slow, especially with long contexts

**Solutions:**
1. Reduce `AI_MAX_TOKENS` to limit response length
2. Switch to `gpt-3.5-turbo` for faster (but less capable) responses
3. Implement caching for common queries
4. Show loading state in UI

---

### Issue: Responses seem off-topic

**Cause:** Poor context or prompt engineering

**Solutions:**
1. Review system prompts in `buildSystemPrompt()`
2. Ensure graph data is being fetched correctly
3. Add more specific instructions to prompts
4. Clear conversation if context is stale

---

### Issue: High API costs

**Cause:** Too many requests or inefficient token usage

**Solutions:**
1. Implement caching (Redis)
2. Reduce rate limits
3. Use gpt-3.5-turbo where possible
4. Optimize prompts to be shorter
5. Monitor usage with analytics

## Production Deployment

### Environment Configuration

```bash
# Production .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/rabbithole
OPENAI_API_KEY=sk-prod-key-here
OPENAI_MODEL=gpt-4-turbo
AI_MAX_TOKENS=800  # Reduced for cost
AI_TEMPERATURE=0.7

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=error
```

### Scaling Considerations

**Single Server:**
- In-memory caching works fine
- Rate limiting per server
- ~1000 users supported

**Multi-Server:**
- Migrate to Redis for shared cache
- Centralized rate limiting via Redis
- Load balancer distributes AI requests

**Redis Migration:**
```typescript
// Instead of Map, use Redis
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache conversation
await redis.setex(
  `conv:${graphId}`,
  3600,
  JSON.stringify(conversation)
);

// Rate limiting
const key = `ratelimit:${userId}`;
await redis.incr(key);
await redis.expire(key, 3600);
```

### Health Checks

```typescript
// Add health check endpoint
app.get('/health/ai', async (req, res) => {
  try {
    // Test OpenAI connection
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });

    res.json({
      status: 'healthy',
      service: 'ai-assistant',
      model: process.env.OPENAI_MODEL,
      responseTime: response.response_ms
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'ai-assistant',
      error: error.message
    });
  }
});
```

## Future Enhancements

### Planned Features
- [ ] Voice input for chat
- [ ] Multi-language support
- [ ] Custom AI personas
- [ ] Evidence auto-fetching
- [ ] Collaborative AI (team suggestions)
- [ ] Learning from user feedback
- [ ] Export chat as PDF
- [ ] AI-powered graph search
- [ ] Webhook notifications
- [ ] Batch analysis of multiple graphs

### Research Areas
- Fine-tuning on investigation methodologies
- RAG (Retrieval Augmented Generation) for evidence
- Multi-modal analysis (images, documents)
- Automated graph generation from text
- Predictive analysis of investigation outcomes

## Support & Resources

### Documentation
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Type-GraphQL Docs](https://typegraphql.com/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

### Internal Resources
- Service README: `src/services/AIAssistantService.README.md`
- Resolver README: `src/resolvers/AIAssistantResolver.README.md`
- API Examples: This file

### Getting Help
1. Check error logs: `logs/ai-assistant.log`
2. Review OpenAI status: https://status.openai.com/
3. Test with GraphQL Playground
4. Check rate limits and quotas
5. Contact development team

---

**Version:** 1.0.0
**Last Updated:** 2024-10-09
**Authors:** Backend Development Team
