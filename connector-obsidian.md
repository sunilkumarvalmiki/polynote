
# Task: Obsidian Local Connector

## Goal
File‑system watcher for a vault; parse YAML frontmatter and content; write changes safely.

## Sub‑tasks
- Watcher (chokidar) on `VAULT_DIR_EXAMPLE`.
- Parser: frontmatter (YAML) + Markdown.
- Writer: preserve EOL/encoding; atomic writes temp→rename.
- Attachments: copy/link; compute hashes for dedupe.

## Micro‑tasks
- Build `parseNote(filePath)` → internal Note.
- Build `emitNote(note)` → write to disk; ensure parent dirs.
- FTS5 index update on create/update/delete.
