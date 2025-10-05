// Database
export {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  transaction,
  query,
  queryOne,
  execute,
  searchNotes,
  Database,
} from './db/connection.js';

// Database Optimization (Issue #4.17)
export { AsyncDatabase } from './db/AsyncDatabase.js';
export type { QueryOptions, TransactionOptions, PerformanceMetrics } from './db/AsyncDatabase.js';
export { ConnectionPool } from './db/ConnectionPool.js';
export type { PoolConfig, PoolStats } from './db/ConnectionPool.js';
export { QueryOptimizer } from './db/QueryOptimizer.js';
export type { SearchOptions, SearchResult, QueryPlan } from './db/QueryOptimizer.js';

// Types
export type {
  Note,
  Tag,
  Attachment,
  NoteLink,
  SyncState,
  Conflict,
  ChangeLogEntry,
  ConnectorConfig,
  AIOperation,
  EncryptionKey,
  ShareBundle,
  IConnector,
  SyncResult,
  ConflictResolution,
} from './types/index.js';

// Utilities
// Graph
export { GraphEngine } from './graph/GraphEngine.js';
export type { Graph, GraphNode, GraphEdge } from './graph/GraphEngine.js';

// Rules
export { RuleEngine } from './rules/RuleEngine.js';
export type { Rule, Condition, Action } from './rules/RuleEngine.js';
export { generateChecksum, verifyChecksum, generateFileChecksum } from './utils/checksum.js';

// Audit logging
export { AuditLogger, auditLogger, AuditEventType } from './audit/AuditLogger.js';
export type { AuditEvent, AuditQuery } from './audit/AuditLogger.js';
