// Core data types for PolyNote

export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
  source_connector: string;
  source_id: string;
  checksum: string;
  tags?: Tag[];
  attachments?: Attachment[];
  links?: NoteLink[];
}

export interface Tag {
  id: string;
  name: string;
  created_at: number;
}

export interface Attachment {
  id: string;
  note_id: string;
  filename: string;
  mime_type: string;
  size: number;
  path: string;
  checksum: string;
  created_at: number;
}

export interface NoteLink {
  from_note_id: string;
  to_note_id: string;
  link_type: 'internal' | 'backlink' | 'external';
}

export interface SyncState {
  connector: string;
  last_sync_at?: number;
  cursor?: string;
  error?: string;
}

export interface Conflict {
  id: string;
  note_id: string;
  connector_a: string;
  connector_b: string;
  version_a: string;
  version_b: string;
  resolved_at?: number;
  resolution?: string;
  created_at: number;
}

export interface ChangeLogEntry {
  id: string;
  note_id: string;
  connector: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  checksum?: string;
}

export interface ConnectorConfig {
  connector: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface AIOperation {
  id: string;
  note_id: string;
  operation: 'summarize' | 'translate' | 'rewrite' | 'extract';
  provider: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  duration_ms?: number;
  result?: string;
  error?: string;
  created_at: number;
}

export interface EncryptionKey {
  id: string;
  key_type: 'master' | 'share' | 'backup';
  encrypted_key: string;
  salt: string;
  created_at: number;
  last_used_at?: number;
}

export interface ShareBundle {
  id: string;
  note_ids: string;
  encryption_key_id: string;
  expires_at?: number;
  access_count: number;
  created_at: number;
}

// Connector types
export interface IConnector {
  name: string;
  enabled: boolean;

  initialize(): Promise<void>;
  authenticate(): Promise<void>;

  pullChanges(since?: Date): Promise<Note[]>;
  pushChanges(notes: Note[]): Promise<void>;

  getNote(id: string): Promise<Note | null>;
  createNote(note: Omit<Note, 'id'>): Promise<Note>;
  updateNote(id: string, note: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
}

// Sync engine types
export interface SyncResult {
  connector: string;
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  resolved_note?: Note;
}
