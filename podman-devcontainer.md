
# Task: Podman Dev & CI Containers

## Goal
Standardize local dev and CI builds with Podman.

## Sub‑tasks
- `Containerfile` for server and builder images.
- `podman machine init {os.getenv('PODMAN_MACHINE','polynote-dev')}`; set resources.
- Volumes for cache and node_modules.

## Micro‑tasks
- `make dev-up`: `podman compose up`.
- Rootless containers; user namespace mappings.
