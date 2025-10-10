# MethodologySelector Integration Guide

## Overview

The `MethodologySelector` component provides a visual interface for users to choose a knowledge organization methodology when creating new Level 1 graphs.

## Component Location

`/Users/kmk/rabbithole/frontend/src/components/MethodologySelector.tsx`

## Features

- **Grid Layout**: Responsive 1-3 column layout (mobile to desktop)
- **Methodology Cards**: Visual cards with icons, names, and descriptions
- **Details Modal**: Expanded view showing steps, benefits, and use cases
- **Custom Option**: Allows users to create custom methodologies
- **Theme Consistency**: Uses zinc theme tokens matching CommandMenu.tsx
- **GraphQL Integration**: Fetches methodologies from backend
- **State Management**: Handles selection and navigation state

## Integration with CommandMenu.tsx

### Step 1: Import the Component

```typescript
import MethodologySelector from './MethodologySelector';
```

### Step 2: Add State Management

```typescript
const [showMethodologySelector, setShowMethodologySelector] = useState(false);
const [selectedMethodology, setSelectedMethodology] = useState<string | null>(null);
```

### Step 3: Modify New Graph Flow

Replace the current "New Graph" form with a multi-step flow:

```typescript
// In the component body
const [graphCreationStep, setGraphCreationStep] = useState<'initial' | 'methodology' | 'details'>('initial');

// When "New Graph" button is clicked
const handleNewGraph = () => {
  setGraphCreationStep('methodology');
};

// Handle methodology selection
const handleMethodologySelect = (methodologyId: string | null) => {
  setSelectedMethodology(methodologyId);
  if (methodologyId === null) {
    // Handle custom methodology flow
    // Navigate to methodology builder
  } else {
    // Continue to graph details
    setGraphCreationStep('details');
  }
};

// Handle methodology cancel
const handleMethodologyCancel = () => {
  setGraphCreationStep('initial');
  setSelectedMethodology(null);
};
```

### Step 4: Conditional Rendering

Replace the current form section with:

```typescript
{graphCreationStep === 'methodology' && (
  <div className="mb-4">
    <MethodologySelector
      onSelect={handleMethodologySelect}
      onCancel={handleMethodologyCancel}
      selectedMethodology={selectedMethodology}
    />
  </div>
)}

{graphCreationStep === 'details' && (
  <div className="mb-4 space-y-3">
    {/* Existing graph name and description inputs */}
    <input
      type="text"
      placeholder="Graph name"
      value={newGraphName}
      onChange={(e) => setNewGraphName(e.target.value)}
      // ... rest of the input props
    />
    <input
      type="text"
      placeholder="Description"
      value={newGraphDescription}
      onChange={(e) => setNewGraphDescription(e.target.value)}
      // ... rest of the input props
    />
    {/* Add buttons */}
    <div className="flex gap-2">
      <button onClick={handleCreateGraph}>
        Create Graph
      </button>
      <button onClick={() => setGraphCreationStep('methodology')}>
        Back
      </button>
    </div>
  </div>
)}
```

### Step 5: Update Graph Creation Mutation

Modify the `handleCreateGraph` function to include methodology:

```typescript
const handleCreateGraph = async () => {
  if (!newGraphName.trim()) return;

  try {
    await createGraph({
      variables: {
        input: {
          name: newGraphName,
          description: newGraphDescription,
          methodology: selectedMethodology,
          level: 1, // Level 1 graphs require methodology
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
  }
};
```

## GraphQL Schema Requirements

The component expects the following GraphQL query to be supported:

```graphql
query Methodologies {
  methodologies {
    id
    name
    description
    category
    steps
    benefits
    examples
    isDefault
  }
}
```

## Backend Setup

Ensure your GraphQL backend supports:

1. **Methodologies Query**: Returns list of available methodologies
2. **CreateGraph Mutation**: Accepts methodology field
3. **Default Methodologies**: Pre-populate with common methodologies (Zettelkasten, Mind Map, etc.)

### Example Methodologies Data

```json
[
  {
    "id": "zettelkasten",
    "name": "Zettelkasten",
    "description": "A personal knowledge management system using interconnected atomic notes",
    "category": "Note-taking",
    "steps": [
      "Create atomic notes with single ideas",
      "Add unique identifiers to each note",
      "Link related notes together",
      "Build index notes for navigation"
    ],
    "benefits": [
      "Encourages deep thinking",
      "Builds interconnected knowledge",
      "Easy retrieval of information"
    ],
    "examples": [
      "Research notes and academic writing",
      "Personal knowledge base",
      "Literature review organization"
    ],
    "isDefault": true
  },
  {
    "id": "mindmap",
    "name": "Mind Map",
    "description": "Visual diagram with central concept branching to related ideas",
    "category": "Visual Thinking",
    "steps": [
      "Start with central concept",
      "Add main branches for key themes",
      "Extend sub-branches for details",
      "Use colors and symbols for organization"
    ],
    "benefits": [
      "Visual and intuitive",
      "Quick brainstorming",
      "Shows relationships clearly"
    ],
    "examples": [
      "Project planning",
      "Brainstorming sessions",
      "Learning new concepts"
    ],
    "isDefault": true
  }
]
```

