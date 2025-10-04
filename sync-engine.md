
# Task: Sync Engine

## Goal
Bidirectional sync with mapping, queues, conflict resolver, and cursors per connector.

## Sub‑tasks
- Change detection (hash/mtime) and source cursors.
- Mapping layer for each connector to internal model.
- Work queue with concurrency limits.
- Conflict resolver producing `.conflict.md` artifacts.

## Micro‑tasks
- `diffNote(a,b)`; `mergeNote(a,b)` minimal.
- `queue.run()` with retry/backoff.
- Persist cursors in SQLite.
