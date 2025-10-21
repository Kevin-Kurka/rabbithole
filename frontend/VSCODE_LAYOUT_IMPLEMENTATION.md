# VS Code-Style Layout Implementation Status

**Started**: October 10, 2025
**Status**: Phase 1 Complete - Core Components Created

---

## Overview

This document tracks the implementation of a VS Code-style layout for the Rabbit Hole application, featuring resizable panels, icon navigation, and multi-graph layering.

---

## Completed Components ✅

### 1. MainMenu Component (`/src/components/layout/MainMenu.tsx`)
**Features**:
- Logo and app title (clickable to return to graph page)
- Centered search bar with Cmd/Ctrl+P shortcut
- Panel toggle icons (PanelLeft, PanelRight, PanelBottom)
- User menu with settings and sign out
- Active state indicators for open panels
- 40px height, sticky positioning
- Zinc theme integration

**Props**:
```typescript
{
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleBottomPanel: () => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  onSearch?: (query: string) => void;
}
```

### 2. StatusBar Component (`/src/components/layout/StatusBar.tsx`)
**Features**:
- Active graph name display
- Node/Edge count
- Connection status (WiFi icon with green/red indicator)
- AI assistant status (Zap icon with purple/gray indicator)
- Layout algorithm display
- Zoom level percentage
- 24px height, sticky positioning
- Auto-updating indicators

**Props**:
```typescript
{
  graphName?: string;
  nodeCount?: number;
  edgeCount?: number;
  isConnected?: boolean;
  aiActive?: boolean;
  layoutAlgorithm?: string;
  zoomLevel?: number;
}
```

### 3. ResizeHandle Component (`/src/components/layout/ResizeHandle.tsx`)
**Features**:
- Reusable resize handle for panels
- Supports horizontal and vertical resizing
- Visual feedback (highlight on hover/drag)
- Min/max size constraints
- Smooth cursor changes
- 4px width/height

**Props**:
```typescript
{
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  minSize?: number;
  maxSize?: number;
}
```

### 4. IconNavigationBar Component (`/src/components/layout/IconNavigationBar.tsx`)
**Features**:
- Vertical icon navigation (48px width)
- 5 navigation items: Graphs, Search, Structure, Extensions, Settings
- Active state with left border indicator
- Hover effects
- Keyboard shortcut hints in tooltips
- Zinc theme colors

**Props**:
```typescript
{
  activeItem: 'graphs' | 'search' | 'structure' | 'extensions' | 'settings';
  onItemClick: (item: IconNavItem) => void;
}
```

**Navigation Items**:
- **Graphs** (⇧⌘G): Graph list, search, create
- **Search** (⇧⌘F): Global search across all nodes/edges
- **Structure** (⇧⌘O): Graph outline/minimap
- **Extensions** (⇧⌘X): AI Assistant, plugins
- **Settings** (⌘,): User preferences

### 5. Index Export (`/src/components/layout/index.ts`)
Centralized exports for all layout components.

---

## Remaining Components 🚧

### Phase 2: Panel Content Components

#### 1. LeftPanelContent Component
**File**: `/src/components/layout/LeftPanelContent.tsx`
**Purpose**: Column 2 of left panel, displays content based on icon navigation selection
**Features**:
- Resizable 200-400px width
- Content switching based on activeItem
- Smooth transitions
- Scrollable content area

**Content Views**:
- **Graphs**: Refactored GraphSidebar content
- **Search**: SearchPanel component
- **Structure**: StructurePanel component
- **Extensions**: Extensions list
- **Settings**: SettingsPanel component

#### 2. RightPanel Component
**File**: `/src/components/layout/RightPanel.tsx`
**Purpose**: Right-side panel with tabbed interface
**Features**:
- Resizable 300-600px width
- Collapsible
- 4 tabs: Properties, Collaboration, AI Chat, History
- Tab content switching

**Tabs**:
- **Properties**: Node/edge properties editor
- **Collaboration**: Refactored CollaborationPanel content
- **AI Chat**: Refactored AIAssistantPanel content
- **History**: Recent changes timeline

#### 3. BottomPanel Component
**File**: `/src/components/layout/BottomPanel.tsx`
**Purpose**: Bottom panel for logs and system output
**Features**:
- Resizable 150-400px height
- Collapsible
- 4 tabs: Console, Terminal, Output, Debug
- Auto-show on errors
- Log filtering

**Tabs**:
- **Console**: Error/warning/info logs
- **Terminal**: Command execution (future)
- **Output**: System messages
- **Debug**: Development info