## Styling

The component uses the zinc theme from `/Users/kmk/rabbithole/frontend/src/styles/theme.ts`:

- **Background**: `theme.colors.bg.primary`, `theme.colors.bg.elevated`
- **Text**: `theme.colors.text.primary`, `theme.colors.text.muted`
- **Borders**: `theme.colors.border.primary`
- **Hover States**: `theme.colors.bg.hover`
- **Radius**: `theme.radius.md` for cards, `theme.radius.sm` for buttons

## Component Props

### MethodologySelector

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSelect` | `(methodologyId: string \| null) => void` | Yes | Callback when methodology is selected. `null` indicates custom methodology |
| `onCancel` | `() => void` | Yes | Callback when user cancels selection |
| `selectedMethodology` | `string \| null` | No | Currently selected methodology ID for controlled state |

## Custom Methodology Flow

When user selects "Custom Methodology" (by clicking the dashed card), the `onSelect` callback is called with `null`:

```typescript
const handleMethodologySelect = (methodologyId: string | null) => {
  if (methodologyId === null) {
    // Open methodology builder modal/page
    setShowMethodologyBuilder(true);
  } else {
    // Continue with selected methodology
    setSelectedMethodology(methodologyId);
    setGraphCreationStep('details');
  }
};
```

## Accessibility

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus States**: Visual focus indicators on all buttons
- **ARIA Labels**: Semantic HTML with proper button roles
- **Modal Management**: ESC key closes details modal

## Responsive Design

- **Mobile (< 640px)**: Single column grid
- **Tablet (640px - 1024px)**: Two column grid
- **Desktop (> 1024px)**: Three column grid

## Error Handling

The component handles:
- **Loading State**: Shows loading message while fetching
- **Error State**: Displays error message with fallback
- **Empty State**: Shows message if no methodologies available
- **Network Errors**: Graceful degradation with error UI

## Testing Considerations

When testing the integration:

1. **Query Mocking**: Mock the `METHODOLOGIES_QUERY` response
2. **Selection Flow**: Test methodology selection and cancellation
3. **Details Modal**: Test opening/closing details modal
4. **Custom Option**: Test custom methodology selection
5. **Responsive Layout**: Test on different screen sizes
6. **Theme Consistency**: Verify zinc theme colors are applied

## Example Test (Jest + React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import MethodologySelector from './MethodologySelector';
import { METHODOLOGIES_QUERY } from './MethodologySelector';

const mocks = [
  {
    request: {
      query: METHODOLOGIES_QUERY,
    },
    result: {
      data: {
        methodologies: [
          {
            id: 'test-1',
            name: 'Test Methodology',
            description: 'Test description',
            category: 'Test',
            steps: [],
            benefits: [],
            examples: [],
            isDefault: true,
          },
        ],
      },
    },
  },
];

test('renders methodology cards', async () => {
  const onSelect = jest.fn();
  const onCancel = jest.fn();

  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MethodologySelector onSelect={onSelect} onCancel={onCancel} />
    </MockedProvider>
  );

  // Wait for data to load
  const methodology = await screen.findByText('Test Methodology');
  expect(methodology).toBeInTheDocument();
});
```

## Performance Considerations

- **Lazy Loading**: Details modal content only renders when opened
- **Memoization**: Consider memoizing icon lookups for large methodology lists
- **Query Caching**: Apollo Client caches methodology query results
- **Optimistic UI**: Selection state updates immediately before mutation completes

## Future Enhancements

Potential improvements for future iterations:

1. **Search/Filter**: Add search bar to filter methodologies
2. **Categories**: Group methodologies by category
3. **Favorites**: Allow users to mark favorite methodologies
4. **Preview**: Show methodology preview in graph canvas
5. **Recommendations**: AI-powered methodology recommendations
6. **Templates**: Pre-built graph templates for each methodology
7. **Import/Export**: Share custom methodologies with community

## Support

For issues or questions:
- Check GraphQL query is working: Test in GraphQL playground
- Verify theme imports: Ensure `/Users/kmk/rabbithole/frontend/src/styles/theme.ts` exists
- Check console: Look for GraphQL or React errors
- Test in isolation: Render component in Storybook
