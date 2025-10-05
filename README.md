<div align="center">

# 🇮🇳 PolyNote

**Universal Note Synchronization Platform**

_Made with ❤️ in India, for knowledge workers everywhere_

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange)](https://pnpm.io)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🌟 What is PolyNote?

PolyNote is an **open-source, privacy-first** note synchronization platform built in India. It seamlessly connects your favorite note-taking apps while keeping your data secure and under your control.

### Why PolyNote?

- 🔒 **Privacy First**: Your notes stay on your device. End-to-end encryption for everything.
- 🌐 **Universal Sync**: Works with Obsidian, Notion, Joplin, OneNote, and Apple Notes
- 🤖 **Local AI**: Summarize, translate, and enhance notes using local AI models
- 🇮🇳 **Multilingual**: Full support for English, Telugu (తెలుగు), and Hindi (हिंदी)
- 💻 **Cross-Platform**: Linux, macOS, and Windows support

---

## ✨ Features

### 🔄 Bidirectional Sync

- Automatic synchronization across all your note-taking platforms
- Smart conflict resolution with visual merge tools
- Preserves formatting, tags, and metadata

### 🧠 AI-Powered Tools

- **Local-first AI**: Run AI models on your own computer
- **Summarization**: Get quick summaries of long notes
- **Translation**: Translate between English, Telugu, and Hindi
- **Content Enhancement**: Rewrite and improve your notes

### 🔐 Security & Privacy

- End-to-end encryption for all data
- Secure sharing with encrypted bundles
- No cloud storage required (unless you choose)
- Open-source and auditable

### 🌈 For Indian Users

- Full support for Indian languages (Telugu, Hindi)
- RTL text support where needed
- Localized date and number formats
- Built by Indian developers who understand your needs

---

## 🚀 Quick Start

### Prerequisites

Before you begin, make sure you have these installed:

- **Node.js** (version 22 or higher) - [Download here](https://nodejs.org)
- **pnpm** (version 9 or higher) - Install with: `npm install -g pnpm`
- **Podman** or **Docker** (for development) - [Podman Install Guide](https://podman.io/getting-started/installation)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/sunilkumarvalmiki/polynote.git
cd polynote

# 2. Install dependencies
pnpm install

# 3. Start the development environment
make dev-up

# 4. Run the application
pnpm dev
```

That's it! PolyNote should now be running on your computer.

### First Steps

1. **Connect Your First App**: Start with Obsidian (easiest) or Notion
2. **Configure Sync**: Choose which folders to sync
3. **Try AI Features**: Summarize a note using local AI
4. **Explore**: Check out the graph view and search features

---

## 📖 Documentation

- [**Getting Started Guide**](docs/getting-started.md) - Step-by-step setup instructions
- [**User Guide**](docs/user-guide.md) - How to use PolyNote's features
- [**Developer Guide**](docs/developer-guide.md) - For contributors and developers
- [**Database Optimization Guide**](docs/database-optimization.md) - Performance tuning and best practices

---

## 🛠️ Development

### Project Structure

```
polynote/
├── apps/
│   ├── desktop/          # Electron desktop app
│   └── server/           # Backend API server
├── packages/
│   ├── connectors/       # Platform connectors (Obsidian, Notion, etc.)
│   ├── ai/              # AI provider integrations
│   ├── security/        # Encryption and security
│   └── shared/          # Shared utilities and types
├── infra/               # Infrastructure and deployment
└── docs/                # Documentation
```

### Available Commands

```bash
# Development
pnpm dev              # Start development server
pnpm dev:desktop      # Start desktop app in dev mode

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report

# Code Quality
pnpm lint             # Lint code
pnpm format           # Format code with Prettier
pnpm type-check       # TypeScript type checking

# Building
pnpm build            # Build for production
pnpm build:desktop    # Build desktop app
```

### Running Tests

We maintain high code quality with comprehensive testing:

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test packages/ai

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

---

## 🤝 Contributing

We welcome contributions from developers across India and around the world!

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/amazing-feature`)
3. **Make** your changes
4. **Test** your changes (`pnpm test`)
5. **Commit** using conventional commits (`git commit -m 'feat: add amazing feature'`)
6. **Push** to your branch (`git push origin feat/amazing-feature`)
7. **Create** a Pull Request

### Contribution Guidelines

- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)
- Write tests for new features
- Update documentation when needed
- Use conventional commit messages
- Ensure all tests pass before submitting

---

## 🌍 Supported Platforms

### Note-Taking Apps

- ✅ **Obsidian** - Full bidirectional sync
- ✅ **Notion** - Read and write support
- ✅ **Joplin** - Full sync with attachments
- ⏳ **OneNote** - Read-only (write coming soon)
- ⏳ **Apple Notes** - Read-only (macOS only)

### Operating Systems

- ✅ **Linux** - Full support (AppImage, DEB, RPM)
- ✅ **macOS** - Intel and Apple Silicon (DMG, PKG)
- ✅ **Windows** - Full support (EXE, NSIS installer)

### AI Providers

- ✅ **Ollama** - Local AI (recommended)
- ✅ **GPT4All** - Local AI
- ✅ **llama.cpp** - Local AI
- ✅ **OpenAI** - Cloud AI (optional)
- ✅ **Claude** - Cloud AI (optional)

---

## 📊 Project Status

🚧 **Currently in Active Development**

- **Version**: v0.9.0 (Beta)
- **Target Release**: v1.0.0 in Q1 2025
- **Test Coverage**: 85%+
- **Contributors**: Growing community of Indian developers

### Roadmap

- [x] Core sync engine
- [x] Obsidian connector
- [x] Notion connector
- [x] Local AI integration
- [ ] Mobile apps (Android first)
- [ ] Cloud sync option
- [ ] Team collaboration features

---

## 🇮🇳 Made in India

PolyNote is proudly developed in India by Indian developers who understand the unique needs of Indian knowledge workers and students.

### Why This Matters

- **Local Language Support**: First-class support for Telugu and Hindi
- **Performance Optimization**: Works on modest hardware common in India
- **Offline-First**: Reliable even with unstable internet connections
- **Privacy Focused**: Your data stays in India if you want it to
- **Community**: Join a growing community of Indian open-source contributors

### Indian Contributors

We're building a community of talented Indian developers. Want to join us? Check out our [Contributing Guide](CONTRIBUTING.md).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with ❤️ by developers in India
- Inspired by the Indian open-source community
- Special thanks to all our contributors
- Powered by amazing open-source projects

---

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/sunilkumarvalmiki/polynote/issues)
- **Email**: Contact via GitHub Issues

---

<div align="center">

**🇮🇳 Made with ❤️ in India**

_Empowering knowledge workers, one note at a time_

[⬆ Back to Top](#-polynote)

</div>
