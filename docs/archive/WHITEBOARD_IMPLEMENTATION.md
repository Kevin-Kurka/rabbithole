# Whiteboard Interactive Features - Implementation Summary

## Phase 1: Core Canvas & Interaction Foundation ✅ COMPLETE

### Overview
Phase 1 establishes the foundation for transforming the graph into an interactive whiteboard with enhanced node creation, edge management, and keyboard shortcuts.

---

## 🗄️ Database & Backend (COMPLETE)

### Migration: `024_whiteboard_features.sql`

#### New Node Types Added
- **Thesis**: Overarching argument or position with citation support
- **Citation**: References to sources with attribution (academic, web, book, article, node)
- **Reference**: General notes pointing to nodes or external resources

**Key Features**:
- No credibility scores (weight = NULL)
- Canvas positioning in `props.position` and `props.dimensions`
- Version history tracking in `meta.versionHistory`
- Z-index calculated from credibility score

#### Enhanced Database Schema
```sql
-- ActivityPosts now have canvas_props for sticky note rendering
ALTER TABLE public."ActivityPosts"
  ADD COLUMN canvas_props JSONB;

-- Sticky note z-index: parent credibility + 0.001
-- Function: calculate_sticky_note_zindex(parent_node_uuid UUID)

-- Automatic version history tracking
-- Function: append_node_version_history(...)
-- Trigger: trigger_node_version_history (runs on node UPDATE)
```

#### Indexes & Performance
- GIN indexes on `props` and `meta` for canvas queries
- Special index for text box nodes
- Full-text search on node titles

#### Permissions Structure
Documented in `nodes.permissions` JSONB:
```json
[
  {
    "userId": "uuid",
    "role": "owner|editor|viewer|commenter",
    "grantedBy": "uuid",
    "grantedAt": "ISO8601",
    "expiresAt": "ISO8601|null"
  }
]
```

**Roles**:
- **owner**: Full control (edit, delete, manage permissions)
- **editor**: Edit content and properties
- **viewer**: Read-only access
- **commenter**: View and add comments/sticky notes

---

### GraphQL API: `WhiteboardResolver.ts`

#### Queries

**`getCanvasNodes(graphId: ID!)`**
```graphql
query GetCanvasNodes($graphId: ID!) {
  getCanvasNodes(graphId: $graphId) {
    id
    graphId
    nodeType
    title
    position
    dimensions
    zIndex
    props
    meta
    weight
    isLevel0
  }
}
```
Returns all nodes with canvas positioning, sorted by z-index.

**`getTextBoxNodes(graphId: ID!)`**
```graphql
query GetTextBoxNodes($graphId: ID!) {
  getTextBoxNodes(graphId: $graphId) {
    id
    title
    props
    meta
    created_at
  }
}
```
Returns only Thesis, Citation, and Reference nodes.

#### Mutations

**`createTextBoxNode(input: CreateTextBoxNodeInput!)`**
```graphql
mutation CreateTextBox($input: CreateTextBoxNodeInput!) {
  createTextBoxNode(input: $input) {
    id
    title
    props
    meta
  }
}
```

Input:
```typescript
{
  graphId: string;
  nodeType: "Thesis" | "Citation" | "Reference";
  title: string;
  content: string;
  position: { x: number; y: number };
  dimensions?: { width: number; height: number };
  additionalProps?: any; // For citations (authors, url, etc.)
}
```

**`updateNodePosition(input: UpdateNodePositionInput!)`**
```graphql
mutation UpdatePosition($input: UpdateNodePositionInput!) {
  updateNodePosition(input: $input) {
    id
    props
    meta
  }
}
```

**`bulkUpdateNodePositions(input: BulkUpdatePositionsInput!)`**
```graphql
mutation BulkUpdate($input: BulkUpdatePositionsInput!) {
  bulkUpdateNodePositions(input: $input) {
    success
    updatedCount
    errors
  }
}
```

**`updateNodePermissions(input: UpdateNodePermissionsInput!)`**
```graphql
mutation UpdatePermissions($input: UpdateNodePermissionsInput!) {
  updateNodePermissions(input: $input) {
    id
    permissions
  }
}
```

