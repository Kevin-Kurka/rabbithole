# MethodologySelector Component

A comprehensive React component for selecting knowledge organization methodologies during graph creation.

## Location

`/Users/kmk/rabbithole/frontend/src/components/MethodologySelector.tsx`

## Quick Start

```tsx
import MethodologySelector from '@/components/MethodologySelector';

function MyComponent() {
  const [selectedMethodology, setSelectedMethodology] = useState<string | null>(null);

  return (
    <MethodologySelector
      onSelect={(methodologyId) => {
        if (methodologyId === null) {
          // User wants to create custom methodology
          console.log('Open custom methodology builder');
        } else {
          setSelectedMethodology(methodologyId);
          console.log('Selected methodology:', methodologyId);
        }
      }}
      onCancel={() => {
        console.log('User cancelled selection');
      }}
      selectedMethodology={selectedMethodology}
    />
  );
}
```

## Features

### 1. Responsive Grid Layout
- **Mobile**: 1 column
- **Tablet**: 2 columns
- **Desktop**: 3+ columns

### 2. Methodology Cards
Each card displays:
- Icon (auto-selected based on methodology name/category)
- Methodology name
- Category badge
- Short description (3-line clamp)
- "Learn More" button
- Selection indicator

### 3. Details Modal
Shows comprehensive information:
- Full description
- Step-by-step guide
- Benefits list
- Use case examples
- "Select This Methodology" action button

### 4. Custom Methodology Option
- Dashed border card for visual distinction
- Opens methodology builder when selected
- Callback receives `null` as methodologyId

### 5. Theme Integration
- Uses zinc theme tokens from `/Users/kmk/rabbithole/frontend/src/styles/theme.ts`
- Consistent with CommandMenu.tsx styling
- Smooth hover and transition effects

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onSelect` | `(methodologyId: string \| null) => void` | Yes | - | Called when methodology is selected. `null` = custom |
| `onCancel` | `() => void` | Yes | - | Called when user cancels selection |
| `selectedMethodology` | `string \| null` | No | `undefined` | Currently selected methodology ID |

## Icons

The component automatically selects icons based on methodology name:

| Methodology Type | Icon |
|-----------------|------|
| Zettelkasten | BookOpen |
| Mind Map | Brain |
| Workflow | Workflow |
| Network | Network |
| Hierarchical | Layers |
| Branch/Tree | GitBranch |
| Default | Sparkles |

## GraphQL Integration

### Query Used

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

### Expected Response

```json
{
  "data": {
    "methodologies": [
      {
        "id": "zettelkasten",
        "name": "Zettelkasten",
        "description": "A personal knowledge management system...",
        "category": "Note-taking",
        "steps": ["Step 1", "Step 2"],
        "benefits": ["Benefit 1", "Benefit 2"],
        "examples": ["Example 1", "Example 2"],
        "isDefault": true
      }
    ]
  }
}
```

## State Management

The component manages internal state for:
- Details modal open/closed
- Selected methodology for details view
- Card hover states

External state (selected methodology) is controlled by parent:

```tsx
// Parent component
const [selectedMethodology, setSelectedMethodology] = useState<string | null>(null);

// Pass to MethodologySelector
<MethodologySelector
  selectedMethodology={selectedMethodology}
  onSelect={setSelectedMethodology}
  onCancel={() => setSelectedMethodology(null)}
/>
```

## Styling

All styling uses inline styles with theme tokens:

```tsx
style={{
  backgroundColor: theme.colors.bg.primary,
  borderColor: theme.colors.border.primary,
  borderRadius: theme.radius.md,
}}
```

### Key Colors

- **Background**: `theme.colors.bg.primary`, `theme.colors.bg.elevated`
- **Hover**: `theme.colors.bg.hover`
- **Text**: `theme.colors.text.primary`, `theme.colors.text.muted`, `theme.colors.text.tertiary`
- **Border**: `theme.colors.border.primary`, `theme.colors.border.secondary`
- **Overlay**: `theme.colors.overlay.backdrop`, `theme.colors.overlay.modal`

### Border Radius

- **Cards**: `theme.radius.md` (4px)
- **Buttons**: `theme.radius.sm` (2px)
- **Icons**: `theme.radius.sm` (2px)
- **Indicators**: `theme.radius.full` (9999px)

## Error Handling

### Loading State
```tsx
{loading && (
  <div>Loading methodologies...</div>
)}
```

### Error State
```tsx
{error && (
  <div>Failed to load methodologies. Using default options.</div>
)}
```

### Empty State
Gracefully handles empty methodology lists.

## Accessibility

- **Keyboard Navigation**: All buttons are keyboard accessible
- **Focus Management**: Modal traps focus, ESC to close
- **Semantic HTML**: Proper button elements and ARIA labels
- **Screen Readers**: Descriptive text for all interactive elements

## Performance

- **Lazy Modal Rendering**: Details modal only renders when open
- **Apollo Cache**: Query results cached by Apollo Client
- **Memoized Icons**: Icon components are imported once
- **Optimized Re-renders**: Only re-renders on state changes

## Integration Example

### Full CommandMenu.tsx Integration

```tsx
import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import MethodologySelector from './MethodologySelector';

const CREATE_GRAPH_MUTATION = gql`
  mutation CreateGraph($input: GraphInput!) {
    createGraph(input: $input) {
      id
      name
      methodology
    }
  }
`;

