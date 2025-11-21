/**
 * GraphCanvas Storybook Stories
 *
 * Interactive documentation and testing for the GraphCanvas component.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MockedProvider } from '@apollo/client/testing';
import GraphCanvas from './graph-canvas';
import { GraphLevel } from '@/types/graph';
import { GRAPH_QUERY } from '@/graphql/queries/graphs';

const meta: Meta<typeof GraphCanvas> = {
  title: 'Components/GraphCanvas',
  component: GraphCanvas,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
GraphCanvas is the main component for visualizing and editing knowledge graphs.
It supports Level 0 (verified, read-only) and Level 1 (editable) nodes and edges
with visual veracity score indicators.

## Features
- Visual veracity score color coding
- Level 0/1 distinction with lock icons
- Context menu for operations
- Undo/redo support
- Copy/paste functionality
- Real-time updates via GraphQL subscriptions
- Minimap and controls
- Keyboard shortcuts
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    graphId: {
      control: 'text',
      description: 'Unique identifier for the graph',
    },
    readOnly: {
      control: 'boolean',
      description: 'Disable all editing operations',
    },
    showMinimap: {
      control: 'boolean',
      description: 'Show/hide the minimap',
    },
    showControls: {
      control: 'boolean',
      description: 'Show/hide zoom controls',
    },
    showBackground: {
      control: 'boolean',
      description: 'Show/hide grid background',
    },
    methodologyId: {
      control: 'text',
      description: 'Associated methodology ID',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GraphCanvas>;

// Mock data
const mockGraphData = {
  graph: {
    id: 'story-graph-1',
    name: 'Example Graph',
    description: 'A sample graph for Storybook',
    nodes: [
      {
        id: 'node-1',
        weight: 1.0,
        level: GraphLevel.LEVEL_0,
        props: JSON.stringify({
          label: 'Verified Node',
          x: 250,
          y: 100,
        }),
      },
      {
        id: 'node-2',
        weight: 0.9,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({
          label: 'High Confidence',
          x: 100,
          y: 250,
        }),
      },
      {
        id: 'node-3',
        weight: 0.6,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({
          label: 'Medium Confidence',
          x: 400,
          y: 250,
        }),
      },
      {
        id: 'node-4',
        weight: 0.3,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({
          label: 'Low Confidence',
          x: 250,
          y: 400,
        }),
      },
      {
        id: 'node-5',
        weight: 0.05,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({
          label: 'Provisional',
          x: 550,
          y: 400,
        }),
      },
    ],
    edges: [
      {
        id: 'edge-1-2',
        from: { id: 'node-1' },
        to: { id: 'node-2' },
        weight: 0.95,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({ label: 'Strong connection' }),
      },
      {
        id: 'edge-1-3',
        from: { id: 'node-1' },
        to: { id: 'node-3' },
        weight: 0.7,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({ label: '' }),
      },
      {
        id: 'edge-2-4',
        from: { id: 'node-2' },
        to: { id: 'node-4' },
        weight: 0.5,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({ label: '' }),
      },
      {
        id: 'edge-3-4',
        from: { id: 'node-3' },
        to: { id: 'node-4' },
        weight: 0.4,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({ label: '' }),
      },
      {
        id: 'edge-4-5',
        from: { id: 'node-4' },
        to: { id: 'node-5' },
        weight: 0.2,
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({ label: 'Weak link' }),
      },
    ],
  },
};

const mocks = [
  {
    request: {
      query: GRAPH_QUERY,
      variables: { id: 'story-graph-1' },
    },
    result: {
      data: mockGraphData,
    },
  },
];

/**
 * Default graph canvas with all features enabled
 */
export const Default: Story = {
  args: {
    graphId: 'story-graph-1',
    showMinimap: true,
    showControls: true,
    showBackground: true,
  },
  render: (args) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      <GraphCanvas {...args} />
    </MockedProvider>
  ),
};

/**
 * Read-only graph (no editing allowed)
 */
