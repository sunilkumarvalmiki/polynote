import { ipcMain, shell, app } from 'electron';
import { mainWindow } from './main';

/**
 * IPC Handlers for secure communication between main and renderer processes
 *
 * Security principles:
 * 1. All handlers validate input
 * 2. No direct access to Node.js/Electron APIs from renderer
 * 3. All file system operations are sandboxed
 * 4. External URLs are validated before opening
 */

// Mock data storage (replace with actual backend calls)
const mockNotes: any[] = [];
const mockRules: any[] = [];
let mockSettings: any = {
  theme: 'dark',
  language: 'en',
  syncInterval: 300,
  aiProvider: 'ollama',
};

export function registerIpcHandlers(): void {
  // ============================================================================
  // Notes API
  // ============================================================================

  ipcMain.handle('notes:get-all', async (_, filter?: { search?: string; tags?: string[] }) => {
    try {
      // TODO: Replace with actual backend call
      let notes = [...mockNotes];

      if (filter?.search) {
        notes = notes.filter(note =>
          note.title.toLowerCase().includes(filter.search!.toLowerCase()) ||
          note.body.toLowerCase().includes(filter.search!.toLowerCase())
        );
      }

      if (filter?.tags && filter.tags.length > 0) {
        notes = notes.filter(note =>
          filter.tags!.some(tag => note.tags?.includes(tag))
        );
      }

      return notes;
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  });

  ipcMain.handle('notes:get-one', async (_, noteId: string) => {
    try {
      // TODO: Replace with actual backend call
      const note = mockNotes.find(n => n.id === noteId);
      if (!note) {
        throw new Error(`Note not found: ${noteId}`);
      }
      return note;
    } catch (error) {
      console.error('Error getting note:', error);
      throw error;
    }
  });

  ipcMain.handle('notes:create', async (_, note: any) => {
    try {
      // TODO: Replace with actual backend call
      const newNote = {
        id: `note-${Date.now()}`,
        ...note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockNotes.push(newNote);
      return newNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  });

  ipcMain.handle('notes:update', async (_, noteId: string, updates: any) => {
    try {
      // TODO: Replace with actual backend call
      const index = mockNotes.findIndex(n => n.id === noteId);
      if (index === -1) {
        throw new Error(`Note not found: ${noteId}`);
      }
      mockNotes[index] = {
        ...mockNotes[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return mockNotes[index];
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  });

  ipcMain.handle('notes:delete', async (_, noteId: string) => {
    try {
      // TODO: Replace with actual backend call
      const index = mockNotes.findIndex(n => n.id === noteId);
      if (index === -1) {
        throw new Error(`Note not found: ${noteId}`);
      }
      mockNotes.splice(index, 1);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  });

  // ============================================================================
  // Search API
  // ============================================================================

  ipcMain.handle('search:notes', async (_, query: string, _options?: any) => {
    try {
      // TODO: Replace with actual FTS5 search
      const results = mockNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.body.toLowerCase().includes(query.toLowerCase())
      );
      return results;
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  });

  // ============================================================================
  // Sync API
  // ============================================================================

  ipcMain.handle('sync:get-status', async () => {
    try {
      // TODO: Replace with actual sync status
      return {
        isRunning: false,
        lastSync: new Date().toISOString(),
        connectors: [
          { id: 'obsidian', name: 'Obsidian', status: 'idle', enabled: true },
          { id: 'notion', name: 'Notion', status: 'idle', enabled: false },
        ],
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:start', async (_, connectorId?: string) => {
    try {
      // TODO: Replace with actual sync start
      console.log('Starting sync for:', connectorId || 'all connectors');

      // Simulate progress updates
      const progress = { current: 0, total: 100 };
      const interval = setInterval(() => {
        progress.current += 10;
        if (mainWindow) {
          mainWindow.webContents.send('sync:progress', progress);
        }
        if (progress.current >= progress.total) {
          clearInterval(interval);
        }
      }, 500);
    } catch (error) {
      console.error('Error starting sync:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:pause', async () => {
    try {
      // TODO: Replace with actual sync pause
      console.log('Pausing sync');
    } catch (error) {
      console.error('Error pausing sync:', error);
      throw error;
    }
  });

  // ============================================================================
  // AI API
  // ============================================================================

  ipcMain.handle('ai:summarize', async (_, _noteId: string, _options?: any) => {
    try {
      // TODO: Replace with actual AI summarization
      return 'This is a mock summary of the note.';
    } catch (error) {
      console.error('Error summarizing note:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:translate', async (_, _noteId: string, _targetLang: string) => {
    try {
      // TODO: Replace with actual AI translation
      return 'This is a mock translation.';
    } catch (error) {
      console.error('Error translating note:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:rewrite', async (_, _noteId: string, _style: string) => {
    try {
      // TODO: Replace with actual AI rewrite
      return 'This is a mock rewrite.';
    } catch (error) {
      console.error('Error rewriting note:', error);
      throw error;
    }
  });

  // ============================================================================
  // Graph API
  // ============================================================================

  ipcMain.handle('graph:get', async (_, _options?: any) => {
    try {
      // TODO: Replace with actual graph data
      return {
        nodes: mockNotes.map(note => ({
          id: note.id,
          label: note.title,
          group: note.tags?.[0] || 'default',
        })),
        edges: [],
      };
    } catch (error) {
      console.error('Error getting graph:', error);
      throw error;
    }
  });

  // ============================================================================
  // Rules API
  // ============================================================================

  ipcMain.handle('rules:get-all', async () => {
    try {
      // TODO: Replace with actual backend call
      return mockRules;
    } catch (error) {
      console.error('Error getting rules:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:create', async (_, rule: any) => {
    try {
      // TODO: Replace with actual backend call
      const newRule = {
        id: `rule-${Date.now()}`,
        ...rule,
        createdAt: new Date().toISOString(),
      };
      mockRules.push(newRule);
      return newRule;
    } catch (error) {
      console.error('Error creating rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:update', async (_, ruleId: string, updates: any) => {
    try {
      // TODO: Replace with actual backend call
      const index = mockRules.findIndex(r => r.id === ruleId);
      if (index === -1) {
        throw new Error(`Rule not found: ${ruleId}`);
      }
      mockRules[index] = { ...mockRules[index], ...updates };
      return mockRules[index];
    } catch (error) {
      console.error('Error updating rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:delete', async (_, ruleId: string) => {
    try {
      // TODO: Replace with actual backend call
      const index = mockRules.findIndex(r => r.id === ruleId);
      if (index === -1) {
        throw new Error(`Rule not found: ${ruleId}`);
      }
      mockRules.splice(index, 1);
    } catch (error) {
      console.error('Error deleting rule:', error);
      throw error;
    }
  });

  // ============================================================================
  // Settings API
  // ============================================================================

  ipcMain.handle('settings:get', async () => {
    try {
      // TODO: Replace with actual backend call
      return mockSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', async (_, updates: any) => {
    try {
      // TODO: Replace with actual backend call
      mockSettings = { ...mockSettings, ...updates };
      return mockSettings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  });

  // ============================================================================
  // System API
  // ============================================================================

  ipcMain.handle('system:open-external', async (_, url: string) => {
    try {
      // Security: Validate URL before opening
      const allowedProtocols = ['http:', 'https:', 'mailto:'];
      const parsedUrl = new URL(url);

      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
      }

      await shell.openExternal(url);
    } catch (error) {
      console.error('Error opening external URL:', error);
      throw error;
    }
  });

  ipcMain.handle('system:get-version', async () => {
    return app.getVersion();
  });

  ipcMain.handle('system:get-path', async (_, name: string) => {
    const allowedPaths = ['home', 'appData', 'userData', 'temp', 'downloads', 'documents'];
    if (!allowedPaths.includes(name)) {
      throw new Error(`Invalid path name: ${name}`);
    }
    return app.getPath(name as any);
  });
}
