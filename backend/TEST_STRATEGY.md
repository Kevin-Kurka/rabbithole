# Test Strategy for Rabbit Hole Backend Services

## Executive Summary

This document outlines the comprehensive testing strategy for 5 critical backend services in the Rabbit Hole platform. The target coverage is **80% minimum** for all services, with emphasis on edge cases, error handling, and integration scenarios.

**Current Coverage**: ~1.27% → **Target**: 80%+

---

## Testing Pyramid

```
         /\         E2E Tests (10%)
        /  \        - Critical user journeys
       /    \       - Claim verification workflow
      /------\      Integration Tests (30%)
     /        \     - Service-to-service communication
    /          \    - Database interactions
   /------------\   Unit Tests (60%)
  /              \  - Business logic isolation
 /                \ - Edge cases & error handling
/------------------\
```

### Target Coverage Distribution

- **Unit Tests**: 60% (isolated function behavior)
- **Integration Tests**: 30% (service collaboration)
- **E2E Tests**: 10% (critical user workflows)

---

## Service Coverage Overview

### 1. EmbeddingService (NEW)
**File**: `/backend/src/__tests__/EmbeddingService.test.ts`
**Lines**: ~700 test code

#### Key Test Areas
- **Initialization**: OpenAI vs Ollama provider selection
- **Embedding Generation**:
  - Text validation (empty, non-string, length)
  - Provider-specific implementations
  - Dimension validation (1536 for OpenAI, 768 for Ollama)
  - Retry logic with exponential backoff
  - Rate limit handling (429 responses)
  - Network error recovery

- **Batch Operations**:
  - Batch processing (100 items per batch)
  - Fallback to individual embedding on batch failure
  - Rate limiting between batches

- **Text Extraction**:
  - Extract from name, description, props
  - Handle nested objects (max depth: 3)
  - Skip null/undefined values
  - Handle arrays and primitives

- **Error Scenarios**:
  - Non-retryable errors (4xx)
  - Retryable errors (5xx, 429, network)
  - Invalid API responses
  - Health checks

#### Test Coverage Goals
- ✅ Happy path: embedding generation
- ✅ Provider switching
- ✅ Retry logic with backoff
- ✅ Input validation
- ✅ Error classification
- ✅ Dimension validation
- ✅ Batch processing

**Estimated Coverage**: 85%+

---

### 2. AIAssistantService (NEW)
**File**: `/backend/src/__tests__/AIAssistantService.test.ts`
**Lines**: ~850 test code

#### Key Test Areas
- **Ollama Integration**:
  - Chat API calls with temperature & tokens
  - Connection error handling
  - Timeout handling
  - Non-axios error handling

- **Conversation Management**:
  - Conversation history caching
  - History truncation (max 20 messages)
  - Cache expiration (1 hour)
  - Conversation clearing

- **Rate Limiting**:
  - 10 requests per hour per user
  - Remaining request tracking
  - Rate limit enforcement
  - Hour-based window calculation

- **Graph Analysis**:
  - Fetch graph structure (nodes, edges, methodologies)
  - Build system prompts
  - Context extraction
  - Methodology-aware guidance

- **Consistency Detection**:
  - Orphaned node detection
  - Edge type validation
  - Required property checking
  - Logical contradiction detection via AI

- **Evidence Suggestion**:
  - Evidence type classification
  - Search query generation
  - Priority ranking
  - Fallback suggestions

- **Methodology Compliance**:
  - Compliance scoring
  - Issue categorization (errors vs warnings)
  - Workflow completeness checking
  - Non-prescriptive messaging (suggestions, not commands)

#### Test Coverage Goals
- ✅ Ollama API integration
- ✅ Rate limiting enforcement
- ✅ Conversation history management
- ✅ Graph analysis and context
- ✅ Error handling
- ✅ Fallback mechanisms
- ✅ Compliance reporting

**Estimated Coverage**: 80%+

---

### 3. DeduplicationService (NEW)
**File**: `/backend/src/__tests__/DeduplicationService.test.ts`
**Lines**: ~900 test code

#### Key Test Areas
- **Duplicate Detection**:
  - Exact hash matching (SHA256, similarity = 1.0)
  - Perceptual hash matching (hamming distance)
  - Semantic similarity (vector search, 0.90+ threshold)
  - Candidate deduplication and ranking

- **Duplicate Classification**:
  - Exact (1.0 similarity)
  - Near (0.95-0.99 similarity)
  - Semantic (0.90-0.94 similarity)
  - None (<0.90 similarity)

- **Recommendations**:
  - Merge for exact duplicates
  - Link for near/semantic duplicates
  - Separate for low similarity

- **Merge Operations**:
  - Node merging with transaction safety
  - Metadata combination
  - Evidence consolidation
  - Edge reference redirection
  - Self-loop removal
  - Merge history tracking
  - Rollback on error

