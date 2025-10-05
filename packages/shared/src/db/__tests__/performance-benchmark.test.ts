/**
 * Performance Benchmarking Suite
 *
 * Comprehensive performance tests for database operations.
 * Tests include:
 * - Insert performance (single and bulk)
 * - Query performance (simple and complex)
 * - FTS5 search performance
 * - Transaction performance
 * - Concurrent read/write scenarios
 *
 * Acceptance Criteria (from VALIDATION_REPORT.md):
 * - Insert/Update note: <50ms
 * - FTS5 search (10k notes): <100ms
 * - Sync 1000 notes: <60s
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { ConnectionPool } from '../ConnectionPool';
import { QueryOptimizer } from '../QueryOptimizer';
import { v4 as uuidv4 } from 'uuid';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
  passed: boolean;
  threshold: number;
}

const TEST_DB_DIR = join(tmpdir(), 'polynote-benchmark');
const TEST_DB_PATH = join(TEST_DB_DIR, 'benchmark.db');

describe('Database Performance Benchmarks', () => {
  let db: Database.Database;
  let pool: ConnectionPool;
  let optimizer: QueryOptimizer;

  beforeAll(() => {
    // Clean up and create test directory
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DB_DIR, { recursive: true });

    // Create database and apply schema
    db = new Database(TEST_DB_PATH);
    applySchema(db);

    // Initialize connection pool
    pool = new ConnectionPool({ dbPath: TEST_DB_PATH });
    pool.initialize();

    // Initialize query optimizer
    optimizer = new QueryOptimizer(db);
  });

  afterAll(() => {
    pool.close();
    db.close();
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    }
  });

  describe('Insert Performance', () => {
    it('should insert single note in <50ms', () => {
      const result = benchmark(
        'Single Note Insert',
        100,
        () => {
          const note = createTestNote();
          db.prepare(`
            INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum, deleted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
          `).run(
            note.id,
            note.title,
            note.body,
            note.created_at,
            note.updated_at,
            note.source_connector,
            note.source_id,
            note.checksum
          );
        },
        50 // 50ms threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(50);
    });

    it('should bulk insert 1000 notes in <60s', () => {
      const notes = Array.from({ length: 1000 }, () => createTestNote());

      const result = benchmark(
        'Bulk Insert 1000 Notes',
        1,
        () => {
          const transaction = db.transaction(() => {
            const stmt = db.prepare(`
              INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum, deleted_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
            `);

            for (const note of notes) {
              stmt.run(
                note.id,
                note.title,
                note.body,
                note.created_at,
                note.updated_at,
                note.source_connector,
                note.source_id,
                note.checksum
              );
            }
          });

          transaction();
        },
        60000 // 60s threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(60000);
    });
  });

  describe('Query Performance', () => {
    beforeAll(() => {
      // Seed database with 10k notes for testing
      seedDatabase(db, 10000);
    });

    it('should query single note by ID in <10ms', () => {
      const testNote = createTestNote();
      db.prepare(`
        INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `).run(
        testNote.id,
        testNote.title,
        testNote.body,
        testNote.created_at,
        testNote.updated_at,
        testNote.source_connector,
        testNote.source_id,
        testNote.checksum
      );

      const result = benchmark(
        'Single Note Query by ID',
        1000,
        () => {
          db.prepare('SELECT * FROM Note WHERE id = ?').get(testNote.id);
        },
        10 // 10ms threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(10);
    });

    it('should list 50 notes with pagination in <20ms', () => {
      const result = benchmark(
        'List 50 Notes with Pagination',
        100,
        () => {
          db.prepare(`
            SELECT * FROM Note
            WHERE deleted_at IS NULL
            ORDER BY updated_at DESC
            LIMIT 50 OFFSET 0
          `).all();
        },
        20 // 20ms threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(20);
    });
  });

  describe('FTS5 Search Performance', () => {
    beforeAll(() => {
      // Ensure database has enough notes for testing
      const currentCount = db.prepare('SELECT COUNT(*) as count FROM Note').get() as { count: number };
      if (currentCount.count < 10000) {
        seedDatabase(db, 10000 - currentCount.count);
      }
    });

    it('should search 10k notes in <100ms', () => {
      const result = benchmark(
        'FTS5 Search (10k notes)',
        50,
        () => {
          optimizer.searchNotes('project management', { limit: 50 });
        },
        100 // 100ms threshold from requirements
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(100);
    });

    it('should search with filters in <150ms', () => {
      const result = benchmark(
        'FTS5 Search with Filters',
        50,
        () => {
          optimizer.searchNotes('project', {
            limit: 50,
            sourceConnector: 'obsidian',
            dateRange: {
              from: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
              to: Date.now(),
            },
          });
        },
        150 // 150ms threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(150);
    });

    it('should perform fuzzy search in <200ms', () => {
      const result = benchmark(
        'Fuzzy Search',
        50,
        () => {
          optimizer.fuzzySearchNotes('projct managmnt', { limit: 50 });
        },
        200 // 200ms threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(200);
    });
  });

  describe('Connection Pool Performance', () => {
    it('should handle concurrent reads efficiently', async () => {
      const result = await benchmarkAsync(
        'Concurrent Reads (10 parallel)',
        10,
        async () => {
          const promises = Array.from({ length: 10 }, () =>
            pool.read('SELECT * FROM Note LIMIT 10')
          );
          await Promise.all(promises);
        },
        100 // 100ms threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(100);
    });

    it('should maintain performance under heavy read load', async () => {
      const result = await benchmarkAsync(
        'Heavy Read Load (50 parallel)',
        5,
        async () => {
          const promises = Array.from({ length: 50 }, () =>
            pool.read('SELECT * FROM Note LIMIT 100')
          );
          await Promise.all(promises);
        },
        500 // 500ms threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(500);
    });
  });

  describe('Transaction Performance', () => {
    it('should complete transaction with 100 operations in <200ms', () => {
      const operations = Array.from({ length: 100 }, () => ({
        sql: `UPDATE Note SET updated_at = ? WHERE id = ?`,
        params: [Date.now(), uuidv4()],
      }));

      const result = benchmark(
        'Transaction (100 operations)',
        10,
        () => {
          pool.writeTransaction(operations);
        },
        200 // 200ms threshold
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(200);
    });
  });

  describe('Update Performance', () => {
    it('should update single note in <50ms', () => {
      const testNote = createTestNote();
      db.prepare(`
        INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `).run(
        testNote.id,
        testNote.title,
        testNote.body,
        testNote.created_at,
        testNote.updated_at,
        testNote.source_connector,
        testNote.source_id,
        testNote.checksum
      );

      const result = benchmark(
        'Single Note Update',
        100,
        () => {
          db.prepare(`
            UPDATE Note
            SET title = ?, body = ?, updated_at = ?
            WHERE id = ?
          `).run('Updated Title', 'Updated body content', Date.now(), testNote.id);
        },
        50 // 50ms threshold from requirements
      );

      logBenchmark(result);
      expect(result.passed).toBe(true);
      expect(result.averageTime).toBeLessThan(50);
    });
  });
});

// Helper Functions

function applySchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS Note (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      source_connector TEXT NOT NULL,
      source_id TEXT NOT NULL,
      checksum TEXT NOT NULL,
      UNIQUE(source_connector, source_id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS NoteSearch USING fts5(
      note_id UNINDEXED,
      title,
      body
    );

    CREATE TRIGGER IF NOT EXISTS note_ai AFTER INSERT ON Note BEGIN
      INSERT INTO NoteSearch(note_id, title, body) VALUES (new.id, new.title, new.body);
    END;

    CREATE INDEX IF NOT EXISTS idx_note_updated ON Note(updated_at);
    CREATE INDEX IF NOT EXISTS idx_note_source ON Note(source_connector, source_id);
  `);
}

function createTestNote() {
  const id = uuidv4();
  return {
    id,
    title: `Test Note ${id.slice(0, 8)}`,
    body: `This is a test note with some content about project management and task tracking. It contains various keywords for search testing.`,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_connector: 'obsidian',
    source_id: id,
    checksum: `checksum-${id}`,
  };
}

function seedDatabase(database: Database.Database, count: number): void {
  const transaction = database.transaction(() => {
    const stmt = database.prepare(`
      INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);

    for (let i = 0; i < count; i++) {
      const note = createTestNote();
      stmt.run(
        note.id,
        note.title,
        note.body,
        note.created_at,
        note.updated_at,
        note.source_connector,
        note.source_id,
        note.checksum
      );
    }
  });

  transaction();
}

function benchmark(
  operation: string,
  iterations: number,
  fn: () => void,
  threshold: number
): BenchmarkResult {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / averageTime;

  return {
    operation,
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    opsPerSecond,
    passed: averageTime < threshold,
    threshold,
  };
}

async function benchmarkAsync(
  operation: string,
  iterations: number,
  fn: () => Promise<void>,
  threshold: number
): Promise<BenchmarkResult> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / averageTime;

  return {
    operation,
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    opsPerSecond,
    passed: averageTime < threshold,
    threshold,
  };
}

function logBenchmark(result: BenchmarkResult): void {
  console.log(`\n${result.operation}:`);
  console.log(`  Iterations: ${result.iterations}`);
  console.log(`  Average: ${result.averageTime.toFixed(2)}ms`);
  console.log(`  Min: ${result.minTime.toFixed(2)}ms`);
  console.log(`  Max: ${result.maxTime.toFixed(2)}ms`);
  console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(2)}`);
  console.log(`  Threshold: ${result.threshold}ms`);
  console.log(`  Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
}
