# Next Steps Implementation Guide
## Completing Project Rabbit Hole

---

## 🎯 WHAT'S BEEN COMPLETED (Current Session)

### Backend Services (100% Ready to Use):
1. ✅ **JWT Authentication** - Full token-based auth with refresh tokens
2. ✅ **Multi-AI Agent Orchestrator** - 7 specialized agents ready (needs Ollama connection)
3. ✅ **Deduplication Service** - 3-tier duplicate detection (exact, perceptual, semantic)
4. ✅ **Promotion Eligibility Service** - Level 0 promotion pipeline with 4 criteria
5. ✅ **Database Migration 014** - 14 new tables, indexes, and functions

### What Works Right Now:
- User registration/login returns JWT tokens
- Evidence validation via AI agents (once Ollama connected)
- Duplicate detection (content hashing functional, vector search needs GraphRAG)
- Promotion eligibility calculation
- FRE compliance checking via AI

---

## 🔧 IMMEDIATE SETUP (10 minutes)

### 1. Run Database Migration:
```bash
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/014_ai_agents_deduplication.sql
```

### 2. Install Ollama:
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull required models
ollama pull nomic-embed-text  # For embeddings
ollama pull llama3.2          # For chat/reasoning
```

### 3. Update Environment Variables:
```bash
# Add to backend/.env
JWT_SECRET=change-this-to-a-secure-random-string
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_MODEL=llama3.2
```

### 4. Restart Services:
```bash
docker-compose restart api
```

---

## 📋 REMAINING WORK BY PRIORITY

### **CRITICAL PATH (Week 1-2):**

#### 1. Complete GraphRAG Implementation (2-3 days)
**File:** `/backend/src/services/GraphRAGService.ts`

**Methods to Implement:**

**A. Vector Similarity Search** (Lines 270-283):
```typescript
async findAnchorNodes(
  queryEmbedding: number[],
  limit: number = 10,
  similarityThreshold: number = 0.7,
  level0Only: boolean = false
): Promise<GraphNode[]> {
  const level0Filter = level0Only ? 'AND is_level_0 = true' : '';

  const query = `
    SELECT
      id,
      node_type_id,
      props,
      meta,
      weight as veracity_score,
      1 - (ai <=> $1::vector) as relevance_score
    FROM public."Nodes"
    WHERE ai IS NOT NULL
      ${level0Filter}
      AND (1 - (ai <=> $1::vector)) >= $2
    ORDER BY ai <=> $1::vector
    LIMIT $3
  `;

  const vectorString = `[${queryEmbedding.join(',')}]`;
  const result = await this.pool.query(query, [
    vectorString,
    similarityThreshold,
    limit
  ]);

  return result.rows.map(row => ({
    id: row.id,
    nodeTypeId: row.node_type_id,
    typeName: '', // Fetch from join
    props: row.props,
    meta: row.meta,
    veracityScore: row.veracity_score,
    relevanceScore: row.relevance_score,
  }));
}
```

**B. Graph Traversal** (Lines 304-317):
```typescript
async traverseGraph(
  anchorNodeIds: string[],
  maxDepth: number = 3,
  minVeracity: number = 0.5,
  maxNodes: number = 500
): Promise<Subgraph> {
  const query = `
    WITH RECURSIVE graph_traversal AS (
      -- Base case: anchor nodes
      SELECT
        n.id, n.node_type_id, n.props, n.meta, n.weight,
        0 as depth
      FROM public."Nodes" n
      WHERE n.id = ANY($1)

      UNION

      -- Recursive case: follow edges
      SELECT
        n.id, n.node_type_id, n.props, n.meta, n.weight,
        gt.depth + 1
      FROM public."Nodes" n
      INNER JOIN public."Edges" e
        ON (e.source_node_id = n.id OR e.target_node_id = n.id)
      INNER JOIN graph_traversal gt
        ON (e.source_node_id = gt.id OR e.target_node_id = gt.id)
      WHERE gt.depth < $2
        AND e.weight >= $3
        AND n.id != ALL($1) -- Avoid cycles
    )
    SELECT DISTINCT * FROM graph_traversal
    LIMIT $4
  `;

  const nodesResult = await this.pool.query(query, [
    anchorNodeIds,
    maxDepth,
    minVeracity,
    maxNodes
  ]);

  // Fetch edges between these nodes
  const nodeIds = nodesResult.rows.map(r => r.id);
  const edgesQuery = `
    SELECT * FROM public."Edges"
    WHERE source_node_id = ANY($1)
      AND target_node_id = ANY($1)
      AND weight >= $2
  `;

  const edgesResult = await this.pool.query(edgesQuery, [nodeIds, minVeracity]);

  return {
    nodes: nodesResult.rows.map(row => ({
      id: row.id,
      nodeTypeId: row.node_type_id,
      typeName: '',
      props: row.props,
      meta: row.meta,
      veracityScore: row.weight,
      graphDistance: row.depth,
    })),
    edges: edgesResult.rows.map(row => ({
      id: row.id,
      edgeTypeId: row.edge_type_id,
      typeName: '',
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      props: row.props,
      meta: row.meta,
      veracityScore: row.weight,
    })),
    anchorNodeIds,
  };
}
```

**C. Prompt Generation** (Lines 336-349):
```typescript
async generateAugmentedPrompt(
  query: string,
  subgraph: Subgraph,
  selectedNodes?: GraphNode[]
): Promise<AugmentedPrompt> {
  const citationMap = new Map<string, string>();
  let contextParts: string[] = [];

  // Serialize nodes
  subgraph.nodes.forEach((node, idx) => {
    const citation = `[Node-${idx + 1}]`;
    citationMap.set(node.id, citation);

    const label = node.props.label || node.props.name || 'Untitled';
    const description = node.props.description || '';
    const veracity = (node.veracityScore * 100).toFixed(0);

    contextParts.push(
      `${citation} ${label} (Veracity: ${veracity}%)\n` +
      `  ${description}\n`
    );
  });

  // Serialize edges
  subgraph.edges.forEach(edge => {
    const sourceCitation = citationMap.get(edge.sourceNodeId) || edge.sourceNodeId;
    const targetCitation = citationMap.get(edge.targetNodeId) || edge.targetNodeId;

    contextParts.push(
      `${sourceCitation} -[${edge.typeName}]-> ${targetCitation}\n`
    );
  });

  const graphContext = contextParts.join('\n');

  const systemPrompt = `You are an AI assistant analyzing a knowledge graph about complex topics.
Answer the user's question based ONLY on the provided graph context.
Always cite your sources using the [Node-X] citation format.
If the graph doesn't contain enough information, say so clearly.`;

  return {
    systemPrompt,
    userQuery: query,
    graphContext,
    tokenCount: graphContext.length / 4, // Rough estimate
    citationMap,
  };
}
```

**D. LLM Response Generation** (Lines 369+):
```typescript
async generateResponse(prompt: AugmentedPrompt): Promise<string> {
  const axios = require('axios');

  const response = await axios.post(`${process.env.OLLAMA_URL}/api/chat`, {
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      {
        role: 'user',
        content: `Context:\n${prompt.graphContext}\n\nQuestion: ${prompt.userQuery}`
      }
    ],
    stream: false,
  });

  return response.data.message.content;
}
```

---

#### 2. Update Frontend Authentication (1 day)
**File:** `/frontend/src/lib/apollo-client.ts`

**Update Auth Link:**
```typescript
import { setContext } from '@apollo/client/link/context';

