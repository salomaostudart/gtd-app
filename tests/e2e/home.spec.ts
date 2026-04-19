import { expect, test } from '@playwright/test';

// E2E smoke — verifica que a homepage carrega
test.describe('GTD App homepage', () => {
  test('should load without errors', async ({ page }) => {
    await page.goto('/');

    // Page should have title
    await expect(page).toHaveTitle(/GTD/);
  });

  test('should show auth overlay or app container', async ({ page }) => {
    await page.goto('/');

    // Either auth overlay or app container should be visible (depending on session)
    const authOverlay = page.locator('#auth-overlay');
    const appContainer = page.locator('#app-container');

    const authVisible = await authOverlay.isVisible();
    const appVisible = await appContainer.isVisible();

    expect(authVisible || appVisible).toBe(true);
  });
});
