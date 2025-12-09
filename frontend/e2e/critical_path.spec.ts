import { test, expect } from '@playwright/test';

test.describe('Critical Path', () => {
    test('should register and create a conversational inquiry', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const username = `user_${uniqueId}`;
        const email = `user_${uniqueId}@example.com`;
        const password = 'password123';

        // 1. Register
        await page.goto('/register');
        await page.fill('input#username', username);
        await page.fill('input#email', email);
        await page.fill('input#password', password);
        await page.click('button[type="submit"]');

        // Check for error message if redirect fails
        const errorMsg = page.locator('.bg-red-500\\/20');
        if (await errorMsg.isVisible()) {
            console.log('Registration Error:', await errorMsg.textContent());
        }

        // Expect redirect to home
        await expect(page).toHaveURL('/');

        // 2. Open Inquiry Modal via AI Assistant
        // The dedicated button was removed, now we access features via the AI FAB
        await page.getByRole('button', { name: /AI Assistant/i }).click();
        // Use first() to avoid strict mode violation if duplicates exist (e.g. mobile/desktop layouts)
        await expect(page.getByRole('heading', { name: 'Create Formal Inquiry' }).first()).toBeVisible();

        // 3. Chat Interaction: Classify
        // Wait for AI greeting to ensure message count is correct (avoid race condition)
        await expect(page.getByText(/Hi! I'll help you/)).toBeVisible();

        const input = page.getByPlaceholder('Type your message...').first();
        await input.fill('I found a logical fallacy in the argument.');
        // Note: The button in code has Send icon, finding by icon class or position is safer if no text. 
        // Code: <button ...><Send ... /></button>
        // Let's use locator for the button next to input.
        const sendButton = page.locator('div.border-t button').first();
        await sendButton.click({ force: true });

        // Wait for AI response (simulated delay 1.5s)
        await expect(page.getByText('Logical Fallacy Inquiry')).toBeVisible({ timeout: 10000 });

        // 4. Chat Interaction: Evidence
        await input.fill('The evidence is self-evident.');
        await sendButton.click({ force: true });

        // Wait for AI to ask HOW to provide evidence ("Great! You can...")
        await expect(page.getByText('Great! You can')).toBeVisible({ timeout: 10000 });

        // 5. Chat Interaction: Provide Description
        await input.fill('I will describe it here.');
        await sendButton.click({ force: true });

        // Wait for finalization (AI reply)
        await expect(page.getByText('Credibility Score')).toBeVisible({ timeout: 10000 });

        // 6. Publish
        await input.fill('Publish now');
        await sendButton.click({ force: true });

        // 6. Verify Success
        await expect(page.getByText('Inquiry Published Successfully!')).toBeVisible({ timeout: 10000 });
    });
});
