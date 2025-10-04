# Contributing to PolyNote

🇮🇳 Thank you for your interest in contributing to PolyNote! We're building a thriving community of Indian developers and welcome contributions from everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Contribution Workflow](#contribution-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and considerate in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues. When creating a bug report, include:

- Clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Your environment (OS, Node version, etc.)

### Suggesting Features

Feature suggestions are welcome! Please:

- Use a clear and descriptive title
- Provide detailed explanation of the feature
- Explain why this feature would be useful
- Include examples if possible

### Code Contributions

1. **First-time contributors**: Look for issues tagged with `good first issue`
2. **Bug fixes**: Check issues tagged with `bug`
3. **New features**: Discuss in an issue before starting work
4. **Documentation**: Improvements are always welcome

## Development Setup

### Prerequisites

- Node.js ≥22.0.0
- pnpm ≥9.0.0
- Podman or Docker
- Git

### Setup Steps

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/polynote.git
cd polynote

# Install dependencies
pnpm install

# Set up development environment
make dev-up

# Run tests to verify setup
pnpm test

# Start development server
pnpm dev
```

### Project Structure

```
polynote/
├── apps/
│   ├── desktop/          # Electron desktop application
│   └── server/           # Backend API server
├── packages/
│   ├── connectors/       # Platform connectors
│   ├── ai/              # AI integrations
│   ├── security/        # Security features
│   └── shared/          # Shared utilities
├── infra/               # Infrastructure configs
└── docs/                # Documentation
```

## Contribution Workflow

### 1. Create a Branch

```bash
# Create a feature branch
git checkout -b feat/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
pnpm test

# Run tests in watch mode during development
pnpm test:watch

# Check code coverage
pnpm test:coverage

# Lint your code
pnpm lint

# Check TypeScript types
pnpm type-check
```

### 4. Commit Your Changes

Use conventional commits format:

```bash
git commit -m "feat(connectors): add Joplin sync support"
```

See [Commit Guidelines](#commit-guidelines) for details.

### 5. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Provide type annotations for public APIs
- Avoid `any` type unless absolutely necessary
- Use meaningful variable and function names

### Code Style

- Follow ESLint and Prettier configurations
- Use 2 spaces for indentation
- Maximum line length: 100 characters
- Use single quotes for strings

### Testing

- Write unit tests for all new functions
- Aim for ≥80% code coverage
- Use descriptive test names
- Include edge cases

Example test structure:

```typescript
describe('FeatureName', () => {
  describe('functionName()', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle edge case', () => {
      // Test implementation
    });

    it('should throw error for invalid input', () => {
      // Test implementation
    });
  });
});
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Scopes

- `connectors`: Connector-related changes
- `ai`: AI module changes
- `security`: Security features
- `ui`: User interface changes
- `docs`: Documentation
- `infra`: Infrastructure

### Examples

```bash
# Feature
git commit -m "feat(connectors): implement Notion OAuth flow"

# Bug fix
git commit -m "fix(sync): resolve conflict detection issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Multiple changes
git commit -m "feat(ai): add translation support" -m "Supports EN, TE, and HI languages"
```

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally (`pnpm test`)
- [ ] Code is linted (`pnpm lint`)
- [ ] Types are correct (`pnpm type-check`)
- [ ] Documentation is updated
- [ ] Commits follow conventional commits
- [ ] Branch is up to date with `develop`

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing

How was this tested?

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Follows code style guidelines
```

### Review Process

1. Automated checks must pass (CI, linting, tests)
2. At least one approval from maintainers
3. All review comments addressed
4. Branch up to date with target branch

### After Approval

- Maintainers will merge your PR
- Delete your feature branch after merge
- Celebrate your contribution! 🎉

## Community

### Getting Help

- **Discord**: Join our community (coming soon)
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Report bugs or suggest features

### Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project website (when available)

### Indian Developer Community

We're building a strong community of Indian open-source contributors. Join us to:

- Learn from experienced developers
- Contribute to a growing project
- Build your portfolio
- Connect with other Indian developers

---

## Questions?

Feel free to ask questions in:

- GitHub Discussions
- Issue comments
- Pull request comments

**Happy Contributing! 🚀**

_Made with ❤️ in India_