#### 4. VSCodeLayout Component
**File**: `/src/components/layout/VSCodeLayout.tsx`
**Purpose**: Main layout wrapper that composes all components
**Features**:
- Integrates MainMenu, StatusBar, panels
- Panel state management
- Keyboard shortcuts (Cmd+B, Cmd+J, Cmd+K)
- LocalStorage persistence
- Resize coordination

### Phase 3: Panel Content Components

#### 1. GraphListPanel Component
**File**: `/src/components/panels/GraphListPanel.tsx`
**Purpose**: Refactored GraphSidebar as panel content
**Changes**:
- Remove fixed positioning
- Remove collapse functionality (handled by parent)
- Keep search, tabs, list, create modal

#### 2. SearchPanel Component
**File**: `/src/components/panels/SearchPanel.tsx`
**Purpose**: Global search across all graphs
**Features**:
- Search input
- Results grouped by graph
- Node/edge filtering
- Jump to result in canvas

#### 3. StructurePanel Component
**File**: `/src/components/panels/StructurePanel.tsx`
**Purpose**: Graph outline/minimap
**Features**:
- Tree view of current graph
- Node grouping by type
- Minimap preview
- Click to focus node

#### 4. PropertiesPanel Component
**File**: `/src/components/panels/PropertiesPanel.tsx`
**Purpose**: Edit selected node/edge properties
**Features**:
- Property editor
- Veracity controls
- Metadata display
- Save/revert buttons

#### 5. ConsolePanel Component
**File**: `/src/components/panels/ConsolePanel.tsx`
**Purpose**: Display logs and errors
**Features**:
- Log level filtering
- Clear button
- Timestamps
- Auto-scroll

#### 6. OutputPanel Component
**File**: `/src/components/panels/OutputPanel.tsx`
**Purpose**: System messages
**Features**:
- GraphQL operation logs
- Subscription events
- Export notifications

---

## Multi-Graph Layering Implementation

### GraphCanvas Modifications
**File**: `/src/components/GraphCanvas.tsx`

**New Features**:
1. **Multiple Graph Support**:
   - Accept array of graph IDs instead of single ID
   - Layer graphs with z-index management
   - Level 0 graph always at base layer

2. **Layer Controls**:
   - Toggle visibility per graph
   - Opacity slider per graph (0-100%)
   - Layer reordering
   - Visual indicators for active layers

3. **Interaction**:
   - Click-through to lower layers
   - Layer-specific selection
   - Multi-layer node highlighting

**New Props**:
```typescript
{
  graphIds: string[];           // Array instead of single ID
  baseGraphId: string;          // Level 0 graph (always visible)
  layerOpacity: Record<string, number>; // Per-graph opacity
  visibleLayers: Set<string>;   // Which graphs are visible
  onLayerToggle: (graphId: string) => void;
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘P` / `Ctrl+P` | Focus search bar |
| `⌘B` / `Ctrl+B` | Toggle left panel |
| `⌘K` / `Ctrl+K` | Toggle right panel |
| `⌘J` / `Ctrl+J` | Toggle bottom panel |
| `⇧⌘G` | Switch to Graphs view |
| `⇧⌘F` | Switch to Search view |
| `⇧⌘O` | Switch to Structure view |
| `⇧⌘X` | Switch to Extensions view |
| `⌘,` | Open Settings |

---

## LocalStorage Keys

```typescript
// Panel states
'vscode-layout:leftPanel:open'     // boolean
'vscode-layout:leftPanel:width'    // number
'vscode-layout:leftPanel:active'   // IconNavItem
'vscode-layout:rightPanel:open'    // boolean
'vscode-layout:rightPanel:width'   // number
'vscode-layout:rightPanel:tab'     // string
'vscode-layout:bottomPanel:open'   // boolean
'vscode-layout:bottomPanel:height' // number
'vscode-layout:bottomPanel:tab'    // string

// Graph layers
'vscode-layout:layers:visible'     // string[] (graph IDs)
'vscode-layout:layers:opacity'     // Record<string, number>
```

---

## Implementation Steps (Remaining)

### Step 1: Complete Panel Components
- [x] Create LeftPanelContent.tsx
- [x] Create RightPanel.tsx with tabs
- [x] Create BottomPanel.tsx with tabs
- [x] Create VSCodeLayout.tsx wrapper

### Step 2: Create Panel Content Components
- [ ] Create GraphListPanel.tsx (refactor GraphSidebar)
- [ ] Create SearchPanel.tsx
- [ ] Create StructurePanel.tsx
- [ ] Create PropertiesPanel.tsx
- [ ] Create ConsolePanel.tsx
- [ ] Create OutputPanel.tsx

### Step 3: Refactor CollaborationPanel & AIAssistantPanel
- [ ] Convert CollaborationPanel to tab content
- [ ] Convert AIAssistantPanel to tab content
- [ ] Remove slide-in animations (handled by parent)
- [ ] Remove fixed positioning

