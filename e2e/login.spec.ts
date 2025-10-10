import { test, expect } from '@playwright/test';

const email = `test-${Date.now()}@example.com`;
const password = 'password123';

test('login test', async ({ page }) => {
  // 1. Register a new user
  await page.goto('http://localhost:3001/register');
  await page.waitForSelector('form');
  await page.fill('input[placeholder="Username"]', 'testuser');
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3001/graph');

  // 2. Log out
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('http://localhost:3001/api/auth/signout');
  await page.goto('http://localhost:3001/graph');
  await expect(page.locator('button:has-text("Sign in")')).toBeVisible();

  // 3. Log in with the new user
  await page.click('button:has-text("Sign in")');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Sign in with Credentials")');
  await page.waitForURL('http://localhost:3001/graph');
  await expect(page.locator('p:has-text("Session User: testuser")')).toBeVisible();
});