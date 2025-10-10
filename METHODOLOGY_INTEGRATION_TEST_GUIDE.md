# Methodology Selector Integration - Manual Test Guide

## Prerequisites
- Backend running on http://localhost:4000/graphql
- Frontend running on http://localhost:3000
- Database seeded with 8 methodologies

## Test Scenarios

### 1. Open Command Menu
**Steps:**
1. Navigate to http://localhost:3000
2. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)

**Expected:**
- CommandMenu panel opens from the left side
- Panel is 400px wide
- Shows search bar at top
- Shows "New Graph" button
- Shows "Recents" and "Trending" sections

---

### 2. Start Graph Creation Flow
**Steps:**
1. Open CommandMenu (Cmd+K)
2. Click "New Graph" button

**Expected:**
- "New Graph" button is replaced by a form
- Form shows two input fields:
  - "Graph name" (required)
  - "Description (optional)"
- Form shows two buttons:
  - "Next" button (primary, on left)
  - "Cancel" button (on right)
- "Next" button is disabled (grayed out)

---

### 3. Enter Graph Information
**Steps:**
1. Start graph creation flow
2. Type "My Test Graph" in the name field
3. Type "Testing methodology selection" in description field

**Expected:**
- Name field accepts input
- Description field accepts input
- "Next" button becomes enabled (not grayed out)

---

### 4. Navigate to Methodology Selector
**Steps:**
1. Enter graph information
2. Click "Next" button

**Expected:**
- Name/description form disappears
- Panel smoothly expands from 400px to 800px (animated)
- MethodologySelector component appears with:
  - Header "Select Methodology"
  - Subtitle "Choose a knowledge organization methodology for your graph"
  - Grid of methodology cards (3 columns)
  - 8 methodology cards
  - 1 custom methodology card (dashed border)
  - "Back" button at bottom left
  - No "Create Graph" button yet (nothing selected)

---

### 5. View Methodologies
**Steps:**
1. Navigate to methodology selector
2. Observe the 8 methodology cards

**Expected Methodologies:**
1. **Timeline Analysis** (INVESTIGATIVE)
2. **Concept Mapping** (INVESTIGATIVE)
3. **Decision Tree** (STRATEGIC)
4. **Systems Thinking Causal Loop** (SYSTEMS)
5. **SWOT Analysis** (STRATEGIC)
6. **Mind Mapping** (CREATIVE)
7. **Fishbone (Ishikawa) Diagram** (ANALYTICAL)
8. **5 Whys Root Cause Analysis** (ANALYTICAL)

**Card Structure:**
- Icon at top left
- Methodology name
- Category label
- Description (3 lines max)
- "Learn More" link at bottom

---

### 6. Hover Over Methodology Card
**Steps:**
1. View methodologies
2. Hover mouse over any methodology card

**Expected:**
- Card background changes to elevated color
- Smooth transition animation
- Card remains clickable

---

### 7. Select a Methodology
**Steps:**
1. View methodologies
2. Click on "Mind Mapping" card

**Expected:**
- Selected card:
  - Background changes to hover color
  - Border changes to secondary color
  - Small dot indicator appears at top-right corner
- Other cards remain unselected
- "Create Graph" button appears at bottom right
- Button shows "Create Graph" with chevron icon

---

### 8. Change Methodology Selection
**Steps:**
1. Select "Mind Mapping"
2. Click on "Decision Tree" card

**Expected:**
- "Mind Mapping" card returns to normal state
- "Decision Tree" card becomes selected (highlighted)
- Dot indicator moves to "Decision Tree" card
- "Create Graph" button remains visible

---

### 9. View Methodology Details
**Steps:**
1. Select any methodology
2. Click "Learn More" link on the card (not the card itself)

**Expected:**
- Modal opens centered on screen
- Backdrop appears (darkened overlay)
- Modal shows:
  - Methodology icon and name in header
  - Close button (X) at top right
  - Description section
  - "How It Works" section (if available)
  - "Benefits" section (if available)
  - "Use Cases" section (if available)
  - "Select This Methodology" button at bottom

---

### 10. Close Methodology Details
**Steps:**
1. Open methodology details modal
2. Click the X button or click backdrop

**Expected:**
- Modal closes with fade animation
- Returns to methodology selector
- Previously selected card remains selected

---

### 11. Select Custom Methodology
**Steps:**
1. Navigate to methodology selector
2. Click "Custom Methodology" card (dashed border)

**Expected:**
- Custom card becomes highlighted
- Dot indicator appears on custom card
- "Create Graph" button appears
- Other methodology cards are unselected

---

### 12. Return to Name/Description Form
**Steps:**
1. Navigate to methodology selector
2. Select any methodology
3. Click "Back" button

