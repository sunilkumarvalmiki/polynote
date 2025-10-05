import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('dashboard screenshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('dashboard.png');
  });
  
  test('notes page screenshot', async ({ page }) => {
    await page.goto('/notes');
    await expect(page).toHaveScreenshot('notes-page.png');
  });

  test('graph page screenshot', async ({ page }) => {
    await page.goto('/graph');
    await expect(page).toHaveScreenshot('graph-page.png');
  });

  test('rules page screenshot', async ({ page }) => {
    await page.goto('/rules');
    await expect(page).toHaveScreenshot('rules-page.png');
  });

  test('settings page screenshot', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveScreenshot('settings-page.png');
  });
  
  test('dark mode screenshot', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /dark/i }).click();
    await page.goto('/');
    await expect(page).toHaveScreenshot('dashboard-dark.png');
  });

  test('collapsed sidebar screenshot', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /collapse sidebar/i }).click();
    await expect(page).toHaveScreenshot('sidebar-collapsed.png');
  });

  test('hidden sidebar screenshot', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /hide sidebar/i }).click();
    await expect(page).toHaveScreenshot('sidebar-hidden.png');
  });
});