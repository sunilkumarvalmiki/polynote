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

// Type definitions for mock data
interface Note {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Rule {
  id: string;
  createdAt: string;
  [key: string]: unknown;
}

interface Settings {
  theme: string;
  language: string;
  syncInterval: number;
  aiProvider: string;
  [key: string]: unknown;
}

interface NoteFilter {
  search?: string;
  tags?: string[];
}

// Mock data storage (replace with actual backend calls)
const mockNotes: Note[] = [];
const mockRules: Rule[] = [];
let mockSettings: Settings = {
  theme: 'dark',
  language: 'en',
  syncInterval: 300,
  aiProvider: 'ollama',
};

export function registerIpcHandlers(): void {
  // ============================================================================
  // Notes API
  // ============================================================================

  ipcMain.handle('notes:get-all', (_, filter?: NoteFilter) => {
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

  ipcMain.handle('notes:get-one', (_, noteId: string) => {
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

  ipcMain.handle('notes:create', (_, note: Partial<Note>) => {
    try {
      // TODO: Replace with actual backend call
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: note.title || '',
        body: note.body || '',
        tags: note.tags || [],
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

  ipcMain.handle('notes:update', (_, noteId: string, updates: Partial<Note>) => {
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

  ipcMain.handle('notes:delete', (_, noteId: string) => {
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

  ipcMain.handle('search:notes', (_, query: string) => {
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

  ipcMain.handle('sync:get-status', () => {
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

  ipcMain.handle('sync:start', (_, connectorId?: string) => {
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

  ipcMain.handle('sync:pause', () => {
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

  ipcMain.handle('ai:summarize', (_, _noteId: string) => {
    try {
      // TODO: Replace with actual AI summarization
      return 'This is a mock summary of the note.';
    } catch (error) {
      console.error('Error summarizing note:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:translate', (_, _noteId: string, _targetLang: string) => {
    try {
      // TODO: Replace with actual AI translation
      return 'This is a mock translation.';
    } catch (error) {
      console.error('Error translating note:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:rewrite', (_, _noteId: string, _style: string) => {
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

  ipcMain.handle('graph:get', () => {
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

  ipcMain.handle('rules:get-all', () => {
    try {
      // TODO: Replace with actual backend call
      return mockRules;
    } catch (error) {
      console.error('Error getting rules:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:create', (_, rule: Partial<Rule>) => {
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

  ipcMain.handle('rules:update', (_, ruleId: string, updates: Partial<Rule>) => {
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

  ipcMain.handle('rules:delete', (_, ruleId: string) => {
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

  ipcMain.handle('settings:get', () => {
    try {
      // TODO: Replace with actual backend call
      return mockSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', (_, updates: Partial<Settings>) => {
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

  ipcMain.handle('system:get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('system:get-path', (_, name: string) => {
    const allowedPaths = ['home', 'appData', 'userData', 'temp', 'downloads', 'documents'];
    if (!allowedPaths.includes(name)) {
      throw new Error(`Invalid path name: ${name}`);
    }
    return app.getPath(name as 'home' | 'appData' | 'userData' | 'temp' | 'downloads' | 'documents');
  });
}
