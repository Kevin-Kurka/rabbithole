import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Media Upload Flow', () => {
    test('should upload a document and process it', async ({ page }) => {
        // Enable console logging
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

        // Monitor network requests
        page.on('request', request => {
            if (request.url().includes('graphql')) {
                console.log(`→ GraphQL Request: ${request.method()} ${request.url()}`);
                const postData = request.postData();
                if (postData) {
                    try {
                        const data = JSON.parse(postData);
                        console.log(`  Operation: ${data.operationName}`);
                    } catch (e) {
                        console.log(`  Body: ${postData.substring(0, 200)}`);
                    }
                }
            }
        });

        page.on('response', async response => {
            if (response.url().includes('graphql')) {
                console.log(`← GraphQL Response: ${response.status()}`);
                if (response.status() >= 400) {
                    try {
                        const body = await response.text();
                        console.log(`  Error Body: ${body.substring(0, 500)}`);
                    } catch (e) {
                        console.log(`  Could not read error body`);
                    }
                }
            }
        });

        // 1. Register a new user
        await page.goto('/register');
        const timestamp = Date.now();
        const username = `media_user_${timestamp}`;
        const email = `${username}@example.com`;

        await page.getByPlaceholder('Username').fill(username);
        await page.getByPlaceholder('Email').fill(email);
        await page.getByPlaceholder('Password', { exact: true }).fill('password123');
        await page.getByRole('button', { name: 'Register' }).click();
        await expect(page).toHaveURL('/');

        // 2. Navigate to Media Library
        await page.goto('/media');
        await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible();

        // 3. Open Upload Dialog
        await page.getByRole('button', { name: 'Upload File' }).first().click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Upload Media File')).toBeVisible();

        // 4. Upload File
        // Note: The input is hidden, so we used setInputFiles on the dialog or label
        // Finding the hidden input might require a specific locator
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(path.join(__dirname, 'assets/test-doc.txt'));

        // 5. Verify Preview and Options
        await expect(page.getByText('test-doc.txt').first()).toBeVisible();
        // Check "Extract tables" option is visible (document specific)
        await expect(page.getByLabel('Extract tables')).toBeVisible();

        // 6. Submit
        await page.getByRole('button', { name: 'Upload & Process' }).click();

        // 7. Wait for Success
        // The dialog should close or success message appears
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });

        // 8. Verify File in List
        // Should appear in the grid
        await expect(page.getByText('test-doc.txt').first()).toBeVisible();
        await expect(page.getByText('queued').first()).toBeVisible(); // Initially queued
    });
});
