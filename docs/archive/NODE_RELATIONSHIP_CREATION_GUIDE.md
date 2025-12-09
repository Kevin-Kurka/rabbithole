# Node Relationship Creation Feature

## Overview

A comprehensive system for creating semantic relationships between nodes with AI-powered edge type determination based on natural language descriptions.

## Components Created

### 1. CreateNodeRelationshipDialog Component
**Location**: `frontend/src/components/create-node-relationship-dialog.tsx`

**Features**:
- Visual source → target node display
- Natural language relationship description input
- AI-powered relationship type analysis
- Color-coded relationship type badges
- Real-time type suggestion based on keywords
- Common relationship types reference

**Relationship Types Supported**:
- `causes` - Causal relationships (e.g., "led to", "resulted in")
- `supports` - Evidentiary support (e.g., "proves", "validates")
- `contradicts` - Conflicting information (e.g., "refutes", "disproves")
- `similar_to` - Similarity (e.g., "like", "resembles")
- `part_of` - Hierarchical containment (e.g., "belongs to", "component of")
- `temporal` - Time-based (e.g., "before", "after")
- `cites` - Reference relationships (e.g., "references", "quotes")
- `related` - Generic relationship (default)

### 2. Updated NodeLinkCombobox Component
**Location**: `frontend/src/components/node-link-combobox.tsx`

**Changes**:
- **Opaque background**: Added `bg-background` to all Command components
- **New interface**: Accepts `sourceNodeId`, `sourceNodeTitle`, and `onRelationshipCreated` callback
- **Removed multi-select**: Now focuses on creating one relationship at a time
- **Dialog integration**: Automatically opens relationship dialog after node selection
- **Filters out source node**: Prevents self-referencing relationships

### 3. Backend Resolver Updates
**Location**: `backend/src/resolvers/NodeAssociationResolver.ts`

**Changes**:
- Added `description` field to `AddNodeAssociationInput`
- Updated `addNodeAssociation` mutation to save description in `Edge.props`
- Props structure: `{ description, createdBy, createdAt }`

### 4. Frontend Integration
**Location**: `frontend/src/components/node-associations-panel.tsx`

**Changes**:
- Updated `handleAddNodeAssociation` to accept description parameter
- Added AI-powered relationship type detection (keyword matching)
- Updated NodeLinkCombobox usage with new interface
- Added `title` to nodeData interface

## Usage Flow

### User Experience
1. User hovers over "Nodes" section header → Link icon appears
2. User clicks link icon → Search popover opens (opaque background)
3. User searches and selects a target node
4. Relationship dialog opens showing source and target nodes
5. User describes the relationship in natural language
6. User can click "Analyze" to get AI-suggested relationship type
7. User submits → Edge created with:
   - Automatically determined relationship type
   - Description saved in Edge.props
   - Default confidence score (0.8)

### Example Interactions

**Creating a Causal Relationship**:
```
User selects: "Oswald's rifle" → "Kennedy's death"
Description: "This weapon was used in the assassination and directly caused the president's death"
AI determines: type = "causes"
Edge created with props: { description: "This weapon was...", createdBy: userId, createdAt: timestamp }
```

**Creating an Evidentiary Relationship**:
```
User selects: "Autopsy report" → "Single bullet theory"
Description: "The autopsy findings support the single bullet theory by showing trajectory evidence"
AI determines: type = "supports"
```

## Technical Details

### GraphQL Mutation
```graphql
mutation AddNodeAssociation($input: AddNodeAssociationInput!) {
  addNodeAssociation(input: $input) {
    id
    sourceNodeId
    targetNodeId
    confidence
    relationshipType
    createdAt
    targetNode {
      id
      title
      type
      veracity
    }
  }
}
```

### Input Type
```typescript
input AddNodeAssociationInput {
  sourceNodeId: ID!
  targetNodeId: ID!
  confidence: Float
  relationshipType: String
  description: String
}
```

### Database Schema
```sql
-- Edge with props storing the description
INSERT INTO public."Edges"
  (source_node_id, target_node_id, relationship, weight, props, created_by)
VALUES ($1, $2, $3, $4, $5, $6)

-- Props structure
{
  "description": "User's natural language description",
  "createdBy": "user-id",
  "createdAt": "2024-01-20T10:00:00.000Z"
}
```

