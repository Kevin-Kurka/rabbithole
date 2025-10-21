# Promotion Ledger - Query Examples and Usage

## GraphQL Query Examples

### 1. Fetch Recent Promotions (Basic)

```graphql
query GetRecentPromotions {
  promotionEvents(limit: 20, offset: 0) {
    id
    graph_id
    graph_name
    previous_level
    new_level
    promoted_at
    promotion_reason
  }
}
```

**Response:**
```json
{
  "data": {
    "promotionEvents": [
      {
        "id": "uuid-1234",
        "graph_id": "graph-uuid-5678",
        "graph_name": "Climate Change Evidence Network",
        "previous_level": 1,
        "new_level": 0,
        "promoted_at": "2025-10-10T14:30:00Z",
        "promotion_reason": "Automatic promotion - all objective criteria met"
      }
    ]
  }
}
```

### 2. Filter by Date Range

```graphql
query GetPromotionsByDateRange {
  promotionEvents(
    startDate: "2025-01-01"
    endDate: "2025-12-31"
    limit: 50
  ) {
    id
    graph_name
    promoted_at
    new_level
  }
}
```

### 3. Filter by Methodology

```graphql
query GetScientificMethodPromotions {
  promotionEvents(
    methodology: "scientific_method"
    limit: 100
  ) {
    id
    graph_name
    methodology
    promoted_at
  }
}
```

### 4. Get Promotion Count (For Pagination)

```graphql
query GetPromotionCount {
  promotionEventsCount
}

# With filters
query GetFilteredPromotionCount {
  promotionEventsCount(
    startDate: "2025-01-01"
    methodology: "legal_discovery"
  )
}
```

### 5. Get Detailed Eligibility for Promoted Graph

```graphql
query GetPromotionDetails($graphId: String!) {
  # Get basic promotion info
  promotionEvents(limit: 1) {
    id
    graph_id
    graph_name
    promoted_at
  }

  # Get detailed eligibility breakdown
  getPromotionEligibility(graphId: $graphId) {
    graph_id
    methodology_completion_score
    consensus_score
    evidence_quality_score
    challenge_resolution_score
    overall_score
    is_eligible
    calculated_at
  }

  # Get consensus votes
  getConsensusVotes(graphId: $graphId) {
    vote_value
    reasoning
    vote_weight
    voter_reputation_score
    created_at
  }
}
```

**Variables:**
```json
{
  "graphId": "graph-uuid-5678"
}
```

## Frontend Hook Usage

### Basic Usage in React Component

```typescript
import { useQuery } from '@apollo/client';
import { GET_PROMOTION_EVENTS } from '@/graphql/queries/promotions';

function MyComponent() {
  const { data, loading, error } = useQuery(GET_PROMOTION_EVENTS, {
    variables: {
      limit: 20,
      offset: 0,
    },
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.promotionEvents.map((event) => (
        <li key={event.id}>
          {event.graph_name} promoted on {event.promoted_at}
        </li>
      ))}
    </ul>
  );
}
```

### With Filters and Pagination

```typescript
import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_PROMOTION_EVENTS, GET_PROMOTION_EVENTS_COUNT } from '@/graphql/queries/promotions';

function PromotionLedger() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    methodology: '',
  });

  const itemsPerPage = 20;
  const offset = (page - 1) * itemsPerPage;

  // Fetch events
  const { data, loading } = useQuery(GET_PROMOTION_EVENTS, {
    variables: {
      limit: itemsPerPage,
      offset,
      ...filters,
    },
  });

  // Fetch total count
  const { data: countData } = useQuery(GET_PROMOTION_EVENTS_COUNT, {
    variables: filters,
  });

  const totalPages = Math.ceil((countData?.promotionEventsCount || 0) / itemsPerPage);

  return (
    <div>
      {/* Filter controls */}
      <input
        type="date"
        value={filters.startDate}
        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
      />

      {/* Event list */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {data?.promotionEvents.map((event) => (
            <li key={event.id}>{event.graph_name}</li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
        Next
      </button>
    </div>
  );
}
```