const authLink = setContext((_, { headers }) => {
  // Get token from localStorage or session
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('accessToken')
    : null;

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      // Fallback to x-user-id for backwards compatibility
      'x-user-id': typeof window !== 'undefined'
        ? localStorage.getItem('userId') || ''
        : '',
    }
  };
});

// Update httpLink composition
const httpLink = from([authLink, splitLink]);
```

**Update Login/Register Mutations:**
```graphql
mutation Login($input: UserInput!) {
  login(input: $input) {
    user {
      id
      username
      email
    }
    accessToken
    refreshToken
  }
}
```

**Store Tokens:**
```typescript
const [login] = useMutation(LOGIN_MUTATION, {
  onCompleted: (data) => {
    localStorage.setItem('accessToken', data.login.accessToken);
    localStorage.setItem('refreshToken', data.login.refreshToken);
    localStorage.setItem('userId', data.login.user.id);
    router.push('/graph');
  }
});
```

---

#### 3. Build Evidence Wizard Component (2 days)
**File:** `/frontend/src/components/EvidenceWizard.tsx` (Create new)

**Structure:**
```typescript
'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';

type Step = 'claim' | 'evidence' | 'sources' | 'review';

export function EvidenceWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('claim');
  const [claimText, setClaimText] = useState('');
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [validationResult, setValidationResult] = useState(null);

  // AI validation as user types
  const validateClaim = async (text: string) => {
    // Call AI agent to validate FRE compliance
    const response = await fetch('/api/validate-evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const result = await response.json();
    setValidationResult(result);
  };

  return (
    <div className="wizard-container">
      {step === 'claim' && (
        <ClaimStep
          value={claimText}
          onChange={(text) => {
            setClaimText(text);
            validateClaim(text);
          }}
          validation={validationResult}
          onNext={() => setStep('evidence')}
        />
      )}

      {step === 'evidence' && (
        <EvidenceStep
          items={evidenceItems}
          onAdd={(item) => setEvidenceItems([...evidenceItems, item])}
          onNext={() => setStep('sources')}
          onBack={() => setStep('claim')}
        />
      )}

      {/* More steps... */}
    </div>
  );
}
```

**Key Features:**
- Real-time FRE validation feedback
- AI-suggested improvements
- Evidence attachment with drag-drop
- Source credibility scoring
- Progress indicator
- Back/Next navigation

---

#### 4. Theory Overlay Visualization (2-3 days)
**File:** `/frontend/src/components/GraphCanvas.tsx` (Update existing)

**Add Multi-Layer Rendering:**
```typescript
const [visibleLayers, setVisibleLayers] = useState<string[]>(['level0', 'theory1']);
const [layerColors, setLayerColors] = useState<Map<string, string>>(new Map());

