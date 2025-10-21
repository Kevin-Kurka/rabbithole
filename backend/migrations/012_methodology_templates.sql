-- Migration 012: Methodology Template Data
-- Seeds the database with standard methodologies that have pre-configured templates

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert Scientific Method methodology
INSERT INTO public."Methodologies" (
  id,
  name,
  description,
  category,
  status,
  version,
  is_system,
  icon,
  color,
  tags,
  usage_count,
  created_at,
  updated_at,
  published_at
) VALUES (
  'scientific-method',
  'Scientific Method',
  'A systematic approach to investigation through observation, hypothesis formation, experimentation, and analysis. Perfect for empirical research and evidence-based inquiry.',
  'investigative',
  'published',
  1,
  true,
  'flask',
  '#3b82f6',
  ARRAY['science', 'research', 'empirical', 'hypothesis', 'experiment'],
  0,
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Insert Legal Discovery methodology
INSERT INTO public."Methodologies" (
  id,
  name,
  description,
  category,
  status,
  version,
  is_system,
  icon,
  color,
  tags,
  usage_count,
  created_at,
  updated_at,
  published_at
) VALUES (
  'legal-discovery',
  'Legal Discovery',
  'The eDiscovery Reference Model (EDRM) framework for identifying, preserving, collecting, reviewing, and producing electronically stored information in legal proceedings.',
  'investigative',
  'published',
  1,
  true,
  'gavel',
  '#8b5cf6',
  ARRAY['legal', 'discovery', 'evidence', 'litigation', 'compliance'],
  0,
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Insert Toulmin Argumentation methodology
INSERT INTO public."Methodologies" (
  id,
  name,
  description,
  category,
  status,
  version,
  is_system,
  icon,
  color,
  tags,
  usage_count,
  created_at,
  updated_at,
  published_at
) VALUES (
  'toulmin-argumentation',
  'Toulmin Argumentation',
  'The Toulmin model of argumentation for building well-structured arguments with claims, grounds, warrants, backing, qualifiers, and rebuttals. Ideal for critical thinking and debate.',
  'analytical',
  'published',
  1,
  true,
  'message-square',
  '#10b981',
  ARRAY['argumentation', 'logic', 'debate', 'critical-thinking', 'rhetoric'],
  0,
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Create node types for Scientific Method
INSERT INTO public."MethodologyNodeTypes" (
  methodology_id,
  name,
  display_name,
  description,
  icon,
  color,
  properties_schema,
  default_properties,
  required_properties,
  display_order
) VALUES
  ('scientific-method', 'hypothesis', 'Hypothesis', 'A testable prediction or explanation', 'lightbulb', '#fbbf24', '{}', '{}', '{}', 1),
  ('scientific-method', 'experiment', 'Experiment', 'Controlled test of the hypothesis', 'flask', '#3b82f6', '{}', '{}', '{}', 2),
  ('scientific-method', 'data', 'Data Collection', 'Observations and measurements', 'database', '#06b6d4', '{}', '{}', '{}', 3),
  ('scientific-method', 'analysis', 'Analysis', 'Statistical and qualitative analysis', 'bar-chart', '#8b5cf6', '{}', '{}', '{}', 4),
  ('scientific-method', 'conclusion', 'Conclusion', 'Interpretation of results', 'check-circle', '#10b981', '{}', '{}', '{}', 5)
ON CONFLICT (methodology_id, name) DO NOTHING;

-- Create node types for Legal Discovery
INSERT INTO public."MethodologyNodeTypes" (
  methodology_id,
  name,
  display_name,
  description,
  icon,
  color,
  properties_schema,
  default_properties,
  required_properties,
  display_order
) VALUES
  ('legal-discovery', 'identification', 'Identification', 'Identify potentially relevant data sources', 'search', '#f59e0b', '{}', '{}', '{}', 1),
  ('legal-discovery', 'preservation', 'Preservation', 'Preserve evidence from alteration', 'shield', '#3b82f6', '{}', '{}', '{}', 2),
  ('legal-discovery', 'collection', 'Collection', 'Collect relevant documents and data', 'folder', '#06b6d4', '{}', '{}', '{}', 3),
  ('legal-discovery', 'review', 'Review', 'Review materials for relevance and privilege', 'eye', '#8b5cf6', '{}', '{}', '{}', 4),
  ('legal-discovery', 'production', 'Production', 'Produce documents to opposing party', 'file-text', '#10b981', '{}', '{}', '{}', 5)
ON CONFLICT (methodology_id, name) DO NOTHING;

-- Create node types for Toulmin Argumentation
INSERT INTO public."MethodologyNodeTypes" (
  methodology_id,
  name,
  display_name,
  description,
  icon,
  color,
  properties_schema,
  default_properties,
  required_properties,
  display_order
) VALUES
  ('toulmin-argumentation', 'claim', 'Claim', 'The central assertion or thesis', 'flag', '#ef4444', '{}', '{}', '{}', 1),
  ('toulmin-argumentation', 'grounds', 'Grounds', 'Evidence and data supporting the claim', 'file-text', '#3b82f6', '{}', '{}', '{}', 2),
  ('toulmin-argumentation', 'warrant', 'Warrant', 'Logical connection between grounds and claim', 'link', '#8b5cf6', '{}', '{}', '{}', 3),
  ('toulmin-argumentation', 'backing', 'Backing', 'Additional support for the warrant', 'shield', '#06b6d4', '{}', '{}', '{}', 4),
  ('toulmin-argumentation', 'qualifier', 'Qualifier', 'Limitations on the strength of the claim', 'alert-circle', '#f59e0b', '{}', '{}', '{}', 5),
  ('toulmin-argumentation', 'rebuttal', 'Rebuttal', 'Counter-arguments and exceptions', 'x-circle', '#f97316', '{}', '{}', '{}', 6)
ON CONFLICT (methodology_id, name) DO NOTHING;

-- Create edge types for methodologies
INSERT INTO public."MethodologyEdgeTypes" (
  methodology_id,
  name,
  display_name,
  description,
  is_directed,
  valid_source_types,
  valid_target_types,
  line_style,
  arrow_style,
  display_order
) VALUES
  ('scientific-method', 'informs', 'Informs', 'Provides foundation for next step', true, '[]', '[]', 'solid', 'arrow', 1),
  ('scientific-method', 'generates', 'Generates', 'Produces data or results', true, '[]', '[]', 'solid', 'arrow', 2),
  ('scientific-method', 'leads-to', 'Leads To', 'Results in conclusion', true, '[]', '[]', 'solid', 'arrow', 3),
  ('legal-discovery', 'requires', 'Requires', 'Prerequisite relationship', true, '[]', '[]', 'solid', 'arrow', 1),
  ('legal-discovery', 'enables', 'Enables', 'Makes possible', true, '[]', '[]', 'solid', 'arrow', 2),
  ('legal-discovery', 'determines', 'Determines', 'Decides outcome', true, '[]', '[]', 'solid', 'arrow', 3),
  ('toulmin-argumentation', 'supports', 'Supports', 'Provides evidence for', true, '[]', '[]', 'solid', 'arrow', 1),
  ('toulmin-argumentation', 'justifies', 'Justifies', 'Explains logical connection', true, '[]', '[]', 'solid', 'arrow', 2),
  ('toulmin-argumentation', 'qualifies', 'Qualifies', 'Limits scope', true, '[]', '[]', 'dashed', 'arrow', 3),
  ('toulmin-argumentation', 'challenges', 'Challenges', 'Counter-argument', true, '[]', '[]', 'dashed', 'arrow', 4)
ON CONFLICT (methodology_id, name) DO NOTHING;

-- Create workflows for methodologies
INSERT INTO public."MethodologyWorkflows" (
  methodology_id,
  steps,
  is_linear,
  allow_skip,
  instructions
) VALUES
  (
    'scientific-method',
    '[
      {"id": "step1", "title": "State Hypothesis", "description": "Formulate a testable hypothesis"},
      {"id": "step2", "title": "Design Experiment", "description": "Plan your experimental methodology"},
      {"id": "step3", "title": "Collect Data", "description": "Gather observations and measurements"},
      {"id": "step4", "title": "Analyze Results", "description": "Examine data for patterns and significance"},
      {"id": "step5", "title": "Draw Conclusions", "description": "Interpret findings and evaluate hypothesis"}
    ]',
    true,
    false,
    'Follow the scientific method to conduct rigorous empirical investigation. Start with a clear hypothesis, design a controlled experiment, collect data systematically, analyze results objectively, and draw evidence-based conclusions.'
  ),
  (
    'legal-discovery',
    '[
      {"id": "step1", "title": "Identify Sources", "description": "Locate potential evidence sources"},
      {"id": "step2", "title": "Preserve Evidence", "description": "Implement legal hold procedures"},
      {"id": "step3", "title": "Collect Materials", "description": "Gather relevant documents and data"},
      {"id": "step4", "title": "Review for Relevance", "description": "Assess materials for privilege and relevance"},
      {"id": "step5", "title": "Produce Documents", "description": "Deliver responsive materials to opposing counsel"}
    ]',
    true,
    false,
    'Follow the EDRM framework for electronic discovery. Ensure all potentially relevant electronically stored information is identified, preserved, collected, reviewed, and produced in compliance with legal requirements.'
  ),
  (
    'toulmin-argumentation',
    '[
      {"id": "step1", "title": "State Your Claim", "description": "Present your central argument"},
      {"id": "step2", "title": "Provide Grounds", "description": "Supply evidence and data"},
      {"id": "step3", "title": "Explain Warrant", "description": "Connect evidence to claim"},
      {"id": "step4", "title": "Add Backing", "description": "Support your reasoning"},
      {"id": "step5", "title": "Qualify and Rebut", "description": "Address limitations and counter-arguments"}
    ]',
    false,
    true,
    'Build a robust argument using the Toulmin model. Start with a clear claim, support it with grounds, explain the warrant connecting them, provide backing for your reasoning, and address qualifiers and rebuttals to strengthen your argument.'
  )
ON CONFLICT (methodology_id) DO UPDATE SET
  steps = EXCLUDED.steps,
  instructions = EXCLUDED.instructions,
  updated_at = NOW();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 012: Methodology templates seeded successfully';
END $$;
