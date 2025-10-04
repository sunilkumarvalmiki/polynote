
# Task: Testing & CI

## Goal
Automated tests (unit/contract/E2E) and CI with GitHub Actions + Podman.

## Sub‑tasks
- Jest/Pytest unit tests.
- Contract tests for connectors with recorded fixtures.
- E2E smoke with seeded vault and mock Notion/Joplin.
- Coverage gate ≥80%.

## Micro‑tasks
- `podman run --rm -v $PWD:/repo -w /repo node:22-alpine npm test`.
- GH Actions workflow with matrix (linux, macos-12 virtual) invoking Podman where supported.
