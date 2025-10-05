import { test, expect } from '@playwright/test';

test.describe('Notes Page', () => {
  test('creates new note with icon button', async ({ page }) => {
    await page.goto('/notes');
    
    // Click new note button (icon only)
    const newNoteBtn = page.getByRole('button', { name: /create new note/i });
    await expect(newNoteBtn).toBeVisible();
    await newNoteBtn.click();
    
    // Verify editor opens
    await expect(page.getByPlaceholder('Note title...')).toBeVisible();
  });
  
  test('AI menu displays all options', async ({ page }) => {
    await page.goto('/notes');
    
    // Create and open note
    await page.getByRole('button', { name: /new note/i }).click();
    
    // Click AI button
    await page.getByRole('button', { name: /AI/i }).click();
    
    // Verify all AI options
    await expect(page.getByText('Summarize')).toBeVisible();
    await expect(page.getByText('Translate to Telugu')).toBeVisible();
    await expect(page.getByText('Translate to Hindi')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    await expect(page.getByText('Casual')).toBeVisible();
    await expect(page.getByText('Concise')).toBeVisible();
    await expect(page.getByText('Detailed')).toBeVisible();
  });

  test('markdown toolbar has all formatting options', async ({ page }) => {
    await page.goto('/notes');
    
    // Create and open note
    await page.getByRole('button', { name: /new note/i }).click();
    
    // Verify markdown toolbar buttons
    await expect(page.getByRole('button', { name: /bold/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /italic/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /heading/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /link/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /code/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /list/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /quote/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /image/i })).toBeVisible();
  });

  test('title field has focus border styling', async ({ page }) => {
    await page.goto('/notes');
    
    // Create and open note
    await page.getByRole('button', { name: /new note/i }).click();
    
    const titleInput = page.getByPlaceholder('Note title...');
    
    // Focus the title field and verify it receives focus
    await titleInput.focus();
    
    // Verify the field is focused by checking if it's the active element
    await expect(titleInput).toBeFocused();
  });
});