function CommandMenu() {
  const [step, setStep] = useState<'initial' | 'methodology' | 'details'>('initial');
  const [selectedMethodology, setSelectedMethodology] = useState<string | null>(null);
  const [graphName, setGraphName] = useState('');
  const [createGraph] = useMutation(CREATE_GRAPH_MUTATION);

  const handleMethodologySelect = (methodologyId: string | null) => {
    if (methodologyId === null) {
      // Open custom methodology builder
      alert('Custom methodology builder not yet implemented');
    } else {
      setSelectedMethodology(methodologyId);
      setStep('details');
    }
  };

  const handleCreateGraph = async () => {
    await createGraph({
      variables: {
        input: {
          name: graphName,
          methodology: selectedMethodology,
          level: 1,
        }
      }
    });
    // Reset state
    setStep('initial');
    setSelectedMethodology(null);
    setGraphName('');
  };

  return (
    <div>
      {step === 'methodology' && (
        <MethodologySelector
          onSelect={handleMethodologySelect}
          onCancel={() => setStep('initial')}
          selectedMethodology={selectedMethodology}
        />
      )}

      {step === 'details' && (
        <div>
          <input
            value={graphName}
            onChange={(e) => setGraphName(e.target.value)}
            placeholder="Graph name"
          />
          <button onClick={handleCreateGraph}>Create</button>
          <button onClick={() => setStep('methodology')}>Back</button>
        </div>
      )}
    </div>
  );
}
```

## Dependencies

- `react`: ^19.1.0
- `@apollo/client`: ^3.14.0
- `lucide-react`: ^0.545.0
- `graphql`: ^16.11.0

## Type Definitions

Located at `/Users/kmk/rabbithole/frontend/src/types/methodology.ts`:

```tsx
export interface Methodology {
  id: string;
  name: string;
  description: string;
  category?: string;
  steps?: string[];
  benefits?: string[];
  examples?: string[];
  isDefault?: boolean;
}
```

## GraphQL Queries

Centralized at `/Users/kmk/rabbithole/frontend/src/graphql/queries/methodologies.ts`:

- `METHODOLOGIES_QUERY`: Fetch all methodologies
- `METHODOLOGY_QUERY`: Fetch single methodology
- `CREATE_METHODOLOGY_MUTATION`: Create custom methodology
- And more...

## Testing

### Unit Test Example

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import MethodologySelector from './MethodologySelector';
import { METHODOLOGIES_QUERY } from '@/graphql/queries/methodologies';

const mockMethodologies = [
  {
    id: '1',
    name: 'Test Methodology',
    description: 'Test description',
    category: 'Test',
    steps: ['Step 1', 'Step 2'],
    benefits: ['Benefit 1'],
    examples: ['Example 1'],
    isDefault: true,
  },
];

const mocks = [
  {
    request: { query: METHODOLOGIES_QUERY },
    result: { data: { methodologies: mockMethodologies } },
  },
];

describe('MethodologySelector', () => {
  test('renders methodology cards', async () => {
    const onSelect = jest.fn();
    const onCancel = jest.fn();

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MethodologySelector onSelect={onSelect} onCancel={onCancel} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Methodology')).toBeInTheDocument();
    });
  });

  test('calls onSelect when methodology is clicked', async () => {
    const onSelect = jest.fn();
    const onCancel = jest.fn();

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MethodologySelector onSelect={onSelect} onCancel={onCancel} />
      </MockedProvider>
    );

    await waitFor(() => {
      const card = screen.getByText('Test Methodology');
      fireEvent.click(card.closest('button')!);
      expect(onSelect).toHaveBeenCalledWith('1');
    });
  });

  test('opens details modal on Learn More click', async () => {
    const onSelect = jest.fn();
    const onCancel = jest.fn();

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MethodologySelector onSelect={onSelect} onCancel={onCancel} />
      </MockedProvider>
    );

    await waitFor(() => {
      const learnMore = screen.getByText('Learn More');
      fireEvent.click(learnMore);
    });

    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Issue: Methodologies not loading

**Solution**:
1. Check GraphQL endpoint is running: `http://localhost:4000/graphql`
2. Test query in GraphQL playground
3. Check network tab for failed requests
4. Verify Apollo Client configuration

### Issue: Styles not applying

**Solution**:
1. Ensure theme import path is correct: `@/styles/theme`
2. Check Tailwind config includes component directory
3. Verify no CSS conflicts with global styles

### Issue: Icons not displaying

**Solution**:
1. Verify `lucide-react` is installed
2. Check icon imports at top of file
3. Ensure icon mapping function returns valid icon component

### Issue: Modal not closing

**Solution**:
1. Check ESC key handler is bound
2. Verify backdrop click handler is working
3. Check z-index conflicts with other modals

## Future Enhancements

1. **Search & Filter**: Add search input to filter methodologies
2. **Categories**: Group methodologies by category with tabs
3. **Favorites**: Star favorite methodologies
4. **Preview**: Show methodology in mini graph preview
5. **Recommendations**: AI-powered methodology suggestions
6. **Popularity Sorting**: Sort by popularity or usage
7. **Community Templates**: Browse shared methodologies
8. **Comparison View**: Compare multiple methodologies side-by-side

## Contributing

When extending this component:

1. **Follow Theme**: Always use theme tokens, never hardcoded colors
2. **Type Safety**: Use TypeScript types from `/types/methodology.ts`
3. **Accessibility**: Maintain keyboard navigation and ARIA labels
4. **Performance**: Profile before adding expensive operations
5. **Testing**: Add tests for new functionality
6. **Documentation**: Update this README with changes

## License

Part of the Rabbithole project.
