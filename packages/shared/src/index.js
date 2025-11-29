// Database
export { initializeDatabase, getDatabase, closeDatabase, transaction, query, queryOne, execute, searchNotes, Database, } from './db/connection.js';
// Database Optimization (Issue #4.17)
export { AsyncDatabase } from './db/AsyncDatabase.js';
export { ConnectionPool } from './db/ConnectionPool.js';
export { QueryOptimizer } from './db/QueryOptimizer.js';
// Utilities
// Graph
export { GraphEngine } from './graph/GraphEngine.js';
// Rules
export { RuleEngine } from './rules/RuleEngine.js';
export { generateChecksum, verifyChecksum, generateFileChecksum } from './utils/checksum.js';
// Audit logging
export { AuditLogger, auditLogger, AuditEventType } from './audit/AuditLogger.js';
