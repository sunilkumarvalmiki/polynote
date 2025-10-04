import { describe, it, expect, beforeEach } from 'vitest';

import type { Note } from '../../types/index.js';
import { NoteMapper, createNoteMapper, defaultMappings, type ExternalNote } from '../NoteMapper.js';

describe('NoteMapper', () => {
  let mapper: NoteMapper;

  beforeEach(() => {
    mapper = createNoteMapper();
  });

  const createExternalNote = (overrides: Partial<ExternalNote> = {}): ExternalNote => ({
    id: 'ext-1',
    title: 'External Note',
    body: 'External content',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    tags: ['tag1', 'tag2'],
    ...overrides
  });

  const createInternalNote = (overrides: Partial<Note> = {}): Note => ({
    id: 'note-1',
    title: 'Internal Note',
    body: 'Internal content',
    created_at: new Date('2025-01-01').getTime(),
    updated_at: new Date('2025-01-02').getTime(),
    source_connector: 'obsidian',
    source_id: 'obsidian-note-1',
    checksum: 'abc123',
    ...overrides
  });

  describe('registerMapping', () => {
    it('should register custom mapping configuration', () => {
      const customMapper = new NoteMapper();
      
      customMapper.registerMapping({
        connector: 'custom',
        fieldMappings: {
          id: 'uid',
          title: 'name'
        }
      });

      expect(customMapper.hasConnector('custom')).toBe(true);
    });

    it('should allow overriding default mappings', () => {
      mapper.registerMapping({
        connector: 'obsidian',
        fieldMappings: {
          id: 'custom_id'
        }
      });

      expect(mapper.hasConnector('obsidian')).toBe(true);
    });
  });

  describe('importNote', () => {
    it('should import external note to internal format', () => {
      const external = createExternalNote();
      
      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.id).toBe(external.id);
      expect(result.title).toBe(external.title);
      expect(result.body).toBe(external.body);
      expect(result.source_connector).toBe('obsidian');
      expect(result.source_id).toBe('test.md');
      expect(result.created_at).toBe((external.createdAt as Date).getTime());
      expect(result.updated_at).toBe((external.updatedAt as Date).getTime());
    });

    it('should handle timestamp as number', () => {
      const timestamp = Date.now();
      const external = createExternalNote({
        createdAt: timestamp,
        updatedAt: timestamp + 1000
      });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.created_at).toBe(timestamp);
      expect(result.updated_at).toBe(timestamp + 1000);
    });

    it('should normalize tags during import', () => {
      const external = createExternalNote({
        tags: ['#tag1', 'TAG2', '  tag3  ']
      });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.tags).toBeDefined();
      expect(result.tags).toHaveLength(3);
      expect(result.tags?.[0].name).toBe('tag1');
      expect(result.tags?.[1].name).toBe('tag2');
      expect(result.tags?.[2].name).toBe('tag3');
    });

    it('should generate checksum for imported note', () => {
      const external = createExternalNote({ body: 'Test content' });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.checksum).toBeDefined();
      expect(result.checksum.length).toBeGreaterThan(0);
    });

    it('should handle notes without title', () => {
      const external = createExternalNote({ title: '' });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.title).toBe('Untitled');
    });

    it('should handle notes without tags', () => {
      const external = createExternalNote({ tags: undefined });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.tags).toBeUndefined();
    });

    it('should handle deleted notes', () => {
      const deletedAt = new Date('2025-01-03');
      const external = createExternalNote({ deletedAt });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.deleted_at).toBe(deletedAt.getTime());
    });
  });

  describe('exportNote', () => {
    it('should export internal note to external format', () => {
      const internal = createInternalNote();

      const result = mapper.exportNote(internal, 'obsidian');

      expect(result.id).toBe(internal.id);
      expect(result.title).toBe(internal.title);
      expect(result.body).toBe(internal.body);
      expect(result.createdAt).toBe(internal.created_at);
      expect(result.updatedAt).toBe(internal.updated_at);
    });

    it('should export tags as string array', () => {
      const internal = createInternalNote({
        tags: [
          { id: 'tag-1', name: 'work', created_at: Date.now() },
          { id: 'tag-2', name: 'important', created_at: Date.now() }
        ]
      });

      const result = mapper.exportNote(internal, 'obsidian');

      expect(result.tags).toEqual(['work', 'important']);
    });

    it('should handle notes without tags', () => {
      const internal = createInternalNote({ tags: undefined });

      const result = mapper.exportNote(internal, 'obsidian');

      expect(result.tags).toBeUndefined();
    });

    it('should preserve deleted timestamp', () => {
      const deletedAt = Date.now();
      const internal = createInternalNote({ deleted_at: deletedAt });

      const result = mapper.exportNote(internal, 'obsidian');

      expect(result.deletedAt).toBe(deletedAt);
    });
  });

  describe('importNotes', () => {
    it('should batch import multiple notes', () => {
      const external: ExternalNote[] = [
        createExternalNote({ id: 'ext-1' }),
        createExternalNote({ id: 'ext-2' }),
        createExternalNote({ id: 'ext-3' })
      ];

      const result = mapper.importNotes(external, 'obsidian');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('ext-1');
      expect(result[1].id).toBe('ext-2');
      expect(result[2].id).toBe('ext-3');
    });

    it('should handle empty array', () => {
      const result = mapper.importNotes([], 'obsidian');

      expect(result).toHaveLength(0);
    });
  });

  describe('exportNotes', () => {
    it('should batch export multiple notes', () => {
      const internal: Note[] = [
        createInternalNote({ id: 'note-1' }),
        createInternalNote({ id: 'note-2' }),
        createInternalNote({ id: 'note-3' })
      ];

      const result = mapper.exportNotes(internal, 'obsidian');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('note-1');
      expect(result[1].id).toBe('note-2');
      expect(result[2].id).toBe('note-3');
    });

    it('should handle empty array', () => {
      const result = mapper.exportNotes([], 'obsidian');

      expect(result).toHaveLength(0);
    });
  });

  describe('mergeNotes', () => {
    it('should merge notes without conflicts', () => {
      const local = createInternalNote({
        id: 'note-1',
        title: 'Title',
        body: 'Content',
        updated_at: Date.now()
      });
      const remote = createInternalNote({
        id: 'note-1',
        title: 'Title',
        body: 'Content',
        updated_at: Date.now() + 1000
      });

      const { merged, hasConflict, conflicts } = mapper.mergeNotes(local, remote);

      expect(hasConflict).toBe(false);
      expect(conflicts).toHaveLength(0);
      expect(merged.id).toBe('note-1');
    });

    it('should detect title conflict', () => {
      const local = createInternalNote({ title: 'Local Title' });
      const remote = createInternalNote({ title: 'Remote Title' });

      const { hasConflict, conflicts } = mapper.mergeNotes(local, remote);

      expect(hasConflict).toBe(true);
      expect(conflicts).toContain('title');
    });

    it('should detect body conflict', () => {
      const local = createInternalNote({ body: 'Local content' });
      const remote = createInternalNote({ body: 'Remote content' });

      const { hasConflict, conflicts } = mapper.mergeNotes(local, remote);

      expect(hasConflict).toBe(true);
      expect(conflicts).toContain('body');
    });

    it('should use newer version when merging', () => {
      const older = Date.now();
      const newer = older + 10000;
      
      const local = createInternalNote({
        title: 'Old Title',
        body: 'Old content',
        updated_at: older
      });
      const remote = createInternalNote({
        title: 'New Title',
        body: 'New content',
        updated_at: newer
      });

      const { merged } = mapper.mergeNotes(local, remote);

      expect(merged.title).toBe('New Title');
      expect(merged.body).toBe('New content');
      expect(merged.updated_at).toBe(newer);
    });

    it('should use earlier creation timestamp', () => {
      const earlier = Date.now();
      const later = earlier + 10000;

      const local = createInternalNote({ created_at: later });
      const remote = createInternalNote({ created_at: earlier });

      const { merged } = mapper.mergeNotes(local, remote);

      expect(merged.created_at).toBe(earlier);
    });

    it('should merge tags from both notes', () => {
      const local = createInternalNote({
        tags: [
          { id: 'tag-1', name: 'local', created_at: Date.now() }
        ]
      });
      const remote = createInternalNote({
        tags: [
          { id: 'tag-2', name: 'remote', created_at: Date.now() }
        ]
      });

      const { merged } = mapper.mergeNotes(local, remote);

      expect(merged.tags).toHaveLength(2);
      expect(merged.tags?.some(t => t.name === 'local')).toBe(true);
      expect(merged.tags?.some(t => t.name === 'remote')).toBe(true);
    });

    it('should handle duplicate tags', () => {
      const timestamp = Date.now();
      const local = createInternalNote({
        tags: [
          { id: 'tag-1', name: 'shared', created_at: timestamp }
        ]
      });
      const remote = createInternalNote({
        tags: [
          { id: 'tag-1', name: 'shared', created_at: timestamp + 1000 }
        ]
      });

      const { merged } = mapper.mergeNotes(local, remote);

      expect(merged.tags).toHaveLength(1);
      expect(merged.tags?.[0].name).toBe('shared');
      expect(merged.tags?.[0].created_at).toBe(timestamp + 1000); // Newer wins
    });
  });

  describe('diffNotes', () => {
    it('should detect no differences for identical notes', () => {
      const note = createInternalNote();

      const diff = mapper.diffNotes(note, note);

      expect(diff.title).toBe(false);
      expect(diff.body).toBe(false);
      expect(diff.tags).toBe(false);
      expect(diff.metadata).toBe(false);
    });

    it('should detect title difference', () => {
      const a = createInternalNote({ title: 'Title A' });
      const b = createInternalNote({ title: 'Title B' });

      const diff = mapper.diffNotes(a, b);

      expect(diff.title).toBe(true);
    });

    it('should detect body difference', () => {
      const a = createInternalNote({ body: 'Content A' });
      const b = createInternalNote({ body: 'Content B' });

      const diff = mapper.diffNotes(a, b);

      expect(diff.body).toBe(true);
    });

    it('should detect tag differences', () => {
      const a = createInternalNote({
        tags: [{ id: 'tag-1', name: 'tag1', created_at: Date.now() }]
      });
      const b = createInternalNote({
        tags: [{ id: 'tag-2', name: 'tag2', created_at: Date.now() }]
      });

      const diff = mapper.diffNotes(a, b);

      expect(diff.tags).toBe(true);
    });

    it('should detect checksum difference', () => {
      const a = createInternalNote({ checksum: 'abc' });
      const b = createInternalNote({ checksum: 'def' });

      const diff = mapper.diffNotes(a, b);

      expect(diff.metadata).toBe(true);
    });
  });

  describe('getConnectors', () => {
    it('should return list of registered connectors', () => {
      const connectors = mapper.getConnectors();

      expect(connectors).toContain('obsidian');
      expect(connectors).toContain('notion');
      expect(connectors).toContain('joplin');
    });
  });

  describe('hasConnector', () => {
    it('should return true for registered connector', () => {
      expect(mapper.hasConnector('obsidian')).toBe(true);
    });

    it('should return false for unregistered connector', () => {
      expect(mapper.hasConnector('unknown')).toBe(false);
    });
  });

  describe('defaultMappings', () => {
    it('should include Obsidian mapping', () => {
      const obsidian = defaultMappings.find(m => m.connector === 'obsidian');

      expect(obsidian).toBeDefined();
      expect(obsidian?.fieldMappings.id).toBe('id');
      expect(obsidian?.fieldMappings.title).toBe('title');
    });

    it('should include Notion mapping', () => {
      const notion = defaultMappings.find(m => m.connector === 'notion');

      expect(notion).toBeDefined();
      expect(notion?.fieldMappings.body).toBe('content');
    });

    it('should include Joplin mapping', () => {
      const joplin = defaultMappings.find(m => m.connector === 'joplin');

      expect(joplin).toBeDefined();
      expect(joplin?.fieldMappings.createdAt).toBe('user_created_time');
    });
  });

  describe('edge cases', () => {
    it('should handle notes with empty body', () => {
      const external = createExternalNote({ body: '' });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.body).toBe('');
      expect(result.checksum).toBeDefined();
    });

    it('should handle notes with special characters in title', () => {
      const external = createExternalNote({ title: 'Test: Title / With \\ Special * Chars' });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.title).toBe('Test: Title / With \\ Special * Chars');
    });

    it('should handle large tag arrays', () => {
      const tags = Array.from({ length: 100 }, (_, i) => `tag${i}`);
      const external = createExternalNote({ tags });

      const result = mapper.importNote(external, 'obsidian', 'test.md');

      expect(result.tags).toHaveLength(100);
    });

    it('should handle very long note bodies efficiently', () => {
      const longBody = 'x'.repeat(100000);
      const external = createExternalNote({ body: longBody });

      const startTime = Date.now();
      const result = mapper.importNote(external, 'obsidian', 'test.md');
      const duration = Date.now() - startTime;

      expect(result.body.length).toBe(100000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});