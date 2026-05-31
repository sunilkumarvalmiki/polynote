# PolyNote

A privacy-first universal note synchronization and AI-powered knowledge-management platform for
local-first workflows.

## Overview

Active TypeScript monorepo on the `develop` branch. It includes apps, shared packages,
infrastructure, scripts, tests, implementation summaries, changelog, and contribution/community
documents.

## What This Repository Contains

- Application packages under `apps/`.
- Shared libraries under `packages/`.
- Infrastructure assets under `infra/`.
- Build, test, lint, type-check, format, and workspace scripts.
- Documentation, changelog, code of conduct, and contribution materials.

## Who This Is For

- Knowledge-management app builders
- Local-first developers
- TypeScript monorepo maintainers
- Note-sync platform contributors

## Repository Structure

| Path | Purpose |
|------|---------|
| `apps/` | Application entrypoints. |
| `packages/` | Shared TypeScript packages. |
| `infra/` | Infrastructure assets. |
| `docs/` | Project documentation. |
| `scripts/` | Build and maintenance scripts. |
| `package.json` | Root workspace scripts and requirements. |

## Getting Started

- Install Node.js 22 or newer and pnpm 9 or newer.
- Run `npm install` or the package manager workflow expected by the workspace.
- Run `npm run build`, `npm run test`, `npm run lint`, and `npm run type-check` for broad checks.

## Common Workflows

- Keep app-specific code inside `apps/` and reusable logic inside `packages/`.
- Use `npm run format:check` before publishing documentation or code changes.

## Quality, Security, And Maintenance Notes

- Do not commit private notes, credentials, sync tokens, or local vault contents unless they are synthetic fixtures.
- Keep local-first and privacy claims backed by implementation and tests.

## Current Documentation State

This README was rewritten to make the repository purpose, structure, setup path, and safety
expectations clear to a new reader. If implementation details change, update this file in the same
change so the GitHub landing page stays accurate.

Last documentation refresh: 2026-05-31.
