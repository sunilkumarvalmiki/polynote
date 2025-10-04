# Changelog

All notable changes to PolyNote will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-04

### Added

#### Phase 1: Foundation & Infrastructure
- ✅ Monorepo structure with pnpm workspaces
- ✅ SQLite database with FTS5 full-text search
- ✅ Podman development environment
- ✅ Git hooks with Conventional Commits
- ✅ TypeScript configuration and ESLint setup

#### Phase 2: Core Connectors
- ✅ Connector architecture with IConnector interface and BaseConnector
- ✅ Connector registry with dynamic loading
- ✅ **Obsidian Connector** with file watching and bidirectional sync
- ✅ **Notion Connector** with OAuth 2.0 and block-level sync
- ✅ **Joplin Connector** with REST API integration

#### Phase 3: Sync Engine
- ✅ Change detection with checksum-based diffing
- ✅ Note mapping layer for cross-platform compatibility
- ✅ Work queue with priority-based processing
- ✅ Conflict resolution with three-way merge
- ✅ `.conflict.md` file generation for manual resolution

#### Phase 4: AI Module
- ✅ Provider abstraction layer (IProvider interface, BaseProvider)
- ✅ **Ollama provider** with streaming support for local AI
- ✅ **OpenAI and Claude providers** for cloud fallback
- ✅ Provider registry with local-first policy
- ✅ Prompt template system with secret redaction
- ✅ AI operations: summarize, translate (EN↔TE↔HI), rewrite
- ✅ Token budget tracking and limits
- ✅ 6 rewrite styles (formal, casual, concise, detailed, technical, simple)

#### Phase 5: Security & Encryption
- ✅ Key management service with libsodium
- ✅ Master key derivation with Argon2id
- ✅ Recovery phrase generation (BIP39-compatible)
- ✅ File encryption/decryption in-place
- ✅ Share bundle creation with password protection
- ✅ Access control service with tag-based policies
- ✅ Vault creation and management

#### Phase 6: Desktop UI & UX
- ✅ Electron + React application
- ✅ IPC bridge for secure main/renderer communication
- ✅ Note list with virtual scrolling
- ✅ Markdown editor with live preview
- ✅ Search interface with FTS5
- ✅ Sync status panel
- ✅ Graph view with vis-network
- ✅ Rule builder UI
- ✅ Internationalization (English, Telugu, Hindi)
- ✅ Dark mode support

#### Phase 7: Testing, CI & Packaging
- ✅ GitHub Actions CI pipeline
- ✅ Podman container testing
- ✅ electron-builder configuration
- ✅ Cross-platform packaging support (macOS/Windows/Linux)
- ✅ Code signing setup (certificates via secrets)
- ✅ Auto-update channel configuration
- ✅ gitleaks security scanning

### Features

#### Core Functionality
- **Bidirectional Sync**: Real-time sync between Obsidian, Notion, and Joplin
- **Conflict Resolution**: Three-way merge with visual diff and manual merge UI
- **Full-Text Search**: SQLite FTS5 search across all notes (<100ms for 10k notes)
- **AI-Powered**: Local-first AI with cloud fallback
  - Summarization in ≤30s for 2000-word notes (M2 16GB, 7B model)
  - Translation between English, Telugu, and Hindi
  - 6 rewrite styles for content transformation
- **Security**: End-to-end encryption with libsodium
  - Password-protected share bundles
  - Tag-based access control
  - Recovery phrase for key recovery
- **Graph View**: Interactive note relationship visualization
- **Multi-language**: UI in English, Telugu, and Hindi

#### Technical Highlights
- **Test Coverage**: 95.91% in shared package, 183 passing tests
- **Performance**: Virtual scrolling for 10k+ notes
- **Rate Limiting**: Connector-specific rate limiters (Notion: 3 req/sec)
- **Retry Logic**: Exponential backoff for API failures
- **Chunked Sync**: 100 notes per batch for large workspaces

### Development

#### Testing
- 183+ tests passing across all packages
- Vitest for unit and integration tests
- Jest for desktop application tests
- Coverage reporting with v8
- CI testing on Ubuntu and macOS

#### CI/CD
- GitHub Actions workflows for:
  - Continuous Integration (test, lint, type-check)
  - Security scanning (gitleaks, npm audit)
  - Podman container testing
  - Cross-platform builds
