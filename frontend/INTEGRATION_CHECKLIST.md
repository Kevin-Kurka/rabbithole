# MethodologySelector Integration Checklist

Use this checklist to ensure proper integration of the MethodologySelector component.

## Prerequisites

### ✅ Completed (Already Done)
- [x] Component created at `/src/components/MethodologySelector.tsx`
- [x] Type definitions at `/src/types/methodology.ts`
- [x] GraphQL queries at `/src/graphql/queries/methodologies.ts`
- [x] Mock data at `/src/mocks/methodologies.ts`
- [x] Documentation created (README, integration guide)
- [x] Storybook stories created
- [x] Theme integration verified

### ⏳ Pending (To Be Done)

#### Backend Setup
- [ ] Create `methodologies` table in database
- [ ] Implement GraphQL schema for methodologies
- [ ] Create GraphQL resolvers
- [ ] Seed database with initial methodologies
- [ ] Update Graph model to include methodology field
- [ ] Test GraphQL queries in playground

#### Frontend Integration
- [ ] Fix CommandMenu.tsx compilation issues
- [ ] Import MethodologySelector into CommandMenu
- [ ] Add state management for multi-step flow
- [ ] Implement methodology selection handler
- [ ] Update graph creation mutation
- [ ] Test complete flow

#### Testing
- [ ] Write unit tests
- [ ] Create integration tests
- [ ] Test with Storybook
- [ ] E2E tests for graph creation
- [ ] Test responsive layouts
- [ ] Test accessibility

## Backend Setup Checklist

### Step 1: Database Schema

```sql
-- [ ] Run this SQL migration

CREATE TABLE methodologies (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  steps JSON,
  benefits JSON,
  examples JSON,
  is_default BOOLEAN DEFAULT false,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_is_default (is_default)
);

-- [ ] Update graphs table
ALTER TABLE graphs
ADD COLUMN methodology VARCHAR(255),
ADD CONSTRAINT fk_methodology
  FOREIGN KEY (methodology)
  REFERENCES methodologies(id);
```

**Verification**:
- [ ] Tables created successfully
- [ ] Foreign key constraint works
- [ ] Indexes created

### Step 2: GraphQL Schema

```graphql
# [ ] Add to schema.graphql

type Methodology {
  id: ID!
  name: String!
  description: String!
  category: String
  steps: [String!]
  benefits: [String!]
  examples: [String!]
  isDefault: Boolean
  createdBy: User
  createdAt: String
  updatedAt: String
}

extend type Query {
  methodologies: [Methodology!]!
  methodology(id: ID!): Methodology
  methodologiesByCategory(category: String!): [Methodology!]!
  searchMethodologies(query: String!): [Methodology!]!
}

extend type Mutation {
  createMethodology(input: MethodologyInput!): Methodology!
  updateMethodology(id: ID!, input: MethodologyInput!): Methodology!
  deleteMethodology(id: ID!): DeleteResult!
}

input MethodologyInput {
  name: String!
  description: String!
  category: String
  steps: [String!]
  benefits: [String!]
  examples: [String!]
}

# [ ] Update GraphInput
input GraphInput {
  name: String!
  description: String
  methodology: String  # Add this field
  level: Int!
  privacy: String
}
```

**Verification**:
- [ ] Schema compiles without errors
- [ ] Types properly defined
- [ ] Input validation works

### Step 3: Resolvers

```typescript
// [ ] Create resolvers/methodology.ts

import { Methodology } from '../models';

export const methodologyResolvers = {
  Query: {
    methodologies: async () => {
      return await Methodology.findAll({
        order: [['isDefault', 'DESC'], ['name', 'ASC']]
      });
    },

    methodology: async (_: any, { id }: { id: string }) => {
      return await Methodology.findByPk(id);
    },

    methodologiesByCategory: async (_: any, { category }: { category: string }) => {
      return await Methodology.findAll({
        where: { category },
        order: [['name', 'ASC']]
      });
    },

    searchMethodologies: async (_: any, { query }: { query: string }) => {
      return await Methodology.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${query}%` } },
            { description: { [Op.like]: `%${query}%` } },
            { category: { [Op.like]: `%${query}%` } }
          ]
        }
      });
    }
  },

  Mutation: {
    createMethodology: async (_: any, { input }: any, context: any) => {
      // Verify user is authenticated
      if (!context.user) throw new Error('Unauthorized');

      return await Methodology.create({
        ...input,
        createdBy: context.user.id
      });
    },

    updateMethodology: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');

      const methodology = await Methodology.findByPk(id);
      if (!methodology) throw new Error('Methodology not found');

      return await methodology.update(input);
    },

    deleteMethodology: async (_: any, { id }: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');

      await Methodology.destroy({ where: { id } });
      return { success: true, message: 'Methodology deleted' };
    }
  }
};
```

**Verification**:
- [ ] Resolvers implement all schema fields
- [ ] Authentication checks in place
- [ ] Error handling implemented

### Step 4: Seed Data

```typescript
// [ ] Create seeds/methodologies.ts

