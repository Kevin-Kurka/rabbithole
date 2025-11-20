import { test as base, Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Test fixture that provides an authenticated page
 * Uses shared authentication state to avoid repeated login flows
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login');

    // Check if already logged in (has session)
    const isLoggedIn = await page.evaluate(() => {
      return document.cookie.includes('next-auth.session-token');
    });

    if (!isLoggedIn) {
      // Perform login
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'test');
      await page.click('button:has-text("Sign in with Credentials")');

      // Wait for redirect to complete
      await page.waitForURL('http://localhost:3001/', { timeout: 10000 });
    }

    // Provide the authenticated page to the test
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper function to create a test user via registration
 * Returns credentials for subsequent login
 */
export async function createTestUser(page: Page) {
  const timestamp = Date.now();
  const username = `testuser-${timestamp}`;
  const email = `test-${timestamp}@example.com`;
  const password = 'testpassword123';

  await page.goto('http://localhost:3001/register');
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Password"]', password);
  await page.click('button[type="submit"]');

  // Wait for successful registration and redirect
  await page.waitForURL('http://localhost:3001/', { timeout: 10000 });

  return { username, email, password };
}

/**
 * Helper function to login with specific credentials
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Sign in with Credentials")');
  await page.waitForURL('http://localhost:3001/', { timeout: 10000 });
}