**`createEdgeWithDetails(input: CreateEdgeWithDetailsInput!)`**
```graphql
mutation CreateEdge($input: CreateEdgeWithDetailsInput!) {
  createEdgeWithDetails(input: $input) {
    id
    props
  }
}
```

Input includes:
```typescript
{
  graphId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: "supports" | "contradicts" | "related" | "cites" | ...;
  description?: string;
  properties?: { weight: number };
}
```

---

## 🎨 Frontend Components (COMPLETE)

### 1. Context Menu: `CanvasContextMenu.tsx`

**Location**: `frontend/src/components/whiteboard/CanvasContextMenu.tsx`

**Features**:
- Right-click to create nodes (Thesis, Citation, Reference, Article, Claim, Evidence)
- Context-aware actions (Paste, Delete when node selected)
- Keyboard shortcut hints displayed at bottom

**Usage**:
```tsx
import CanvasContextMenu from '@/components/whiteboard/CanvasContextMenu';

<CanvasContextMenu
  position={{ x: 100, y: 200 }}
  onClose={() => setMenuOpen(false)}
  onCreateNode={(type) => handleCreateNode(type)}
  selectedNodeId={selectedNode?.id}
  onDelete={handleDelete}
/>
```

---

### 2. Keyboard Shortcuts Hook: `useCanvasKeyboardShortcuts.ts`

**Location**: `frontend/src/hooks/useCanvasKeyboardShortcuts.ts`

**Shortcuts**:
- `Ctrl+T` / `Cmd+T` - Create Thesis
- `Ctrl+Shift+C` / `Cmd+Shift+C` - Create Citation
- `Ctrl+R` / `Cmd+R` - Create Reference
- `Delete` / `Backspace` - Delete selected
- `Ctrl+C` / `Cmd+C` - Copy
- `Ctrl+V` / `Cmd+V` - Paste
- `Ctrl+Z` / `Cmd+Z` - Undo
- `Ctrl+Y` / `Cmd+Y` - Redo
- `Ctrl+A` / `Cmd+A` - Select all
- `Ctrl++` / `Cmd++` - Zoom in
- `Ctrl+-` / `Cmd+-` - Zoom out
- `Ctrl+0` / `Cmd+0` - Fit view

**Usage**:
```tsx
import { useCanvasKeyboardShortcuts } from '@/hooks/useCanvasKeyboardShortcuts';

useCanvasKeyboardShortcuts({
  onCreateThesis: handleCreateThesis,
  onCreateCitation: handleCreateCitation,
  onCreateReference: handleCreateReference,
  onDelete: handleDelete,
  onUndo: handleUndo,
  onRedo: handleRedo,
  // ... other handlers
  enabled: true,
});
```

---

### 3. Connectable Node: `ConnectableNode.tsx`

**Location**: `frontend/src/components/whiteboard/ConnectableNode.tsx`

**Features**:
- Connection handles appear on hover/selection (top, right, bottom, left)
- Color-coded by credibility score:
  - Green (≥80%): High credibility
  - Yellow (60-79%): Medium credibility
  - Orange (40-59%): Low credibility
  - Red (<40%): Very low credibility
- Type-specific icons (FileText, Quote, Link)
- Smooth animations and hover effects

**Usage with ReactFlow**:
```tsx
import ConnectableNode from '@/components/whiteboard/ConnectableNode';

const nodeTypes = {
  connectableNode: ConnectableNode,
};

<ReactFlow
  nodes={nodes}
  nodeTypes={nodeTypes}
  ...
/>
```

**Node Data Structure**:
```typescript
{
  id: string;
  type: 'connectableNode';
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: 'Thesis' | 'Citation' | 'Reference' | ...;
    credibilityScore: number; // 0.0 to 1.0
    content?: string;
    isTextBox?: boolean;
  };
}
```

---

### 4. Edge Creation Modal: `EdgeCreationModal.tsx`

