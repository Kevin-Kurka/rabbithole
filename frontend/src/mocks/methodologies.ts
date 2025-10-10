/**
 * Mock Methodology Data
 *
 * Sample methodologies for development and testing.
 * Use these when backend is unavailable or for unit tests.
 */

import type { Methodology } from '@/types/methodology';

export const mockMethodologies: Methodology[] = [
  {
    id: 'zettelkasten',
    name: 'Zettelkasten',
    description: 'A personal knowledge management system based on interconnected atomic notes. Each note contains a single idea with unique identifiers and links to related concepts.',
    category: 'Note-taking',
    steps: [
      'Create atomic notes with single, focused ideas',
      'Assign unique identifiers to each note',
      'Link related notes together using references',
      'Build index notes for topic navigation',
      'Review and expand connections regularly',
    ],
    benefits: [
      'Encourages deep, critical thinking about concepts',
      'Builds an interconnected web of knowledge',
      'Easy retrieval and discovery of related information',
      'Natural emergence of new insights through connections',
      'Long-term knowledge retention',
    ],
    examples: [
      'Research notes and academic writing projects',
      'Building a personal knowledge base',
      'Literature review organization',
      'PhD dissertation research',
      'Learning and studying complex topics',
    ],
    isDefault: true,
  },
  {
    id: 'mind-map',
    name: 'Mind Map',
    description: 'A visual diagram with a central concept that branches out to related ideas, sub-topics, and details in a radial, tree-like structure.',
    category: 'Visual Thinking',
    steps: [
      'Place the central concept in the middle',
      'Add main branches for key themes or categories',
      'Extend sub-branches for details and specifics',
      'Use colors and symbols for visual organization',
      'Connect related branches with associations',
    ],
    benefits: [
      'Highly visual and intuitive to understand',
      'Perfect for quick brainstorming sessions',
      'Shows relationships and hierarchies clearly',
      'Engages both creative and analytical thinking',
      'Easy to share and collaborate on',
    ],
    examples: [
      'Project planning and task breakdown',
      'Brainstorming sessions for new ideas',
      'Learning and memorizing new concepts',
      'Meeting notes and agenda planning',
      'Creative writing and story development',
    ],
    isDefault: true,
  },
  {
    id: 'concept-map',
    name: 'Concept Map',
    description: 'A structured network of concepts connected by labeled relationships, showing how ideas relate to each other with explicit linking phrases.',
    category: 'Educational',
    steps: [
      'Identify key concepts in the domain',
      'Arrange concepts hierarchically or by importance',
      'Draw connections between related concepts',
      'Label each connection with the relationship type',
      'Review and refine the concept structure',
    ],
    benefits: [
      'Makes relationships between concepts explicit',
      'Excellent for learning complex subjects',
      'Helps identify knowledge gaps',
      'Supports collaborative learning',
      'Facilitates knowledge sharing',
    ],
    examples: [
      'Course curriculum planning',
      'Understanding scientific theories',
      'Software architecture documentation',
      'Business process mapping',
      'Medical diagnosis frameworks',
    ],
    isDefault: true,
  },
  {
    id: 'cornell-notes',
    name: 'Cornell Notes',
    description: 'A systematic format for organizing notes with cues, detailed notes, and summaries in a structured layout.',
    category: 'Note-taking',
    steps: [
      'Divide the page into cue, notes, and summary sections',
      'Take detailed notes during learning',
      'Add key questions and cues in the left column',
      'Summarize main points at the bottom',
      'Review regularly using the cue column',
    ],
    benefits: [
      'Structured and organized note format',
      'Built-in review and study system',
      'Encourages active processing of information',
      'Easy to locate specific information',
      'Supports spaced repetition learning',
    ],
    examples: [
      'Lecture notes for students',
      'Book reading summaries',
      'Meeting notes with action items',
      'Training and workshop documentation',
      'Technical documentation review',
    ],
    isDefault: true,
  },
  {
    id: 'evergreen-notes',
    name: 'Evergreen Notes',
    description: 'Concept-oriented notes that are continuously refined and updated, focusing on developing ideas over time rather than capturing information.',
    category: 'Knowledge Development',
    steps: [
      'Write notes as complete, atomic concepts',
      'Focus on your own understanding and interpretation',
      'Continuously revise and improve notes over time',
      'Link notes densely to build context',
      'Let insights emerge from the connections',
    ],
    benefits: [
      'Develops deeper understanding over time',
      'Notes become more valuable with age',
      'Encourages original thinking',
      'Builds genuine knowledge, not just information',
      'Supports creative work and writing',
    ],
    examples: [
      'Research and thought development',
      'Long-term learning projects',
      'Writing and content creation',
      'Professional development documentation',
      'Personal philosophy and values exploration',
    ],
    isDefault: true,
  },
  {
    id: 'slip-box',
    name: 'Slip Box',
    description: 'A physical or digital box of index cards where each card contains a single note, organized by connections rather than categories.',
    category: 'Note-taking',
    steps: [
      'Write one idea per card with a unique identifier',
      'File cards behind related cards',
      'Create index cards for entry points',
      'Add reference cards for sources',
      'Build connections through card sequences',
    ],
    benefits: [
      'Simple and flexible organization system',
      'Forces ideas to be concise and focused',
      'Natural knowledge growth through connections',
      'No complex folder hierarchies needed',
      'Serendipitous discovery of connections',
    ],
    examples: [
      'Academic research and writing',
      'Reading notes and annotations',
      'Project ideas and planning',
      'Professional knowledge management',
      'Personal learning journal',
    ],
    isDefault: true,
  },
  {
    id: 'outline',
    name: 'Hierarchical Outline',
    description: 'A traditional hierarchical structure organizing information from general to specific in nested levels.',
    category: 'Structured',
    steps: [
      'Start with main topics at the top level',
      'Add subtopics under each main topic',
      'Continue nesting for increasing detail',
      'Use consistent numbering or bullets',
      'Maintain logical hierarchy throughout',
    ],
    benefits: [
      'Clear structure and organization',
      'Easy to understand at a glance',
      'Familiar format for most people',
      'Simple to create and maintain',
      'Works well for linear content',
    ],
    examples: [
      'Course syllabi and curriculum',
      'Book and document outlines',
      'Project plans and timelines',
      'Standard operating procedures',
      'Legal and policy documents',
    ],
    isDefault: true,
  },
  {
    id: 'network-graph',
    name: 'Network Graph',
    description: 'A free-form network of interconnected nodes representing concepts, people, or entities with various types of relationships.',
    category: 'Network',
    steps: [
      'Create nodes for entities or concepts',
      'Add edges to show relationships',
      'Label edges with relationship types',
      'Use node size or color for properties',
      'Analyze network patterns and clusters',
    ],
    benefits: [
      'Reveals hidden patterns and clusters',
      'Great for complex relationship mapping',
      'Supports network analysis',
      'Flexible and adaptive structure',
      'Visual insights from graph layout',
    ],
    examples: [
      'Social network analysis',
      'Knowledge graph construction',
      'Software dependency mapping',
      'Organization charts with relationships',
      'Citation and reference networks',
    ],
    isDefault: true,
  },
  {
    id: 'timeline',
    name: 'Timeline / Chronological',
    description: 'Organizing information based on temporal sequence, showing how events or concepts develop over time.',
    category: 'Temporal',
    steps: [
      'Identify key events or milestones',
      'Place items in chronological order',
      'Add context and relationships',
      'Note dependencies and causes',
      'Highlight important transitions',
    ],
    benefits: [
      'Clear temporal understanding',
      'Shows cause and effect relationships',
      'Easy to identify patterns over time',
      'Good for historical context',
      'Supports project planning',
    ],
    examples: [
      'Project roadmaps and planning',
      'Historical research and analysis',
      'Personal life documentation',
      'Product development cycles',
      'Learning progression tracking',
    ],
    isDefault: true,
  },
  {
    id: 'matrix',
    name: 'Matrix / Grid',
    description: 'A two-dimensional grid structure for comparing items across multiple dimensions or criteria.',
    category: 'Comparison',
    steps: [
      'Define row and column categories',
      'Place items in appropriate cells',
      'Fill in properties or relationships',
      'Analyze patterns across dimensions',
      'Use for decision-making and comparison',
    ],
    benefits: [
      'Systematic comparison of options',
      'Clear visualization of multi-dimensional data',
      'Supports decision matrices',
      'Easy to spot patterns and gaps',
      'Good for prioritization',
    ],
    examples: [
      'Product feature comparison',
      'Risk assessment matrices',
      'Skills and competency mapping',
      'SWOT analysis',
      'Eisenhower priority matrix',
    ],
    isDefault: true,
  },
];

/**
 * Mock Apollo Query Response
 */
export const mockMethodologiesQueryResponse = {
  data: {
    methodologies: mockMethodologies,
  },
};

/**
 * Filter methodologies by category
 */
export const getMethodologiesByCategory = (category: string): Methodology[] => {
  return mockMethodologies.filter(
    (m) => m.category?.toLowerCase() === category.toLowerCase()
  );
};

/**
 * Get methodology by ID
 */
export const getMethodologyById = (id: string): Methodology | undefined => {
  return mockMethodologies.find((m) => m.id === id);
};

/**
 * Get default methodologies
 */
export const getDefaultMethodologies = (): Methodology[] => {
  return mockMethodologies.filter((m) => m.isDefault);
};

/**
 * Search methodologies by name or description
 */
export const searchMethodologies = (query: string): Methodology[] => {
  const lowerQuery = query.toLowerCase();
  return mockMethodologies.filter(
    (m) =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.description.toLowerCase().includes(lowerQuery) ||
      m.category?.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get unique categories
 */
export const getCategories = (): string[] => {
  const categories = new Set(
    mockMethodologies
      .map((m) => m.category)
      .filter((c): c is string => c !== undefined)
  );
  return Array.from(categories).sort();
};