- **Content Hashing**:
  - SHA256 consistency
  - Perceptual hashing (future)
  - Whitespace normalization

- **Challenge Deduplication**:
  - Detect duplicate challenges (similarity > 0.7)
  - Filter by status (open, under_review)
  - Prevent duplicate debates

#### Test Coverage Goals
- ✅ All duplicate detection methods
- ✅ Type classification accuracy
- ✅ Merge strategy execution
- ✅ Transaction safety
- ✅ Content hashing
- ✅ Edge cases (circular refs, malformed data)
- ✅ Error handling with rollback

**Estimated Coverage**: 85%+

---

### 4. SearchService (ENHANCED)
**File**: `/backend/src/__tests__/SearchService.enhanced.test.ts`
**Lines**: ~800 test code

#### Key Test Areas
- **Hybrid Search**:
  - Full-text + semantic result combination
  - Deduplication (keep highest relevance)
  - Result reranking by relevance
  - Limit enforcement

- **Semantic Search**:
  - Query embedding generation
  - pgvector cosine distance (<=> operator)
  - Embedding failure fallback
  - Type filtering (ANY operator)
  - GraphId filtering
  - Relevance calculation from distance

- **Full-Text Search**:
  - ts_rank scoring
  - English language parsing
  - Article vs node separation
  - ILIKE case-insensitive matching
  - Pagination (limit/offset)

- **Autocomplete**:
  - Minimum query length (2 chars)
  - Case-insensitive suggestions
  - Result limiting
  - Pattern matching with %

- **Filter Application**:
  - Node type filtering
  - Graph ID filtering
  - Combined filter logic
  - Invalid parameter handling

- **Result Enrichment**:
  - Veracity scores
  - Graph name inclusion
  - Narrative field handling
  - Relevance scores

#### Test Coverage Goals
- ✅ Both search methods independently
- ✅ Hybrid combination and deduplication
- ✅ Filter application accuracy
- ✅ Pagination correctness
- ✅ Error handling
- ✅ Performance (large result sets)
- ✅ SQL injection prevention (parameterized)

**Estimated Coverage**: 75%+ (existing tests + enhancements)

---

### 5. GraphTraversalService (ENHANCED)
**File**: `/backend/src/__tests__/GraphTraversalService.enhanced.test.ts`
**Lines**: ~900 test code

#### Key Test Areas
- **Path Finding**:
  - Shortest path via bidirectional BFS
  - Cycle detection (path arrays)
  - Veracity threshold filtering
  - Max depth limiting
  - Accumulated weight calculation
  - Meeting point optimization

- **Subgraph Expansion**:
  - Outgoing expansion (children)
  - Incoming expansion (parents)
  - Bidirectional expansion
  - Depth control
  - Veracity filtering
  - Max node limiting
  - Relevance decay factor

- **Related Node Finding**:
  - Edge type filtering
  - Path weight tracking
  - Multiple path support
  - Depth control
  - Veracity thresholds

- **Ancestry Tracking**:
  - Provenance chain via primarySourceId
  - Circular reference prevention
  - Depth limiting
  - Root-to-leaf ordering

- **Veracity-Weighted Ranking**:
  - Combined score calculation (node weight × edge weight)
  - Threshold filtering
  - Limit enforcement
  - Missing weight handling

- **Error Scenarios**:
  - Missing nodes
  - Database errors
  - Malformed results
  - Very deep graphs (100+ levels)

#### Test Coverage Goals
- ✅ All traversal methods
- ✅ Cycle detection & prevention
- ✅ Veracity thresholding
- ✅ Performance with deep graphs
- ✅ Data transformation accuracy
- ✅ Recursive CTE efficiency
- ✅ Error recovery

**Estimated Coverage**: 80%+

---

## Test Patterns & Best Practices

### AAA Pattern (Arrange-Act-Assert)
```typescript
it('should do something specific', async () => {
  // Arrange: Set up test data and mocks
  const input = { /* test data */ };
  mockPool.query.mockResolvedValue({ rows: [] });

  // Act: Execute the function
  const result = await service.method(input);

  // Assert: Verify the result
  expect(result).toBeDefined();
  expect(mockPool.query).toHaveBeenCalledWith(expectedQuery);
});
```

### Mock Strategy
- **Database**: Mock `Pool.query()` with controlled responses
- **External APIs**: Mock `axios.post()` for Ollama calls
- **Services**: Constructor injection + partial mocks
- **Time-based**: Use jest timers for cache expiration

### Error Testing
```typescript
it('should handle errors gracefully', async () => {
  mockPool.query.mockRejectedValue(new Error('DB error'));
  await expect(service.method()).rejects.toThrow('DB error');
});
```

