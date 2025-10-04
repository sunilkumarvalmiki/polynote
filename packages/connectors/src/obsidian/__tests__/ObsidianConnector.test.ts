import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

import { watch } from 'chokidar';
import matter from 'gray-matter';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Note } from '@polynote/shared';

import { ObsidianConnector } from '../ObsidianConnector.js';

vi.mock('node:fs');
vi.mock('chokidar');
vi.mock('gray-matter');

describe('ObsidianConnector', () => {
  let connector: ObsidianConnector;
  const mockConfig = {
    vaultPath: '/test/vault',
    enabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new ObsidianConnector(mockConfig);
    (existsSync as any).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create connector with correct config', () => {
      expect(connector.name).toBe('obsidian');
      expect(connector.enabled).toBe(true);
    });

    it('should throw error if vault path does not exist', async () => {
      (existsSync as any).mockReturnValue(false);
      await expect(connector.initialize()).rejects.toThrow(
        'Obsidian vault not found: /test/vault'
      );
    });

    it('should start file watcher on initialization', async () => {
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
      };
      (watch as any).mockReturnValue(mockWatcher);

      await connector.initialize();

      expect(watch).toHaveBeenCalledWith('/test/vault', expect.objectContaining({
        persistent: true,
        ignoreInitial: false,
        ignored: expect.any(RegExp),
        awaitWriteFinish: expect.any(Object),
      }));
      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
    });

    it('should ignore dotfiles in watcher', async () => {
      const mockWatcher = { on: vi.fn().mockReturnThis() };
      (watch as any).mockReturnValue(mockWatcher);

      await connector.initialize();

      const watchCall = (watch as any).mock.calls[0][1];
      expect(watchCall.ignored).toBeInstanceOf(RegExp);
      expect(watchCall.ignored.test('/.git/config')).toBe(true);
      expect(watchCall.ignored.test('/notes.md')).toBe(false);
    });

    it('should configure write stabilization', async () => {
      const mockWatcher = { on: vi.fn().mockReturnThis() };
      (watch as any).mockReturnValue(mockWatcher);

      await connector.initialize();

      const watchCall = (watch as any).mock.calls[0][1];
      expect(watchCall.awaitWriteFinish.stabilityThreshold).toBe(2000);
      expect(watchCall.awaitWriteFinish.pollInterval).toBe(100);
    });
  });

  describe('Authentication', () => {
    it('should authenticate successfully without credentials', async () => {
      await expect(connector.authenticate()).resolves.toBeUndefined();
    });
  });

  describe('Pull Changes', () => {
    const mockFileContent = `---
id: test-id
title: Test Note
created_at: 1704067200000
updated_at: 1704153600000
tags: [test, note]
---

# Test Content`;

    beforeEach(() => {
      (matter as any).mockReturnValue({
        data: {
          id: 'test-id',
          title: 'Test Note',
          created_at: 1704067200000,
          updated_at: 1704153600000,
          tags: ['test', 'note'],
        },
        content: '# Test Content',
      });
    });

    it('should pull all notes from vault', async () => {
      const mockStats = { birthtimeMs: 1704067200000, mtimeMs: 1704153600000 };
      vi.spyOn(require('node:fs'), 'readdirSync').mockReturnValue([
        { name: 'note1.md', isDirectory: () => false, isFile: () => true },
        { name: 'note2.md', isDirectory: () => false, isFile: () => true },
      ]);
      vi.spyOn(require('node:fs'), 'statSync').mockReturnValue(mockStats);
      (readFileSync as any).mockReturnValue(mockFileContent);

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(2);
      expect(readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should filter notes by since date', async () => {
      const sinceDate = new Date(1704110000000); // Between created and updated
      const mockStats = { birthtimeMs: 1704067200000, mtimeMs: 1704153600000 };
      vi.spyOn(require('node:fs'), 'readdirSync').mockReturnValue([
        { name: 'note.md', isDirectory: () => false, isFile: () => true },
      ]);
      vi.spyOn(require('node:fs'), 'statSync').mockReturnValue(mockStats);
      (readFileSync as any).mockReturnValue(mockFileContent);

      const notes = await connector.pullChanges(sinceDate);

      expect(notes).toHaveLength(1);
      expect(notes[0].updated_at).toBeGreaterThanOrEqual(sinceDate.getTime());
    });

    it('should recursively scan subdirectories', async () => {
      const mockStats = { birthtimeMs: 1704067200000, mtimeMs: 1704153600000 };
      const readdirSyncMock = vi.spyOn(require('node:fs'), 'readdirSync')
        .mockReturnValueOnce([
          { name: 'subdir', isDirectory: () => true, isFile: () => false },
        ])
        .mockReturnValueOnce([
          { name: 'note.md', isDirectory: () => false, isFile: () => true },
        ]);
      
      vi.spyOn(require('node:fs'), 'statSync').mockReturnValue(mockStats);
      (readFileSync as any).mockReturnValue(mockFileContent);

      const notes = await connector.pullChanges();

      expect(readdirSyncMock).toHaveBeenCalledTimes(2);
      expect(notes).toHaveLength(1);
    });

    it('should skip non-markdown files', async () => {
      vi.spyOn(require('node:fs'), 'readdirSync').mockReturnValue([
        { name: 'note.md', isDirectory: () => false, isFile: () => true },
        { name: 'image.png', isDirectory: () => false, isFile: () => true },
        { name: 'doc.txt', isDirectory: () => false, isFile: () => true },
      ]);
      const mockStats = { birthtimeMs: 1704067200000, mtimeMs: 1704153600000 };
      vi.spyOn(require('node:fs'), 'statSync').mockReturnValue(mockStats);
      (readFileSync as any).mockReturnValue(mockFileContent);

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(1);
      expect(readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle notes without frontmatter gracefully', async () => {
      (matter as any).mockReturnValue({
        data: {},
        content: 'Note content without frontmatter',
      });
      const mockStats = { birthtimeMs: 1704067200000, mtimeMs: 1704153600000 };
      vi.spyOn(require('node:fs'), 'readdirSync').mockReturnValue([
        { name: 'note.md', isDirectory: () => false, isFile: () => true },
      ]);
      vi.spyOn(require('node:fs'), 'statSync').mockReturnValue(mockStats);
      (readFileSync as any).mockReturnValue('Note content');

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('note');
      expect(notes[0].created_at).toBe(mockStats.birthtimeMs);
    });

    it('should handle file read errors gracefully', async () => {
      vi.spyOn(require('node:fs'), 'readdirSync').mockReturnValue([
        { name: 'note.md', isDirectory: () => false, isFile: () => true },
      ]);
      (readFileSync as any).mockImplementation(() => {
        throw new Error('Read error');
      });

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(0);
    });
  });

  describe('Push Changes', () => {
    const mockNote: Note = {
      id: 'note-123',
      title: 'Test Note',
      body: '# Content',
      created_at: 1704067200000,
      updated_at: 1704153600000,
      source_connector: 'obsidian',
      source_id: 'note-123',
      checksum: 'abc123',
      tags: ['test'],
    };

    beforeEach(() => {
      (matter.stringify as any).mockReturnValue('mocked markdown content');
      (mkdirSync as any).mockReturnValue(undefined);
      (writeFileSync as any).mockReturnValue(undefined);
    });

    it('should write notes to vault', async () => {
      await connector.pushChanges([mockNote]);

      expect(writeFileSync).toHaveBeenCalledWith(
        '/test/vault/note-123.md',
        'mocked markdown content',
        'utf-8'
      );
    });

    it('should create vault directory if not exists', async () => {
      (existsSync as any).mockReturnValueOnce(false);

      await connector.pushChanges([mockNote]);

      expect(mkdirSync).toHaveBeenCalledWith('/test/vault', { recursive: true });
    });

    it('should process multiple notes', async () => {
      const notes = [
        mockNote,
        { ...mockNote, id: 'note-456' },
        { ...mockNote, id: 'note-789' },
      ];

      await connector.pushChanges(notes);

      expect(writeFileSync).toHaveBeenCalledTimes(3);
    });

    it('should include frontmatter in written files', async () => {
      await connector.pushChanges([mockNote]);

      expect(matter.stringify).toHaveBeenCalledWith(
        '# Content',
        expect.objectContaining({
          id: 'note-123',
          title: 'Test Note',
          created_at: 1704067200000,
          updated_at: 1704153600000,
          tags: ['test'],
        })
      );
    });
  });

  describe('Get Note', () => {
    it('should retrieve note by ID', async () => {
      const mockFileContent = `---
id: test-id
title: Test
---
Content`;
      const mockStats = { birthtimeMs: 1704067200000, mtimeMs: 1704153600000 };
      
      (matter as any).mockReturnValue({
        data: { id: 'test-id', title: 'Test' },
        content: 'Content',
      });
      vi.spyOn(require('node:fs'), 'statSync').mockReturnValue(mockStats);
      (readFileSync as any).mockReturnValue(mockFileContent);

      const note = await connector.getNote('test-id');

      expect(note).not.toBeNull();
      expect(note?.title).toBe('Test');
      expect(readFileSync).toHaveBeenCalledWith('/test/vault/test-id.md', 'utf-8');
    });

    it('should return null if file does not exist', async () => {
      (existsSync as any).mockReturnValue(false);

      const note = await connector.getNote('nonexistent');

      expect(note).toBeNull();
    });

    it('should handle file read errors', async () => {
      (readFileSync as any).mockImplementation(() => {
        throw new Error('Read error');
      });

      const note = await connector.getNote('test-id');

      expect(note).toBeNull();
    });
  });

  describe('Create Note', () => {
    beforeEach(() => {
      (matter.stringify as any).mockReturnValue('formatted content');
      (writeFileSync as any).mockReturnValue(undefined);
    });

    it('should create note with generated ID', async () => {
      const newNote = {
        title: 'New Note',
        body: 'Content',
        created_at: Date.now(),
        updated_at: Date.now(),
        source_connector: 'obsidian',
        source_id: '',
        checksum: '',
        tags: [],
      };

      const created = await connector.createNote(newNote);

      expect(created.id).toBeDefined();
      expect(created.title).toBe('New Note');
      expect(created.source_connector).toBe('obsidian');
    });

    it('should write note to file', async () => {
      const newNote = {
        title: 'New Note',
        body: 'Content',
        created_at: Date.now(),
        updated_at: Date.now(),
        source_connector: 'obsidian',
        source_id: '',
        checksum: '',
        tags: [],
      };

      await connector.createNote(newNote);

      expect(writeFileSync).toHaveBeenCalled();
    });

    it('should generate checksum', async () => {
      const newNote = {
        title: 'New Note',
        body: 'Content',
        created_at: Date.now(),
        updated_at: Date.now(),
        source_connector: 'obsidian',
        source_id: '',
        checksum: '',
        tags: [],
      };

      const created = await connector.createNote(newNote);

      expect(created.checksum).toBeDefined();
      expect(created.checksum.length).toBeGreaterThan(0);
    });
  });

  describe('Update Note', () => {
    const mockExisting: Note = {
      id: 'note-123',
      title: 'Original',
      body: 'Original content',
      created_at: 1704067200000,
      updated_at: 1704153600000,
      source_connector: 'obsidian',
      source_id: 'note-123',
      checksum: 'abc123',
      tags: [],
    };

    beforeEach(() => {
      (matter.stringify as any).mockReturnValue('updated content');
      (writeFileSync as any).mockReturnValue(undefined);
    });

    it('should update existing note', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(mockExisting);

      const updated = await connector.updateNote('note-123', { title: 'Updated' });

      expect(updated.title).toBe('Updated');
      expect(updated.body).toBe('Original content');
      expect(writeFileSync).toHaveBeenCalled();
    });

    it('should update checksum when body changes', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(mockExisting);

      const updated = await connector.updateNote('note-123', { body: 'New content' });

      expect(updated.checksum).not.toBe(mockExisting.checksum);
    });

    it('should update timestamp', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(mockExisting);
      const beforeUpdate = Date.now();

      const updated = await connector.updateNote('note-123', { title: 'Updated' });

      expect(updated.updated_at).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('should throw error if note not found', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(null);

      await expect(connector.updateNote('nonexistent', {})).rejects.toThrow(
        'Note not found: nonexistent'
      );
    });
  });

  describe('Delete Note', () => {
    const mockNote: Note = {
      id: 'note-123',
      title: 'Test',
      body: 'Content',
      created_at: 1704067200000,
      updated_at: 1704153600000,
      source_connector: 'obsidian',
      source_id: 'note-123',
      checksum: 'abc123',
      tags: [],
    };

    beforeEach(() => {
      (matter.stringify as any).mockReturnValue('content');
      (writeFileSync as any).mockReturnValue(undefined);
    });

    it('should mark note as deleted instead of removing file', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(mockNote);

      await connector.deleteNote('note-123');

      const writeCall = (writeFileSync as any).mock.calls[0];
      expect(writeCall).toBeDefined();
      expect(matter.stringify).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deleted_at: expect.any(Number),
        })
      );
    });

    it('should do nothing if file does not exist', async () => {
      (existsSync as any).mockReturnValue(false);

      await connector.deleteNote('nonexistent');

      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle note not found gracefully', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(null);

      await expect(connector.deleteNote('note-123')).resolves.toBeUndefined();
    });
  });

  describe('File Path Generation', () => {
    it('should generate correct file path', () => {
      const filePath = (connector as any).getFilePath('test-note');

      expect(filePath).toBe('/test/vault/test-note.md');
    });

    it('should handle special characters in ID', () => {
      const filePath = (connector as any).getFilePath('note-with-spaces');

      expect(filePath).toContain('note-with-spaces.md');
    });
  });

  describe('File Change Handlers', () => {
    it('should log file changes for markdown files', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await (connector as any).handleFileChange('/test/vault/note.md');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('changed'));
    });

    it('should ignore non-markdown file changes', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await (connector as any).handleFileChange('/test/vault/image.png');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log file deletions for markdown files', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await (connector as any).handleFileDelete('/test/vault/note.md');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deleted'));
    });

    it('should ignore non-markdown file deletions', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await (connector as any).handleFileDelete('/test/vault/image.png');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Close', () => {
    it('should close file watcher', async () => {
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
      };
      (watch as any).mockReturnValue(mockWatcher);

      await connector.initialize();
      await connector.close();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should handle close without watcher', async () => {
      await expect(connector.close()).resolves.toBeUndefined();
    });
  });
});