### Real-Time Updates with Subscription

```typescript
import { useSubscription } from '@apollo/client';
import { PROMOTION_EVENT_SUBSCRIPTION } from '@/graphql/queries/promotions';

function LivePromotionFeed() {
  const { data, loading } = useSubscription(PROMOTION_EVENT_SUBSCRIPTION);

  if (loading) return <div>Connecting...</div>;

  return (
    <div>
      <h3>New Promotion!</h3>
      {data?.promotionEventCreated && (
        <div>
          {data.promotionEventCreated.graph_name} was promoted to Level{' '}
          {data.promotionEventCreated.new_level}
        </div>
      )}
    </div>
  );
}
```

## Backend Resolver Usage

### Manual Promotion Trigger (Internal)

```typescript
import { pool } from './database';
import { ProcessValidationResolver } from './resolvers/ProcessValidationResolver';

async function triggerPromotionCheck(graphId: string, userId: string) {
  const resolver = new ProcessValidationResolver();

  const result = await resolver.requestPromotionEvaluation(
    graphId,
    { pool, pubSub, userId }
  );

  if (result.promotion_successful) {
    console.log(`Graph promoted to Level ${result.new_level}`);
    // Promotion event is automatically logged in the database
  } else {
    console.log('Promotion failed:', result.failure_reason);
    console.log('Missing requirements:', result.detailed_requirements);
  }
}
```

### Direct Database Query (For Analytics)

```sql
-- Get promotion statistics by methodology
SELECT
  g.methodology,
  COUNT(*) as total_promotions,
  AVG(pe.new_level - pe.previous_level) as avg_level_jump,
  MIN(pe.promoted_at) as first_promotion,
  MAX(pe.promoted_at) as last_promotion
FROM public."PromotionEvents" pe
JOIN public."Graphs" g ON pe.graph_id = g.id
GROUP BY g.methodology
ORDER BY total_promotions DESC;

-- Get recent Level 0 promotions with graph details
SELECT
  pe.promoted_at,
  pe.graph_name,
  g.methodology,
  g.created_at as graph_created,
  EXTRACT(EPOCH FROM (pe.promoted_at - g.created_at))/86400 as days_to_promotion
FROM public."PromotionEvents" pe
JOIN public."Graphs" g ON pe.graph_id = g.id
WHERE pe.new_level = 0
ORDER BY pe.promoted_at DESC
LIMIT 10;

-- Get promotion velocity (promotions per month)
SELECT
  DATE_TRUNC('month', promoted_at) as month,
  COUNT(*) as promotions
FROM public."PromotionEvents"
GROUP BY month
ORDER BY month DESC;
```

## cURL Examples (For Testing)

### Basic Query
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ promotionEvents(limit: 5) { id graph_name promoted_at } }"
  }'
```

### With Variables
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetPromotions($limit: Int, $methodology: String) { promotionEvents(limit: $limit, methodology: $methodology) { id graph_name methodology promoted_at } }",
    "variables": {
      "limit": 10,
      "methodology": "scientific_method"
    }
  }'
```

### Get Count
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ promotionEventsCount }"
  }'
