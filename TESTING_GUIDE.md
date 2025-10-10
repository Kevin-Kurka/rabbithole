# GraphCanvas Integration - Testing Guide

## Prerequisites

### 1. Environment Setup
Ensure `.env.local` has these variables:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_GRAPHQL_HTTP_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:4000/graphql
```

### 2. Services Running
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Test Data
Ensure you have at least one graph in the database with some nodes and edges.

---

## Manual Testing Checklist

### Test Suite 1: Authentication & Access Control

#### Test 1.1: Unauthenticated Access
**Steps**:
1. Open browser in incognito mode
2. Navigate to `http://localhost:3000/graph`

**Expected**:
- [ ] Redirect to sign-in page OR show "Access Denied" message
- [ ] "Sign in" button visible and functional
- [ ] No graph canvas visible

#### Test 1.2: Authenticated Access
**Steps**:
1. Sign in with valid credentials
2. Navigate to `/graph`

**Expected**:
- [ ] Empty state shows if no graph selected
- [ ] CommandMenu FAB button visible in top-left
- [ ] No errors in console
- [ ] Page loads within 2 seconds

---

### Test Suite 2: Graph Selection

#### Test 2.1: Open CommandMenu
**Steps**:
1. Click the FAB button (BrainCircuit icon)
2. OR press `Cmd+K` (Mac) / `Ctrl+K` (Windows)

**Expected**:
- [ ] CommandMenu slides in from left
- [ ] Search bar is auto-focused
- [ ] "New Graph" button visible
- [ ] Recent and Trending sections visible
- [ ] Lock icons appear on Level 0 graphs

#### Test 2.2: Select Graph
**Steps**:
1. Open CommandMenu
2. Click on a graph from the list

**Expected**:
- [ ] Graph ID appears in activeGraphs state
- [ ] GraphCanvas renders within 1 second
- [ ] Nodes appear with correct positions
- [ ] Edges connect the correct nodes
- [ ] CommandMenu stays open (current behavior)

#### Test 2.3: Close CommandMenu
**Steps**:
1. Press `Escape` key
2. OR click outside the menu

**Expected**:
- [ ] Menu closes smoothly
- [ ] Graph canvas still visible
- [ ] FAB button reappears

---

### Test Suite 3: Veracity Visualization

#### Test 3.1: Node Colors
**Steps**:
1. Select a graph with various node weights
2. Inspect node colors