export const ReadOnly: Story = {
  args: {
    graphId: 'story-graph-1',
    readOnly: true,
    showMinimap: true,
    showControls: true,
    showBackground: true,
  },
  render: (args) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      <GraphCanvas {...args} />
    </MockedProvider>
  ),
};

/**
 * Minimal graph (no minimap or controls)
 */
export const Minimal: Story = {
  args: {
    graphId: 'story-graph-1',
    showMinimap: false,
    showControls: false,
    showBackground: true,
  },
  render: (args) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      <GraphCanvas {...args} />
    </MockedProvider>
  ),
};

/**
 * Empty graph
 */
export const Empty: Story = {
  args: {
    graphId: 'empty-graph',
    showMinimap: true,
    showControls: true,
    showBackground: true,
  },
  render: (args) => {
    const emptyMocks = [
      {
        request: {
          query: GRAPH_QUERY,
          variables: { id: 'empty-graph' },
        },
        result: {
          data: {
            graph: {
              id: 'empty-graph',
              name: 'Empty Graph',
              nodes: [],
              edges: [],
            },
          },
        },
      },
    ];

    return (
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <GraphCanvas {...args} />
      </MockedProvider>
    );
  },
};

/**
 * Graph with methodology
 */
export const WithMethodology: Story = {
  args: {
    graphId: 'story-graph-1',
    methodologyId: 'zettelkasten',
    showMinimap: true,
    showControls: true,
    showBackground: true,
  },
  render: (args) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      <GraphCanvas {...args} />
    </MockedProvider>
  ),
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    graphId: 'loading-graph',
    showMinimap: true,
    showControls: true,
    showBackground: true,
  },
  render: (args) => {
    // Mock with delay to show loading state
    const loadingMocks = [
      {
        request: {
          query: GRAPH_QUERY,
          variables: { id: 'loading-graph' },
        },
        result: {
          data: mockGraphData,
        },
        delay: 3000, // 3 second delay
      },
    ];

    return (
      <MockedProvider mocks={loadingMocks} addTypename={false}>
        <GraphCanvas {...args} />
      </MockedProvider>
    );
  },
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    graphId: 'error-graph',
    showMinimap: true,
    showControls: true,
    showBackground: true,
  },
  render: (args) => {
    const errorMocks = [
      {
        request: {
          query: GRAPH_QUERY,
          variables: { id: 'error-graph' },
        },
        error: new Error('Failed to load graph data'),
      },
    ];

    return (
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <GraphCanvas {...args} />
      </MockedProvider>
    );
  },
};

/**
 * Large graph (performance test)
 */
export const LargeGraph: Story = {
  args: {
    graphId: 'large-graph',
    showMinimap: true,
    showControls: true,
    showBackground: true,
  },
  render: (args) => {
    // Generate large graph data
    const nodes = Array.from({ length: 50 }, (_, i) => ({
      id: `node-${i}`,
      weight: Math.random(),
      level: Math.random() > 0.3 ? GraphLevel.LEVEL_1 : GraphLevel.LEVEL_0,
      props: JSON.stringify({
        label: `Node ${i}`,
        x: Math.random() * 1000,
        y: Math.random() * 1000,
      }),
    }));

    const edges = Array.from({ length: 75 }, (_, i) => {
      const source = Math.floor(Math.random() * 50);
      const target = Math.floor(Math.random() * 50);
      return {
        id: `edge-${i}`,
        from: { id: `node-${source}` },
        to: { id: `node-${target}` },
        weight: Math.random(),
        level: GraphLevel.LEVEL_1,
        props: JSON.stringify({ label: '' }),
      };
    });

    const largeMocks = [
      {
        request: {
          query: GRAPH_QUERY,
          variables: { id: 'large-graph' },
        },
        result: {
          data: {
            graph: {
              id: 'large-graph',
              name: 'Large Graph',
              nodes,
              edges,
            },
          },
        },
      },
    ];

    return (
      <MockedProvider mocks={largeMocks} addTypename={false}>
        <GraphCanvas {...args} />
      </MockedProvider>
    );
  },
};