**Expected:**
- MethodologySelector disappears
- Panel smoothly shrinks from 800px to 400px
- Name/description form reappears with:
  - Previously entered name still filled
  - Previously entered description still filled
  - "Next" and "Cancel" buttons
- Selected methodology is remembered (not visible but in state)

---

### 13. Create Graph with Methodology
**Steps:**
1. Enter name: "Methodology Test Graph"
2. Enter description: "Testing the integration"
3. Click "Next"
4. Select "SWOT Analysis" methodology
5. Click "Create Graph" button

**Expected:**
- Button shows loading state briefly
- Graph is created in database
- CommandMenu closes completely
- Panel fades out
- Page remains on current view

---

### 14. Verify Graph Creation
**Steps:**
1. Create a graph with methodology (previous test)
2. Press Cmd+K to reopen CommandMenu
3. Look in "Recents" section

**Expected:**
- New graph appears in Recents list
- Graph name is "Methodology Test Graph"
- Clicking graph opens/toggles it in canvas

**Backend Verification:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ graphs { id name methodology } }"}'
```
- Response includes the new graph
- Methodology field contains UUID of SWOT Analysis

---

### 15. Cancel from Name/Description Form
**Steps:**
1. Open CommandMenu
2. Click "New Graph"
3. Enter some text in name field
4. Click "Cancel" button

**Expected:**
- Form disappears
- "New Graph" button reappears
- Entered text is cleared
- Panel remains open at 400px

---

### 16. Cancel from Methodology Selector
**Steps:**
1. Open CommandMenu
2. Click "New Graph"
3. Enter name and click "Next"
4. Select a methodology
5. Click "Back" button

**Expected:**
- MethodologySelector disappears
- Panel shrinks to 400px
- Name/description form reappears
- Entered name/description preserved
- Can click "Next" again to return to selector

---

### 17. Escape Key Navigation - From Methodology Selector
**Steps:**
1. Navigate to methodology selector
2. Press Escape key

**Expected:**
- MethodologySelector disappears
- Panel shrinks to 400px
- Returns to name/description form
- Data is preserved

---

### 18. Escape Key Navigation - From Name/Description Form
**Steps:**
1. Open CommandMenu
2. Click "New Graph"
3. Press Escape key

**Expected:**
- Form closes
- "New Graph" button reappears
- Data is cleared

---

### 19. Escape Key Navigation - From Main Menu
**Steps:**
1. Open CommandMenu
2. Press Escape key (without opening any forms)

**Expected:**
- CommandMenu closes completely
- Panel fades out
- Returns to main canvas view

---

### 20. Create Graph Without Description
**Steps:**
1. Open CommandMenu
2. Click "New Graph"
3. Enter name: "Minimal Graph"
4. Leave description empty
5. Click "Next"
6. Select "Timeline Analysis"
7. Click "Create Graph"

**Expected:**
- Graph created successfully
- Description field stored as NULL or empty in database
- CommandMenu closes

---

### 21. Create Graph with Custom Methodology
**Steps:**
1. Open CommandMenu
2. Click "New Graph"
3. Enter name: "Custom Methodology Graph"
4. Click "Next"
5. Select "Custom Methodology" card
6. Click "Create Graph"

**Expected:**
- Graph created successfully
- Methodology field stored as NULL in database
- CommandMenu closes

**Backend Verification:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ graphs { id name methodology } }"}'
```
- New graph has `methodology: null`

---

### 22. Panel Width Animation
**Steps:**
1. Open CommandMenu
2. Click "New Graph"
3. Enter name and click "Next"
4. Observe panel animation
5. Click "Back"
6. Observe panel animation

**Expected:**
- Expanding: Smooth 300ms transition from 400px to 800px
- Shrinking: Smooth 300ms transition from 800px to 400px
- No jittering or jumpy behavior
- Content reflows smoothly

---

### 23. Loading State
**Steps:**
1. Navigate to methodology selector
2. Observe immediately after "Next" click

**Expected (if backend slow):**
- "Loading methodologies..." message appears
- Centered in methodology area
- Gray/muted text color
- No error after loading completes

---

### 24. Error State
**Steps:**
1. Stop backend server
2. Navigate to methodology selector

**Expected:**
- Error message appears:
  - "Failed to load methodologies. Using default options."
  - Displayed in a bordered box
  - Orange/warning color scheme
- Empty grid or no methodology cards
- Can still click "Back" to return

---

### 25. Multiple Graph Creation
**Steps:**
1. Create graph "Graph 1" with "Mind Mapping"
2. Press Cmd+K to reopen
3. Create graph "Graph 2" with "Decision Tree"
4. Press Cmd+K to reopen
5. Create graph "Graph 3" with "SWOT Analysis"