**Expected**:
- [ ] Level 0 nodes (weight=1.0): Green (#10b981)
- [ ] High confidence (0.7-0.99): Lime (#84cc16)
- [ ] Medium confidence (0.4-0.69): Yellow (#eab308)
- [ ] Low confidence (0.1-0.39): Orange (#f97316)
- [ ] Provisional (0.0-0.09): Red (#ef4444)

#### Test 3.2: Lock Icons
**Steps**:
1. Find a Level 0 node
2. Check for lock icon

**Expected**:
- [ ] Lock icon visible in top-right corner of node
- [ ] Icon has transparent background
- [ ] Cursor shows "not-allowed" on hover

#### Test 3.3: Veracity Badge
**Steps**:
1. Hover over various nodes
2. Check the veracity badge text

**Expected**:
- [ ] Level 0: "Level 0 - Verified"
- [ ] Others: "XX% confidence" (e.g., "85% confidence")

#### Test 3.4: Edge Colors
**Steps**:
1. Inspect edge colors
2. Find a low-confidence edge (< 0.4)

**Expected**:
- [ ] Edge colors match node color scheme
- [ ] Low-confidence edges have animated dashed lines
- [ ] Edge labels show veracity percentage

#### Test 3.5: Veracity Legend
**Steps**:
1. Select a graph
2. Check bottom-right corner

**Expected**:
- [ ] Legend overlay visible
- [ ] Shows 5 color tiers with labels
- [ ] Active graph ID displayed

---

### Test Suite 4: Node Interactions

#### Test 4.1: Select Node
**Steps**:
1. Click on a Level 1 node

**Expected**:
- [ ] Node gets blue selection ring
- [ ] Node remains at same position
- [ ] No other nodes selected

#### Test 4.2: Drag Level 1 Node
**Steps**:
1. Click and drag a Level 1 node
2. Release mouse button

**Expected**:
- [ ] Node follows cursor smoothly
- [ ] Node snaps to grid (15px)
- [ ] Position saves automatically
- [ ] No console errors
- [ ] UPDATE_NODE_MUTATION fires (check Network tab)

#### Test 4.3: Try to Drag Level 0 Node
**Steps**:
1. Try to drag a Level 0 node

**Expected**:
- [ ] Node does NOT move
- [ ] Cursor shows "not-allowed"
- [ ] No mutation fires

#### Test 4.4: Multi-Select Nodes
**Steps**:
1. Hold `Shift` key
2. Click multiple nodes

**Expected**:
- [ ] All clicked nodes get selection rings
- [ ] Can drag all selected nodes together (if all Level 1)
- [ ] Can delete all together

---

### Test Suite 5: Edge Interactions

#### Test 5.1: Create Edge
**Steps**:
1. Drag from a node's bottom handle
2. Release on another node's top handle

**Expected**:
- [ ] Connection preview line appears during drag
- [ ] Edge appears on release
- [ ] Edge has correct veracity color
- [ ] CREATE_EDGE_MUTATION fires
- [ ] Edge persists after page refresh

#### Test 5.2: Try to Connect to Level 0 Node
**Steps**:
1. Try to create edge from/to a Level 0 node

**Expected**:
- [ ] Connection is blocked
- [ ] No edge appears
- [ ] No mutation fires

#### Test 5.3: Select Edge
**Steps**:
1. Click on an edge

**Expected**:
- [ ] Edge becomes thicker (selected state)
- [ ] Edge label remains visible

#### Test 5.4: Delete Edge
**Steps**:
1. Select a Level 1 edge
2. Press `Delete` or `Backspace`

**Expected**:
- [ ] Edge disappears immediately
- [ ] DELETE_EDGE_MUTATION fires
- [ ] Connected nodes remain

---

### Test Suite 6: Context Menu

#### Test 6.1: Node Context Menu
**Steps**:
1. Right-click on a Level 1 node

**Expected**:
- [ ] Context menu appears at cursor position
- [ ] Menu items: Edit, Duplicate, Copy, Delete
- [ ] Keyboard shortcuts shown
- [ ] No items disabled

#### Test 6.2: Locked Node Context Menu
**Steps**:
1. Right-click on a Level 0 node

**Expected**:
- [ ] Context menu appears
- [ ] Edit, Duplicate, Delete are DISABLED
- [ ] Copy is ENABLED
- [ ] Disabled items show muted color

#### Test 6.3: Edge Context Menu
**Steps**:
1. Right-click on an edge

**Expected**:
- [ ] Context menu appears
- [ ] Menu items: Edit, Delete
- [ ] Items enabled/disabled based on Level

#### Test 6.4: Canvas Context Menu
**Steps**:
1. Right-click on empty canvas area

**Expected**:
- [ ] Context menu appears
- [ ] Shows "Paste" option
- [ ] Paste disabled if clipboard empty

#### Test 6.5: Execute Context Actions
**Steps**:
1. Open node context menu
2. Click "Copy"
3. Right-click canvas
4. Click "Paste"

**Expected**:
- [ ] Copy action: Node data saved to clipboard
- [ ] Paste action: New node appears at cursor
- [ ] New node has "(copy)" suffix

---

### Test Suite 7: Keyboard Shortcuts

#### Test 7.1: Cmd/Ctrl + K
**Steps**:
1. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)

**Expected**:
- [ ] CommandMenu opens
- [ ] Search field focused

#### Test 7.2: Delete/Backspace
**Steps**:
1. Select a Level 1 node or edge
2. Press `Delete` or `Backspace`

**Expected**:
- [ ] Item deleted immediately
- [ ] Mutation fires
- [ ] Undo history updated

#### Test 7.3: Cmd/Ctrl + Z (Undo)
**Steps**:
1. Delete a node
2. Press `Cmd+Z` (Mac) or `Ctrl+Z` (Windows)

**Expected**:
- [ ] Node reappears
- [ ] Position restored
- [ ] Edges restored

#### Test 7.4: Cmd/Ctrl + Shift + Z (Redo)
**Steps**:
1. Undo an action
2. Press `Cmd+Shift+Z` (Mac) or `Ctrl+Shift+Z` (Windows)

**Expected**:
- [ ] Action re-applied
- [ ] State matches before undo

#### Test 7.5: Cmd/Ctrl + C (Copy)
**Steps**:
1. Select a node
2. Press `Cmd+C` (Mac) or `Ctrl+C` (Windows)

**Expected**:
- [ ] Node copied to clipboard
- [ ] No visual feedback (silent operation)

#### Test 7.6: Escape
**Steps**:
1. Open CommandMenu or ContextMenu
2. Press `Escape`

**Expected**:
- [ ] Menu closes
- [ ] Focus returns to canvas

---

### Test Suite 8: Real-Time Collaboration

#### Test 8.1: Two-Browser Node Creation
**Steps**:
1. Open `/graph` in Browser A
2. Open `/graph` in Browser B (same graph)
3. In Browser A, create a new node

**Expected**:
- [ ] Node appears in Browser A immediately
- [ ] Node appears in Browser B within 500ms
- [ ] Both browsers show same node
- [ ] Veracity colors match

#### Test 8.2: Two-Browser Node Update
**Steps**:
1. In Browser A, drag a node
2. Watch Browser B

**Expected**:
- [ ] Browser B updates within 500ms
- [ ] Node moves to same position
- [ ] No jitter or flickering

#### Test 8.3: Two-Browser Node Deletion
**Steps**:
1. In Browser A, delete a node
2. Watch Browser B

**Expected**:
- [ ] Node disappears in Browser B
- [ ] Connected edges also disappear
- [ ] No orphaned edges

#### Test 8.4: Subscription Filtering
**Steps**:
1. Open Graph X in Browser A
2. Open Graph Y in Browser B
3. Create node in Graph X

**Expected**:
- [ ] Update appears in Browser A only
- [ ] Browser B shows NO change
- [ ] No unnecessary network traffic

---

### Test Suite 9: Error Handling

#### Test 9.1: Network Disconnection
**Steps**:
1. Select a graph
2. Disable network in DevTools
3. Try to create a node

**Expected**:
- [ ] Error notification appears in top-right
- [ ] Error message is clear and actionable
- [ ] Error auto-dismisses after 5 seconds
- [ ] Canvas remains interactive

#### Test 9.2: Invalid Graph ID
**Steps**:
1. Manually set activeGraphs to invalid ID
2. Watch behavior

**Expected**:
- [ ] Error notification appears
- [ ] GraphQL error logged to console
- [ ] No crash or blank screen
- [ ] User can select different graph

#### Test 9.3: Backend Server Down
**Steps**:
1. Stop backend server
2. Try to load graph

**Expected**:
- [ ] Loading state appears
- [ ] Eventually shows error message
- [ ] "Network error" or similar
- [ ] Graceful degradation

---

### Test Suite 10: UI/UX Polish

#### Test 10.1: Loading States
**Steps**:
1. Select a large graph
2. Watch loading behavior

**Expected**:
- [ ] Loading spinner appears immediately
- [ ] Canvas shows within 2 seconds
- [ ] No flash of unstyled content
- [ ] Smooth transition to loaded state

#### Test 10.2: Empty State
**Steps**:
1. Clear activeGraphs
2. Check empty state

**Expected**:
- [ ] BrainCircuit icon centered
- [ ] "No graph selected" message
- [ ] Instructions mention Cmd+K
- [ ] Professional appearance

#### Test 10.3: Responsive Behavior
**Steps**:
1. Resize browser window
2. Try various sizes

**Expected**:
- [ ] Canvas scales properly
- [ ] Minimap repositions
- [ ] Controls remain accessible
- [ ] No horizontal scrollbar

#### Test 10.4: Dark Theme Consistency
**Steps**:
1. Check all UI elements
2. Compare colors to theme.ts

**Expected**:
- [ ] All backgrounds use zinc palette
- [ ] Text colors readable
- [ ] Borders subtle but visible
- [ ] No white backgrounds

#### Test 10.5: Hover States
**Steps**:
1. Hover over nodes, edges, buttons

**Expected**:
- [ ] Cursor changes appropriately
- [ ] Subtle feedback on hover
- [ ] No jarring color changes
- [ ] Smooth transitions

---

### Test Suite 11: Performance

#### Test 11.1: Large Graph (100+ nodes)
**Steps**:
1. Load a graph with 100+ nodes
2. Drag a node
3. Zoom in/out

**Expected**:
- [ ] Initial load < 3 seconds
- [ ] Dragging remains smooth (60fps)
- [ ] Zoom/pan responsive
- [ ] No browser lag

#### Test 11.2: Rapid Node Creation
**Steps**:
1. Create 10 nodes quickly
2. Watch performance

**Expected**:
- [ ] Each node appears within 200ms
- [ ] No queueing or delays
- [ ] Mutations batched if possible
- [ ] No memory leaks (check DevTools)

#### Test 11.3: Subscription Performance
**Steps**:
1. Open in 5+ browsers
2. Create nodes in one browser
3. Watch others

**Expected**:
- [ ] All browsers update correctly
- [ ] No duplicate updates
- [ ] Network traffic reasonable
- [ ] No crashes or disconnects

---

### Test Suite 12: Browser Compatibility

#### Test 12.1: Chrome/Edge
**Expected**:
- [ ] All features work
- [ ] Smooth animations
- [ ] No console warnings

#### Test 12.2: Firefox
**Expected**:
- [ ] All features work
- [ ] Keyboard shortcuts work
- [ ] WebSocket subscriptions work

#### Test 12.3: Safari
**Expected**:
- [ ] All features work
- [ ] Cmd key shortcuts work
- [ ] No WebKit-specific issues

---

## Automated Testing

### Unit Tests
```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage
```

**Expected Coverage**:
- [ ] Components: > 80%
- [ ] Utils: > 90%
- [ ] Types: 100% (TypeScript)

### Integration Tests
```bash
# Run integration tests
npm run test:integration
```

**Test Scenarios**:
- [ ] GraphCanvas renders with mock data
- [ ] Mutations execute correctly
- [ ] Subscriptions update state
- [ ] Context menu actions work

### E2E Tests (Playwright)
```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e:headed
```

**Test Scenarios**:
- [ ] Full user journey (login → select graph → interact)
- [ ] Real-time collaboration
- [ ] Error scenarios

---

## Performance Benchmarks

### Metrics to Track
1. **Initial Load Time**
   - Target: < 2 seconds for graphs with < 100 nodes
   - Measure: Time from navigation to first render

2. **Mutation Latency**
   - Target: < 200ms for optimistic update
   - Measure: Time from user action to UI update

3. **Subscription Latency**
   - Target: < 500ms for real-time updates
   - Measure: Time from mutation to subscription callback

4. **Frame Rate**
   - Target: 60fps during interactions
   - Measure: DevTools Performance profiler

5. **Memory Usage**
   - Target: < 100MB for typical session
   - Measure: DevTools Memory profiler

---

## Bug Reporting Template

When filing bugs, include:

```markdown
**Title**: Brief description

**Environment**:
- Browser: Chrome 120 / Firefox 115 / Safari 17
- OS: macOS 14 / Windows 11 / Linux
- Screen: 1920x1080 @ 100% zoom

**Steps to Reproduce**:
1. Navigate to /graph
2. Select graph "Test Graph"
3. ...

**Expected Behavior**:
Node should turn green...

**Actual Behavior**:
Node stays red...

**Screenshots**:
[Attach screenshot]

**Console Errors**:
```
Error message here
```

**GraphQL Queries** (if applicable):
[Copy from Network tab]

**Additional Context**:
This happens only with Level 0 nodes...
```

---

## Success Criteria

The integration is considered successful when:

- [ ] All manual tests pass
- [ ] Unit test coverage > 80%
- [ ] E2E tests pass on Chrome, Firefox, Safari
- [ ] No console errors during normal usage
- [ ] Performance benchmarks met
- [ ] Real-time updates work reliably
- [ ] Veracity colors display correctly
- [ ] Level 0 nodes are properly locked
- [ ] Keyboard shortcuts work as expected
- [ ] Error handling is graceful
- [ ] UI is polished and professional

---

## Known Issues

None currently. All tests should pass.

---

## Next Steps After Testing

1. **User Acceptance Testing**
   - Have real users test the interface
   - Collect feedback on UX
   - Iterate on pain points

2. **Performance Optimization**
   - Profile with large graphs (1000+ nodes)
   - Implement virtual rendering if needed
   - Optimize subscription payload size

3. **Feature Enhancements**
   - Multi-graph overlay
   - Advanced search/filter
   - Export functionality

4. **Documentation**
   - User guide
   - Video tutorials
   - API documentation

---

## Testing Checklist Summary

Quick checklist for regression testing:

```
Authentication & Access
 □ Unauthenticated redirect works
 □ Authenticated access works

Graph Selection
 □ CommandMenu opens/closes
 □ Graph selection works
 □ Canvas renders correctly

Veracity Visualization
 □ Node colors correct
 □ Lock icons show on Level 0
 □ Veracity badges display
 □ Edge colors/animations work
 □ Legend overlay shows

Node Interactions
 □ Select nodes
 □ Drag Level 1 nodes
 □ Level 0 nodes locked
 □ Multi-select works

Edge Interactions
 □ Create edges
 □ Can't connect to Level 0
 □ Select edges
 □ Delete edges

Context Menu
 □ Node menu works
 □ Locked node menu disabled
 □ Edge menu works
 □ Canvas menu works
 □ Actions execute

Keyboard Shortcuts
 □ Cmd+K opens menu
 □ Delete removes items
 □ Cmd+Z/Shift+Z undo/redo
 □ Cmd+C copies
 □ Escape closes menus

Real-Time Updates
 □ Two-browser node sync
 □ Position updates sync
 □ Deletion syncs
 □ Subscription filtering works

Error Handling
 □ Network errors show notification
 □ Invalid graph ID handled
 □ Server down graceful

UI/UX Polish
 □ Loading states work
 □ Empty state displays
 □ Responsive behavior
 □ Theme consistency
 □ Hover states smooth

Performance
 □ Large graphs load fast
 □ Rapid actions smooth
 □ Subscriptions efficient

Browser Compatibility
 □ Chrome works
 □ Firefox works
 □ Safari works
```

---

**Happy Testing!**
