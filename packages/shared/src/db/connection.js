import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_DIR = join(homedir(), '.polynote');
const DB_PATH = join(DB_DIR, 'notes.db');
let db = null;
// Statement cache for prepared statements
const statementCache = new Map();
// Initialize database connection with optimized settings
function ensureDatabase() {
    if (!db) {
        // Ensure .polynote directory exists
        mkdirSync(DB_DIR, { recursive: true });
        // Create database connection
        db = new Database(DB_PATH);
        // Performance optimization pragmas
        db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
        db.pragma('foreign_keys = ON'); // Enforce foreign key constraints
        db.pragma('synchronous = NORMAL'); // Balance between safety and performance
        db.pragma('temp_store = MEMORY'); // Store temp tables in memory
        db.pragma('mmap_size = 30000000000'); // Use memory-mapped I/O (30GB)
        db.pragma('page_size = 4096'); // Optimal page size for most systems
        db.pragma('cache_size = -64000'); // 64MB cache (negative = KB)
    }
    return db;
}
// Initialize schema
export function initializeDatabase() {
    const database = ensureDatabase();
    const schemaPath = join(__dirname, 'schema.sql');
    if (!existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
    }
    const schema = readFileSync(schemaPath, 'utf-8');
    database.exec(schema);
}
// Get database instance
export function getDatabase() {
    return ensureDatabase();
}
// Close database connection and clear caches
export function closeDatabase() {
    if (db) {
        // Clear statement cache
        statementCache.clear();
        // Close database
        db.close();
        db = null;
    }
}
// Transaction helper with batching support
export function transaction(fn) {
    const database = ensureDatabase();
    const txn = database.transaction(fn);
    return txn();
}
// Batch transaction for bulk operations
export function batchTransaction(operations) {
    const database = ensureDatabase();
    const batch = database.transaction(() => {
        for (const op of operations) {
            op();
        }
    });
    batch();
}
// Get or create prepared statement from cache
function getPreparedStatement(sql) {
    if (!statementCache.has(sql)) {
        const database = ensureDatabase();
        statementCache.set(sql, database.prepare(sql));
    }
    return statementCache.get(sql);
}
// Query helpers with prepared statement caching
export function query(sql, params) {
    const stmt = getPreparedStatement(sql);
    return params ? stmt.all(...params) : stmt.all();
}
export function queryOne(sql, params) {
    const stmt = getPreparedStatement(sql);
    return params ? stmt.get(...params) : stmt.get();
}
export function execute(sql, params) {
    const stmt = getPreparedStatement(sql);
    return params ? stmt.run(...params) : stmt.run();
}
// Full-text search helper
export function searchNotes(searchTerm, limit = 50) {
    // Wrap search term in quotes to handle special characters and treat as phrase
    const quotedTerm = `"${searchTerm.replace(/"/g, '""')}"`;
    return query(`
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
    `, [quotedTerm, limit]);
}
export { Database };
