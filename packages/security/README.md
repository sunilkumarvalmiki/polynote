# @polynote/security

Security and encryption module for PolyNote, providing key management, file encryption, access control, and secure sharing capabilities.

## Features

- **Key Management**: Master key derivation using Argon2id, key rotation, recovery phrases
- **Encryption**: ChaCha20-Poly1305 authenticated encryption for notes and attachments
- **Access Control**: Rule-based permission system for notes, folders, and tags
- **Share Bundles**: Password-protected encrypted bundles for sharing notes

## Installation

```bash
pnpm add @polynote/security
```

## Usage

### Initialize Security Service

```typescript
import { SecurityService } from '@polynote/security';

// Create and initialize
const security = await SecurityService.create('your-master-passphrase');

// Access individual services
const { kms, encryption, access, share } = security;
```

### Key Management

```typescript
// Initialize with passphrase
await kms.initialize({ passphrase: 'your-passphrase' });

// Generate recovery phrase
const recoveryPhrase = await kms.generateRecoveryPhrase();
console.log('Save this recovery phrase:', recoveryPhrase);

// Recover from phrase
await kms.recoverFromPhrase(recoveryPhrase);

// Export encrypted master key
const exportedKey = await kms.exportMasterKey('backup-password');

// Rotate master key
await kms.rotateMasterKey({ passphrase: 'new-passphrase' });
```

### Encryption

```typescript
// Encrypt note content
const encrypted = await encryption.encryptNote('note-123', 'Secret content');

// Decrypt note content
const content = await encryption.decryptNote('note-123', encrypted);

// Encrypt file
await encryption.encryptFile('/path/to/file.txt', 'key-id');

// Decrypt file
await encryption.decryptFile('/path/to/file.txt.encrypted', 'key-id');

// Encrypt attachment
const encryptedAttachment = await encryption.encryptAttachment(
  'attachment-456',
  fileBuffer
);

// Decrypt attachment
const fileData = await encryption.decryptAttachment(
  'attachment-456',
  encryptedAttachment
);
```

### Access Control

```typescript
import { PermissionLevel } from '@polynote/security';

// Add access rule
await access.addRule({
  resourceType: 'note',
  resourceId: 'note-123',
  permission: PermissionLevel.READ,
  priority: 100,
});

// Check permission
const canRead = await access.isAllowed('note', 'note-123', 'read');
const canWrite = await access.isAllowed('note', 'note-123', 'write');

// Get all rules for a resource
const rules = await access.getRules('note', 'note-123');

// Update rule
await access.updateRule('rule-id', { permission: PermissionLevel.WRITE });

// Remove rule
await access.removeRule('rule-id');
```

### Share Bundles

```typescript
// Create encrypted share bundle
const bundle = await share.createBundle({
  noteIds: ['note-1', 'note-2', 'note-3'],
  password: 'share-password',
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  includeAttachments: true,
});

// Save bundle to file
await fs.writeFile('share.polynote', bundle);

// Extract bundle
const { notes, attachments, metadata } = await share.extractBundle(
  bundle,
  'share-password'
);

// Verify bundle integrity
const isValid = await share.verifyBundle(bundle);

// Get metadata without password (limited with OpenPGP)
const metadata = await share.getBundleMetadata(bundle);
```

## Security Best Practices

1. **Passphrase Strength**: Use strong passphrases (≥16 characters, mixed case, numbers, symbols)
2. **Key Storage**: Never store master passphrases in code or config files
3. **Recovery Phrases**: Store recovery phrases securely offline
4. **Key Rotation**: Rotate master keys periodically (every 90 days recommended)
5. **Access Control**: Apply least-privilege principle for all resources
6. **Share Bundles**: Set expiration times on all shared bundles
7. **Memory Safety**: Call `security.shutdown()` when done to clear sensitive data

## Architecture

### Key Derivation

```
Master Passphrase
       ↓ (Argon2id)
  Master Key (32 bytes)
       ↓ (HKDF/BLAKE2b)
  ├─ Note Encryption Keys
  ├─ Attachment Encryption Keys
  ├─ Share Bundle Keys
  ├─ Database Encryption Keys
  └─ Credential Encryption Keys
```

### Encryption Scheme

- **Algorithm**: XChaCha20-Poly1305
- **Key Size**: 256 bits
- **Nonce Size**: 192 bits (24 bytes)
- **Authentication**: Poly1305 MAC

### Access Control Model

- **Resources**: Notes, Folders, Tags
- **Permissions**: NONE, READ, WRITE, ADMIN
- **Rules**: Priority-based with wildcard support
- **Default**: Allow (configurable to deny)

## API Reference

See [SECURITY.md](../../docs/SECURITY.md) for complete API documentation.

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## License

MIT
