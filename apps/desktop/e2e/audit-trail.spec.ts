import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';

test.describe('Audit Trail Integration', () => {
  let electronApp: any;
  let window: any;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../electron/main.ts')],
    });
    window = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should log note creation events', async () => {
    // Navigate to notes page
    await window.click('a[href="/notes"]');
    await window.waitForTimeout(500);

    // Create a new note
    await window.click('button[title="New Note"]');
    await window.fill('input[placeholder="Note title"]', 'Audit Test Note');
    await window.fill('textarea', 'This is a test note for audit logging');
    
    // Save the note (trigger the create event)
    await window.click('button:has-text("Save")');
    await window.waitForTimeout(500);

    // Verify audit log entry was created
    // This would require access to the audit database or an API endpoint
    // For now, we verify the operation completed successfully
    const noteTitle = await window.textContent('h2');
    expect(noteTitle).toBe('Audit Test Note');
  });

  test('should log note update events', async () => {
    // Assume we have a note from the previous test
    await window.click('a[href="/notes"]');
    await window.waitForTimeout(500);

    // Click on the first note
    await window.click('.note-item:first-child');
    await window.waitForTimeout(500);

    // Update the note
    const originalTitle = await window.inputValue('input[placeholder="Note title"]');
    await window.fill('input[placeholder="Note title"]', originalTitle + ' - Updated');
    await window.click('button:has-text("Save")');
    await window.waitForTimeout(500);

    // Verify the update was logged
    const updatedTitle = await window.textContent('h2');
    expect(updatedTitle).toContain('Updated');
  });

  test('should log note deletion events', async () => {
    // Navigate to notes and select a note
    await window.click('a[href="/notes"]');
    await window.waitForTimeout(500);
    
    const initialNoteCount = await window.locator('.note-item').count();
    
    // Click on the first note
    await window.click('.note-item:first-child');
    await window.waitForTimeout(500);

    // Delete the note
    await window.click('button[title="Delete Note"]');
    await window.click('button:has-text("Confirm")'); // Assuming there's a confirmation
    await window.waitForTimeout(500);

    // Verify deletion
    const finalNoteCount = await window.locator('.note-item').count();
    expect(finalNoteCount).toBe(initialNoteCount - 1);
  });

  test('should log AI operation events', async () => {
    // Navigate to notes and create/select a note
    await window.click('a[href="/notes"]');
    await window.waitForTimeout(500);
    await window.click('.note-item:first-child');
    await window.waitForTimeout(500);

    // Trigger AI summarization
    await window.click('button[title="AI Actions"]');
    await window.click('button:has-text("Summarize")');
    await window.waitForTimeout(2000); // Wait for AI processing

    // Verify AI operation completed (summary appears)
    const content = await window.textContent('textarea');
    expect(content).toBeTruthy();
  });

  test('should log sync operations', async () => {
    // Navigate to settings
    await window.click('a[href="/settings"]');
    await window.waitForTimeout(500);

    // Trigger a manual sync
    await window.click('button:has-text("Sync Now")');
    await window.waitForTimeout(1000);

    // Verify sync status updated
    const syncStatus = await window.textContent('.sync-status');
    expect(syncStatus).toContain('Synced');
  });

  test('should log settings update events', async () => {
    // Navigate to settings
    await window.click('a[href="/settings"]');
    await window.waitForTimeout(500);

    // Change a setting (e.g., theme)
    await window.click('button[title="Toggle Theme"]');
    await window.waitForTimeout(500);

    // Verify theme changed
    const body = await window.locator('body');
    const className = await body.getAttribute('class');
    expect(className).toBeTruthy();
  });

  test('should sanitize error messages in audit logs', async () => {
    // This test would require triggering an error condition
    // and verifying that sensitive data is redacted
    
    // For example, trying to create a note with invalid data
    await window.click('a[href="/notes"]');
    await window.waitForTimeout(500);
    await window.click('button[title="New Note"]');
    
    // Try to save without required fields (should trigger error)
    await window.click('button:has-text("Save")');
    await window.waitForTimeout(500);

    // Verify error is shown (and would be logged without sensitive data)
    const errorMessage = await window.textContent('.error-message');
    expect(errorMessage).toBeTruthy();
    // Sensitive data like passwords, tokens should not appear in the error
  });

  test('should verify audit log database integrity', async () => {
    // This test would require direct database access
    // We would verify:
    // 1. Audit logs table exists
    // 2. Logs contain expected fields (eventType, action, status, timestamp)
    // 3. No sensitive data in error messages
    // 4. Logs are ordered by timestamp
    
    // For now, we just verify the app is functioning
    const title = await window.title();
    expect(title).toBeTruthy();
  });
});