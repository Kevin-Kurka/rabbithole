/**
 * Methodology Type Definitions
 *
 * Defines types for knowledge organization methodologies
 * used in graph creation flow.
 */

export interface Methodology {
  id: string;
  name: string;
  description: string;
  category?: string;
  steps?: string[];
  benefits?: string[];
  examples?: string[];
  isDefault?: boolean;
  icon?: string;
  popularityScore?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MethodologyCategory {
  id: string;
  name: string;
  description: string;
  methodologies: Methodology[];
}

export type MethodologySelectionState = {
  selectedId: string | null;
  isCustom: boolean;
  customConfig?: CustomMethodologyConfig;
};

export interface CustomMethodologyConfig {
  name: string;
  description: string;
  steps: string[];
  nodeTypes?: string[];
  edgeTypes?: string[];
  rules?: string[];
}

export interface MethodologyTemplate {
  id: string;
  name: string;
  description: string;
  defaultNodeTypes: string[];
  defaultEdgeTypes: string[];
  recommendedSettings: {
    maxDepth?: number;
    allowCycles?: boolean;
    requireCategories?: boolean;
  };
}