### Edge Cases Always Test
- Empty/null inputs
- Very large datasets
- Malformed responses
- Network failures
- Timeout scenarios
- Rate limiting
- Circular references
- Missing required fields

---

## Running Tests

### Run All Tests
```bash
cd /Users/kmk/rabbithole/backend
npm test
```

### Run Specific Test Suite
```bash
npm test -- EmbeddingService.test
npm test -- AIAssistantService.test
npm test -- DeduplicationService.test
npm test -- SearchService.enhanced.test
npm test -- GraphTraversalService.enhanced.test
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

---

## Coverage Metrics & Goals

| Service | File | Test Cases | Target Coverage | Current | Status |
|---------|------|-----------|-----------------|---------|--------|
| EmbeddingService | EmbeddingService.test.ts | 35+ | 85% | NEW | ✅ NEW |
| AIAssistantService | AIAssistantService.test.ts | 40+ | 80% | NEW | ✅ NEW |
| DeduplicationService | DeduplicationService.test.ts | 45+ | 85% | NEW | ✅ NEW |
| SearchService | SearchService.enhanced.test.ts | 35+ | 75% | ~20% | ✅ ENHANCED |
| GraphTraversalService | GraphTraversalService.enhanced.test.ts | 40+ | 80% | ~15% | ✅ ENHANCED |
| **TOTAL** | **5 files** | **195+** | **80%** | **~10%** | **→ 75%+** |

---

## Test Data Strategy

### Fixtures & Mocks
- **Small datasets**: 1-10 items for happy path
- **Medium datasets**: 50-100 items for pagination
- **Large datasets**: 1000+ items for performance
- **Edge cases**: Empty, null, malformed, very large

### Graph Test Data
```typescript
const nodes = [
  { id: 'node-1', title: 'Root', weight: 0.95 },
  { id: 'node-2', title: 'Child', weight: 0.85 },
];

const edges = [
  { id: 'edge-1', source: 'node-1', target: 'node-2', weight: 0.9 },
];
```

---

## CI/CD Integration

### Pre-commit Checks
- All tests must pass
- Coverage must meet thresholds
- No console.error logs
- No skipped tests (x.it, x.describe)

### GitHub Actions / CI Pipeline
```yaml
- Run: npm test -- --coverage
- Fail if coverage < 80%
- Generate coverage report
- Upload to coverage service
```

---

## Known Limitations & Future Work

### Current Limitations
1. **Integration Tests**: Limited database integration (using mocks)
2. **E2E Tests**: Not included in this phase
3. **Performance Tests**: Load/stress testing deferred
4. **Real Ollama**: Tests mock Ollama API

### Future Enhancements
1. **Test Database**: Integration tests with real PostgreSQL
2. **E2E Tests**: Full workflow testing with real services
3. **Performance Testing**: Load testing with k6 or Artillery
4. **Contract Testing**: GraphQL schema validation
5. **Mutation Testing**: Test quality verification

---

## Test Maintenance & Updates

### Adding New Tests
1. Follow existing AAA pattern
2. Add to appropriate describe block
3. Name clearly: `should [action] when [condition]`
4. Mock external dependencies
5. Test happy path + error cases
6. Update coverage metrics

### Updating Existing Tests
1. Run full test suite before changes
2. Update mocks if service contract changes
3. Add new tests for new functionality
4. Maintain backward compatibility
5. Update this document if patterns change

---

## Code Review Checklist

- [ ] Tests are isolated (no test interdependencies)
- [ ] Mocks are properly configured
- [ ] Both happy path and error cases covered
- [ ] Edge cases tested (null, empty, large)
- [ ] Test names clearly describe behavior
- [ ] No hardcoded values (use constants)
- [ ] Coverage meets 80% threshold
- [ ] No console.log or debugger statements
- [ ] Database calls are parameterized
- [ ] Async operations properly awaited

---

## References

### Test Files Created
1. `/backend/src/__tests__/EmbeddingService.test.ts`
2. `/backend/src/__tests__/AIAssistantService.test.ts`
3. `/backend/src/__tests__/DeduplicationService.test.ts`
4. `/backend/src/__tests__/SearchService.enhanced.test.ts`
5. `/backend/src/__tests__/GraphTraversalService.enhanced.test.ts`

### Configuration Files
- `jest.config.js` - Jest configuration
- `setup.ts` - Test environment setup
- `.env.test` - Test environment variables

### Documentation
- `README.md` - Quick start
- `CLAUDE.md` - Architecture decisions
- `TEST_STRATEGY.md` - This file

---

## Contact & Questions

For questions about the test strategy, refer to:
- Service implementation files
- Existing test patterns
- CLAUDE.md project guidelines
- Jest documentation: https://jestjs.io/docs/getting-started

---

**Last Updated**: 2025-11-23
**Coverage Target**: 80% minimum
**Status**: Ready for execution
