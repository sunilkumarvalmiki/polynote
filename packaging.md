
# Task: Cross‑platform Packaging

## Goal
Generate installers: macOS (DMG/PKG), Windows (EXE/NSIS), Linux (AppImage/DEB/RPM).

## Sub‑tasks
- electron‑builder config per OS.
- Code signing hooks (optional).
- Auto‑update channel (file server).

## Micro‑tasks
- `podman run --rm -v $PWD:/project -w /project ghcr.io/electron-userland/electron-builder:latest --linux AppImage`.
- GitHub Actions matrix build using Podman.
