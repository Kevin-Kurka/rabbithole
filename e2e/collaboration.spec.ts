import { test, expect } from '@playwright/test';

const username = `testuser-${Date.now()}`;
const email = `test-${Date.now()}@example.com`;
const password = 'password123';

test('collaboration test', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  page1.on('close', () => console.log('Page 1 closed'));
  page2.on('close', () => console.log('Page 2 closed'));

  // 1. Register a new user in the first window
  await page1.goto('http://localhost:3001/register');
  await page1.fill('input[placeholder="Username"]', username);
  await page1.fill('input[placeholder="Email"]', email);
  await page1.fill('input[placeholder="Password"]', password);
  await page1.click('button[type="submit"]');

  // Wait for the graph page to load
  await page1.waitForURL('http://localhost:3001/graph');

  // 2. Log in with the new user in the second window
  await page2.goto('http://localhost:3001/graph');
  await page2.click('button:has-text("Sign in")');
  await page2.waitForTimeout(1000); // wait for the sign in page to load
  await page2.screenshot({ path: 'screenshot1.png' });
  await page2.fill('input[name="email"]', email);
  await page2.fill('input[name="password"]', password);
  await page2.screenshot({ path: 'screenshot2.png' });
  await page2.click('button:has-text("Sign in with Credentials")');
  await page2.waitForTimeout(5000); // wait for something to happen
  await page2.screenshot({ path: 'screenshot3.png' });

  // Wait for the graph page to load
  await page2.waitForURL('http://localhost:3001/graph');

  // 3. Create a node in the first window
  await page1.click('button:has-text("Create Node")');

  // 4. Assert that the new node is visible in both windows
  const node1 = await page1.waitForSelector('.react-flow__node:has-text("New Node")');
  const node2 = await page2.waitForSelector('.react-flow__node:has-text("New Node")');

  expect(node1).not.toBeNull();
  expect(node2).not.toBeNull();
});
