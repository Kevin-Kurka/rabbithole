# Level 0 vs Level 1 Graph System Integration Tests

## Overview

This test suite provides comprehensive integration testing for the Level 0 (immutable) vs Level 1 (editable) graph system. It ensures that immutability constraints are properly enforced at the graph, node, and edge levels.

## Test Architecture

### Test Framework
- **Testing Library**: Jest with TypeScript support
- **Mocking Strategy**: Mock database pool and PubSub engine
- **Test Database**: Uses mock database (no actual database required)

### Test Coverage

The test suite covers **29 test scenarios** across 5 categories:

#### 1. Graph Level Enforcement (6 tests)
- ✅ Creating Level 0 graphs (level=0)
- ✅ Creating Level 1 graphs (level=1, default)
- ✅ Rejecting updates to Level 0 graphs
- ✅ Allowing updates to Level 1 graphs
- ✅ Rejecting deletion of Level 0 graphs
- ✅ Allowing deletion of Level 1 graphs

#### 2. Node Enforcement (8 tests)
- ✅ Rejecting node creation in Level 0 graphs
- ✅ Allowing node creation in Level 1 graphs
- ✅ Rejecting updates to Level 0 nodes (weight and props)
- ✅ Allowing updates to Level 1 nodes (weight and props)
- ✅ Rejecting deletion of Level 0 nodes
- ✅ Allowing deletion of Level 1 nodes

#### 3. Edge Enforcement (8 tests)
- ✅ Rejecting edge creation in Level 0 graphs
- ✅ Allowing edge creation in Level 1 graphs
- ✅ Rejecting updates to Level 0 edges (weight and props)
- ✅ Allowing updates to Level 1 edges (weight and props)
- ✅ Rejecting deletion of Level 0 edges
- ✅ Allowing deletion of Level 1 edges

#### 4. Complex Scenarios (3 tests)
- ✅ Preventing cascading modifications from Level 1 to Level 0 nodes
- ✅ Allowing queries across Level 0 and Level 1 graphs
- ✅ Maintaining referential integrity when deleting graphs

#### 5. Edge Cases and Error Handling (4 tests)
- ✅ Handling non-existent graphs gracefully
- ✅ Handling database errors gracefully
- ✅ Validating Level 0 flag consistency
- ✅ Handling empty props gracefully

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install
```

### Run All Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

### Test Output

```
PASS src/__tests__/level0-system.test.ts
  Level 0 vs Level 1 Graph System Integration Tests
    1. Graph Level Enforcement
      ✓ should create a Level 0 graph with level=0
      ✓ should create a Level 1 graph with level=1 (default)
      ...

Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        1.216 s
```

## Test Configuration

### Test Environment

Tests use a separate test database configuration to prevent data loss:

```bash
# Create .env.test file
cp .env.test.example .env.test

# Configure test database
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/rabbithole_test_db
# Or use in-memory SQLite
TEST_DATABASE_URL=sqlite::memory:
```

### Jest Configuration

Configuration is defined in `/Users/kmk/rabbithole/backend/jest.config.js`:

```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

## Test Design Patterns

### AAA Pattern (Arrange, Act, Assert)

All tests follow the AAA pattern:

```typescript
it('should reject updates to Level 0 graphs', async () => {
  // Arrange: Set up mock data
  mockPool.query.mockResolvedValueOnce(mockQuery([{ level: 0 }]));

  // Act: Perform the operation
  await expect(
    graphResolver.updateGraph(level0GraphId, { name: 'Updated' }, { pool: mockPool })

  // Assert: Verify the result
  ).rejects.toThrow('Cannot modify Level 0 (immutable) graphs');
});
```

### Test Isolation

- Each test is independent and doesn't affect others
- Mocks are cleared after each test using `jest.clearAllMocks()`
- No shared state between tests

### Mock Strategy

The test suite uses Jest mocks for:

1. **Database Pool**: Mock `pg.Pool` to avoid actual database calls
2. **PubSub Engine**: Mock GraphQL subscriptions
3. **Query Results**: Helper function `mockQuery()` to create consistent query results

Example:

```typescript
const mockQuery = <T extends QueryResultRow = any>(
  rows: T[] = [],
  command = 'SELECT'
): QueryResult<T> => ({
  rows,
  command,
  rowCount: rows.length,
  oid: 0,
  fields: [],
});
```

## Coverage Goals

Target: **80% coverage** for:
- Statements
- Branches
- Functions
- Lines

Current coverage for GraphResolver:
- **Statements**: 74.17%
- **Branches**: 72.82%
- **Functions**: 41.93%
- **Lines**: 75.14%

## Test Data

The test suite uses consistent test data IDs:

```typescript
const level0GraphId = 'level0-graph-id';
const level1GraphId = 'level1-graph-id';
const level0NodeId = 'level0-node-id';
const level1NodeId = 'level1-node-id';
const level0EdgeId = 'level0-edge-id';
const level1EdgeId = 'level1-edge-id';
```

## Debugging Tests

### Run a specific test file

```bash
npm test level0-system.test.ts
```

### Run a specific test

```bash
npm test -- -t "should reject updates to Level 0 graphs"
```

### Enable debug logging

```bash
DEBUG=* npm test
```

### View detailed error messages

```bash
npm run test:verbose
```

## Adding New Tests

When adding new tests:

1. Follow the AAA pattern (Arrange, Act, Assert)
2. Use descriptive test names that explain the expected behavior
3. Mock external dependencies (database, PubSub)
4. Test both success and failure scenarios
5. Include edge cases and error handling
6. Ensure tests are isolated and independent

Example template:

```typescript
describe('New Feature', () => {
  it('should do something when conditions are met', async () => {
    // Arrange
    const input = { /* test data */ };
    mockPool.query.mockResolvedValueOnce(mockQuery([/* mock result */]));

    // Act
    const result = await resolver.newMethod(input, { pool: mockPool });

    // Assert
    expect(result).toMatchObject({ /* expected result */ });
  });

  it('should throw error when conditions are not met', async () => {
    // Arrange
    mockPool.query.mockResolvedValueOnce(mockQuery([/* mock result */]));

    // Act & Assert
    await expect(
      resolver.newMethod(input, { pool: mockPool })
    ).rejects.toThrow('Expected error message');
  });
});
```

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm test
  env:
    NODE_ENV: test
    TEST_DATABASE_URL: postgresql://test:test@localhost:5432/test_db

- name: Generate Coverage Report
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Security Considerations

- Tests use mock database to prevent accidental data modifications
- No real credentials or sensitive data in test files
- Test database URL validation prevents production database usage
- All test data is temporary and cleared after tests

## Troubleshooting

### Tests fail with "Reflect.getMetadata is not a function"

**Solution**: Ensure `reflect-metadata` is imported in setup.ts:

```typescript
import 'reflect-metadata';
```

### Tests fail with "DATABASE_URL not configured"

**Solution**: This is expected for mock tests. The warning can be ignored or you can create `.env.test` with a test database URL.

### TypeScript errors in test files

**Solution**: Ensure all types are properly imported:

```typescript
import { Pool, QueryResult, QueryResultRow } from 'pg';
```

## References

- [Jest Documentation](https://jestjs.io/)
- [TypeScript Testing](https://jestjs.io/docs/getting-started#via-ts-jest)
- [GraphQL Testing Best Practices](https://www.apollographql.com/docs/apollo-server/testing/testing/)

## Maintainers

This test suite is maintained as part of the RabbitHole backend project. For questions or issues, please open a GitHub issue or contact the development team.