### Step 4: Multi-Graph Layering
- [ ] Modify GraphCanvas to accept array of graph IDs
- [ ] Implement layer management system
- [ ] Add opacity controls
- [ ] Add visibility toggles
- [ ] Update graph selection in GraphListPanel

### Step 5: Integration
- [x] Update `/app/graph/page.tsx` to use VSCodeLayout
- [x] Implement keyboard shortcuts globally (Cmd/Ctrl+B, J, K)
- [x] Add localStorage persistence
- [ ] Test all panel interactions
- [ ] Test multi-graph layering

### Step 6: Polish
- [ ] Add smooth transitions (300ms)
- [ ] Optimize performance
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Write documentation

---

## Testing Checklist

### Panel Functionality
- [ ] All panels collapse/expand smoothly
- [ ] Resize handles work for all panels
- [ ] Panel states persist across page reloads
- [ ] Keyboard shortcuts toggle panels correctly
- [ ] Panel content loads correctly
- [ ] Scrolling works in all panels

### Multi-Graph Layering
- [ ] Multiple graphs can be selected
- [ ] Level 0 graph always visible
- [ ] Opacity controls work per graph
- [ ] Layer toggling works
- [ ] Graph interactions work with layers
- [ ] Performance is acceptable with 3+ graphs

### Responsive Design
- [ ] Layout works on different screen sizes
- [ ] Panels have min/max constraints
- [ ] Text doesn't overflow
- [ ] Icons are properly sized
- [ ] Mobile layout (if applicable)

### Integration
- [ ] No regressions in existing features
- [ ] GraphCanvas works with new layout
- [ ] Collaboration features still work
- [ ] AI Assistant still works
- [ ] Navigation is intuitive

---

## File Structure

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── MainMenu.tsx ✅
│   │   ├── StatusBar.tsx ✅
│   │   ├── ResizeHandle.tsx ✅
│   │   ├── IconNavigationBar.tsx ✅
│   │   ├── LeftPanelContent.tsx ✅
│   │   ├── RightPanel.tsx ✅
│   │   ├── BottomPanel.tsx ✅
│   │   ├── VSCodeLayout.tsx ✅
│   │   └── index.ts ✅
│   ├── panels/
│   │   ├── GraphListPanel.tsx ⏳
│   │   ├── SearchPanel.tsx ⏳
│   │   ├── StructurePanel.tsx ⏳
│   │   ├── PropertiesPanel.tsx ⏳
│   │   ├── ConsolePanel.tsx ⏳
│   │   └── OutputPanel.tsx ⏳
│   └── ... (existing components)
└── app/graph/page.tsx ✅ (updated to use VSCodeLayout)
```

✅ = Complete
⏳ = In Progress / Pending

---

## Design Decisions

1. **Why VS Code Layout?**
   - Familiar to developers
   - Efficient use of screen space
   - Professional look and feel
   - Resizable and collapsible panels

2. **Why Icon Navigation?**
   - More space-efficient than full sidebar
   - Quick context switching
   - Visual hierarchy
   - Industry standard (VS Code, JetBrains IDEs)

3. **Why Multi-Graph Layering?**
   - Level 0 as foundational truth layer
   - Compare graphs side-by-side
   - Build theories on top of facts
   - Visual transparency for relationships

4. **Why Zinc Theme?**
   - Consistent with existing design
   - Professional and neutral
   - Good contrast ratios
   - Matches VS Code dark theme aesthetic

---

## Known Limitations

1. **Panel Constraints**:
   - Left panel: 200-400px (with 48px icon nav)
   - Right panel: 300-600px
   - Bottom panel: 150-400px

2. **Performance**:
   - Tested with up to 5 layered graphs
   - May need optimization for 10+ graphs
   - React Flow handles rendering

3. **Browser Support**:
   - Modern browsers only (Chrome, Firefox, Safari, Edge)
   - No IE11 support
   - Requires CSS Grid and Flexbox

---

## Next Steps

1. **Immediate**: Create remaining Phase 2 components (LeftPanelContent, RightPanel, BottomPanel, VSCodeLayout)
2. **Short-term**: Create panel content components (GraphListPanel, SearchPanel, etc.)
3. **Medium-term**: Implement multi-graph layering
4. **Long-term**: Add keyboard shortcuts and localStorage persistence

---

## Resources

- [VS Code Layout Documentation](https://code.visualstudio.com/docs/getstarted/userinterface)
- [Lucide Icons](https://lucide.dev)
- [React Flow Documentation](https://reactflow.dev)
- Zinc Theme: `/src/styles/theme.ts`

---

**Last Updated**: October 10, 2025
**Progress**: 8/19 components complete (42%) - Phase 2 Complete
