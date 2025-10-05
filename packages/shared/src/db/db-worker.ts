/**
 * Database Worker Thread
 *
 * Runs SQLite operations in a separate thread to prevent blocking the main UI thread.
 * This worker handles all database I/O operations asynchronously.
 */

import { parentPort, workerData } from 'node:worker_threads';
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

interface WorkerMessage {
  id: string;
  type: 'query' | 'execute' | 'transaction' | 'close';
  sql?: string;
  params?: unknown[];
  operations?: Array<{ sql: string; params?: unknown[] }>;
  options?: {
    timeout?: number;
    readOnly?: boolean;
    mode?: 'deferred' | 'immediate' | 'exclusive';
  };
}

let db: Database.Database | null = null;
const statementCache = new Map<string, Database.Statement>();

/**
 * Initialize the database connection
 */
function initializeDatabase(): void {
  const dbPath = workerData.dbPath as string;

  // Ensure directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create database connection with optimized settings
  db = new Database(dbPath);

  // Performance optimization pragmas
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
  db.pragma('foreign_keys = ON'); // Enforce foreign key constraints
  db.pragma('synchronous = NORMAL'); // Balance between safety and performance
  db.pragma('temp_store = MEMORY'); // Store temp tables in memory
  db.pragma('mmap_size = 30000000000'); // Use memory-mapped I/O (30GB)
  db.pragma('page_size = 4096'); // Optimal page size for most systems
  db.pragma('cache_size = -64000'); // 64MB cache (negative = KB)
  db.pragma('busy_timeout = 5000'); // Wait up to 5s if database is locked

  // Additional optimizations for read performance
  db.pragma('locking_mode = NORMAL'); // Allow multiple connections
  db.pragma('read_uncommitted = true'); // Allow dirty reads for better concurrency

  parentPort?.postMessage({ type: 'ready' });
}

/**
 * Get or create a prepared statement from cache
 */
function getPreparedStatement(sql: string): Database.Statement {
  if (!db) {
    throw new Error('Database not initialized');
  }

  if (!statementCache.has(sql)) {
    statementCache.set(sql, db.prepare(sql));
  }

  return statementCache.get(sql)!;
}

/**
 * Execute a SELECT query
 */
function executeQuery(sql: string, params?: unknown[]): unknown[] {
  const stmt = getPreparedStatement(sql);
  return params ? stmt.all(...params) : stmt.all();
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement
 */
function executeStatement(sql: string, params?: unknown[]): Database.RunResult {
  const stmt = getPreparedStatement(sql);
  return params ? stmt.run(...params) : stmt.run();
}

/**
 * Execute multiple operations in a transaction
 */
function executeTransaction(
  operations: Array<{ sql: string; params?: unknown[] }>,
  mode: 'deferred' | 'immediate' | 'exclusive' = 'deferred'
): void {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const transaction = db.transaction(() => {
    for (const op of operations) {
      const stmt = getPreparedStatement(op.sql);
      if (op.params) {
        stmt.run(...op.params);
      } else {
        stmt.run();
      }
    }
  });

  // Set transaction mode
  if (mode === 'immediate') {
    db.exec('BEGIN IMMEDIATE');
  } else if (mode === 'exclusive') {
    db.exec('BEGIN EXCLUSIVE');
  }

  transaction();
}

/**
 * Close the database connection
 */
function closeDatabase(): void {
  if (db) {
    statementCache.clear();
    db.close();
    db = null;
  }
}

/**
 * Handle messages from the main thread
 */
function handleMessage(message: WorkerMessage): void {
  const startTime = Date.now();

  try {
    let result: unknown;

    switch (message.type) {
      case 'query':
        if (!message.sql) {
          throw new Error('SQL query is required');
        }
        result = executeQuery(message.sql, message.params);
        break;

      case 'execute':
        if (!message.sql) {
          throw new Error('SQL query is required');
        }
        result = executeStatement(message.sql, message.params);
        break;

      case 'transaction':
        if (!message.operations) {
          throw new Error('Transaction operations are required');
        }
        executeTransaction(
          message.operations,
          message.options?.mode || 'deferred'
        );
        result = { changes: message.operations.length };
        break;

      case 'close':
        closeDatabase();
        result = { success: true };
        break;

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }

    const duration = Date.now() - startTime;

    parentPort?.postMessage({
      id: message.id,
      result,
      metrics: { duration },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    parentPort?.postMessage({
      id: message.id,
      error: errorMessage,
    });
  }
}

// Initialize database when worker starts
try {
  initializeDatabase();

  // Listen for messages from the main thread
  parentPort?.on('message', handleMessage);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  parentPort?.postMessage({
    type: 'error',
    error: errorMessage,
  });
  process.exit(1);
}