**Expected:**
- All 3 graphs created successfully
- Each graph has different methodology
- All graphs appear in Recents list
- No cross-contamination of data

---

## Regression Tests

### 26. Existing Functionality - Search Graphs
**Steps:**
1. Open CommandMenu
2. Type "Test" in search bar

**Expected:**
- Search filters graph list
- Only graphs with "Test" in name appear
- Sections update (Recents, Trending)
- New Graph button still works

---

### 27. Existing Functionality - Toggle Graph Visibility
**Steps:**
1. Open CommandMenu
2. Click on a graph in Recents

**Expected:**
- Graph appears on canvas
- Eye icon shows on graph item
- Clicking again removes graph from canvas
- Eye icon changes to EyeOff

---

### 28. Existing Functionality - Close Menu Backdrop
**Steps:**
1. Open CommandMenu
2. Click on dark backdrop (not on panel)

**Expected:**
- CommandMenu closes
- Returns to canvas
- No errors

---

## Edge Cases

### 29. Empty Graph Name
**Steps:**
1. Open CommandMenu
2. Click "New Graph"
3. Leave name field empty
4. Try to click "Next"

**Expected:**
- "Next" button remains disabled
- Cannot proceed to methodology selector
- No error messages

---

### 30. Very Long Graph Name
**Steps:**
1. Enter name: "This is an extremely long graph name that should test the UI layout and ensure it doesn't break the design when users enter very long text strings"
2. Click "Next"
3. Select methodology
4. Create graph

**Expected:**
- Name field accepts long text
- Text truncates in UI if needed
- Graph creates successfully
- Long name displayed correctly in list

---

### 31. Special Characters in Name
**Steps:**
1. Enter name: "Test!@#$%^&*()_+-=[]{}|;:',.<>?/~`"
2. Enter description with emojis: "Testing 🚀 with special chars"
3. Create graph with methodology

**Expected:**
- All characters accepted
- Graph creates successfully
- Special characters preserved in database

---

### 32. Rapid Clicking
**Steps:**
1. Navigate to methodology selector
2. Rapidly click different methodology cards (5+ clicks in 1 second)

**Expected:**
- Only last clicked card is selected
- No multiple selections
- No UI glitches
- "Create Graph" button state correct

---

### 33. Double Click Create Button
**Steps:**
1. Navigate to methodology selector
2. Select a methodology
3. Double-click "Create Graph" button quickly

**Expected:**
- Only one graph created
- No duplicate graphs
- Mutation loading state prevents double submission
- No errors in console

---

## Performance Tests

### 34. Methodology Load Time
**Steps:**
1. Open developer tools Network tab
2. Navigate to methodology selector
3. Observe GraphQL request

**Expected:**
- Query completes in < 500ms
- Single GraphQL request
- Response includes all 8 methodologies
- No duplicate requests

---

### 35. Panel Animation Smoothness
**Steps:**
1. Navigate back and forth between forms multiple times
2. Observe panel width animation
3. Check browser FPS (developer tools)

**Expected:**
- 60 FPS maintained
- No dropped frames
- Smooth easing function
- No layout thrashing

---

## Accessibility Tests

### 36. Keyboard Navigation
**Steps:**
1. Open CommandMenu
2. Press Tab key multiple times
3. Navigate through all interactive elements

**Expected:**
- Focus moves logically through elements
- Focus visible on all interactive elements
- Can activate buttons with Enter/Space
- Can close modal with Escape

---

### 37. Screen Reader Compatibility
**Steps:**
1. Enable screen reader (VoiceOver, NVDA, etc.)
2. Navigate through CommandMenu

**Expected:**
- All text read correctly
- Button purposes announced
- Form field labels announced
- Selected state announced

---

## Summary Checklist

After completing all tests, verify:
- [ ] Graph creation flow works end-to-end
- [ ] Methodology selection properly integrated
- [ ] All 8 methodologies load from backend
- [ ] Custom methodology option works
- [ ] Panel animations smooth
- [ ] Escape key navigation correct
- [ ] No console errors
- [ ] Graphs stored with methodology in database
- [ ] Existing CommandMenu features still work
- [ ] Edge cases handled gracefully

---

## Reporting Issues

When reporting issues, include:
1. Test scenario number
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Browser console errors (if any)
6. Screenshots/video (if UI issue)
7. Network tab (if backend issue)

## Success Criteria

Integration is successful when:
✅ All 37 test scenarios pass
✅ No console errors during testing
✅ Backend stores methodology correctly
✅ UI animations smooth and responsive
✅ No regression in existing features
