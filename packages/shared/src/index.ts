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
} from './db/connection';

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
} from './types';

// Utilities
export { generateChecksum, verifyChecksum, generateFileChecksum } from './utils/checksum';