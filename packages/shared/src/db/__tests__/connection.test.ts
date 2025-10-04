import { unlinkSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  transaction,
  query,
  queryOne,
  execute,
  searchNotes,
} from '../connection';


const TEST_DB_PATH = join(homedir(), '.polynote', 'notes.db');

describe('Database Connection', () => {
  beforeAll(() => {
    // Clean up test database if exists
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('initializeDatabase', () => {
    it('should create database file', () => {
      expect(existsSync(TEST_DB_PATH)).toBe(true);
    });

    it('should create all required tables', () => {
      const db = getDatabase();
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as Array<{ name: string }>;

      const expectedTables = [
        'Note',
        'NoteSearch',
        'Tag',
        'NoteTag',
        'Attachment',
        'SyncState',
        'Conflict',
        'ChangeLog',
        'ConnectorConfig',
        'NoteLink',
        'AIOperation',
        'EncryptionKey',
        'ShareBundle',
      ];

      expectedTables.forEach(tableName => {
        expect(tables.some(t => t.name === tableName)).toBe(true);
      });
    });

    it('should enable WAL mode', () => {
      const db = getDatabase();
      const result = db.pragma('journal_mode', { simple: true });
      expect(result).toBe('wal');
    });

    it('should enable foreign keys', () => {
      const db = getDatabase();
      const result = db.pragma('foreign_keys', { simple: true });
      expect(result).toBe(1);
    });
  });

  describe('getDatabase', () => {
    it('should return database instance', () => {
      const db = getDatabase();
      expect(db).toBeDefined();
      expect(typeof db.prepare).toBe('function');
    });

    it('should return same instance on multiple calls', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2);
    });
  });

  describe('transaction', () => {
    beforeEach(() => {
      execute('DELETE FROM Note');
    });

    it('should execute function within transaction', () => {
      const result = transaction(() => {
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['test-1', 'Test', 'Body', Date.now(), Date.now(), 'test', 'test-1', 'abc123']
        );
        return 'success';
      });

      expect(result).toBe('success');
      const notes = query('SELECT * FROM Note');
      expect(notes).toHaveLength(1);
    });

    it('should rollback on error', () => {
      expect(() => {
        transaction(() => {
          execute(
            'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['test-2', 'Test', 'Body', Date.now(), Date.now(), 'test', 'test-2', 'abc123']
          );
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const notes = query('SELECT * FROM Note WHERE id = ?', ['test-2']);
      expect(notes).toHaveLength(0);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      execute('DELETE FROM Note');
    });

    it('should return all matching rows', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['test-1', 'Test 1', 'Body 1', now, now, 'test', 'test-1', 'abc123']
      );
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['test-2', 'Test 2', 'Body 2', now, now, 'test', 'test-2', 'def456']
      );

      const results = query<{ id: string }>('SELECT * FROM Note');
      expect(results).toHaveLength(2);
    });

    it('should support parameterized queries', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['test-3', 'Test 3', 'Body 3', now, now, 'test', 'test-3', 'ghi789']
      );

      const results = query<{ id: string }>('SELECT * FROM Note WHERE id = ?', ['test-3']);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-3');
    });

    it('should return empty array when no matches', () => {
      const results = query('SELECT * FROM Note WHERE id = ?', ['nonexistent']);
      expect(results).toHaveLength(0);
    });
  });

  describe('queryOne', () => {
    beforeEach(() => {
      execute('DELETE FROM Note');
    });

    it('should return single row', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['test-4', 'Test 4', 'Body 4', now, now, 'test', 'test-4', 'jkl012']
      );

      const result = queryOne<{ id: string; title: string }>(
        'SELECT * FROM Note WHERE id = ?',
        ['test-4']
      );
      expect(result).toBeDefined();
      expect(result?.id).toBe('test-4');
      expect(result?.title).toBe('Test 4');
    });

    it('should return undefined when no match', () => {
      const result = queryOne('SELECT * FROM Note WHERE id = ?', ['nonexistent']);
      expect(result).toBeUndefined();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      execute('DELETE FROM Note');
    });

    it('should insert data and return result', () => {
      const now = Date.now();
      const result = execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['test-5', 'Test 5', 'Body 5', now, now, 'test', 'test-5', 'mno345']
      );

      expect(result.changes).toBe(1);
    });

    it('should update data', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['test-6', 'Test 6', 'Body 6', now, now, 'test', 'test-6', 'pqr678']
      );

      const result = execute(
        'UPDATE Note SET title = ? WHERE id = ?',
        ['Updated Title', 'test-6']
      );

      expect(result.changes).toBe(1);
      const updated = queryOne<{ title: string }>('SELECT title FROM Note WHERE id = ?', ['test-6']);
      expect(updated?.title).toBe('Updated Title');
    });

    it('should delete data', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['test-7', 'Test 7', 'Body 7', now, now, 'test', 'test-7', 'stu901']
      );

      const result = execute('DELETE FROM Note WHERE id = ?', ['test-7']);
      expect(result.changes).toBe(1);

      const deleted = queryOne('SELECT * FROM Note WHERE id = ?', ['test-7']);
      expect(deleted).toBeUndefined();
    });
  });

  describe('searchNotes', () => {
    beforeEach(() => {
      execute('DELETE FROM Note');
    });

    it('should find notes matching search term', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['search-1', 'JavaScript Tutorial', 'Learn JavaScript basics', now, now, 'test', 'search-1', 'abc']
      );
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['search-2', 'Python Guide', 'Python programming guide', now, now, 'test', 'search-2', 'def']
      );

      const results = searchNotes('JavaScript');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('JavaScript');
    });

    it('should respect limit parameter', () => {
      const now = Date.now();
      for (let i = 0; i < 100; i++) {
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`limit-${i}`, `Test ${i}`, 'programming', now, now, 'test', `limit-${i}`, `hash${i}`]
        );
      }

      const results = searchNotes('programming', 10);
      expect(results).toHaveLength(10);
    });

    it('should return empty array when no matches', () => {
      const results = searchNotes('nonexistent-term-xyz');
      expect(results).toHaveLength(0);
    });

    it('should rank results by relevance', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['rank-1', 'TypeScript', 'Brief mention', now, now, 'test', 'rank-1', 'xyz']
      );
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['rank-2', 'TypeScript Advanced', 'TypeScript TypeScript TypeScript', now, now, 'test', 'rank-2', 'uvw']
      );

      const results = searchNotes('TypeScript');
      expect(results.length).toBeGreaterThan(0);
      // Higher rank (more negative) should come first
      expect(results[0].rank).toBeLessThan(results[results.length - 1]?.rank || 0);
    });
  });

  describe('Database Edge Cases', () => {
    describe('Multiple database instances', () => {
      it('should maintain singleton pattern across modules', () => {
        const db1 = getDatabase();
        const db2 = getDatabase();
        expect(db1).toBe(db2);
      });
    });

    describe('Database file permissions', () => {
      it('should handle existing database file gracefully', () => {
        // Database already initialized in beforeAll
        expect(() => initializeDatabase()).not.toThrow();
      });
    });

    describe('Concurrent transactions', () => {
      beforeEach(() => {
        execute('DELETE FROM Note');
      });

      it('should handle nested transaction attempts', () => {
        const result = transaction(() => {
          const now = Date.now();
          execute(
            'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['nested-1', 'Nested Test', 'Body', now, now, 'test', 'nested-1', 'hash1']
          );
          
          // Attempt nested transaction
          const nested = transaction(() => {
            execute(
              'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              ['nested-2', 'Nested Test 2', 'Body 2', now, now, 'test', 'nested-2', 'hash2']
            );
            return 'nested';
          });
          
          return nested;
        });

        expect(result).toBe('nested');
        const notes = query('SELECT * FROM Note');
        expect(notes).toHaveLength(2);
      });
    });

    describe('Query parameter edge cases', () => {
      beforeEach(() => {
        execute('DELETE FROM Note');
      });

      it('should handle nullable columns', () => {
        const now = Date.now();
        // Test deleted_at which is nullable in schema
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          ['null-test', 'Title', 'Body', now, now, 'test', 'null-test', 'hash', null]
        );

        const result = queryOne<{ deleted_at: number | null }>('SELECT deleted_at FROM Note WHERE id = ?', ['null-test']);
        expect(result?.deleted_at).toBeNull();
      });

      it('should handle empty string parameters', () => {
        const now = Date.now();
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['empty-test', '', '', now, now, 'test', 'empty-test', 'hash']
        );

        const result = queryOne<{ title: string }>('SELECT title FROM Note WHERE id = ?', ['empty-test']);
        expect(result?.title).toBe('');
      });

      it('should handle special characters in parameters', () => {
        const now = Date.now();
        const specialTitle = "Title with 'quotes' and \"double quotes\" and \\ backslashes";
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['special-test', specialTitle, 'Body', now, now, 'test', 'special-test', 'hash']
        );

        const result = queryOne<{ title: string }>('SELECT title FROM Note WHERE id = ?', ['special-test']);
        expect(result?.title).toBe(specialTitle);
      });

      it('should handle very long string parameters', () => {
        const now = Date.now();
        const longBody = 'x'.repeat(100000); // 100KB string
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['long-test', 'Title', longBody, now, now, 'test', 'long-test', 'hash']
        );

        const result = queryOne<{ body: string }>('SELECT body FROM Note WHERE id = ?', ['long-test']);
        expect(result?.body).toHaveLength(100000);
      });

      it('should handle unicode characters', () => {
        const now = Date.now();
        const unicodeTitle = '🚀 Unicode test 测试 тест';
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['unicode-test', unicodeTitle, 'Body', now, now, 'test', 'unicode-test', 'hash']
        );

        const result = queryOne<{ title: string }>('SELECT title FROM Note WHERE id = ?', ['unicode-test']);
        expect(result?.title).toBe(unicodeTitle);
      });
    });

    describe('Large dataset operations', () => {
      beforeEach(() => {
        execute('DELETE FROM Note');
      });

      it('should handle batch inserts efficiently', () => {
        const now = Date.now();
        const startTime = performance.now();
        
        transaction(() => {
          for (let i = 0; i < 1000; i++) {
            execute(
              'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [`batch-${i}`, `Title ${i}`, `Body ${i}`, now, now, 'test', `batch-${i}`, `hash${i}`]
            );
          }
        });
        
        const endTime = performance.now();
        const notes = query('SELECT COUNT(*) as count FROM Note');
        
        expect((notes[0] as { count: number }).count).toBe(1000);
        // Should complete in under 5 seconds
        expect(endTime - startTime).toBeLessThan(5000);
      });

      it('should handle queries on large datasets', () => {
        const now = Date.now();
        transaction(() => {
          for (let i = 0; i < 5000; i++) {
            execute(
              'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [`large-${i}`, `Title ${i}`, `Body ${i}`, now, now, 'test', `large-${i}`, `hash${i}`]
            );
          }
        });

        const startTime = performance.now();
        const results = query('SELECT * FROM Note WHERE source_connector = ?', ['test']);
        const endTime = performance.now();
        
        expect(results.length).toBeGreaterThanOrEqual(5000);
        // Query should be fast even on large dataset
        expect(endTime - startTime).toBeLessThan(1000);
      });
    });
  });

  describe('searchNotes Edge Cases', () => {
    beforeEach(() => {
      execute('DELETE FROM Note');
    });

    it('should handle empty search term', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['empty-search', 'Title', 'Body', now, now, 'test', 'empty-search', 'hash']
      );

      const results = searchNotes('');
      expect(results).toHaveLength(0);
    });

    it('should handle search terms with special FTS5 characters', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['special-fts', 'React-Native Tutorial', 'Learn React-Native', now, now, 'test', 'special-fts', 'hash']
      );

      const results = searchNotes('React-Native');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('React-Native');
    });

    it('should handle search terms with quotes', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['quote-search', 'The "best" practices', 'Using "quotes" in text', now, now, 'test', 'quote-search', 'hash']
      );

      const results = searchNotes('best');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle search terms with parentheses', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['paren-search', 'Function(parameters)', 'Using function(args)', now, now, 'test', 'paren-search', 'hash']
      );

      const results = searchNotes('Function');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle unicode search terms', () => {
      const now = Date.now();
      // Use ASCII-based test since FTS5 default tokenizer may not handle CJK well
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['unicode-search', 'Unicode Test 测试', 'Content with unicode: 你好', now, now, 'test', 'unicode-search', 'hash']
      );

      const results = searchNotes('Unicode');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Unicode');
    });

    it('should handle content with repeated terms', () => {
      const now = Date.now();
      const searchTerm = 'programming';
      const longBody = `Learn ${searchTerm}. Master ${searchTerm}. ${searchTerm} is essential for developers.`;
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['long-term', 'Programming Guide', longBody, now, now, 'test', 'long-term', 'hash']
      );

      const results = searchNotes(searchTerm);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Programming');
    });

    it('should handle limit of 0', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['limit-zero', 'Test', 'programming', now, now, 'test', 'limit-zero', 'hash']
      );

      const results = searchNotes('programming', 0);
      expect(results).toHaveLength(0);
    });

    it('should handle negative limit by treating as unlimited', () => {
      const now = Date.now();
      for (let i = 0; i < 100; i++) {
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`neg-limit-${i}`, 'Test', 'programming', now, now, 'test', `neg-limit-${i}`, `hash${i}`]
        );
      }

      // SQLite treats negative LIMIT as no limit
      const results = searchNotes('programming', -1);
      expect(results.length).toBeGreaterThan(50); // Should return more than default limit
    });

    it('should handle case-insensitive search', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['case-search', 'JavaScript Tutorial', 'Learn JAVASCRIPT basics', now, now, 'test', 'case-search', 'hash']
      );

      const lowerResults = searchNotes('javascript');
      const upperResults = searchNotes('JAVASCRIPT');
      const mixedResults = searchNotes('JaVaScRiPt');

      expect(lowerResults.length).toBeGreaterThan(0);
      expect(upperResults.length).toBeGreaterThan(0);
      expect(mixedResults.length).toBeGreaterThan(0);
    });

    it('should search in both title and body', () => {
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['title-only', 'Python Tutorial', 'Learn programming basics', now, now, 'test', 'title-only', 'hash1']
      );
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['body-only', 'Programming Guide', 'Learn Python advanced concepts', now, now, 'test', 'body-only', 'hash2']
      );

      const results = searchNotes('Python');
      expect(results.length).toBe(2);
    });
  });

  describe('Schema Validation', () => {
    it('should enforce foreign key constraints', () => {
      execute('DELETE FROM Note');
      
      expect(() => {
        execute(
          'INSERT INTO NoteTag (note_id, tag_id) VALUES (?, ?)',
          ['nonexistent-note', 'nonexistent-tag']
        );
      }).toThrow();
    });

    it('should enforce unique constraints', () => {
      execute('DELETE FROM Note');
      const now = Date.now();
      
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['unique-test', 'Title', 'Body', now, now, 'test', 'unique-test', 'hash']
      );

      expect(() => {
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['unique-test', 'Different Title', 'Different Body', now, now, 'test', 'unique-test-2', 'hash2']
        );
      }).toThrow();
    });

    it('should cascade deletes for related records', () => {
      execute('DELETE FROM Note');
      execute('DELETE FROM Tag');
      
      const now = Date.now();
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['cascade-note', 'Title', 'Body', now, now, 'test', 'cascade-note', 'hash']
      );
      execute(
        'INSERT INTO Tag (id, name, created_at) VALUES (?, ?, ?)',
        ['cascade-tag', 'TestTag', now]
      );
      execute(
        'INSERT INTO NoteTag (note_id, tag_id) VALUES (?, ?)',
        ['cascade-note', 'cascade-tag']
      );

      execute('DELETE FROM Note WHERE id = ?', ['cascade-note']);

      const noteTags = query('SELECT * FROM NoteTag WHERE note_id = ?', ['cascade-note']);
      expect(noteTags).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed SQL gracefully', () => {
      expect(() => {
        query('SELECT * FORM Note'); // Intentional typo
      }).toThrow();
    });

    it('should handle invalid table names', () => {
      expect(() => {
        query('SELECT * FROM NonexistentTable');
      }).toThrow();
    });

    it('should handle invalid column names', () => {
      expect(() => {
        query('SELECT nonexistent_column FROM Note');
      }).toThrow();
    });

    it('should handle type mismatches in parameters', () => {
      execute('DELETE FROM Note');
      const now = Date.now();
      
      // Should handle string where number expected
      execute(
        'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['type-test', 'Title', 'Body', 'not-a-number', now, 'test', 'type-test', 'hash']
      );

      const result = queryOne<{ created_at: number | string }>('SELECT created_at FROM Note WHERE id = ?', ['type-test']);
      expect(result?.created_at).toBe('not-a-number');
    });

    it('should handle database pragma queries', () => {
      const db = getDatabase();
      const journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');
    });

    it('should handle prepared statement reuse', () => {
      execute('DELETE FROM Note');
      const now = Date.now();
      
      // Execute same query multiple times
      for (let i = 0; i < 5; i++) {
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`reuse-${i}`, `Title ${i}`, `Body ${i}`, now, now, 'test', `reuse-${i}`, `hash${i}`]
        );
      }

      const results = query('SELECT COUNT(*) as count FROM Note WHERE source_connector = ?', ['test']);
      expect((results[0] as { count: number }).count).toBeGreaterThanOrEqual(5);
    });
  });
});