# Methodology System Requirements

## Overview
The Methodology System enables users to apply structured investigation frameworks to their Level 1 graphs. Each methodology provides custom node types, relationship types, and guided workflows that help users organize their investigation systematically.

## Functional Requirements

### 1. Core Methodology Features

#### 1.1 Methodology Selection
- Users must be able to select a methodology when creating a new Level 1 graph
- The system must provide at least 8 pre-built methodologies:
  - 5 Whys Analysis
  - SCAMPER Creative Thinking
  - Fishbone/Ishikawa Diagram
  - Timeline Analysis
  - Stakeholder Mapping
  - SWOT Analysis
  - Force Field Analysis
  - Custom (user-defined)

#### 1.2 Custom Node Types
- Each methodology defines its own set of node types
- Node types must include:
  - Display name
  - Icon/visual representation
  - Default properties schema
  - Validation rules
  - Suggested connections

#### 1.3 Custom Edge Types
- Each methodology defines relationship types specific to its domain
- Edge types must include:
  - Display name
  - Directionality (directed/undirected)
  - Cardinality constraints
  - Valid source/target node type pairs
  - Visual styling (color, line style)

#### 1.4 Guided Workflows
- Each methodology provides a step-by-step workflow
- Workflows must support:
  - Sequential steps with validation
  - Branching logic based on user input
  - Progress tracking
  - Skip/return to previous steps
  - Auto-creation of required nodes/edges

### 2. Custom Methodology Creation

#### 2.1 Methodology Builder
- Users with sufficient reputation can create custom methodologies
- Builder interface must support:
  - Defining custom node types
  - Defining custom edge types
  - Creating workflow steps
  - Setting validation rules
  - Providing help text/examples

#### 2.2 Methodology Templates
- Users can save methodologies as reusable templates
- Templates can be:
  - Private (personal use only)
  - Shared with specific users/groups
  - Published to methodology marketplace

#### 2.3 Methodology Versioning
- Custom methodologies support version control
- Changes create new versions, preserving existing graphs
- Users can migrate graphs to newer methodology versions

### 3. Integration Requirements

#### 3.1 Graph Creation Flow
- Methodology selection integrated into graph creation wizard
- Pre-populate canvas with methodology starter nodes
- Display methodology-specific toolbar/palette

#### 3.2 Canvas Integration
- Node/edge creation respects methodology constraints
- Visual indicators for methodology compliance
- Warnings when violating methodology rules

#### 3.3 Veracity Scoring
- Methodology compliance affects veracity scores
- Complete methodology workflows boost credibility
- Systematic approaches weighted higher than ad-hoc

## Non-Functional Requirements

### 1. Performance
- Methodology loading < 500ms
- Workflow step transitions < 200ms
- Custom node/edge type retrieval < 100ms

### 2. Scalability
- Support 100+ concurrent methodology users
- Store 10,000+ custom methodologies
- Handle methodologies with 50+ node types

### 3. Usability
- Methodology selection requires no training
- Visual workflow progress indicators
- Contextual help for each methodology step

### 4. Security
- Validate all custom methodology definitions
- Sanitize user-provided methodology content
- Rate limit methodology creation (10/day per user)

### 5. Compatibility
- Methodologies backward compatible with existing graphs
- Export methodology definitions as JSON
- Import methodologies from external sources

## Technical Constraints

### 1. Database
- PostgreSQL with JSONB for flexible schemas
- Efficient indexing for methodology queries
- Referential integrity for methodology components

### 2. API
- GraphQL mutations for methodology CRUD
- Real-time subscriptions for collaborative editing
- Batch operations for performance

### 3. Frontend
- React components for methodology UI
- Canvas library compatible with custom rendering
- State management for complex workflows

## User Stories

### Story 1: Investigative Journalist
"As an investigative journalist, I want to use the Timeline Analysis methodology so that I can organize events chronologically and identify patterns in complex stories."

**Acceptance Criteria:**
- Can select Timeline Analysis when creating graph
- Automatically creates timeline axis nodes
- Can add Event nodes with date/time properties
- Events auto-sort on timeline visualization

### Story 2: Business Analyst
"As a business analyst, I want to create a custom PEST analysis methodology so that my team can consistently analyze market factors."

**Acceptance Criteria:**
- Can define Political, Economic, Social, Technological node types
- Can create Impact and Likelihood edge types
- Can share methodology with team members
- Team graphs using methodology are consistent

### Story 3: Quality Engineer
"As a quality engineer, I want to use the Fishbone methodology to perform root cause analysis on production issues."

**Acceptance Criteria:**
- Can create Cause and Effect nodes
- Visual fishbone diagram layout
- Categories for People, Process, Materials, etc.
- Can drill down into sub-causes

## Success Metrics

1. **Adoption Rate**: 60% of new graphs use a methodology
2. **Completion Rate**: 40% complete full methodology workflow
3. **Custom Creation**: 100+ custom methodologies in first 6 months
4. **User Satisfaction**: 4.5/5 rating for methodology feature
5. **Veracity Impact**: 25% higher veracity scores for methodology-based graphs