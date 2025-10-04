
# Task: Notion Connector (CRUD + Delta Sync)

## Goal
Implement Notion connector with read/write for pages & databases and delta syncing.

## Sub‑tasks
- OAuth2 flow; store tokens in OS keychain.
- CRUD wrappers using `@notionhq/client`.
- Mapper: Markdown ↔ Notion Blocks (Limited); tags↔multi‑select.
- Rate limit handling with retries/backoff.
- Delta: maintain page `last_edited_time` cursor per database.

## Micro‑tasks
- Implement `/auth/notion/callback` route.
- Write `mapMdToNotionBlocks(md)` and `mapNotionBlocksToMd(blocks)` with tests.
- Implement `pullChanges(since)`; `pushChanges(changes)`; idempotency.
- Persist `SourceLink` records.
- Podman dev: `podman run --rm -p 3000:3000 --name polynote-notion -e NOTION_TOKEN=... localhost/polynote-server`.
