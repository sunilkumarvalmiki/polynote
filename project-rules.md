# project-rules.md
Team conventions for maintainers and contributors.

- **Branching**: `main` (release), `develop`, feature branches `feat/*`, fix `fix/*`.
- **Commits**: Conventional Commits, signed commits.
- **CI**: Podman in CI; build and test in containers. No Dockerfiles; use `Containerfile` with `FROM quay.io/*` bases.
- **Security**: All connector secrets via env or OS keychain. No secrets in repo. Run `gitleaks` in CI.
- **Testing**: Unit tests for mappers; contract tests per connector using recorded fixtures; E2E smoke on every PR.
- **Docs**: Keep `CONNECTORS.md`, `AI.md`, and `SECURITY.md` up to date; changelog via `standard-version`.