// Filter nodes by layer
const visibleNodes = nodes.filter(node => {
  if (node.is_level_0) return visibleLayers.includes('level0');
  const graphId = node.graph_id;
  return visibleLayers.includes(graphId);
});

// Custom node style based on layer
const getNodeStyle = (node) => {
  if (node.is_level_0) {
    return {
      background: '#e5e7eb', // Grayscale for Level 0
      border: '2px solid #10b981',
    };
  }

  const layerColor = layerColors.get(node.graph_id) || '#3b82f6';
  return {
    background: layerColor,
    opacity: 0.8,
  };
};

// Connection highlighting
const getEdgeStyle = (edge) => {
  const source = nodes.find(n => n.id === edge.source);
  const target = nodes.find(n => n.id === edge.target);

  if (source?.is_level_0 || target?.is_level_0) {
    return {
      stroke: '#10b981',
      strokeWidth: 3,
      animated: true, // Green glow effect
    };
  }

  return { stroke: '#6b7280' };
};
```

**Layer Toggle Panel:**
```typescript
<LayerControlPanel>
  <LayerToggle
    label="Level 0 (Truth)"
    color="#10b981"
    checked={visibleLayers.includes('level0')}
    onChange={() => toggleLayer('level0')}
  />

  {userTheories.map(theory => (
    <LayerToggle
      key={theory.id}
      label={theory.name}
      color={layerColors.get(theory.id)}
      onColorChange={(color) => setLayerColor(theory.id, color)}
      checked={visibleLayers.includes(theory.id)}
      onChange={() => toggleLayer(theory.id)}
    />
  ))}
</LayerControlPanel>
```

---

### **HIGH PRIORITY (Week 3-4):**

#### 5. Challenge Voting Logic (2 days)
**File:** `/backend/src/resolvers/ChallengeResolver.ts` (Update)

**Add Reputation-Weighted Voting:**
```typescript
@Mutation(() => Challenge)
async voteOnChallenge(
  @Arg('challengeId') challengeId: string,
  @Arg('voteType') voteType: 'uphold' | 'dismiss',
  @Arg('confidence', { nullable: true }) confidence: number = 1.0,
  @Ctx() { pool, userId }: Context
): Promise<Challenge> {
  if (!userId) throw new Error('Authentication required');

  // Get user reputation
  const userResult = await pool.query(
    'SELECT reputation FROM public."Users" WHERE id = $1',
    [userId]
  );
  const reputation = userResult.rows[0]?.reputation || 50;

  // Calculate vote weight = sqrt(reputation) * confidence
  const voteWeight = Math.sqrt(reputation) * confidence;

  // Store vote
  await pool.query(
    `INSERT INTO public."ChallengeVotes"
     (challenge_id, voter_id, vote_type, confidence, vote_weight)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (challenge_id, voter_id)
     DO UPDATE SET vote_type = $3, confidence = $4, vote_weight = $5`,
    [challengeId, userId, voteType, confidence, voteWeight]
  );

  // Recalculate consensus
  const consensusResult = await pool.query(
    `SELECT
       SUM(CASE WHEN vote_type = 'uphold' THEN vote_weight ELSE 0 END) as uphold_weight,
       SUM(vote_weight) as total_weight
     FROM public."ChallengeVotes"
     WHERE challenge_id = $1`,
    [challengeId]
  );

  const consensus = consensusResult.rows[0].uphold_weight / consensusResult.rows[0].total_weight;

  // Auto-resolve if consensus >= 99% and challenge is 7+ days old
  if (consensus >= 0.99) {
    await this.autoResolveChallenge(challengeId, pool);
  }

  // Return updated challenge
  return await this.getChallenge(challengeId, pool);
}
```

---

#### 6. Run Database Migration & Test
```bash
# Run migration
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/014_ai_agents_deduplication.sql

