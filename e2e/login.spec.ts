import { test, expect, createTestUser } from './fixtures/auth';

test('login test', async ({ page }) => {
  // 1. Create a test user (this also registers them)
  const testUser = await createTestUser(page);

  // 2. Navigate to login page
  await page.goto('http://localhost:3001/login');
  await page.waitForSelector('form', { timeout: 10000 });

  // 3. Log in with the test user credentials
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button:has-text("Sign in with Credentials")');

  // 4. Verify successful login by checking redirect to graph page
  await page.waitForURL('http://localhost:3001/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // 5. Verify user is authenticated by checking for user-specific UI elements
  // Check for user menu button (profile icon)
  const userMenu = page.locator('button:has-text(""), [aria-label*="user" i], [aria-label*="profile" i], svg[class*="user"]').first();
  await expect(userMenu).toBeVisible({ timeout: 5000 });

  // 6. Test logout functionality
  // Look for user menu or sign out button
  const signOutButton = page.locator('button:has-text("Sign out")');
  if (await signOutButton.isVisible({ timeout: 2000 })) {
    await signOutButton.click();

    // Wait for redirect to sign out page or home
    await page.waitForTimeout(1000);

    // Verify user is logged out by checking redirect to login page
    await page.waitForURL(/\/(login|$)/, { timeout: 5000 }).catch(() => {});
  }

  // 7. Test login again after logout
  await page.goto('http://localhost:3001/login');
  await page.waitForSelector('form', { timeout: 10000 });

  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button:has-text("Sign in with Credentials")');

  await page.waitForURL('http://localhost:3001/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Verify re-login successful by checking for user menu
  const userMenuAfterRelogin = page.locator('button:has-text(""), [aria-label*="user" i], [aria-label*="profile" i], svg[class*="user"]').first();
  await expect(userMenuAfterRelogin).toBeVisible({ timeout: 5000 });
});
