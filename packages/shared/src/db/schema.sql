-- PolyNote Database Schema
-- SQLite with FTS5 for full-text search

-- Core note storage
CREATE TABLE IF NOT EXISTS Note (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  source_connector TEXT NOT NULL,
  source_id TEXT NOT NULL,
  checksum TEXT NOT NULL,
  UNIQUE(source_connector, source_id)
);

-- Full-text search index (standalone FTS5 table)
CREATE VIRTUAL TABLE IF NOT EXISTS NoteSearch USING fts5(
  note_id UNINDEXED,
  title,
  body
);

-- Triggers to keep FTS5 in sync with Note table
CREATE TRIGGER IF NOT EXISTS note_ai AFTER INSERT ON Note BEGIN
  INSERT INTO NoteSearch(note_id, title, body) VALUES (new.id, new.title, new.body);
END;

CREATE TRIGGER IF NOT EXISTS note_ad AFTER DELETE ON Note BEGIN
  DELETE FROM NoteSearch WHERE rowid IN (SELECT rowid FROM NoteSearch WHERE note_id = old.id);
END;

CREATE TRIGGER IF NOT EXISTS note_au AFTER UPDATE ON Note BEGIN
  DELETE FROM NoteSearch WHERE rowid IN (SELECT rowid FROM NoteSearch WHERE note_id = old.id);
  INSERT INTO NoteSearch(note_id, title, body) VALUES (new.id, new.title, new.body);
END;

-- Tags
CREATE TABLE IF NOT EXISTS Tag (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

-- Note-Tag relationships
CREATE TABLE IF NOT EXISTS NoteTag (
  note_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES Note(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES Tag(id) ON DELETE CASCADE
);

-- Attachments
CREATE TABLE IF NOT EXISTS Attachment (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (note_id) REFERENCES Note(id) ON DELETE CASCADE
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS SyncState (
  connector TEXT PRIMARY KEY,
  last_sync_at INTEGER,
  cursor TEXT,
  error TEXT
);

-- Conflict tracking
CREATE TABLE IF NOT EXISTS Conflict (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  connector_a TEXT NOT NULL,
  connector_b TEXT NOT NULL,
  version_a TEXT NOT NULL,
  version_b TEXT NOT NULL,
  resolved_at INTEGER,
  resolution TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (note_id) REFERENCES Note(id) ON DELETE CASCADE
);

-- Change log for delta sync
CREATE TABLE IF NOT EXISTS ChangeLog (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  connector TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
  timestamp INTEGER NOT NULL,
  checksum TEXT,
  FOREIGN KEY (note_id) REFERENCES Note(id) ON DELETE CASCADE
);

-- Connector configuration
CREATE TABLE IF NOT EXISTS ConnectorConfig (
  connector TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Links between notes
CREATE TABLE IF NOT EXISTS NoteLink (
  from_note_id TEXT NOT NULL,
  to_note_id TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK(link_type IN ('internal', 'backlink', 'external')),
  PRIMARY KEY (from_note_id, to_note_id),
  FOREIGN KEY (from_note_id) REFERENCES Note(id) ON DELETE CASCADE,
  FOREIGN KEY (to_note_id) REFERENCES Note(id) ON DELETE CASCADE
);

-- AI operations history
CREATE TABLE IF NOT EXISTS AIOperation (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('summarize', 'translate', 'rewrite', 'extract')),
  provider TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost REAL,
  duration_ms INTEGER,
  result TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (note_id) REFERENCES Note(id) ON DELETE CASCADE
);

-- Encryption metadata
CREATE TABLE IF NOT EXISTS EncryptionKey (
  id TEXT PRIMARY KEY,
  key_type TEXT NOT NULL CHECK(key_type IN ('master', 'share', 'backup')),
  encrypted_key TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

-- Share bundles
CREATE TABLE IF NOT EXISTS ShareBundle (
  id TEXT PRIMARY KEY,
  note_ids TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  expires_at INTEGER,
  access_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (encryption_key_id) REFERENCES EncryptionKey(id)
);

-- Rules for automation
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK(trigger IN ('onCreate', 'onUpdate', 'onTag')),
  conditions TEXT NOT NULL,
  actions TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_source ON Note(source_connector, source_id);
CREATE INDEX IF NOT EXISTS idx_note_updated ON Note(updated_at);
CREATE INDEX IF NOT EXISTS idx_note_deleted ON Note(deleted_at);
CREATE INDEX IF NOT EXISTS idx_attachment_note ON Attachment(note_id);
CREATE INDEX IF NOT EXISTS idx_changelog_note ON ChangeLog(note_id);
CREATE INDEX IF NOT EXISTS idx_changelog_connector ON ChangeLog(connector, timestamp);
CREATE INDEX IF NOT EXISTS idx_conflict_note ON Conflict(note_id);
CREATE INDEX IF NOT EXISTS idx_ai_operation_note ON AIOperation(note_id);
CREATE INDEX IF NOT EXISTS idx_ai_operation_created ON AIOperation(created_at);