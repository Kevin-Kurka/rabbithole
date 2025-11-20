# Archived E2E Tests

This directory contains test files that have been archived for future reference.

## VS Code Layout Tests

**Files**:
- `vscode-layout.spec.ts` (28 tests)
- `vscode-layout-basic.spec.ts` (9 tests)

**Archived Date**: 2025-11-20

**Reason**:
These tests expect a full VS Code-style IDE interface with:
- Editable knowledge graphs
- Multiple panels (Graphs, Properties, Console, Output)
- Icon navigation bar
- Keyboard shortcuts (Cmd+B, Cmd+J, Cmd+K, Cmd+P)
- "New Graph" creation functionality
- Connection status indicators

The current application is a **read-only knowledge graph viewer** focused on displaying pre-existing JFK assassination data. The UI does not include these IDE features.

**Test Results Before Archiving**:
- vscode-layout.spec.ts: 6/28 passing (21.4%)
- vscode-layout-basic.spec.ts: 7/9 passing (77.8%)

**Future Roadmap**:
These tests can be restored when implementing the full IDE interface. They provide a comprehensive test suite for:
1. Graph creation and editing
2. Panel management and layout
3. Keyboard shortcuts
4. Navigation between graphs
5. Properties editing
6. Console/Output panels

## How to Run Archived Tests

```bash
# Run specific archived test
npx playwright test e2e/archived/vscode-layout.spec.ts

# Run all archived tests
npx playwright test e2e/archived/
```

## Related Issues

When implementing these features, refer to:
- [ ] Implement editable knowledge graphs
- [ ] Add VS Code-style panel system
- [ ] Add keyboard shortcuts for navigation
- [ ] Implement graph creation workflow
- [ ] Add properties editing panel
- [ ] Add console/output panels for system feedback