## AI Type Detection

### Current Implementation
Uses simple keyword matching with priority order:

1. **causes**: "cause", "led to", "resulted in"
2. **supports**: "support", "evidence", "proves"
3. **contradicts**: "contradict", "refute", "disproves"
4. **similar_to**: "similar", "like", "same as"
5. **part_of**: "part of", "component", "belongs to"
6. **temporal**: "temporal", "before", "after"
7. **cites**: "cites", "references", "quoted"
8. **related**: Default fallback

### Future Enhancement
Replace keyword matching with actual AI service call:

```typescript
// TODO: Replace with actual AI service
const relationshipType = await aiService.determineRelationType({
  sourceNode: sourceNodeTitle,
  targetNode: targetNodeTitle,
  description: description,
});
```

Recommended AI prompts:
```
Given two nodes and a description of their relationship:
Source: "{sourceNodeTitle}"
Target: "{targetNodeTitle}"
Description: "{description}"

Classify the relationship type as one of:
- causes: Causal relationships
- supports: Evidentiary support
- contradicts: Conflicting information
- similar_to: Similarity or analogy
- part_of: Hierarchical containment
- temporal: Time-based sequencing
- cites: Reference or citation
- related: General association

Return only the relationship type as a lowercase string with underscores.
```

## UI/UX Features

### Visual Feedback
- **Node Connection Visual**: Shows source → target with arrow
- **Hover States**: Icons appear on section hover
- **Loading States**: "Creating..." button text during submission
- **Color-Coded Types**: Each relationship type has distinct color:
  - `causes`: Orange
  - `supports`: Green
  - `contradicts`: Red
  - `similar_to`: Blue
  - `part_of`: Purple
  - `temporal`: Yellow
  - `cites`: Cyan
  - `related`: Gray

### Accessibility
- All interactive elements keyboard accessible
- Clear button states (disabled when no description)
- Descriptive titles and placeholders
- Color + text for relationship types (not color alone)

## Testing Checklist

- [ ] Search finds nodes correctly
- [ ] Cannot select source node (filtered out)
- [ ] Dialog opens after node selection
- [ ] Description is required to submit
- [ ] AI analyze button works
- [ ] Relationship types determined correctly
- [ ] Edge created in database with description in props
- [ ] Node associations list updates after creation
- [ ] Opaque background prevents transparency issues
- [ ] Chevrons rotate to indicate expanded/collapsed state

## Known Limitations

1. **AI Type Detection**: Currently uses simple keyword matching - should be replaced with actual AI service
2. **No Confidence Adjustment**: Confidence is fixed at 0.8 - could add slider for user input
3. **No Edit/Delete**: Once created, relationships cannot be edited from this interface
4. **No Bulk Operations**: Can only create one relationship at a time

## Future Enhancements

1. **Real AI Integration**: Connect to GPT-4/Claude for relationship type determination
2. **Confidence Scoring**: Allow users to set confidence level
3. **Relationship Templates**: Pre-defined templates for common relationship patterns
4. **Bulk Link Creation**: Select multiple target nodes at once
5. **Relationship Visualization**: Show relationship type visually in graph view
6. **Description Editing**: Edit relationship descriptions after creation
7. **Relationship History**: Track changes to relationship descriptions
8. **Smart Suggestions**: Suggest likely relationships based on node types

## Related Files

- `frontend/src/components/create-node-relationship-dialog.tsx` - Relationship dialog
- `frontend/src/components/node-link-combobox.tsx` - Node search component
- `frontend/src/components/node-associations-panel.tsx` - Integration point
- `frontend/src/app/nodes/[id]/page.tsx` - Node details page
- `backend/src/resolvers/NodeAssociationResolver.ts` - GraphQL resolver
- `frontend/src/graphql/queries/evidence-files.ts` - GraphQL mutations

## Support

For questions or issues:
1. Check this implementation guide
2. Review component source code
3. Check GraphQL schema
4. Verify Edge.props structure in database