import { mockMethodologies } from '../../frontend/src/mocks/methodologies';

export const seedMethodologies = async () => {
  for (const methodology of mockMethodologies) {
    await Methodology.findOrCreate({
      where: { id: methodology.id },
      defaults: methodology
    });
  }
  console.log('Methodologies seeded successfully');
};
```

**Verification**:
- [ ] Run seed script
- [ ] Verify data in database
- [ ] Test queries return data

### Step 5: Backend Testing

```bash
# [ ] Test GraphQL queries

# Test in GraphQL Playground:

query {
  methodologies {
    id
    name
    description
    category
  }
}

query {
  methodology(id: "zettelkasten") {
    name
    steps
    benefits
  }
}
```

**Verification**:
- [ ] All queries work
- [ ] Data structure matches frontend expectations
- [ ] Performance is acceptable

## Frontend Integration Checklist

### Step 1: CommandMenu State Management

```typescript
// [ ] Add to CommandMenu.tsx

// State for multi-step flow
const [graphCreationStep, setGraphCreationStep] = useState<
  'initial' | 'methodology' | 'details'
>('initial');

// State for selected methodology
const [selectedMethodology, setSelectedMethodology] = useState<string | null>(null);
```

**Verification**:
- [ ] State types are correct
- [ ] Initial values set properly
- [ ] State updates trigger re-renders

### Step 2: Import Component

```typescript
// [ ] Add import to CommandMenu.tsx

import MethodologySelector from './MethodologySelector';
```

**Verification**:
- [ ] No import errors
- [ ] Component available in scope

### Step 3: Update New Graph Button

```typescript
// [ ] Replace button onClick handler

// Old:
onClick={() => setShowNewGraphForm(true)}

// New:
onClick={() => setGraphCreationStep('methodology')}
```

**Verification**:
- [ ] Button click works
- [ ] Step transitions correctly

### Step 4: Add Methodology Selection Step

```typescript
// [ ] Add to CommandMenu render

{graphCreationStep === 'methodology' && (
  <div className="mb-4">
    <MethodologySelector
      onSelect={(methodologyId) => {
        if (methodologyId === null) {
          // TODO: Open custom methodology builder
          alert('Custom methodology builder not yet implemented');
        } else {
          setSelectedMethodology(methodologyId);
          setGraphCreationStep('details');
        }
      }}
      onCancel={() => {
        setGraphCreationStep('initial');
        setSelectedMethodology(null);
      }}
      selectedMethodology={selectedMethodology}
    />
  </div>
)}
```

**Verification**:
- [ ] Component renders
- [ ] Selection works
- [ ] Cancel works
- [ ] Flow proceeds to details

### Step 5: Add Graph Details Step

```typescript
// [ ] Update details step

{graphCreationStep === 'details' && (
  <div className="mb-4 space-y-3">
    {/* Back button */}
    <button
      onClick={() => setGraphCreationStep('methodology')}
      className="text-sm"
    >
      ← Back to Methodology
    </button>

    {/* Name input */}
    <input
      type="text"
      placeholder="Graph name"
      value={newGraphName}
      onChange={(e) => setNewGraphName(e.target.value)}
      // ... existing styles
    />

    {/* Description input */}
    <input
      type="text"
      placeholder="Description"
      value={newGraphDescription}
      onChange={(e) => setNewGraphDescription(e.target.value)}
      // ... existing styles
    />

    {/* Create button */}
    <div className="flex gap-2">
      <button onClick={handleCreateGraph}>
        Create Graph
      </button>
    </div>
  </div>
)}
```

**Verification**:
- [ ] All inputs work
- [ ] Back button works
- [ ] Create button works

### Step 6: Update Graph Creation Mutation

```typescript
// [ ] Update handleCreateGraph function

const handleCreateGraph = async () => {
  if (!newGraphName.trim()) return;

  try {
    await createGraph({
      variables: {
        input: {
          name: newGraphName,
          description: newGraphDescription,
          methodology: selectedMethodology,
          level: 1, // Level 1 requires methodology
        }
      }
    });

    // Reset all state
    setGraphCreationStep('initial');
    setShowNewGraphForm(false);
    setNewGraphName('');
    setNewGraphDescription('');
    setSelectedMethodology(null);
  } catch (error) {
    console.error('Failed to create graph:', error);
    // TODO: Show error message to user
  }
};
```

**Verification**:
- [ ] Mutation includes methodology
- [ ] Success resets all state
- [ ] Errors handled gracefully

### Step 7: Update CREATE_GRAPH_MUTATION

```typescript
// [ ] Update mutation definition

