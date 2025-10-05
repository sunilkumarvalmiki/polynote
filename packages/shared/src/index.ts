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