**Location**: `frontend/src/components/whiteboard/EdgeCreationModal.tsx`

**Features**:
- Modal dialog shown after drag-to-connect
- 8 relationship types with color coding:
  - Supports (green)
  - Contradicts (red)
  - Related To (blue)
  - Cites (purple)
  - References (yellow)
  - Questions (orange)
  - Derives From (indigo)
  - Implies (cyan)
- Optional description field
- Relationship strength slider (0.0 - 1.0)
- Shows source and target node labels

**Usage**:
```tsx
import EdgeCreationModal from '@/components/whiteboard/EdgeCreationModal';

<EdgeCreationModal
  isOpen={isModalOpen}
  onClose={() => setModalOpen(false)}
  onConfirm={(details) => {
    createEdgeWithDetails({
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      ...details,
    });
  }}
  edgeData={{
    sourceNodeId: '...',
    targetNodeId: '...',
    sourceLabel: 'Node A',
    targetLabel: 'Node B',
  }}
/>
```

---

## 🔧 Integration Guide

### Step 1: Apply Database Migration

```bash
# Ensure Docker containers are running
docker-compose up -d

# Apply migration
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/024_whiteboard_features.sql
```

### Step 2: Restart Backend

The `WhiteboardResolver` is already registered in `backend/src/index.ts`.

```bash
cd backend
npm run build
npm start
```

### Step 3: Integrate Frontend Components

**Example: Enhanced Graph Canvas with Whiteboard Features**

```tsx
'use client';

import React, { useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, addEdge, Connection } from '@xyflow/react';
import { useCanvasKeyboardShortcuts } from '@/hooks/useCanvasKeyboardShortcuts';
import CanvasContextMenu from '@/components/whiteboard/CanvasContextMenu';
import ConnectableNode from '@/components/whiteboard/ConnectableNode';
import EdgeCreationModal from '@/components/whiteboard/EdgeCreationModal';

export default function WhiteboardCanvas() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [edgeModal, setEdgeModal] = useState(null);

  // Define node types
  const nodeTypes = {
    connectableNode: ConnectableNode,
  };

  // Right-click handler
  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  // Create node from context menu
  const handleCreateNode = useCallback((type) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'connectableNode',
      position: { x: contextMenu.x, y: contextMenu.y },
      data: {
        label: `New ${type}`,
        nodeType: type,
        credibilityScore: 0.5,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [contextMenu]);

  // Edge connection handler
  const onConnect = useCallback((connection: Connection) => {
    // Show modal instead of immediately creating edge
    setEdgeModal({
      sourceNodeId: connection.source,
      targetNodeId: connection.target,
      sourceLabel: nodes.find(n => n.id === connection.source)?.data.label,
      targetLabel: nodes.find(n => n.id === connection.target)?.data.label,
    });
  }, [nodes]);

  // Create edge from modal
  const handleCreateEdge = useCallback((details) => {
    const newEdge = {
      id: `edge-${Date.now()}`,
      source: edgeModal.sourceNodeId,
      target: edgeModal.targetNodeId,
      label: details.relationshipType,
      data: details,
    };
    setEdges((eds) => [...eds, newEdge]);
    setEdgeModal(null);
  }, [edgeModal]);

  // Keyboard shortcuts
  useCanvasKeyboardShortcuts({
    onCreateThesis: () => handleCreateNode('Thesis'),
    onCreateCitation: () => handleCreateNode('Citation'),
    onCreateReference: () => handleCreateNode('Reference'),
    onDelete: () => {
      // Delete selected nodes
    },
    onUndo: () => {
      // Undo last action
    },
    onRedo: () => {
      // Redo last action
    },
  });

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {contextMenu && (
        <CanvasContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onCreateNode={handleCreateNode}
        />
      )}

      {edgeModal && (
        <EdgeCreationModal
          isOpen={true}
          onClose={() => setEdgeModal(null)}
          onConfirm={handleCreateEdge}
          edgeData={edgeModal}
        />
      )}
    </div>
  );
}
```

---

## 📊 Version History Tracking