const CREATE_GRAPH_MUTATION = gql`
  mutation CreateGraph($input: GraphInput!) {
    createGraph(input: $input) {
      id
      name
      methodology  # Add this field
      level
      description
    }
  }
`;
```

**Verification**:
- [ ] Mutation includes methodology field
- [ ] No GraphQL errors

## Testing Checklist

### Unit Tests

```typescript
// [ ] Create MethodologySelector.test.tsx

describe('MethodologySelector', () => {
  test('renders without crashing', () => {
    // [ ] Implement
  });

  test('displays methodologies from query', () => {
    // [ ] Implement
  });

  test('calls onSelect when methodology clicked', () => {
    // [ ] Implement
  });

  test('opens details modal on Learn More', () => {
    // [ ] Implement
  });

  test('calls onCancel when cancelled', () => {
    // [ ] Implement
  });

  test('handles custom methodology selection', () => {
    // [ ] Implement
  });
});
```

**Verification**:
- [ ] All tests pass
- [ ] Coverage >80%
- [ ] Edge cases covered

### Integration Tests

```typescript
// [ ] Create CommandMenu.integration.test.tsx

describe('CommandMenu with MethodologySelector', () => {
  test('complete graph creation flow', () => {
    // [ ] Click New Graph
    // [ ] Select methodology
    // [ ] Enter graph details
    // [ ] Submit
    // [ ] Verify graph created
  });

  test('cancel from methodology selection', () => {
    // [ ] Implement
  });

  test('back button from details', () => {
    // [ ] Implement
  });
});
```

**Verification**:
- [ ] Flow tests pass
- [ ] State management works
- [ ] Navigation works

### Storybook Testing

```bash
# [ ] Run Storybook

npm run storybook

# [ ] Test all stories:
# - Default
# - Loading
# - Error
# - Empty
# - With Selection
# - Mobile
# - Tablet
```

**Verification**:
- [ ] All stories render
- [ ] Interactive elements work
- [ ] Responsive layouts correct

### E2E Tests

```typescript
// [ ] Create graph-creation.e2e.ts

describe('Graph Creation with Methodology', () => {
  it('creates graph with selected methodology', () => {
    cy.visit('/');
    cy.get('[data-testid="new-graph-btn"]').click();
    cy.get('[data-testid="methodology-card"]').first().click();
    cy.get('[data-testid="continue-btn"]').click();
    cy.get('input[placeholder="Graph name"]').type('Test Graph');
    cy.get('button').contains('Create Graph').click();
    cy.contains('Test Graph').should('be.visible');
  });
});
```

**Verification**:
- [ ] E2E test passes
- [ ] Real flow works end-to-end

## Accessibility Testing

- [ ] Keyboard navigation works
  - [ ] Tab through cards
  - [ ] Enter to select
  - [ ] ESC closes modal
- [ ] Screen reader support
  - [ ] Cards have proper labels
  - [ ] Buttons have descriptions
- [ ] Color contrast
  - [ ] All text meets WCAG AA
  - [ ] Focus indicators visible
- [ ] ARIA attributes
  - [ ] Modal has role="dialog"
  - [ ] Buttons have aria-label

## Performance Testing

- [ ] Lighthouse score >90
- [ ] Bundle size <20KB
- [ ] Render time <100ms
- [ ] Query response <200ms
- [ ] No memory leaks

## Browser Testing

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari
- [ ] Mobile Chrome

## Documentation Updates

- [ ] Update main README
- [ ] Add methodology section to docs
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Add troubleshooting guide

## Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Performance verified

### Deployment
- [ ] Run database migrations
- [ ] Seed methodologies
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify GraphQL endpoint

### Post-deployment
- [ ] Test in production
- [ ] Monitor for errors
- [ ] Verify analytics
- [ ] Check performance

## Rollback Plan

If issues occur:
- [ ] Database rollback script ready
- [ ] Previous version deployable
- [ ] Communication plan for users
- [ ] Monitoring alerts configured

## Success Criteria

The integration is successful when:

- ✅ Users can create graphs with methodologies
- ✅ All methodologies display correctly
- ✅ Details modal works
- ✅ Custom methodology option available
- ✅ No console errors
- ✅ Performance meets targets
- ✅ Accessibility standards met
- ✅ All tests passing

## Timeline Estimate

- **Backend Setup**: 4-6 hours
- **Frontend Integration**: 2-3 hours
- **Testing**: 3-4 hours
- **Documentation**: 1-2 hours
- **Total**: 10-15 hours

## Resources

- Component: `/src/components/MethodologySelector.tsx`
- Types: `/src/types/methodology.ts`
- Queries: `/src/graphql/queries/methodologies.ts`
- Mocks: `/src/mocks/methodologies.ts`
- README: `/src/components/MethodologySelector.README.md`
- Integration Guide: `/src/components/MethodologySelector.integration.md`

## Support

For issues during integration:
1. Check documentation first
2. Review Storybook examples
3. Test with mock data
4. Check console for errors
5. Review GraphQL queries

---

**Status**: Ready for integration
**Last Updated**: 2025-10-09
**Version**: 1.0.0
