# PolyNote

Universal note synchronization and AI-powered knowledge management for local-first workflows.

## Overview

PolyNote enables seamless bidirectional sync across multiple note-taking platforms with local-first AI capabilities:

- **Connectors**: Obsidian, Notion, Joplin, OneNote, Apple Notes
- **AI Features**: Local summarization, translation (EN↔TE↔HI), rewriting
- **Security**: End-to-end encryption, encrypted share bundles
- **Cross-platform**: Linux, macOS (Intel + Apple Silicon), Windows

## Architecture

```
polynote/
├── apps/
│   ├── desktop/          # Electron + React app
│   └── server/           # Node.js/Express API
├── packages/
│   ├── connectors/       # Connector implementations
│   │   ├── obsidian/
│   │   ├── notion/
│   │   ├── joplin/
│   │   ├── onenote/
│   │   └── apple-notes/
│   ├── ai/              # AI provider abstractions
│   └── shared/          # Common types, utils, DB
├── infra/               # Podman, CI configs
└── docs/                # Documentation
```

## Quick Start

### Prerequisites

- Node.js ≥22.0.0
- pnpm ≥9.0.0
- Podman (recommended) or Docker

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/polynote.git
cd polynote

# Install dependencies
pnpm install

# Start development environment
make dev-up

# Run the app
pnpm dev
```

### Development Commands

```bash
# Run tests
pnpm test

# Lint code
pnpm lint

# Type check
pnpm type-check

# Build for production
pnpm build

# Clean build artifacts
pnpm clean
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Backend** | TypeScript (Node.js/Express), Python (FastAPI) |
| **Frontend** | Electron + React, TailwindCSS |
| **Database** | SQLite with FTS5 |
| **Encryption** | libsodium/sodium-native, OpenPGP.js |
| **AI** | Ollama, GPT4All, llama.cpp, OpenAI, Claude |
| **Containers** | Podman (dev + CI + release) |
| **CI/CD** | GitHub Actions |
| **Packaging** | electron-builder |

## Features

### Core Sync
- Bidirectional sync across platforms
- Conflict resolution with merge UI
- Change detection and delta sync
- Rate limiting and retry logic

### AI Capabilities
- Local summarization (7B models)
- EN↔TE↔HI translation
- Content rewriting and enhancement
- Privacy-first with secret redaction

### Security
- End-to-end encryption
- Encrypted share bundles
- Key management with recovery phrases
- Access control and permissions

## Documentation

- [Product Requirements](PRD.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Connector Guide](docs/CONNECTORS.md) *(coming soon)*
- [AI Module](docs/AI.md) *(coming soon)*
- [Security](docs/SECURITY.md) *(coming soon)*

## Development

### Branching Strategy

- `main`: Production releases
- `develop`: Active development
- `feat/*`: Feature branches
- `fix/*`: Bug fixes

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

feat(connectors): implement Obsidian file watcher
fix(sync): resolve conflict detection edge case
docs(readme): update installation steps
```

### Code Quality

- TypeScript strict mode enabled
- ESLint + Prettier configured
- Minimum 80% test coverage
- Automated CI checks on PRs

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

## Packaging

```bash
# Build for current platform
pnpm --filter @polynote/desktop run build

# Build for all platforms (macOS, Windows, Linux)
pnpm --filter @polynote/desktop run build:all
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit with conventional commits
6. Push and create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details

## Project Status

🚧 **Under Active Development** - v1.0.0 target: Q1 2025

### Roadmap

- [x] Phase 1: Foundation & Infrastructure
- [ ] Phase 2: Core Connectors
- [ ] Phase 3: Sync Engine
- [ ] Phase 4: AI Module
- [ ] Phase 5: Security & Encryption
- [ ] Phase 6: Desktop UI
- [ ] Phase 7: Packaging & Release

## Support

- [Documentation](docs/)
- [Issue Tracker](https://github.com/yourusername/polynote/issues)
- [Discussions](https://github.com/yourusername/polynote/discussions)

---

**Built with ❤️ by the PolyNote Team**