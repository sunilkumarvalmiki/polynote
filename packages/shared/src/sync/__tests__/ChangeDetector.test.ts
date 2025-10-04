import { describe, it, expect, beforeEach } from 'vitest';

import type { Note } from '../../types/index.js';
import { ChangeDetector } from '../ChangeDetector.js';

describe('ChangeDetector', () => {
  let detector: ChangeDetector;

  beforeEach(() => {
    detector = new ChangeDetector();
  });

  const createNote = (overrides: Partial<Note> = {}): Note => ({
    id: 'note-1',
    title: 'Test Note',
    body: 'Test content',
    created_at: Date.now(),
    updated_at: Date.now(),
    source_connector: 'obsidian',
    source_id: 'test-note.md',
    checksum: 'abc123',
    ...overrides
  });

  describe('detectChanges', () => {
    it('should detect newly created notes', () => {
      const localNotes: Note[] = [];
      const remoteNotes: Note[] = [
        createNote({ id: 'note-1' }),
        createNote({ id: 'note-2' })
      ];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      expect(result.created).toHaveLength(2);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.unchanged).toBe(0);
      expect(result.created[0].changeType).toBe('create');
      expect(result.created[0].source).toBe('obsidian');
    });

    it('should detect updated notes based on timestamp', () => {
      const timestamp = Date.now();
      const localNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp, body: 'Old content' })
      ];
      const remoteNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp + 1000, body: 'New content' })
      ];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(1);
      expect(result.deleted).toHaveLength(0);
      expect(result.updated[0].changeType).toBe('update');
      expect(result.updated[0].noteId).toBe('note-1');
    });

    it('should detect updated notes based on content checksum', () => {
      const timestamp = Date.now();
      const localNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp, body: 'Content A' })
      ];
      const remoteNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp + 1000, body: 'Content B' })
      ];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      expect(result.updated).toHaveLength(1);
    });

    it('should detect deleted notes', () => {
      const localNotes: Note[] = [
        createNote({ id: 'note-1', source_connector: 'obsidian' }),
        createNote({ id: 'note-2', source_connector: 'obsidian' })
      ];
      const remoteNotes: Note[] = [
        createNote({ id: 'note-1' })
      ];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(1);
      expect(result.deleted[0].noteId).toBe('note-2');
      expect(result.deleted[0].changeType).toBe('delete');
    });

    it('should not delete notes from different sources', () => {
      const localNotes: Note[] = [
        createNote({ id: 'note-1', source_connector: 'notion' }),
        createNote({ id: 'note-2', source_connector: 'obsidian' })
      ];
      const remoteNotes: Note[] = [];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      expect(result.deleted).toHaveLength(1);
      expect(result.deleted[0].noteId).toBe('note-2');
    });

    it('should count unchanged notes', () => {
      const timestamp = Date.now();
      const note = createNote({ id: 'note-1', updated_at: timestamp, body: 'Same content' });
      const localNotes: Note[] = [note];
      const remoteNotes: Note[] = [note];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.unchanged).toBe(1);
    });

    it('should handle empty note lists', () => {
      const result = detector.detectChanges([], [], 'obsidian');

      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
      expect(result.unchanged).toBe(0);
    });

    it('should detect mixed changes', () => {
      const timestamp = Date.now();
      const localNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp, body: 'Old' }),
        createNote({ id: 'note-2', source_connector: 'obsidian' }),
        createNote({ id: 'note-4', updated_at: timestamp, body: 'Same' })
      ];
      const remoteNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp + 1000, body: 'New' }),
        createNote({ id: 'note-3' }),
        createNote({ id: 'note-4', updated_at: timestamp, body: 'Same' })
      ];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      expect(result.created).toHaveLength(1); // note-3
      expect(result.updated).toHaveLength(1); // note-1
      expect(result.deleted).toHaveLength(1); // note-2
      expect(result.unchanged).toBe(1); // note-4
    });
  });

  describe('detectSingleNoteChange', () => {
    it('should detect new note when local is null', () => {
      const remoteNote = createNote({ id: 'note-1' });
      
      const change = detector.detectSingleNoteChange(null, remoteNote, 'obsidian');

      expect(change).toBeDefined();
      expect(change?.changeType).toBe('create');
      expect(change?.noteId).toBe('note-1');
    });

    it('should detect deleted note when remote is null', () => {
      const localNote = createNote({ id: 'note-1' });
      
      const change = detector.detectSingleNoteChange(localNote, null, 'obsidian');

      expect(change).toBeDefined();
      expect(change?.changeType).toBe('delete');
      expect(change?.noteId).toBe('note-1');
    });

    it('should detect updated note', () => {
      const timestamp = Date.now();
      const localNote = createNote({ id: 'note-1', updated_at: timestamp, body: 'Old' });
      const remoteNote = createNote({ id: 'note-1', updated_at: timestamp + 1000, body: 'New' });
      
      const change = detector.detectSingleNoteChange(localNote, remoteNote, 'obsidian');

      expect(change).toBeDefined();
      expect(change?.changeType).toBe('update');
    });

    it('should return null for unchanged note', () => {
      const timestamp = Date.now();
      const note = createNote({ id: 'note-1', updated_at: timestamp, body: 'Same' });
      
      const change = detector.detectSingleNoteChange(note, note, 'obsidian');

      expect(change).toBeNull();
    });

    it('should return null when both notes are null', () => {
      const change = detector.detectSingleNoteChange(null, null, 'obsidian');

      expect(change).toBeNull();
    });
  });

  describe('calculateStats', () => {
    it('should calculate correct statistics', () => {
      const result = {
        created: [
          { noteId: '1', changeType: 'create' as const, source: 'test', timestamp: new Date(), checksum: 'a' },
          { noteId: '2', changeType: 'create' as const, source: 'test', timestamp: new Date(), checksum: 'b' }
        ],
        updated: [
          { noteId: '3', changeType: 'update' as const, source: 'test', timestamp: new Date(), checksum: 'c' }
        ],
        deleted: [],
        unchanged: 5
      };

      const stats = detector.calculateStats(result);

      expect(stats.total).toBe(8);
      expect(stats.created).toBe(2);
      expect(stats.updated).toBe(1);
      expect(stats.deleted).toBe(0);
      expect(stats.unchanged).toBe(5);
    });

    it('should handle empty result', () => {
      const result = {
        created: [],
        updated: [],
        deleted: [],
        unchanged: 0
      };

      const stats = detector.calculateStats(result);

      expect(stats.total).toBe(0);
      expect(stats.created).toBe(0);
      expect(stats.updated).toBe(0);
      expect(stats.deleted).toBe(0);
      expect(stats.unchanged).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle notes with identical timestamps but different content', () => {
      const timestamp = Date.now();
      const localNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp, body: 'Content A' })
      ];
      const remoteNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp, body: 'Content B' })
      ];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      // Should use checksum to detect change despite same timestamp
      expect(result.updated).toHaveLength(1);
    });

    it('should handle notes with newer local timestamp', () => {
      const timestamp = Date.now();
      const localNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp + 1000, body: 'Newer local' })
      ];
      const remoteNotes: Note[] = [
        createNote({ id: 'note-1', updated_at: timestamp, body: 'Older remote' })
      ];

      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');

      // Should still detect as change based on content difference
      expect(result.updated).toHaveLength(1);
    });

    it('should handle large note sets efficiently', () => {
      const localNotes: Note[] = Array.from({ length: 1000 }, (_, i) => 
        createNote({ id: `note-${i}`, body: `Content ${i}` })
      );
      const remoteNotes: Note[] = Array.from({ length: 1000 }, (_, i) => 
        createNote({ id: `note-${i}`, body: `Content ${i}` })
      );

      const startTime = Date.now();
      const result = detector.detectChanges(localNotes, remoteNotes, 'obsidian');
      const duration = Date.now() - startTime;

      expect(result.unchanged).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});