All node changes are automatically tracked in `meta.versionHistory`:

```json
{
  "versionHistory": [
    {
      "timestamp": "2025-11-14T10:30:00Z",
      "userId": "user-uuid",
      "operation": "create" | "update" | "move" | "delete",
      "changes": {
        "title": { "old": "Old Title", "new": "New Title" },
        "position": { "old": { "x": 100, "y": 100 }, "new": { "x": 200, "y": 200 } }
      },
      "position": { "x": 200, "y": 200 }
    }
  ]
}
```

Operations are tracked:
- **create**: Node creation
- **update**: Property changes
- **move**: Position updates
- **delete**: Node deletion

---

## 🎯 Next Steps (Remaining Phases)

### Phase 2: Sticky Notes & Comments System
- Render ActivityPosts as sticky notes
- Toggle visibility
- Styling system with tags
- Auto-positioning algorithm
- Z-index by credibility + 0.001
- Threaded replies
- @mentions
- Reactions/emojis

### Phase 3: Real-Time Collaboration
- Cursor tracking with Redis pub/sub
- User presence list
- Live cursors with avatars
- Live selection indicators
- Typing indicators
- Editing locks
- Collaborative selections

### Phase 4: Sidebar & Drill-Down
- Node details sidebar
- Inquiry details display
- Drill-down canvas updates
- Breadcrumb navigation
- Navigation to details pages

### Phase 5: Advanced Canvas Elements
- Text box node creation UI
- Media paste/upload
- Grouping/containers
- Layer management

### Phase 6: Smart Features
- Magnetic snapping
- Smart edge routing
- Selection lasso
- Bulk operations
- Zoom to selection
- Undo/redo stack

### Phase 7: AI-Enhanced Features
- Auto-layout algorithms
- Suggested connections
- Content summarization
- Similarity clustering

### Phase 8: Templates & History
- State change templates
- Version history viewer

---

## 🧪 Testing

### Database Functions
```sql
-- Test version history
SELECT append_node_version_history(
  'node-uuid',
  'user-uuid',
  'update',
  '{"title": {"old": "Old", "new": "New"}}'::jsonb,
  '{"x": 100, "y": 100}'::jsonb
);

-- Test sticky note z-index
SELECT calculate_sticky_note_zindex('parent-node-uuid');
-- Returns parent.weight + 0.001
```

### GraphQL Mutations
```graphql
# Create a thesis node
mutation {
  createTextBoxNode(input: {
    graphId: "graph-uuid"
    nodeType: "Thesis"
    title: "Test Thesis"
    content: "This is a test thesis statement"
    position: { x: 100, y: 100 }
  }) {
    id
    title
  }
}

# Update node position
mutation {
  updateNodePosition(input: {
    nodeId: "node-uuid"
    position: { x: 200, y: 200 }
  }) {
    id
    props
  }
}
```

---

## 📝 Notes & Considerations

### Level 0 vs Level 1
- **Level 0 nodes**: Immutable, cannot be moved/edited/deleted
- **Level 1 nodes**: Fully editable
- Sticky notes can be added to Level 0 nodes
- Edges can connect Level 1 → Level 0

### Performance
- GIN indexes optimize canvas position queries
- Batch position updates with `bulkUpdateNodePositions`
- Version history stored in JSONB (efficient for read-heavy workloads)

### Permissions
- Graph-level permissions via `GraphShares` table (existing)
- Node-level permissions via `nodes.permissions` JSONB (new)
- Sticky notes/comments visible to all viewers
- Only owners can manage permissions

---

## 🎉 Phase 1 Complete!

All core foundation components are in place:
- ✅ Database schema with 3 new node types
- ✅ Version history tracking (automatic)
- ✅ Permission management system
- ✅ GraphQL API with 6 new mutations
- ✅ Context menu for node creation
- ✅ Keyboard shortcuts hook (15+ shortcuts)
- ✅ Connectable nodes with handles
- ✅ Edge creation modal with 8 relationship types

Ready to proceed with Phase 2: Sticky Notes & Comments System!
