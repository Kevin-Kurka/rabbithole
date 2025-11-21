/**
 * Storybook Stories for MethodologySelector
 *
 * Visual testing and development environment for the MethodologySelector component.
 * Run with: npm run storybook
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MockedProvider } from '@apollo/client/testing';
import { action } from '@storybook/addon-actions';
import MethodologySelector from './methodology-selector';
import { METHODOLOGIES_QUERY } from '@/graphql/queries/methodologies';
import { mockMethodologies } from '@/mocks/methodologies';

const meta = {
  title: 'Components/MethodologySelector',
  component: MethodologySelector,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A component for selecting knowledge organization methodologies when creating graphs.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSelect: {
      description: 'Callback when methodology is selected',
      action: 'selected',
    },
    onCancel: {
      description: 'Callback when selection is cancelled',
      action: 'cancelled',
    },
    selectedMethodology: {
      description: 'Currently selected methodology ID',
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MethodologySelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock successful query
const successMocks = [
  {
    request: {
      query: METHODOLOGIES_QUERY,
    },
    result: {
      data: {
        methodologies: mockMethodologies,
      },
    },
  },
];

// Mock loading state
const loadingMocks = [
  {
    request: {
      query: METHODOLOGIES_QUERY,
    },
    result: {
      data: {
        methodologies: mockMethodologies,
      },
    },
    delay: 10000, // Simulate slow network
  },
];

// Mock error state
const errorMocks = [
  {
    request: {
      query: METHODOLOGIES_QUERY,
    },
    error: new Error('Failed to fetch methodologies'),
  },
];

// Mock empty state
const emptyMocks = [
  {
    request: {
      query: METHODOLOGIES_QUERY,
    },
    result: {
      data: {
        methodologies: [],
      },
    },
  },
];

// Mock few methodologies
const fewMethodologiesMocks = [
  {
    request: {
      query: METHODOLOGIES_QUERY,
    },
    result: {
      data: {
        methodologies: mockMethodologies.slice(0, 3),
      },
    },
  },
];

/**
 * Default state with all methodologies loaded
 */
export const Default: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
  },
  render: (args) => (
    <MockedProvider mocks={successMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};

/**
 * Loading state while fetching methodologies
 */
export const Loading: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
  },
  render: (args) => (
    <MockedProvider mocks={loadingMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};

/**
 * Error state when query fails
 */
export const Error: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
  },
  render: (args) => (
    <MockedProvider mocks={errorMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};

/**
 * Empty state with no methodologies
 */
export const Empty: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
  },
  render: (args) => (
    <MockedProvider mocks={emptyMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};

/**
 * With a methodology pre-selected
 */
export const WithSelection: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
    selectedMethodology: 'zettelkasten',
  },
  render: (args) => (
    <MockedProvider mocks={successMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};

/**
 * Few methodologies (for testing layout)
 */
export const FewMethodologies: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
  },
  render: (args) => (
    <MockedProvider mocks={fewMethodologiesMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};

/**
 * Mobile viewport
 */
export const Mobile: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: (args) => (
    <MockedProvider mocks={successMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};

/**
 * Tablet viewport
 */
export const Tablet: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
  render: (args) => (
    <MockedProvider mocks={successMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};

/**
 * Interactive playground
 */
export const Playground: Story = {
  args: {
    onSelect: action('onSelect'),
    onCancel: action('onCancel'),
    selectedMethodology: null,
  },
  render: (args) => (
    <MockedProvider mocks={successMocks} addTypename={false}>
      <MethodologySelector {...args} />
    </MockedProvider>
  ),
};
