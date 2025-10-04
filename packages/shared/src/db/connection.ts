import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_DIR = join(homedir(), '.polynote');
const DB_PATH = join(DB_DIR, 'notes.db');

// Ensure .polynote directory exists
mkdirSync(DB_DIR, { recursive: true });

// Create database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// Initialize schema
export function initializeDatabase(): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
}

// Get database instance
export function getDatabase(): Database.Database {
  return db;
}

// Close database connection
export function closeDatabase(): void {
  db.close();
}

// Transaction helper
export function transaction<T>(fn: () => T): T {
  const txn = db.transaction(fn);
  return txn();
}

// Query helpers
export function query<T = unknown>(sql: string, params?: unknown[]): T[] {
  const stmt = db.prepare(sql);
  return params ? stmt.all(...params) as T[] : stmt.all() as T[];
}

export function queryOne<T = unknown>(sql: string, params?: unknown[]): T | undefined {
  const stmt = db.prepare(sql);
  return params ? stmt.get(...params) as T : stmt.get() as T;
}

export function execute(sql: string, params?: unknown[]): Database.RunResult {
  const stmt = db.prepare(sql);
  return params ? stmt.run(...params) : stmt.run();
}

// Full-text search helper
export function searchNotes(searchTerm: string, limit = 50): Array<{
  id: string;
  title: string;
  body: string;
  rank: number;
}> {
  return query<{ id: string; title: string; body: string; rank: number }>(
    `
    SELECT 
      n.id,
      n.title,
      n.body,
      ns.rank
    FROM NoteSearch ns
    JOIN Note n ON ns.note_id = n.id
    WHERE NoteSearch MATCH ?
    ORDER BY rank
    LIMIT ?
    `,
    [searchTerm, limit]
  );
}

export { Database };