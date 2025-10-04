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
export { generateChecksum, verifyChecksum, generateFileChecksum } from './utils/checksum.js';
