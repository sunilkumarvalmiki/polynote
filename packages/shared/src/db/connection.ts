import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_DIR = join(homedir(), '.polynote');
const DB_PATH = join(DB_DIR, 'notes.db');

let db: Database.Database | null = null;

// Initialize database connection
function ensureDatabase(): Database.Database {
  if (!db) {
    // Ensure .polynote directory exists
    mkdirSync(DB_DIR, { recursive: true });
    
    // Create database connection
    db = new Database(DB_PATH);
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

// Initialize schema
export function initializeDatabase(): void {
  const database = ensureDatabase();
  const schemaPath = join(__dirname, 'schema.sql');
  
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }
  
  const schema = readFileSync(schemaPath, 'utf-8');
  database.exec(schema);
}

// Get database instance
export function getDatabase(): Database.Database {
  return ensureDatabase();
}

// Close database connection
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Transaction helper
export function transaction<T>(fn: () => T): T {
  const database = ensureDatabase();
  const txn = database.transaction(fn);
  return txn();
}

// Query helpers
export function query<T = unknown>(sql: string, params?: unknown[]): T[] {
  const database = ensureDatabase();
  const stmt = database.prepare(sql);
  return params ? stmt.all(...params) as T[] : stmt.all() as T[];
}

export function queryOne<T = unknown>(sql: string, params?: unknown[]): T | undefined {
  const database = ensureDatabase();
  const stmt = database.prepare(sql);
  return params ? stmt.get(...params) as T : stmt.get() as T;
}

export function execute(sql: string, params?: unknown[]): Database.RunResult {
  const database = ensureDatabase();
  const stmt = database.prepare(sql);
  return params ? stmt.run(...params) : stmt.run();
}

// Full-text search helper
export function searchNotes(searchTerm: string, limit = 50): Array<{
  id: string;
  title: string;
  body: string;
  rank: number;
}> {
  // Wrap search term in quotes to handle special characters and treat as phrase
  const quotedTerm = `"${searchTerm.replace(/"/g, '""')}"`;
  
  return query<{ id: string; title: string; body: string; rank: number }>(
    `
    SELECT
      n.id,
      n.title,
      n.body,
      rank
    FROM NoteSearch
    JOIN Note n ON NoteSearch.note_id = n.id
    WHERE NoteSearch MATCH ?
    ORDER BY rank
    LIMIT ?
    `,
    [quotedTerm, limit]
  );
}

export { Database };