import { test, expect } from '@playwright/test';

test.describe('Sidebar Navigation', () => {
  test('collapses to icon-only mode', async ({ page }) => {
    await page.goto('/');
    
    // Click collapse button
    await page.getByRole('button', { name: /collapse sidebar/i }).click();
    
    // Verify width changed
    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(80);
    
    // Verify icons still visible
    await expect(page.getByTitle('Dashboard')).toBeVisible();
  });
  
  test('hides completely and shows floating button', async ({ page }) => {
    await page.goto('/');
    
    // Click hide button
    await page.getByRole('button', { name: /hide sidebar/i }).click();
    
    // Verify sidebar hidden
    await expect(page.locator('aside')).not.toBeVisible();
    
    // Verify show button appears
    await expect(page.getByRole('button', { name: /show sidebar/i })).toBeVisible();
  });

  test('responds to keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    
    const sidebar = page.locator('aside');
    
    // Test Ctrl/Cmd+B to collapse
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+b' : 'Control+b');
    
    const collapsedBox = await sidebar.boundingBox();
    expect(collapsedBox?.width).toBeLessThanOrEqual(80);
    
    // Test Ctrl/Cmd+Shift+B to hide
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+b' : 'Control+Shift+b');
    
    await expect(sidebar).not.toBeVisible();
  });
});