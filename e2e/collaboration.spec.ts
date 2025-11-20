import { test, expect, createTestUser } from './fixtures/auth';

test('collaboration test', async ({ browser }) => {
  // Create two separate browser contexts for two different users
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  page1.on('close', () => console.log('Page 1 closed'));
  page2.on('close', () => console.log('Page 2 closed'));

  // 1. Create and authenticate first user
  const user1 = await createTestUser(page1);
  await page1.goto('http://localhost:3001/login');
  await page1.fill('input[name="email"]', user1.email);
  await page1.fill('input[name="password"]', user1.password);
  await page1.click('button:has-text("Sign in with Credentials")');
  await page1.waitForURL('http://localhost:3001/', { timeout: 10000 });

  // 2. Create and authenticate second user
  const user2 = await createTestUser(page2);
  await page2.goto('http://localhost:3001/login');
  await page2.fill('input[name="email"]', user2.email);
  await page2.fill('input[name="password"]', user2.password);
  await page2.click('button:has-text("Sign in with Credentials")');
  await page2.waitForURL('http://localhost:3001/', { timeout: 10000 });

  // Wait for both pages to be fully loaded
  await page1.waitForLoadState('networkidle');
  await page2.waitForLoadState('networkidle');

  // 3. Verify both users can see the knowledge graph nodes
  // Check for any node card (JFK assassination nodes)
  const nodeCards1 = page1.locator('div').filter({ hasText: /CIA|JFK|Assassination|Organized Crime/i }).first();
  const nodeCards2 = page2.locator('div').filter({ hasText: /CIA|JFK|Assassination|Organized Crime/i }).first();

  await expect(nodeCards1).toBeVisible({ timeout: 5000 });
  await expect(nodeCards2).toBeVisible({ timeout: 5000 });

  // 4. Verify search functionality works for both users
  const searchInput1 = page1.locator('input[placeholder*="Search" i]');
  const searchInput2 = page2.locator('input[placeholder*="Search" i]');

  await expect(searchInput1).toBeVisible();
  await expect(searchInput2).toBeVisible();

  // Cleanup
  await context1.close();
  await context2.close();
});
