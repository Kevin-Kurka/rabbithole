import { Pool } from 'pg';
import { MethodologyCategory } from '../types/methodology';

interface MethodologyTemplate {
  name: string;
  description: string;
  category: MethodologyCategory;
  icon: string;
  color: string;
  tags: string[];
  nodeTypes: Array<{
    name: string;
    displayName: string;
    description: string;
    icon: string;
    color: string;
    propertiesSchema: object;
    defaultProperties: object;
    requiredProperties: string[];
    displayOrder: number;
  }>;
  edgeTypes: Array<{
    name: string;
    displayName: string;
    description: string;
    isDirected: boolean;
    validSourceTypes: string[];
    validTargetTypes: string[];
    lineStyle: string;
    arrowStyle: string;
    displayOrder: number;
  }>;
  workflow?: {
    steps: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      config: object;
    }>;
    isLinear: boolean;
    allowSkip: boolean;
    instructions: string;
  };
}

const CORE_METHODOLOGIES: MethodologyTemplate[] = [
  {
    name: '5 Whys Root Cause Analysis',
    description: 'Iteratively ask "why" to drill down to the root cause of a problem. Best for simple to moderately complex issues.',
    category: MethodologyCategory.ANALYTICAL,
    icon: 'search',
    color: '#3B82F6',
    tags: ['root-cause', 'problem-solving', 'simple', 'iterative'],
    nodeTypes: [
      {
        name: 'problem',
        displayName: 'Problem Statement',
        description: 'The initial problem or symptom',
        icon: 'alert-circle',
        color: '#EF4444',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            impact: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
          }
        },
        defaultProperties: { impact: 'medium' },
        requiredProperties: ['title'],
        displayOrder: 0
      },
      {
        name: 'why',
        displayName: 'Why Question',
        description: 'A why question exploring the cause',
        icon: 'help-circle',
        color: '#F59E0B',
        propertiesSchema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
            depth: { type: 'number' }
          }
        },
        defaultProperties: { depth: 1 },
        requiredProperties: ['question', 'answer'],
        displayOrder: 1
      },
      {
        name: 'root_cause',
        displayName: 'Root Cause',
        description: 'The fundamental cause identified',
        icon: 'target',
        color: '#10B981',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 100 }
          }
        },
        defaultProperties: { confidence: 80 },
        requiredProperties: ['title'],
        displayOrder: 2
      },
      {
        name: 'solution',
        displayName: 'Solution',
        description: 'Proposed solution to address the root cause',
        icon: 'lightbulb',
        color: '#8B5CF6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            cost: { type: 'string', enum: ['low', 'medium', 'high'] },
            timeframe: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 3
      }
    ],
    edgeTypes: [
      {
        name: 'asks',
        displayName: 'Asks Why',
        description: 'Connects problem/answer to next why question',
        isDirected: true,
        validSourceTypes: ['problem', 'why'],
        validTargetTypes: ['why'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 0
      },
      {
        name: 'reveals',
        displayName: 'Reveals Root Cause',
        description: 'Final why leads to root cause',
        isDirected: true,
        validSourceTypes: ['why'],
        validTargetTypes: ['root_cause'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 1
      },
      {
        name: 'addresses',
        displayName: 'Addresses',
        description: 'Solution addresses root cause',
        isDirected: true,
        validSourceTypes: ['solution'],
        validTargetTypes: ['root_cause'],
        lineStyle: 'dashed',
        arrowStyle: 'arrow',
        displayOrder: 2
      }
    ],
    workflow: {
      steps: [
        {
          id: 'step1',
          type: 'INSTRUCTION',
          title: 'Define the Problem',
          description: 'Start by clearly stating the problem you want to solve. Be specific about what is happening.',
          config: { nodeType: 'problem' }
        },
        {
          id: 'step2',
          type: 'NODE_CREATION',
          title: 'Ask the First Why',
          description: 'Create the first "Why" question: Why is this problem occurring?',
          config: { nodeType: 'why', properties: { depth: 1 } }
        },
        {
          id: 'step3',
          type: 'NODE_CREATION',
          title: 'Continue Asking Why',
          description: 'Keep asking why for each answer, typically 5 times or until you reach the root cause.',
          config: { nodeType: 'why', repeat: true }
        },
        {
          id: 'step4',
          type: 'NODE_CREATION',
          title: 'Identify Root Cause',
          description: 'Once you can\'t meaningfully ask "why" anymore, you\'ve found your root cause.',
          config: { nodeType: 'root_cause' }
        },
        {
          id: 'step5',
          type: 'NODE_CREATION',
          title: 'Propose Solutions',
          description: 'Develop solutions that address the root cause, not just the symptoms.',
          config: { nodeType: 'solution' }
        }
      ],
      isLinear: true,
      allowSkip: false,
      instructions: 'The 5 Whys technique helps you drill down to the root cause by repeatedly asking "why". Start with a clear problem statement and ask why it occurs. Each answer becomes the input for the next why question. Continue until you reach the fundamental cause.'
    }
  },
  {
    name: 'Fishbone (Ishikawa) Diagram',
    description: 'Systematic cause-and-effect analysis using categories (People, Process, Equipment, Materials, Environment, Management).',
    category: MethodologyCategory.ANALYTICAL,
    icon: 'git-branch',
    color: '#06B6D4',
    tags: ['root-cause', 'structured', 'brainstorming', 'manufacturing'],
    nodeTypes: [
      {
        name: 'effect',
        displayName: 'Effect/Problem',
        description: 'The problem or effect being analyzed',
        icon: 'alert-triangle',
        color: '#DC2626',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 0
      },
      {
        name: 'category',
        displayName: 'Cause Category',
        description: 'Major category of causes (6Ms: Man, Machine, Method, Material, Measurement, Mother Nature)',
        icon: 'folder',
        color: '#7C3AED',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            category: { type: 'string', enum: ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Mother Nature'] }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title', 'category'],
        displayOrder: 1
      },
      {
        name: 'cause',
        displayName: 'Potential Cause',
        description: 'Specific potential cause within a category',
        icon: 'circle',
        color: '#F59E0B',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            likelihood: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        },
        defaultProperties: { likelihood: 'medium' },
        requiredProperties: ['title'],
        displayOrder: 2
      },
      {
        name: 'sub_cause',
        displayName: 'Sub-Cause',
        description: 'Deeper level cause contributing to parent cause',
        icon: 'corner-down-right',
        color: '#FBBF24',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 3
      }
    ],
    edgeTypes: [
      {
        name: 'category_of',
        displayName: 'Category Of',
        description: 'Category relates to the main effect',
        isDirected: true,
        validSourceTypes: ['category'],
        validTargetTypes: ['effect'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 0
      },
      {
        name: 'causes',
        displayName: 'Causes',
        description: 'Cause contributes to effect or parent cause',
        isDirected: true,
        validSourceTypes: ['cause', 'sub_cause'],
        validTargetTypes: ['effect', 'category', 'cause'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 1
      }
    ]
  },
  {
    name: 'Mind Mapping',
    description: 'Visual brainstorming technique for exploring ideas, connections, and hierarchies. Great for creative thinking and knowledge organization.',
    category: MethodologyCategory.CREATIVE,
    icon: 'share-2',
    color: '#EC4899',
    tags: ['brainstorming', 'creative', 'visual', 'free-form'],
    nodeTypes: [
      {
        name: 'central_idea',
        displayName: 'Central Idea',
        description: 'The main topic or concept at the center',
        icon: 'sun',
        color: '#F59E0B',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 0
      },
      {
        name: 'main_branch',
        displayName: 'Main Branch',
        description: 'Primary theme or category',
        icon: 'git-branch',
        color: '#3B82F6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            color: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 1
      },
      {
        name: 'sub_branch',
        displayName: 'Sub-Branch',
        description: 'Secondary idea or detail',
        icon: 'corner-down-right',
        color: '#10B981',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            notes: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 2
      },
      {
        name: 'leaf',
        displayName: 'Leaf Node',
        description: 'Specific detail or example',
        icon: 'file-text',
        color: '#8B5CF6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 3
      }
    ],
    edgeTypes: [
      {
        name: 'branches_to',
        displayName: 'Branches To',
        description: 'Hierarchical connection',
        isDirected: true,
        validSourceTypes: ['central_idea', 'main_branch', 'sub_branch'],
        validTargetTypes: ['main_branch', 'sub_branch', 'leaf'],
        lineStyle: 'solid',
        arrowStyle: 'none',
        displayOrder: 0
      },
      {
        name: 'relates_to',
        displayName: 'Relates To',
        description: 'Non-hierarchical association',
        isDirected: false,
        validSourceTypes: ['main_branch', 'sub_branch', 'leaf'],
        validTargetTypes: ['main_branch', 'sub_branch', 'leaf'],
        lineStyle: 'dashed',
        arrowStyle: 'none',
        displayOrder: 1
      }
    ]
  },
  {
    name: 'SWOT Analysis',
    description: 'Strategic planning framework analyzing Strengths, Weaknesses, Opportunities, and Threats.',
    category: MethodologyCategory.STRATEGIC,
    icon: 'grid',
    color: '#14B8A6',
    tags: ['strategy', 'planning', 'business', 'decision-making'],
    nodeTypes: [
      {
        name: 'objective',
        displayName: 'Objective',
        description: 'The goal or decision being analyzed',
        icon: 'target',
        color: '#6366F1',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 0
      },
      {
        name: 'strength',
        displayName: 'Strength',
        description: 'Internal positive attributes',
        icon: 'trending-up',
        color: '#10B981',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            impact: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        },
        defaultProperties: { impact: 'medium' },
        requiredProperties: ['title'],
        displayOrder: 1
      },
      {
        name: 'weakness',
        displayName: 'Weakness',
        description: 'Internal negative attributes',
        icon: 'trending-down',
        color: '#EF4444',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        },
        defaultProperties: { severity: 'medium' },
        requiredProperties: ['title'],
        displayOrder: 2
      },
      {
        name: 'opportunity',
        displayName: 'Opportunity',
        description: 'External positive factors',
        icon: 'sunrise',
        color: '#3B82F6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            probability: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        },
        defaultProperties: { probability: 'medium' },
        requiredProperties: ['title'],
        displayOrder: 3
      },
      {
        name: 'threat',
        displayName: 'Threat',
        description: 'External negative factors',
        icon: 'alert-triangle',
        color: '#F59E0B',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            risk: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        },
        defaultProperties: { risk: 'medium' },
        requiredProperties: ['title'],
        displayOrder: 4
      },
      {
        name: 'strategy',
        displayName: 'Strategy',
        description: 'Strategic action or recommendation',
        icon: 'flag',
        color: '#8B5CF6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        },
        defaultProperties: { priority: 'medium' },
        requiredProperties: ['title'],
        displayOrder: 5
      }
    ],
    edgeTypes: [
      {
        name: 'analyzes',
        displayName: 'Analyzes',
        description: 'SWOT element relates to objective',
        isDirected: true,
        validSourceTypes: ['strength', 'weakness', 'opportunity', 'threat'],
        validTargetTypes: ['objective'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 0
      },
      {
        name: 'leverages',
        displayName: 'Leverages',
        description: 'Strategy uses strength or opportunity',
        isDirected: true,
        validSourceTypes: ['strategy'],
        validTargetTypes: ['strength', 'opportunity'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 1
      },
      {
        name: 'mitigates',
        displayName: 'Mitigates',
        description: 'Strategy addresses weakness or threat',
        isDirected: true,
        validSourceTypes: ['strategy'],
        validTargetTypes: ['weakness', 'threat'],
        lineStyle: 'dashed',
        arrowStyle: 'arrow',
        displayOrder: 2
      }
    ]
  },
  {
    name: 'Systems Thinking Causal Loop',
    description: 'Visualize feedback loops, delays, and systemic relationships. Understand how parts of a system influence each other.',
    category: MethodologyCategory.SYSTEMS,
    icon: 'repeat',
    color: '#06B6D4',
    tags: ['systems', 'feedback', 'complexity', 'dynamics'],
    nodeTypes: [
      {
        name: 'variable',
        displayName: 'Variable',
        description: 'A factor or element in the system',
        icon: 'circle',
        color: '#3B82F6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['stock', 'flow', 'converter'] }
          }
        },
        defaultProperties: { type: 'stock' },
        requiredProperties: ['title'],
        displayOrder: 0
      },
      {
        name: 'loop_indicator',
        displayName: 'Loop Indicator',
        description: 'Indicates a reinforcing (R) or balancing (B) loop',
        icon: 'refresh-cw',
        color: '#10B981',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            loop_type: { type: 'string', enum: ['reinforcing', 'balancing'] },
            description: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title', 'loop_type'],
        displayOrder: 1
      }
    ],
    edgeTypes: [
      {
        name: 'same_direction',
        displayName: 'Same Direction (+)',
        description: 'Increase in source causes increase in target (or decrease causes decrease)',
        isDirected: true,
        validSourceTypes: ['variable'],
        validTargetTypes: ['variable'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 0
      },
      {
        name: 'opposite_direction',
        displayName: 'Opposite Direction (-)',
        description: 'Increase in source causes decrease in target (or vice versa)',
        isDirected: true,
        validSourceTypes: ['variable'],
        validTargetTypes: ['variable'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 1
      },
      {
        name: 'delayed',
        displayName: 'Delayed Effect',
        description: 'Influence occurs with a time delay',
        isDirected: true,
        validSourceTypes: ['variable'],
        validTargetTypes: ['variable'],
        lineStyle: 'dashed',
        arrowStyle: 'arrow',
        displayOrder: 2
      }
    ]
  },
  {
    name: 'Decision Tree',
    description: 'Map out decisions, possible paths, and outcomes. Calculate expected values and risk-adjusted returns.',
    category: MethodologyCategory.STRATEGIC,
    icon: 'git-merge',
    color: '#F59E0B',
    tags: ['decision', 'probability', 'risk', 'analysis'],
    nodeTypes: [
      {
        name: 'decision',
        displayName: 'Decision Point',
        description: 'A decision that needs to be made',
        icon: 'square',
        color: '#3B82F6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 0
      },
      {
        name: 'chance',
        displayName: 'Chance Node',
        description: 'Uncertain event with multiple possible outcomes',
        icon: 'circle',
        color: '#10B981',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 1
      },
      {
        name: 'outcome',
        displayName: 'Outcome',
        description: 'Final result or endpoint',
        icon: 'flag',
        color: '#8B5CF6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            value: { type: 'number' },
            description: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 2
      }
    ],
    edgeTypes: [
      {
        name: 'choice',
        displayName: 'Choice',
        description: 'A possible choice from a decision',
        isDirected: true,
        validSourceTypes: ['decision'],
        validTargetTypes: ['chance', 'outcome', 'decision'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 0
      },
      {
        name: 'probability',
        displayName: 'Probability',
        description: 'A probabilistic outcome from a chance node',
        isDirected: true,
        validSourceTypes: ['chance'],
        validTargetTypes: ['outcome', 'decision', 'chance'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 1
      }
    ]
  },
  {
    name: 'Concept Mapping',
    description: 'Visualize relationships between concepts with labeled connections. Useful for knowledge representation and learning.',
    category: MethodologyCategory.INVESTIGATIVE,
    icon: 'share-2',
    color: '#A855F7',
    tags: ['learning', 'knowledge', 'relationships', 'education'],
    nodeTypes: [
      {
        name: 'concept',
        displayName: 'Concept',
        description: 'A key concept or idea',
        icon: 'box',
        color: '#3B82F6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            definition: { type: 'string' },
            examples: { type: 'array', items: { type: 'string' } }
          }
        },
        defaultProperties: { examples: [] },
        requiredProperties: ['title'],
        displayOrder: 0
      },
      {
        name: 'sub_concept',
        displayName: 'Sub-Concept',
        description: 'A more specific concept',
        icon: 'square',
        color: '#10B981',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            definition: { type: 'string' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title'],
        displayOrder: 1
      }
    ],
    edgeTypes: [
      {
        name: 'is_a',
        displayName: 'Is A',
        description: 'Taxonomic relationship (specialization)',
        isDirected: true,
        validSourceTypes: ['sub_concept'],
        validTargetTypes: ['concept'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 0
      },
      {
        name: 'has_a',
        displayName: 'Has A',
        description: 'Compositional relationship (part-of)',
        isDirected: true,
        validSourceTypes: ['concept', 'sub_concept'],
        validTargetTypes: ['concept', 'sub_concept'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 1
      },
      {
        name: 'leads_to',
        displayName: 'Leads To',
        description: 'Causal or temporal relationship',
        isDirected: true,
        validSourceTypes: ['concept', 'sub_concept'],
        validTargetTypes: ['concept', 'sub_concept'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 2
      },
      {
        name: 'related_to',
        displayName: 'Related To',
        description: 'General association',
        isDirected: false,
        validSourceTypes: ['concept', 'sub_concept'],
        validTargetTypes: ['concept', 'sub_concept'],
        lineStyle: 'dashed',
        arrowStyle: 'none',
        displayOrder: 3
      }
    ]
  },
  {
    name: 'Timeline Analysis',
    description: 'Chronological visualization of events, milestones, and their relationships over time.',
    category: MethodologyCategory.INVESTIGATIVE,
    icon: 'clock',
    color: '#EC4899',
    tags: ['timeline', 'chronology', 'history', 'sequence'],
    nodeTypes: [
      {
        name: 'event',
        displayName: 'Event',
        description: 'A significant event or milestone',
        icon: 'circle',
        color: '#3B82F6',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date' },
            importance: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
          }
        },
        defaultProperties: { importance: 'medium' },
        requiredProperties: ['title', 'date'],
        displayOrder: 0
      },
      {
        name: 'period',
        displayName: 'Time Period',
        description: 'A span of time or era',
        icon: 'calendar',
        color: '#10B981',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title', 'start_date'],
        displayOrder: 1
      },
      {
        name: 'milestone',
        displayName: 'Milestone',
        description: 'A major achievement or turning point',
        icon: 'flag',
        color: '#F59E0B',
        propertiesSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date' }
          }
        },
        defaultProperties: {},
        requiredProperties: ['title', 'date'],
        displayOrder: 2
      }
    ],
    edgeTypes: [
      {
        name: 'precedes',
        displayName: 'Precedes',
        description: 'Occurs before in time',
        isDirected: true,
        validSourceTypes: ['event', 'milestone', 'period'],
        validTargetTypes: ['event', 'milestone', 'period'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 0
      },
      {
        name: 'causes',
        displayName: 'Causes',
        description: 'Causal relationship between events',
        isDirected: true,
        validSourceTypes: ['event', 'milestone'],
        validTargetTypes: ['event', 'milestone'],
        lineStyle: 'solid',
        arrowStyle: 'arrow',
        displayOrder: 1
      },
      {
        name: 'during',
        displayName: 'During',
        description: 'Event occurs during a time period',
        isDirected: true,
        validSourceTypes: ['event', 'milestone'],
        validTargetTypes: ['period'],
        lineStyle: 'dashed',
        arrowStyle: 'none',
        displayOrder: 2
      }
    ]
  }
];

export async function seedMethodologies(pool: Pool): Promise<void> {
  console.log('Seeding core methodologies...');

  for (const template of CORE_METHODOLOGIES) {
    try {
      // Check if methodology already exists
      const existing = await pool.query(
        'SELECT id FROM public."Methodologies" WHERE name = $1 AND is_system = true',
        [template.name]
      );

      if (existing.rows.length > 0) {
        console.log(`Methodology "${template.name}" already exists, skipping...`);
        continue;
      }

      // Insert methodology
      const methodologyResult = await pool.query(
        `INSERT INTO public."Methodologies"
         (name, description, category, status, is_system, icon, color, tags, config, usage_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          template.name,
          template.description,
          template.category,
          'published',
          true,
          template.icon,
          template.color,
          template.tags,
          '{}',
          0
        ]
      );

      const methodologyId = methodologyResult.rows[0].id;
      console.log(`Created methodology: ${template.name} (${methodologyId})`);

      // Insert node types
      for (const nodeType of template.nodeTypes) {
        await pool.query(
          `INSERT INTO public."MethodologyNodeTypes"
           (methodology_id, name, display_name, description, icon, color,
            properties_schema, default_properties, required_properties, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            methodologyId,
            nodeType.name,
            nodeType.displayName,
            nodeType.description,
            nodeType.icon,
            nodeType.color,
            JSON.stringify(nodeType.propertiesSchema),
            JSON.stringify(nodeType.defaultProperties),
            nodeType.requiredProperties,
            nodeType.displayOrder
          ]
        );
      }
      console.log(`  Created ${template.nodeTypes.length} node types`);

      // Insert edge types
      for (const edgeType of template.edgeTypes) {
        await pool.query(
          `INSERT INTO public."MethodologyEdgeTypes"
           (methodology_id, name, display_name, description, is_directed,
            valid_source_types, valid_target_types, line_style, arrow_style, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            methodologyId,
            edgeType.name,
            edgeType.displayName,
            edgeType.description,
            edgeType.isDirected,
            JSON.stringify(edgeType.validSourceTypes),
            JSON.stringify(edgeType.validTargetTypes),
            edgeType.lineStyle,
            edgeType.arrowStyle,
            edgeType.displayOrder
          ]
        );
      }
      console.log(`  Created ${template.edgeTypes.length} edge types`);

      // Insert workflow if exists
      if (template.workflow) {
        await pool.query(
          `INSERT INTO public."MethodologyWorkflows"
           (methodology_id, steps, is_linear, allow_skip, instructions)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            methodologyId,
            JSON.stringify(template.workflow.steps),
            template.workflow.isLinear,
            template.workflow.allowSkip,
            template.workflow.instructions
          ]
        );
        console.log(`  Created workflow with ${template.workflow.steps.length} steps`);
      }

      console.log(`✓ Successfully seeded: ${template.name}\n`);
    } catch (error) {
      console.error(`Error seeding methodology "${template.name}":`, error);
      throw error;
    }
  }

  console.log('✓ All core methodologies seeded successfully!');
}

// Allow running as standalone script
if (require.main === module) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rabbithole'
  });

  seedMethodologies(pool)
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}
