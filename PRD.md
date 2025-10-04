# Variables

| Key | Value |
|---|---|
| `PROJECT_NAME` | PolyNote |
| `PRIMARY_LANGUAGES` | TypeScript (Node.js/Express), Python (FastAPI) – connector-specific |
| `UI_STACK` | Electron + React (desktop), React (web); TailwindCSS |
| `LOCAL_DB` | SQLite with FTS5 |
| `SEARCH_INDEX` | SQLite FTS5; optional Meilisearch for large datasets |
| `ENCRYPTION` | libsodium / sodium-native; OpenPGP.js for sharing |
| `AI_ENGINES` | Ollama (local), GPT4All (local), llama.cpp (local), OpenAI, Claude |
| `CONNECTORS_V1` | Obsidian (local vault), Notion API, Joplin API, OneNote (MS Graph), Apple Notes (AppleScript/macOS) |
| `PKG_TOOLING` | electron-builder (DMG/PKG, EXE/NSIS, AppImage/DEB/RPM) |
| `CONTAINER_RUNTIME` | Podman (dev + CI + release) |
| `CI` | GitHub Actions |
| `PLATFORMS` | Linux, macOS (Apple Silicon & Intel), Windows; Android (future) |
| `REPO_LAYOUT` | `apps/desktop`, `apps/server`, `packages/connectors/*`, `packages/ai/*`, `infra/` |
| `DATA_DIR` | `~/.polynote` (config, keys, cache) |
| `VAULT_DIR_EXAMPLE` | `~/Documents/Obsidian/SecondBrain` |
| `PODMAN_MACHINE` | `polynote-dev` |
| `VERSIONING` | SemVer + Conventional Commits |
| `DATE` | 2025-10-04 |


# PRD — PolyNote v1.0

## 1. Purpose
A universal, AI‑powered note bridge that syncs and transforms notes across Obsidian, Notion, OneNote, Joplin, and Apple Notes with multilingual (English, Telugu, Hindi) support, strong privacy, and offline‑first design.

## 2. Goals (MVP)
1. Connectors: Obsidian (local), Notion (read/write), Joplin (read/write), OneNote (read), Apple Notes (macOS via AppleScript – read).
2. Bidirectional sync for Obsidian↔Notion and Joplin↔Notion with metadata mapping (tags, dates, attachments).
3. AI transforms: summarize, translate (EN↔TE/HI), rewrite; run via local (Ollama/GPT4All) or cloud providers.
4. Conflict resolution and version history.
5. Desktop app (Electron) with unified dashboard and rule‑based automations.
6. Packaging: DMG/PKG (macOS), EXE/NSIS (Windows), AppImage/DEB/RPM (Linux).

## 3. Non‑Goals (MVP)
• Realtime multi‑user collaborative editing. • Mobile apps. • Full fidelity import of proprietary drawings/embeds (fallback to attachments).

## 4. Users & Roles
• Individual knowledge workers/students; developer‑admins configuring connectors. • Future collaborators with shareable links/keys.

## 5. Functional Requirements
### 5.1 Connectors
- **Obsidian Local**: File watcher on `VAULT_DIR_EXAMPLE`; parse MD + YAML frontmatter; write back preserving structure.
- **Notion**: OAuth2; CRUD pages/blocks, map tags↔multi‑select; attachments handled as Notion files; rate‑limit aware.
- **Joplin**: Use WebClipper/REST API; map notebooks↔folders; resources as attachments.
- **OneNote**: Read pages/sections via Microsoft Graph; HTML→Markdown conversion; preserve page hierarchy.
- **Apple Notes (macOS)**: Read via AppleScript/Automation; export to MD; no write‑back in MVP.

### 5.2 Sync Engine
- Delta detection (mtime/hash), per‑connector cursors.
- Mapping layer for metadata/blocks.
- Two‑way rules with per‑folder filters.
- Conflict resolver UI (side‑by‑side diff); create `.conflict.md` copies.

### 5.3 AI Features
- Prompt templates: *Summarize*, *Translate*, *Rewrite tone*, *Extract tasks*.
- Run queue with provider policy (local‑first, then cloud fallback).
- Prompt budget guardrails; redact secrets before send.

### 5.4 Security
- Local keyring; at‑rest encryption for cache & exports.
- End‑to‑end encrypted share bundles (`.polynote-share.zip`) with per‑recipient keys.

### 5.5 UX
- Unified inbox; graph view; search with FTS5 (ranked).
- Rule builder: when/if/then flows (e.g., “if tag:#blog → export to Notion Database X”).

## 6. Acceptance Criteria
- Create a note in Obsidian → appears in Notion within 60s with title/body/tags preserved.
- Edit same note in Notion → synced back to Obsidian; conflicts produce merge UI.
- Joplin note with image → imports into Notion with attachment intact.
- OneNote page → readable in app; formatting normalized to Markdown.
- Apple Notes read on macOS → available in PolyNote; provenance preserved.
- AI summarize on 2,000‑word note finishes locally (≤M2 16GB) within 30s using a 7B model; translation EN↔TE/HI available via local or cloud.
- Installers generated for macOS/Windows/Linux using electron‑builder in CI.

## 7. Constraints
- API rate limits (Notion/MS Graph); platform limitations (Apple Notes lacks public API); no kernel drivers; air‑gapped friendly.

## 8. Data Model (simplified)
```
Note(id, title, content_md, created_at, updated_at)
NoteMeta(note_id, tags[], props JSON, backlinks[], attachments[])
SourceLink(note_id, provider, external_id, etag, last_sync)
History(note_id, delta, author, ts)
```
FTS index on `title, content_md, tags`.

## 9. Telemetry & Privacy
Opt‑in only. Local analytics; no raw content leaves device unless user consents.

## 10. Internationalization
UI strings externalized; fonts for Telugu/Hindi; transliteration helpers; date/number locale.

## 11. Packaging
- `electron-builder` configs per platform.
- Code‑signed macOS and Windows builds (user‑provided certs).
- Offline installers; air‑gapped updates via file.

## 12. Risks & Mitigations
- **Apple Notes**: read‑only via AppleScript; mitigate by export‑first workflow.
- **HTML→MD fidelity (OneNote)**: use Pandoc + custom rules; store original HTML as attachment.
- **Large workspaces**: chunked sync, backoff, resumable exports.
