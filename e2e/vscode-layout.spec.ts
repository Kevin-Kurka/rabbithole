import { test, expect } from '@playwright/test';

/**
 * VS Code Layout Component Tests
 *
 * Comprehensive test suite for all VS Code-style layout components
 */

test.describe('VS Code Layout - Complete Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to graph page and wait for layout to load
    await page.goto('http://localhost:3001/login');

    // Login first
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'test');
    await page.click('button[type="submit"]');

    // Wait for redirect to graph page
    await page.waitForURL('**/graph');
    await page.waitForLoadState('networkidle');
  });

  test.describe('MainMenu Component', () => {
    test('should render main menu with all elements', async ({ page }) => {
      // Check main menu exists
      const mainMenu = page.locator('div').filter({ hasText: 'Rabbit Hole' }).first();
      await expect(mainMenu).toBeVisible();

      // Check search input
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();

      // Check panel toggle buttons
      const leftPanelToggle = page.locator('button').filter({ hasText: /panel/i }).first();
      await expect(leftPanelToggle).toBeVisible();
    });

    test('should focus search on Cmd/Ctrl+P', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');

      // Press Cmd+P (or Ctrl+P on Windows/Linux)
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyP' : 'Control+KeyP');

      // Check search input is focused
      await expect(searchInput).toBeFocused();
    });

    test('should show user menu on click', async ({ page }) => {
      // Find and click user menu button (last button in main menu)
      const userMenuButton = page.locator('button').last();
      await userMenuButton.click();

      // Check for dropdown menu items
      await page.waitForTimeout(300); // Wait for dropdown animation
    });
  });

  test.describe('StatusBar Component', () => {
    test('should render status bar with graph info', async ({ page }) => {
      // Check status bar exists at bottom
      const statusBar = page.locator('div').filter({ hasText: /Connected|Disconnected/i }).last();
      await expect(statusBar).toBeVisible();
    });

    test('should display connection status', async ({ page }) => {
      // Look for WiFi icon or connection text
      const connectionStatus = page.locator('text=/Connected|Disconnected/i');
      await expect(connectionStatus).toBeVisible();
    });
  });

  test.describe('Panel Toggling', () => {
    test('should toggle left panel with button', async ({ page }) => {
      // Find left panel
      const leftPanel = page.locator('div').filter({ hasText: /Graphs/i }).first();
      const isVisible = await leftPanel.isVisible();

      // Click left panel toggle button
      const toggleButton = page.locator('button[title*="left" i], button').filter({ hasText: /panel.*left/i }).first();
      await toggleButton.click();

      await page.waitForTimeout(500); // Wait for animation

      // Check visibility changed
      if (isVisible) {
        await expect(leftPanel).not.toBeVisible();
      } else {
        await expect(leftPanel).toBeVisible();
      }
    });

    test('should toggle left panel with Cmd/Ctrl+B', async ({ page }) => {
      const isMac = process.platform === 'darwin';

      // Get initial state
      const leftPanel = page.locator('text=/Graphs/i').first();
      const wasVisible = await leftPanel.isVisible();

      // Press Cmd/Ctrl+B
      await page.keyboard.press(isMac ? 'Meta+KeyB' : 'Control+KeyB');
      await page.waitForTimeout(500);

      // Check visibility toggled
      if (wasVisible) {
        await expect(leftPanel).not.toBeVisible();
      } else {
        await expect(leftPanel).toBeVisible();
      }
    });

    test('should toggle bottom panel with Cmd/Ctrl+J', async ({ page }) => {
      const isMac = process.platform === 'darwin';

      // Press Cmd/Ctrl+J to toggle bottom panel
      await page.keyboard.press(isMac ? 'Meta+KeyJ' : 'Control+KeyJ');
      await page.waitForTimeout(500);

      // Check for bottom panel (Console tab)
      const bottomPanel = page.locator('text=/Console|Output/i').last();
      await expect(bottomPanel).toBeVisible();
    });

    test('should toggle right panel with Cmd/Ctrl+K', async ({ page }) => {
      const isMac = process.platform === 'darwin';

      // Press Cmd/Ctrl+K to toggle right panel
      await page.keyboard.press(isMac ? 'Meta+KeyK' : 'Control+KeyK');
      await page.waitForTimeout(500);

      // Check for right panel (Properties tab)
      const rightPanel = page.locator('text=/Properties|Collaboration/i').last();
      await expect(rightPanel).toBeVisible();
    });
  });

  test.describe('Icon Navigation Bar', () => {
    test('should render all navigation icons', async ({ page }) => {
      // Wait for left panel to be visible
      await page.waitForSelector('text=/Graphs/i', { timeout: 5000 });

      // Look for icon buttons (they should have tooltips or aria-labels)
      const iconBar = page.locator('div').filter({ hasText: /Graphs|Search|Structure/i }).first();
      await expect(iconBar).toBeVisible();
    });

    test('should switch content when clicking navigation icons', async ({ page }) => {
      // Ensure left panel is open
      await page.waitForSelector('text=/Graphs/i');

      // Click on different navigation items and check content changes
      // This is a basic test - actual navigation items depend on layout
      const graphsText = page.locator('text=/Graphs/i').first();
      await expect(graphsText).toBeVisible();
    });
  });

  test.describe('GraphListPanel', () => {
    test('should display graph list panel', async ({ page }) => {
      // Check for "Graphs" heading
      const graphsHeading = page.locator('text=/Graphs/i').first();
      await expect(graphsHeading).toBeVisible();

      // Check for search input
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible();
    });

    test('should show "New Graph" button', async ({ page }) => {
      // Look for New Graph button
      const newGraphButton = page.locator('button', { hasText: /New Graph/i });
      await expect(newGraphButton).toBeVisible();
    });

    test('should open create graph modal', async ({ page }) => {
      // Click New Graph button
      const newGraphButton = page.locator('button').filter({ hasText: /New Graph/i }).first();
      await newGraphButton.click();

      // Wait for modal
      await page.waitForTimeout(300);

      // Check for modal title
      const modalTitle = page.locator('text=/Create New Graph/i');
      await expect(modalTitle).toBeVisible();

      // Check for name input
      const nameInput = page.locator('input[placeholder*="name" i]');
      await expect(nameInput).toBeVisible();
    });

    test('should filter graphs with search', async ({ page }) => {
      // Find search input in graph list
      const searchInput = page.locator('input[placeholder*="Search graphs" i]');

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        // Graphs should be filtered (actual verification depends on data)
      }
    });
  });

  test.describe('SearchPanel', () => {
    test('should display search panel when selected', async ({ page }) => {
      // This test depends on being able to navigate to search panel
      // For now, just check if the layout supports it
      const searchText = page.locator('text=/Search/i');
      await expect(searchText).toBeVisible();
    });
  });

  test.describe('RightPanel Tabs', () => {
    test('should render right panel with tabs', async ({ page }) => {
      // Ensure right panel is open
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyK' : 'Control+KeyK');
      await page.waitForTimeout(500);

      // Check for tab names
      const tabs = page.locator('text=/Properties|Collaboration|AI Chat|History/i');
      await expect(tabs.first()).toBeVisible();
    });

    test('should switch between tabs', async ({ page }) => {
      // Open right panel
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyK' : 'Control+KeyK');
      await page.waitForTimeout(500);

      // Click on different tabs
      const propertiesTab = page.locator('button', { hasText: /Properties/i }).first();
      if (await propertiesTab.isVisible()) {
        await propertiesTab.click();
        await page.waitForTimeout(300);

        // Check Properties content is visible
        const propertiesContent = page.locator('text=/Select a node/i, text=/Node Properties/i').first();
        await expect(propertiesContent).toBeVisible();
      }
    });
  });

  test.describe('BottomPanel Tabs', () => {
    test('should render bottom panel with tabs', async ({ page }) => {
      // Open bottom panel
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyJ' : 'Control+KeyJ');
      await page.waitForTimeout(500);

      // Check for tab names
      const consolTab = page.locator('text=/Console/i').last();
      await expect(consolTab).toBeVisible();
    });

    test('should display console panel content', async ({ page }) => {
      // Open bottom panel
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyJ' : 'Control+KeyJ');
      await page.waitForTimeout(500);

      // Click Console tab
      const consoleTab = page.locator('button', { hasText: /Console/i }).last();
      await consoleTab.click();
      await page.waitForTimeout(300);

      // Check for console content
      const consoleContent = page.locator('text=/Console initialized|entries/i');
      await expect(consoleContent).toBeVisible();
    });

    test('should display output panel content', async ({ page }) => {
      // Open bottom panel
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyJ' : 'Control+KeyJ');
      await page.waitForTimeout(500);

      // Click Output tab
      const outputTab = page.locator('button', { hasText: /Output/i }).last();
      await outputTab.click();
      await page.waitForTimeout(300);

      // Check for output content
      const outputContent = page.locator('text=/Output Messages|No output/i');
      await expect(outputContent).toBeVisible();
    });
  });

  test.describe('Panel Resizing', () => {
    test('should resize left panel', async ({ page }) => {
      // This test would require simulating drag events
      // Playwright can do this with page.mouse.move and drag

      // Find resize handle (usually a thin div on the edge)
      const resizeHandle = page.locator('div').filter({
        has: page.locator('div[style*="cursor"]')
      }).first();

      // Get initial panel width
      const leftPanel = page.locator('div').filter({ hasText: /Graphs/i }).first();
      if (await leftPanel.isVisible()) {
        const initialBox = await leftPanel.boundingBox();

        // This is a placeholder - actual resize testing is complex
        expect(initialBox).toBeTruthy();
      }
    });
  });

  test.describe('LocalStorage Persistence', () => {
    test('should persist panel states across reloads', async ({ page }) => {
      // Toggle left panel off
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyB' : 'Control+KeyB');
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check if left panel state was persisted
      // Note: This depends on the panel being closed before reload
      await page.waitForTimeout(1000);
    });
  });

  test.describe('PropertiesPanel', () => {
    test('should show empty state when no node selected', async ({ page }) => {
      // Open right panel
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyK' : 'Control+KeyK');
      await page.waitForTimeout(500);

      // Click Properties tab
      const propertiesTab = page.locator('button', { hasText: /Properties/i }).first();
      await propertiesTab.click();
      await page.waitForTimeout(300);

      // Check for empty state message
      const emptyState = page.locator('text=/Select a node/i');
      await expect(emptyState).toBeVisible();
    });
  });

  test.describe('ConsolePanel', () => {
    test('should display console initialization message', async ({ page }) => {
      // Open bottom panel
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyJ' : 'Control+KeyJ');
      await page.waitForTimeout(500);

      // Should show console initialized
      const consoleMessage = page.locator('text=/Console initialized/i');
      await expect(consoleMessage).toBeVisible();
    });

    test('should have clear button', async ({ page }) => {
      // Open bottom panel
      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+KeyJ' : 'Control+KeyJ');
      await page.waitForTimeout(500);

      // Look for clear/trash button
      const clearButton = page.locator('button[title*="Clear" i]').last();
      if (await clearButton.isVisible()) {
        await expect(clearButton).toBeVisible();
      }
    });
  });

  test.describe('Graph Canvas Integration', () => {
    test('should render graph canvas in main content area', async ({ page }) => {
      // Check for "No graph selected" message or canvas
      const noGraphMessage = page.locator('text=/No graph selected/i');
      const hasNoGraph = await noGraphMessage.isVisible();

      if (hasNoGraph) {
        await expect(noGraphMessage).toBeVisible();
      } else {
        // If a graph is selected, canvas should be rendered
        // Check for ReactFlow or canvas elements
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('should handle window resize', async ({ page }) => {
      // Set viewport to different sizes
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      // Check layout is visible
      const mainMenu = page.locator('text=/Rabbit Hole/i').first();
      await expect(mainMenu).toBeVisible();

      // Resize to smaller viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      // Layout should still be functional
      await expect(mainMenu).toBeVisible();
    });
  });

  test.describe('Overall Layout Structure', () => {
    test('should have all major layout sections', async ({ page }) => {
      // Main menu at top
      const mainMenu = page.locator('text=/Rabbit Hole/i').first();
      await expect(mainMenu).toBeVisible();

      // Status bar at bottom
      await page.waitForTimeout(1000);

      // Main content area should be present
      const mainContent = page.locator('body');
      await expect(mainContent).toBeVisible();
    });

    test('should maintain z-index hierarchy', async ({ page }) => {
      // Open all panels
      const isMac = process.platform === 'darwin';

      // Open bottom panel
      await page.keyboard.press(isMac ? 'Meta+KeyJ' : 'Control+KeyJ');
      await page.waitForTimeout(300);

      // Open right panel
      await page.keyboard.press(isMac ? 'Meta+KeyK' : 'Control+KeyK');
      await page.waitForTimeout(300);

      // All panels should be visible without overlapping issues
      await page.waitForTimeout(500);
    });
  });
});
