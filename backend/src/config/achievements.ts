/**
 * Achievement Definitions for Rabbit Hole Platform
 *
 * Each achievement has:
 * - key: Unique identifier
 * - name: Display name
 * - description: User-facing description
 * - icon: Icon identifier (can be emoji or icon name)
 * - category: One of 'evidence', 'methodology', 'consensus', 'collaboration'
 * - points: Points awarded when earned
 * - criteria: Object defining unlock conditions
 */

export interface AchievementCriteria {
  type: 'count' | 'threshold' | 'streak' | 'quality';
  metric: string;
  threshold: number;
  operator?: 'gte' | 'lte' | 'eq';
}

export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'evidence' | 'methodology' | 'consensus' | 'collaboration';
  points: number;
  criteria: AchievementCriteria;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Evidence Category
  {
    key: 'evidence_expert',
    name: 'Evidence Expert',
    description: 'Submit 50 pieces of evidence',
    icon: '🔍',
    category: 'evidence',
    points: 500,
    criteria: {
      type: 'count',
      metric: 'evidence_submitted',
      threshold: 50,
      operator: 'gte'
    }
  },
  {
    key: 'truth_seeker',
    name: 'Truth Seeker',
    description: 'Have 10 nodes reach 0.9+ veracity score',
    icon: '🎯',
    category: 'evidence',
    points: 750,
    criteria: {
      type: 'count',
      metric: 'high_veracity_nodes',
      threshold: 10,
      operator: 'gte'
    }
  },
  {
    key: 'early_adopter',
    name: 'Early Adopter',
    description: 'Create Level 0 seed data',
    icon: '🌱',
    category: 'evidence',
    points: 1000,
    criteria: {
      type: 'count',
      metric: 'level0_contributions',
      threshold: 1,
      operator: 'gte'
    }
  },

  // Methodology Category
  {
    key: 'methodology_master',
    name: 'Methodology Master',
    description: 'Complete 3 different methodologies',
    icon: '📋',
    category: 'methodology',
    points: 600,
    criteria: {
      type: 'count',
      metric: 'methodologies_completed',
      threshold: 3,
      operator: 'gte'
    }
  },
  {
    key: 'graph_architect',
    name: 'Graph Architect',
    description: 'Create 5 graphs',
    icon: '🏗️',
    category: 'methodology',
    points: 400,
    criteria: {
      type: 'count',
      metric: 'graphs_created',
      threshold: 5,
      operator: 'gte'
    }
  },

  // Consensus Category
  {
    key: 'consensus_builder',
    name: 'Consensus Builder',
    description: 'Participate in 20 process validations',
    icon: '🤝',
    category: 'consensus',
    points: 400,
    criteria: {
      type: 'count',
      metric: 'process_validations',
      threshold: 20,
      operator: 'gte'
    }
  },
  {
    key: 'challenge_accepted',
    name: 'Challenge Accepted',
    description: 'Submit 10 challenges',
    icon: '⚔️',
    category: 'consensus',
    points: 300,
    criteria: {
      type: 'count',
      metric: 'challenges_submitted',
      threshold: 10,
      operator: 'gte'
    }
  },
  {
    key: 'resolution_pro',
    name: 'Resolution Pro',
    description: 'Successfully resolve 5 challenges',
    icon: '✅',
    category: 'consensus',
    points: 500,
    criteria: {
      type: 'count',
      metric: 'challenges_resolved',
      threshold: 5,
      operator: 'gte'
    }
  },

  // Collaboration Category
  {
    key: 'collaboration_champion',
    name: 'Collaboration Champion',
    description: 'Send 100 chat messages',
    icon: '💬',
    category: 'collaboration',
    points: 300,
    criteria: {
      type: 'count',
      metric: 'chat_messages_sent',
      threshold: 100,
      operator: 'gte'
    }
  },
  {
    key: 'community_leader',
    name: 'Community Leader',
    description: 'Help 10 users through active collaboration',
    icon: '👑',
    category: 'collaboration',
    points: 800,
    criteria: {
      type: 'count',
      metric: 'users_helped',
      threshold: 10,
      operator: 'gte'
    }
  }
];

// Helper function to get achievement by key
export function getAchievementByKey(key: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(a => a.key === key);
}

// Helper function to get achievements by category
export function getAchievementsByCategory(category: string): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

// Calculate total possible points
export const TOTAL_POSSIBLE_POINTS = ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);
