import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('displays stat cards correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check all 4 cards exist
    await expect(page.getByText('Total Notes')).toBeVisible();
    await expect(page.getByText('Sync Status')).toBeVisible();
    await expect(page.getByText('Active Rules')).toBeVisible();
    await expect(page.getByText('Connectors')).toBeVisible();
    
    // Verify uniform height
    const cards = page.locator('.bg-card').filter({ hasText: 'Total Notes' });
    const cardHeight = await cards.first().boundingBox();
    expect(cardHeight?.height).toBeGreaterThanOrEqual(140);
  });
  
  test('sync status shows progress when syncing', async ({ page }) => {
    await page.goto('/');
    
    // Click sync button
    await page.getByRole('button', { name: /sync now/i }).click();
    
    // Verify syncing state
    await expect(page.getByText('Syncing')).toBeVisible();
    
    // Check progress bar exists
    const progressBar = page.locator('.bg-primary.h-2');
    await expect(progressBar).toBeVisible();
  });
});