# Promotion Ledger Implementation

## Overview

The Promotion Ledger is a public-facing interface that displays all Level 0 promotions with full transparency. This implementation provides a complete audit trail of graphs that have been promoted to the immutable truth layer (Level 0).

## Features Implemented

### Frontend Components

1. **PromotionLedgerTable Component** (`/frontend/src/components/PromotionLedgerTable.tsx`)
   - Expandable table rows showing promotion details
   - Displays graph name, promotion timestamp, level change, and promotion reason
   - Click to view graph details
   - Loading and empty states
   - Responsive design with zinc-based theme

2. **PromotionLedger Page** (`/frontend/src/app/ledger/page.tsx`)
   - Public page accessible at `/ledger`
   - No authentication required
   - Features:
     - Date range filters (start/end date)
     - Methodology filter (Scientific Method, Legal Discovery, Toulmin Argumentation)
     - Pagination (20 items per page)
     - Clear filters functionality
     - Informational footer explaining promotion criteria
   - Real-time updates via GraphQL subscriptions (ready for future implementation)

3. **Navigation Component** (`/frontend/src/components/Navigation.tsx`)
   - Simple top navigation bar
   - Links to Graphs and Promotion Ledger
   - Active page indicator
   - Consistent with zinc theme

4. **GraphQL Queries** (`/frontend/src/graphql/queries/promotions.ts`)
   - `GET_PROMOTION_EVENTS`: Fetch paginated promotion events with filters
   - `GET_PROMOTION_EVENTS_COUNT`: Get total count for pagination
   - `GET_PROMOTION_ELIGIBILITY`: Fetch eligibility details for a specific graph
   - `GET_CONSENSUS_VOTES`: Get vote breakdown for transparency
   - `PROMOTION_EVENT_SUBSCRIPTION`: Real-time updates when new promotions occur

### Backend Resolvers

Added to **ProcessValidationResolver** (`/backend/src/resolvers/ProcessValidationResolver.ts`):

1. **`promotionEvents` Query**
   - Returns paginated list of all promotion events
   - Parameters:
     - `limit` (optional, default: 50): Number of events per page
     - `offset` (optional, default: 0): Pagination offset
     - `startDate` (optional): Filter by promotion date (start)
     - `endDate` (optional): Filter by promotion date (end)
     - `methodology` (optional): Filter by methodology type
   - No authentication required - public audit trail
   - Sorted by promotion date (newest first)

2. **`promotionEventsCount` Query**
   - Returns total count of promotion events matching filters
   - Same filter parameters as `promotionEvents`
   - Used for calculating pagination

## Database Schema

Uses existing **PromotionEvents** table:
```sql
CREATE TABLE public."PromotionEvents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id),
  graph_name TEXT NOT NULL,
  previous_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  promoted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  promotion_reason TEXT
);
```

## Usage Examples

### Viewing the Promotion Ledger

Navigate to `/ledger` to view all promotion events. No login required.

### Filtering Promotions

```typescript
// Filter by date range
const { data } = useQuery(GET_PROMOTION_EVENTS, {
  variables: {
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  },
});

// Filter by methodology
const { data } = useQuery(GET_PROMOTION_EVENTS, {
  variables: {
    methodology: 'scientific_method',
  },
});
```

### Backend Query Example

```graphql
query GetPromotionEvents($limit: Int, $offset: Int, $startDate: String, $endDate: String) {
  promotionEvents(
    limit: $limit
    offset: $offset
    startDate: $startDate
    endDate: $endDate
  ) {
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

## Transparency Features

1. **Public Access**: No authentication required to view the ledger
2. **Complete Audit Trail**: All promotions are recorded with timestamps and reasons
3. **Filter & Search**: Users can filter by date and methodology
4. **Detailed View**: Expandable rows show full promotion details
5. **Link to Source**: Direct links to view the promoted graph

## Promotion Criteria Display

The page includes an informational section explaining the objective criteria for Level 0 promotion:

- Methodology completion (80%+ required steps)
- Community consensus (80%+ weighted approval)
- Evidence quality (80%+ average confidence)
- Challenge resolution (all challenges resolved)

## Future Enhancements

1. **Real-time Subscriptions**:
   - Implement `PROMOTION_EVENT_SUBSCRIPTION` for live updates
   - Show notification badge when new promotions occur

2. **Evidence & Vote Details**:
   - Add drill-down view showing evidence count and quality scores
   - Display consensus vote breakdown with voter reputation

3. **Export Functionality**:
   - Export ledger as CSV/JSON for external auditing
   - Generate promotion certificate PDFs

4. **Analytics Dashboard**:
   - Promotion trends over time
   - Methodology success rates
   - Average time to promotion

5. **Search Enhancement**:
   - Full-text search across graph names and descriptions
   - Advanced filters (veracity score range, voter count)

## Files Created/Modified

### New Files
- `/frontend/src/app/ledger/page.tsx`
- `/frontend/src/components/PromotionLedgerTable.tsx`
- `/frontend/src/components/Navigation.tsx`
- `/frontend/src/graphql/queries/promotions.ts`

### Modified Files
- `/backend/src/resolvers/ProcessValidationResolver.ts`
  - Added `promotionEvents()` query resolver
  - Added `promotionEventsCount()` query resolver

## Testing

### Manual Testing Checklist

- [ ] Navigate to `/ledger` without authentication
- [ ] Verify promotion events display in table
- [ ] Test date range filtering
- [ ] Test methodology filtering
- [ ] Test clear filters button
- [ ] Test pagination (if >20 events exist)
- [ ] Test expandable row details
- [ ] Test "View" button navigation to graph
- [ ] Verify responsive design on mobile
- [ ] Test loading states
- [ ] Test empty state (no promotions)
- [ ] Test error handling

### Backend Testing

```bash
# Test promotion events query
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { promotionEvents(limit: 10) { id graph_name promoted_at } }"
  }'

# Test with filters
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { promotionEvents(methodology: \"scientific_method\") { id graph_name methodology } }"
  }'
```

## Deployment Notes

1. Ensure `PromotionEvents` table exists in production database
2. No environment variables or secrets required (public endpoint)
3. Consider adding rate limiting for public queries
4. Monitor query performance with large datasets
5. Add database indexes:
   ```sql
   CREATE INDEX idx_promotion_events_promoted_at ON public."PromotionEvents"(promoted_at DESC);
   CREATE INDEX idx_promotion_events_graph_id ON public."PromotionEvents"(graph_id);
   ```

## Architecture Decisions

### Why No Authentication?
The Promotion Ledger is intentionally public to provide full transparency. Level 0 promotions represent community consensus and should be auditable by anyone.

### Why Separate Navigation Component?
To provide consistent navigation across non-canvas pages. The graph canvas has its own sidebar, but the ledger and other informational pages benefit from a traditional top nav.

### Why Client-Side Filtering?
Initial implementation uses client-side filtering for simplicity. For production with large datasets, consider server-side filtering with proper indexing.

### Why Expandable Rows?
To balance information density with readability. Core info (name, date, level) is always visible, while details (graph ID, reason) are on-demand.

## Related Documentation

- [Process Validation System](/backend/src/resolvers/ProcessValidationResolver.ts)
- [Promotion Eligibility Criteria](/CLAUDE.md#veracity-scoring-system)
- [PromotionEvent Entity](/backend/src/entities/PromotionEvent.ts)
- [GraphQL Schema](/backend/src/schema.ts)
