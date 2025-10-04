import { describe, it, expect, beforeEach } from 'vitest';

import type { Note } from '../../types/index.js';
import { generateChecksum } from '../../utils/checksum.js';
import { ConflictResolver } from '../ConflictResolver.js';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  // Helper to create test notes
  const createNote = (overrides: Partial<Note> = {}): Note => ({
    id: '1',
    title: 'Test',
    body: 'Content',
    source_connector: 'obsidian',
    source_id: 'ext1',
    created_at: 1000,
    updated_at: 2000,
    checksum: generateChecksum('Test|Content|2000'),
    tags: [],
    ...overrides,
  });

  describe('detectConflict', () => {
    it('should return false when notes are identical', () => {
      const note = createNote();
      const result = resolver.detectConflict(note, note);
      expect(result).toBe(false);
    });

    it('should return false when notes have same checksum', () => {
      const noteA = createNote();
      const noteB = createNote();
      const result = resolver.detectConflict(noteA, noteB);
      expect(result).toBe(false);
    });

    it('should return false when notes have different source_id', () => {
      const noteA = createNote({ source_id: 'id1' });
      const noteB = createNote({ source_id: 'id2', checksum: 'different' });
      const result = resolver.detectConflict(noteA, noteB);
      expect(result).toBe(false);
    });

    it('should return true when notes have different checksums and same source_id', () => {
      const noteA = createNote({
        body: 'Content A',
        checksum: generateChecksum('Test|Content A|2000'),
      });
      const noteB = createNote({
        body: 'Content B',
        checksum: generateChecksum('Test|Content B|2000'),
      });
      const result = resolver.detectConflict(noteA, noteB);
      expect(result).toBe(true);
    });

    it('should return true when both notes diverged from base', () => {
      const base = createNote({
        body: 'Original',
        checksum: generateChecksum('Test|Original|1000'),
        updated_at: 1000,
      });
      const noteA = createNote({
        body: 'Changed A',
        checksum: generateChecksum('Test|Changed A|2000'),
      });
      const noteB = createNote({
        body: 'Changed B',
        checksum: generateChecksum('Test|Changed B|2000'),
      });
      const result = resolver.detectConflict(noteA, noteB, base);
      expect(result).toBe(true);
    });

    it('should return false when only one note diverged from base', () => {
      const base = createNote({
        body: 'Original',
        checksum: generateChecksum('Test|Original|1000'),
        updated_at: 1000,
      });
      const noteA = createNote({
        body: 'Changed A',
        checksum: generateChecksum('Test|Changed A|2000'),
      });
      const noteB = createNote({ ...base });
      const result = resolver.detectConflict(noteA, noteB, base);
      expect(result).toBe(false);
    });
  });

  describe('merge', () => {
    it('should return newer note when no conflict exists', () => {
      const older = createNote({ updated_at: 1000 });
      const newer = createNote({ updated_at: 2000 });

      const result = resolver.merge(older, newer);

      expect(result.merged).toBe(true);
      expect(result.note).toEqual(newer);
      expect(result.conflict).toBeUndefined();
    });

    it('should auto-merge when only noteA changed', () => {
      const base = createNote({
        body: 'Original',
        checksum: generateChecksum('Test|Original|1000'),
        updated_at: 1000,
      });
      const noteA = createNote({
        body: 'Changed',
        checksum: generateChecksum('Test|Changed|2000'),
        updated_at: 2000,
      });
      const noteB = createNote({ ...base });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.merged).toBe(true);
      expect(result.note?.body).toBe('Changed');
      expect(result.conflict).toBeUndefined();
    });

    it('should auto-merge when only noteB changed', () => {
      const base = createNote({
        body: 'Original',
        checksum: generateChecksum('Test|Original|1000'),
        updated_at: 1000,
      });
      const noteA = createNote({ ...base });
      const noteB = createNote({
        body: 'Changed',
        checksum: generateChecksum('Test|Changed|2000'),
        updated_at: 2000,
      });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.merged).toBe(true);
      expect(result.note?.body).toBe('Changed');
      expect(result.conflict).toBeUndefined();
    });

    it('should auto-merge non-conflicting changes in different fields', () => {
      const base = createNote({
        title: 'Original Title',
        body: 'Original Body',
        checksum: generateChecksum('Original Title|Original Body|1000'),
        updated_at: 1000,
      });
      const noteA = createNote({
        title: 'New Title',
        body: 'Original Body',
        checksum: generateChecksum('New Title|Original Body|2000'),
        updated_at: 2000,
      });
      const noteB = createNote({
        title: 'Original Title',
        body: 'New Body',
        checksum: generateChecksum('Original Title|New Body|2000'),
        updated_at: 2000,
      });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.merged).toBe(true);
      expect(result.note?.title).toBe('New Title');
      expect(result.note?.body).toBe('New Body');
    });

    it('should create conflict when both notes changed same field', () => {
      const base = createNote({
        body: 'Original',
        checksum: generateChecksum('Test|Original|1000'),
        updated_at: 1000,
      });
      const noteA = createNote({
        body: 'Changed A',
        checksum: generateChecksum('Test|Changed A|2000'),
        updated_at: 2000,
      });
      const noteB = createNote({
        body: 'Changed B',
        checksum: generateChecksum('Test|Changed B|2000'),
        updated_at: 2000,
      });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.merged).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict?.note_id).toBe('1');
      expect(result.conflict?.connector_a).toBe('obsidian');
      expect(result.conflict?.connector_b).toBe('obsidian');
      expect(result.conflictFile).toBeDefined();
    });

    it('should create conflict when no base version available', () => {
      const noteA = createNote({
        body: 'Content A',
        checksum: generateChecksum('Test|Content A|2000'),
      });
      const noteB = createNote({
        body: 'Content B',
        checksum: generateChecksum('Test|Content B|2000'),
      });

      const result = resolver.merge(noteA, noteB);

      expect(result.merged).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflictFile).toBeDefined();
    });

    it('should generate conflict file with correct format', () => {
      const noteA = createNote({
        source_connector: 'obsidian',
        body: 'Content A',
        checksum: generateChecksum('Test|Content A|2000'),
      });
      const noteB = createNote({
        source_connector: 'notion',
        body: 'Content B',
        checksum: generateChecksum('Test|Content B|2000'),
      });

      const result = resolver.merge(noteA, noteB);

      expect(result.conflictFile).toContain('# Conflict Resolution Required');
      expect(result.conflictFile).toContain('obsidian');
      expect(result.conflictFile).toContain('notion');
      expect(result.conflictFile).toContain('Content A');
      expect(result.conflictFile).toContain('Content B');
      expect(result.conflictFile).toContain('<<<<<<< VERSION A');
      expect(result.conflictFile).toContain('>>>>>>>');
    });

    it('should include base version in conflict file when available', () => {
      const base = createNote({
        body: 'Original',
        checksum: generateChecksum('Test|Original|1000'),
      });
      const noteA = createNote({
        body: 'Changed A',
        checksum: generateChecksum('Test|Changed A|2000'),
      });
      const noteB = createNote({
        body: 'Changed B',
        checksum: generateChecksum('Test|Changed B|2000'),
      });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.conflictFile).toContain('Base Version');
      expect(result.conflictFile).toContain('Original');
    });

    it('should handle tags in auto-merge', () => {
      const tag1 = { id: '1', name: 'tag1', created_at: 1000 };
      const tag2 = { id: '2', name: 'tag2', created_at: 1000 };
      const base = createNote({
        tags: [tag1],
        checksum: generateChecksum('Test|Content|1000'),
        updated_at: 1000,
      });
      const noteA = createNote({
        tags: [tag1, tag2],
        checksum: generateChecksum('Test|Content|2000'),
        updated_at: 2000,
      });
      const noteB = createNote({ ...base });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.merged).toBe(true);
      expect(result.note?.tags).toEqual([tag1, tag2]);
    });

    it('should handle empty body', () => {
      const base = createNote({
        body: '',
        checksum: generateChecksum('Test||1000'),
        updated_at: 1000,
      });
      const noteA = createNote({
        body: 'New content',
        checksum: generateChecksum('Test|New content|2000'),
        updated_at: 2000,
      });
      const noteB = createNote({ ...base });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.merged).toBe(true);
      expect(result.note?.body).toBe('New content');
    });
  });

  describe('resolveConflictByChoice', () => {
    it('should resolve conflict by choosing version A', () => {
      const conflict = {
        id: 'conflict-1',
        note_id: '1',
        connector_a: 'obsidian',
        connector_b: 'notion',
        version_a: 'checksum-a',
        version_b: 'checksum-b',
        created_at: 1000,
      };
      const noteA = createNote({ body: 'Content A' });
      const noteB = createNote({ body: 'Content B' });

      const result = resolver.resolveConflictByChoice(conflict, 'a', noteA, noteB);

      expect(result.id).toBe('conflict-1');
      expect(result.resolution).toBe('choose_a');
      expect(result.resolvedNote.body).toBe('Content A');
      expect(result.resolvedNote.updated_at).toBeGreaterThan(noteA.updated_at);
    });

    it('should resolve conflict by choosing version B', () => {
      const conflict = {
        id: 'conflict-1',
        note_id: '1',
        connector_a: 'obsidian',
        connector_b: 'notion',
        version_a: 'checksum-a',
        version_b: 'checksum-b',
        created_at: 1000,
      };
      const noteA = createNote({ body: 'Content A' });
      const noteB = createNote({ body: 'Content B' });

      const result = resolver.resolveConflictByChoice(conflict, 'b', noteA, noteB);

      expect(result.id).toBe('conflict-1');
      expect(result.resolution).toBe('choose_b');
      expect(result.resolvedNote.body).toBe('Content B');
      expect(result.resolvedNote.updated_at).toBeGreaterThan(noteB.updated_at);
    });
  });

  describe('resolveConflictManually', () => {
    it('should resolve conflict with manually merged note', () => {
      const conflict = {
        id: 'conflict-1',
        note_id: '1',
        connector_a: 'obsidian',
        connector_b: 'notion',
        version_a: 'checksum-a',
        version_b: 'checksum-b',
        created_at: 1000,
      };
      const mergedNote = createNote({
        body: 'Manually merged content',
      });

      const result = resolver.resolveConflictManually(conflict, mergedNote);

      expect(result.id).toBe('conflict-1');
      expect(result.resolution).toBe('manual');
      expect(result.resolvedNote.body).toBe('Manually merged content');
      expect(result.resolvedNote.updated_at).toBeGreaterThan(mergedNote.updated_at);
      expect(result.resolvedNote.checksum).toBeDefined();
    });

    it('should recompute checksum for manually merged note', () => {
      const conflict = {
        id: 'conflict-1',
        note_id: '1',
        connector_a: 'obsidian',
        connector_b: 'notion',
        version_a: 'checksum-a',
        version_b: 'checksum-b',
        created_at: 1000,
      };
      const mergedNote = createNote({
        title: 'Merged Title',
        body: 'Merged Body',
      });

      const result = resolver.resolveConflictManually(conflict, mergedNote);

      expect(result.resolvedNote.checksum).not.toBe(mergedNote.checksum);
      expect(result.resolvedNote.checksum).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('edge cases', () => {
    it('should handle notes with undefined tags', () => {
      const noteA = createNote({ tags: undefined });
      const noteB = createNote({ tags: undefined });

      const result = resolver.detectConflict(noteA, noteB);

      expect(result).toBe(false);
    });

    it('should handle notes with empty tags array', () => {
      const noteA = createNote({ tags: [] });
      const noteB = createNote({ tags: [] });

      const result = resolver.detectConflict(noteA, noteB);

      expect(result).toBe(false);
    });

    it('should handle notes with undefined attachments', () => {
      const noteA = createNote({ attachments: undefined });
      const noteB = createNote({ attachments: undefined });

      const result = resolver.detectConflict(noteA, noteB);

      expect(result).toBe(false);
    });

    it('should handle notes with undefined links', () => {
      const noteA = createNote({ links: undefined });
      const noteB = createNote({ links: undefined });

      const result = resolver.detectConflict(noteA, noteB);

      expect(result).toBe(false);
    });

    it('should preserve note ID in merged result', () => {
      const base = createNote({ id: 'original-id' });
      const noteA = createNote({
        id: 'original-id',
        body: 'Changed',
        checksum: generateChecksum('Test|Changed|2000'),
      });
      const noteB = createNote({ ...base, id: 'original-id' });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.merged).toBe(true);
      expect(result.note?.id).toBe('original-id');
    });

    it('should use maximum updated_at in auto-merge', () => {
      const base = createNote({ updated_at: 1000 });
      const noteA = createNote({
        body: 'Changed',
        checksum: generateChecksum('Test|Changed|3000'),
        updated_at: 3000,
      });
      const noteB = createNote({ ...base, updated_at: 2000 });

      const result = resolver.merge(noteA, noteB, base);

      expect(result.merged).toBe(true);
      expect(result.note?.updated_at).toBe(3000);
    });

    it('should generate unique conflict IDs', async () => {
      const noteA = createNote({
        body: 'Content A',
        checksum: generateChecksum('Test|Content A|2000'),
      });
      const noteB = createNote({
        body: 'Content B',
        checksum: generateChecksum('Test|Content B|2000'),
      });

      const result1 = resolver.merge(noteA, noteB);
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      const result2 = resolver.merge(noteA, noteB);

      expect(result1.conflict?.id).toBeDefined();
      expect(result2.conflict?.id).toBeDefined();
      expect(result1.conflict?.id).not.toBe(result2.conflict?.id);
    });
  });
});