```

## Common Use Cases

### 1. Public Audit Dashboard

Display recent promotions on a public dashboard:

```typescript
const RecentPromotions = () => {
  const { data } = useQuery(GET_PROMOTION_EVENTS, {
    variables: { limit: 10 },
    pollInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div>
      <h2>Recently Promoted to Level 0</h2>
      {data?.promotionEvents.map((event) => (
        <PromotionCard key={event.id} event={event} />
      ))}
    </div>
  );
};
```

### 2. Methodology Success Tracking

Track which methodologies lead to most promotions:

```typescript
const MethodologyStats = () => {
  const [stats, setStats] = useState({});

  useEffect(() => {
    // Fetch all promotions and group by methodology
    // This would be better as a dedicated backend query
    fetch('/api/promotion-stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div>
      <h2>Promotion Success by Methodology</h2>
      {Object.entries(stats).map(([method, count]) => (
        <div key={method}>
          {method}: {count} promotions
        </div>
      ))}
    </div>
  );
};
```

### 3. User Contribution Tracking

Show promotions that a user contributed to:

```typescript
const UserPromotions = ({ userId }: { userId: string }) => {
  const { data } = useQuery(GET_USER_PROMOTIONS, {
    variables: { userId },
  });

  return (
    <div>
      <h2>Graphs You Helped Promote</h2>
      {data?.userPromotions.map((promotion) => (
        <div key={promotion.id}>
          {promotion.graph_name} - Promoted {formatDate(promotion.promoted_at)}
          <span>Your contribution: {promotion.userContribution}</span>
        </div>
      ))}
    </div>
  );
};
```

## Performance Considerations

### Indexing Strategy

```sql
-- Primary indexes for query performance
CREATE INDEX idx_promotion_events_promoted_at
ON public."PromotionEvents"(promoted_at DESC);

CREATE INDEX idx_promotion_events_graph_id
ON public."PromotionEvents"(graph_id);

-- Composite index for filtered queries
CREATE INDEX idx_promotion_events_methodology_date
ON public."PromotionEvents"(methodology, promoted_at DESC);
```

### Caching Strategy

```typescript
// Apollo Client cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        promotionEvents: {
          keyArgs: ['methodology', 'startDate', 'endDate'],
          merge(existing = [], incoming, { args }) {
            if (args?.offset === 0) {
              return incoming;
            }
            return [...existing, ...incoming];
          },
        },
      },
    },
  },
});
```

### Rate Limiting (Backend)

```typescript
import rateLimit from 'express-rate-limit';

const promotionLedgerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute
  message: 'Too many requests to promotion ledger',
});

app.use('/graphql', promotionLedgerLimiter);
```

## Error Handling

### Frontend Error Handling

```typescript
const { data, loading, error } = useQuery(GET_PROMOTION_EVENTS);

if (error) {
  if (error.networkError) {
    return <div>Network error - please check your connection</div>;
  }
  if (error.graphQLErrors) {
    return (
      <div>
        {error.graphQLErrors.map((err, i) => (
          <div key={i}>Error: {err.message}</div>
        ))}
      </div>
    );
  }
  return <div>An unexpected error occurred</div>;
}
```

### Backend Error Handling

```typescript
@Query(() => [PromotionEvent])
async promotionEvents(
  @Arg('limit', () => Number, { nullable: true }) limit: number = 50,
  @Ctx() { pool }: Context
): Promise<PromotionEvent[]> {
  try {
    const result = await pool.query(/* ... */);
    return result.rows;
  } catch (error) {
    console.error('Error fetching promotion events:', error);
    throw new Error('Failed to fetch promotion events');
  }
}
```

## Testing Examples

### Jest Unit Test

```typescript
import { MockedProvider } from '@apollo/client/testing';
import { render, screen, waitFor } from '@testing-library/react';
import { GET_PROMOTION_EVENTS } from '@/graphql/queries/promotions';
import PromotionLedger from './PromotionLedger';

const mocks = [
  {
    request: {
      query: GET_PROMOTION_EVENTS,
      variables: { limit: 20, offset: 0 },
    },
    result: {
      data: {
        promotionEvents: [
          {
            id: '1',
            graph_name: 'Test Graph',
            promoted_at: '2025-10-10T12:00:00Z',
            new_level: 0,
          },
        ],
      },
    },
  },
];

test('renders promotion events', async () => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <PromotionLedger />
    </MockedProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('Test Graph')).toBeInTheDocument();
  });
});
```

### Integration Test

```typescript
import request from 'supertest';
import { app } from '../app';

describe('Promotion Events API', () => {
  it('should fetch promotion events', async () => {
    const query = `
      query {
        promotionEvents(limit: 10) {
          id
          graph_name
        }
      }
    `;

    const response = await request(app)
      .post('/graphql')
      .send({ query })
      .expect(200);

    expect(response.body.data.promotionEvents).toBeDefined();
    expect(Array.isArray(response.body.data.promotionEvents)).toBe(true);
  });
});
```