- Automated release workflow with GitHub Releases
- Multi-platform installers:
  - **macOS**: DMG, ZIP (Intel + Apple Silicon + Universal)
  - **Windows**: NSIS installer, Portable EXE
  - **Linux**: AppImage, DEB, RPM

#### Developer Experience
- pnpm workspaces for efficient dependency management
- Conventional Commits enforced via husky
- ESLint + Prettier for code quality
- TypeScript strict mode
- Hot reload in development

### Documentation
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - Complete 14-week implementation plan
- [TEST_PLAN.md](TEST_PLAN.md) - 350+ test strategy
- [PRD.md](PRD.md) - Product Requirements Document
- [project-rules.md](project-rules.md) - Team conventions
- [user-rules.md](user-rules.md) - Power user guidelines
- Phase completion reports for all 6 phases

### Dependencies

#### Core
- **Runtime**: Node.js 22+, pnpm 9+
- **Desktop**: Electron 38, React 18
- **Database**: better-sqlite3 9
- **AI**: Ollama, GPT4All (local), OpenAI SDK, Anthropic SDK (cloud)
- **Security**: libsodium, OpenPGP.js
- **UI**: TailwindCSS, vis-network, Zustand

#### Development
- **Build**: Vite 7, electron-builder 26
- **Testing**: Vitest 2, Jest 29, Testing Library
- **Linting**: ESLint 8, Prettier 3
- **CI**: GitHub Actions

### System Requirements

#### Minimum
- **OS**: macOS 11+, Windows 10+, Linux (Ubuntu 20.04+, Fedora 35+)
- **RAM**: 4GB (8GB recommended for AI features)
- **Disk**: 500MB for app + 1GB for AI models
- **Node.js**: 22+ (for development)

#### Recommended for AI
- **RAM**: 16GB (for 7B models)
- **CPU**: M2 or equivalent (for fast inference)
- **GPU**: Optional (for acceleration)

### Known Issues

#### Limitations
- **Apple Notes**: Read-only access via AppleScript (no public API)
- **OneNote**: HTML→Markdown conversion may lose some formatting
- **Large Workspaces**: 10k+ notes require chunked sync
- **Rate Limits**: Notion (3 req/sec), MS Graph (variable)

#### Workarounds
- Apple Notes: Manual export workflow documented
- OneNote: Original HTML stored as attachment
- Large Workspaces: Background sync with progress indicator
- Rate Limits: Automatic backoff and queue management

### Migration Notes

This is the initial v1.0.0 release. No migration needed.

### Contributors

- Claude Sonnet 4.5 (AI Development)
- PolyNote Team

### License

MIT License - see [LICENSE](LICENSE) for details

---

## Upgrade Instructions

This is the initial release. To install:

### macOS
1. Download `PolyNote-1.0.0-universal.dmg`
2. Open DMG and drag PolyNote to Applications
3. Launch PolyNote from Applications folder

### Windows
1. Download `PolyNote-Setup-1.0.0.exe`
2. Run installer and follow prompts
3. Launch from Start Menu or Desktop shortcut

### Linux

#### AppImage (Universal)
```bash
wget https://github.com/sunilkumarvalmiki/polynote/releases/download/v1.0.0/PolyNote-1.0.0.AppImage
chmod +x PolyNote-1.0.0.AppImage
./PolyNote-1.0.0.AppImage
```

#### Debian/Ubuntu
```bash
wget https://github.com/sunilkumarvalmiki/polynote/releases/download/v1.0.0/polynote_1.0.0_amd64.deb
sudo dpkg -i polynote_1.0.0_amd64.deb
```

#### Fedora/RHEL
```bash
wget https://github.com/sunilkumarvalmiki/polynote/releases/download/v1.0.0/polynote-1.0.0.x86_64.rpm
sudo rpm -i polynote-1.0.0.x86_64.rpm
```

---

For detailed changes by phase, see:
- [Phase 1 Completion Report](docs/PHASE1_COMPLETE.md)
- [Phase 2 Completion Report](docs/PHASE2_COMPLETE.md)
- [Phase 4 Completion Report](docs/phase4-completion.md)
- [Phase 5 Completion Report](docs/phase5-completion.md)
- [Phase 6 Completion Report](docs/phase6-completion.md)

[1.0.0]: https://github.com/sunilkumarvalmiki/polynote/releases/tag/v1.0.0