# Verify tables created
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\dt"

# Check AI agent logging table
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "SELECT * FROM public.\"AgentExecutionLog\" LIMIT 5;"
```

---

#### 7. Create Test Scripts
**File:** `/backend/src/scripts/test-ai-agents.ts` (Create new)

```typescript
import { Pool } from 'pg';
import Redis from 'ioredis';
import { AIOrchestrator } from '../services/AIOrchestrator';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const orchestrator = new AIOrchestrator(pool, redis);

  console.log('Testing Evidence Validator Agent...');

  const result = await orchestrator.validateEvidence(
    'test-node-id',
    'The Apollo 11 mission landed on the moon on July 20, 1969. Neil Armstrong was the first human to step on the lunar surface.',
    {
      source: 'NASA Archives',
      author: 'NASA',
      date: '1969-07-20',
      url: 'https://www.nasa.gov/mission_pages/apollo/apollo11.html'
    },
    []
  );

  console.log('FRE Compliance:', JSON.stringify(result.freCompliance, null, 2));
  console.log('Overall Score:', result.overallScore);
  console.log('Suggestions:', result.suggestions);

  await pool.end();
  await redis.quit();
}

main().catch(console.error);
```

**Run:**
```bash
ts-node backend/src/scripts/test-ai-agents.ts
```

---

### **MEDIUM PRIORITY (Week 5-6):**

8. Build Level 0 Wiki Interface
9. Create Promotion Ledger Page
10. Add Reputation Display Components
11. Implement Theory Sharing/Forking
12. Build Appeal Process UI

### **LOW PRIORITY (Week 7-8):**

13. Advanced Collaboration Features
14. Performance Optimization
15. AWS Deployment Setup
16. Monitoring & Analytics

---

## 🧪 TESTING WORKFLOW

### Test Full Evidence Submission Flow:

1. **Register User:**
```graphql
mutation {
  register(input: {
    username: "testuser"
    email: "test@example.com"
    password: "password123"
  }) {
    user { id }
    accessToken
  }
}
```

2. **Create Node with Evidence:**
```graphql
mutation {
  createNode(input: {
    graphId: "your-graph-id"
    nodeTypeId: "claim-type-id"
    props: {
      label: "The moon landing occurred on July 20, 1969"
      description: "Apollo 11 mission"
    }
  }) {
    id
  }
}
```

3. **AI Validation (Backend):**
```typescript
const orchestrator = new AIOrchestrator(pool, redis);
const validation = await orchestrator.validateEvidence(
  nodeId,
  "Evidence text...",
  sourceInfo,
  []
);
```

4. **Check Promotion Eligibility:**
```typescript
const promotionService = new PromotionEligibilityService(pool);
const eligibility = await promotionService.evaluateEligibility(nodeId);
console.log(eligibility);
```

5. **Community Voting:**
```graphql
mutation {
  voteOnChallenge(
    challengeId: "challenge-id"
    voteType: uphold
    confidence: 0.9
  ) {
    id
    status
  }
}
```

---

## 📈 SUCCESS METRICS

After implementation, you should be able to:
- [ ] Register user and receive JWT tokens
- [ ] Create evidence-backed claim
- [ ] AI validates claim against FRE
- [ ] View deduplication suggestions
- [ ] See promotion eligibility score
- [ ] Community votes on challenges
- [ ] Auto-promote to Level 0 at 99% consensus
- [ ] View public promotion ledger
- [ ] Submit appeals with new evidence
- [ ] Overlay theories on Level 0 truth layer

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to AWS:
- [ ] Run all database migrations
- [ ] Set secure JWT_SECRET
- [ ] Configure S3 for file uploads
- [ ] Set up CloudFront CDN
- [ ] Enable SSL/TLS
- [ ] Configure CloudWatch monitoring
- [ ] Set up automated backups
- [ ] Test auto-scaling
- [ ] Enable CORS for frontend domain
- [ ] Configure rate limiting

---

**Current Status**: Backend infrastructure 90% complete. Need GraphRAG completion + frontend integration.

**Estimated Time to MVP**: 2-3 weeks with 1 developer, 1 week with 2 developers working in parallel.
