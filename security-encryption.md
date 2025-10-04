
# Task: Security & Encryption

## Goal
Local at‑rest encryption, shareable encrypted bundles, and key management.

## Sub‑tasks
- Master key derivation; OS keychain integration.
- File encryption for exported bundles.
- Access control per note/tag.

## Micro‑tasks
- `encryptFile(in, out, recipients[])` using libsodium/OpenPGP.js.
- Permissions check middleware.
