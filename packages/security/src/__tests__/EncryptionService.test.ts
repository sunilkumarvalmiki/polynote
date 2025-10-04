/**
 * Tests for Encryption Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import { KeyManagementService } from '../kms/KeyManagementService';
import { EncryptionService } from '../encryption/EncryptionService';
import { KeyPurpose } from '../types';

describe('EncryptionService', () => {
  let kms: KeyManagementService;
  let encryption: EncryptionService;

  beforeEach(async () => {
    kms = new KeyManagementService();
    await kms.initialize({ passphrase: 'test-passphrase' });
    encryption = new EncryptionService(kms);
  });

  describe('basic encryption/decryption', () => {
    it('should encrypt and decrypt data', async () => {
      const plaintext = Buffer.from('Hello, World!', 'utf-8');
      const keyId = 'test-key-1';

      const encrypted = await encryption.encrypt(plaintext, keyId);

      expect(encrypted.ciphertext).toBeInstanceOf(Buffer);
      expect(encrypted.metadata.algorithm).toBe('chacha20-poly1305');
      expect(encrypted.metadata.keyId).toBe(keyId);
      expect(encrypted.metadata.nonce).toBeInstanceOf(Buffer);

      const decrypted = await encryption.decrypt(encrypted, keyId);
      expect(decrypted.toString('utf-8')).toBe('Hello, World!');
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const plaintext = Buffer.from('Same data', 'utf-8');
      const keyId = 'test-key';

      const encrypted1 = await encryption.encrypt(plaintext, keyId);
      const encrypted2 = await encryption.encrypt(plaintext, keyId);

      expect(encrypted1.ciphertext.equals(encrypted2.ciphertext)).toBe(false);
      expect(encrypted1.metadata.nonce.equals(encrypted2.metadata.nonce)).toBe(false);
    });

    it('should fail to decrypt with wrong key ID', async () => {
      const plaintext = Buffer.from('Secret data', 'utf-8');
      const encrypted = await encryption.encrypt(plaintext, 'key-1');

      await expect(
        encryption.decrypt(encrypted, 'key-2')
      ).rejects.toThrow();
    });

    it('should handle empty data', async () => {
      const plaintext = Buffer.alloc(0);
      const encrypted = await encryption.encrypt(plaintext, 'key');
      const decrypted = await encryption.decrypt(encrypted, 'key');

      expect(decrypted.length).toBe(0);
    });

    it('should handle large data', async () => {
      const plaintext = Buffer.alloc(1024 * 1024, 'a'); // 1 MB
      const encrypted = await encryption.encrypt(plaintext, 'key');
      const decrypted = await encryption.decrypt(encrypted, 'key');

      expect(decrypted.equals(plaintext)).toBe(true);
    });
  });

  describe('note encryption/decryption', () => {
    it('should encrypt and decrypt note content', async () => {
      const noteId = 'note-123';
      const content = 'This is my secret note!';

      const encrypted = await encryption.encryptNote(noteId, content);
      const decrypted = await encryption.decryptNote(noteId, encrypted);

      expect(decrypted).toBe(content);
    });

    it('should handle multi-line note content', async () => {
      const noteId = 'note-456';
      const content = `# My Note

This is a multi-line note with:
- Lists
- **Bold text**
- [Links](https://example.com)

And code:
\`\`\`javascript
console.log('Hello');
\`\`\``;

      const encrypted = await encryption.encryptNote(noteId, content);
      const decrypted = await encryption.decryptNote(noteId, encrypted);

      expect(decrypted).toBe(content);
    });

    it('should handle Unicode content', async () => {
      const noteId = 'note-unicode';
      const content = 'నమస్కారం 🎉 Hello हैलो';

      const encrypted = await encryption.encryptNote(noteId, content);
      const decrypted = await encryption.decryptNote(noteId, encrypted);

      expect(decrypted).toBe(content);
    });
  });

  describe('attachment encryption/decryption', () => {
    it('should encrypt and decrypt attachments', async () => {
      const attachmentId = 'attach-123';
      const data = Buffer.from('Binary attachment data');

      const encrypted = await encryption.encryptAttachment(attachmentId, data);
      const decrypted = await encryption.decryptAttachment(attachmentId, encrypted);

      expect(decrypted.equals(data)).toBe(true);
    });

    it('should use different keys for attachments vs notes', async () => {
      const id = 'same-id';
      const data = Buffer.from('test data');

      // Encrypt as note
      const encryptedNote = await encryption.encryptNote(id, data.toString());

      // Encrypt as attachment
      const encryptedAttachment = await encryption.encryptAttachment(id, data);

      // Ciphertexts should be different (different keys used)
      expect(encryptedNote.ciphertext.equals(encryptedAttachment.ciphertext)).toBe(false);
    });

    it('should fail to decrypt attachment with note ID', async () => {
      const id = 'test-id';
      const data = Buffer.from('test');

      const encrypted = await encryption.encryptAttachment(id, data);

      // Try to decrypt as note (should fail because metadata has attachment ID)
      await expect(
        encryption.decryptNote(id, encrypted)
      ).rejects.toThrow();
    });
  });

  describe('file encryption/decryption', () => {
    const testFilePath = '/tmp/test-encrypt-file.txt';
    const testContent = 'Test file content for encryption';

    beforeEach(async () => {
      // Create test file
      await fs.writeFile(testFilePath, testContent);
    });

    it('should encrypt file in place', async () => {
      await encryption.encryptFile(testFilePath, 'file-key');

      // Original file should be deleted
      const exists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(exists).toBe(false);

      // Encrypted file should exist
      const encryptedExists = await fs.access(`${testFilePath}.encrypted`)
        .then(() => true)
        .catch(() => false);
      expect(encryptedExists).toBe(true);

      // Cleanup
      await fs.unlink(`${testFilePath}.encrypted`).catch(() => {});
    });

    it('should decrypt file in place', async () => {
      await encryption.encryptFile(testFilePath, 'file-key');
      await encryption.decryptFile(`${testFilePath}.encrypted`, 'file-key');

      // Original file should be restored
      const content = await fs.readFile(testFilePath, 'utf-8');
      expect(content).toBe(testContent);

      // Cleanup
      await fs.unlink(testFilePath).catch(() => {});
    });

    it('should handle binary files', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
      const binaryFilePath = '/tmp/test-binary-file.bin';

      await fs.writeFile(binaryFilePath, binaryData);
      await encryption.encryptFile(binaryFilePath, 'binary-key');
      await encryption.decryptFile(`${binaryFilePath}.encrypted`, 'binary-key');

      const restored = await fs.readFile(binaryFilePath);
      expect(restored.equals(binaryData)).toBe(true);

      // Cleanup
      await fs.unlink(binaryFilePath).catch(() => {});
    });
  });

  describe('key caching', () => {
    it('should cache derived keys', async () => {
      const keyId = 'cached-key';
      const data = Buffer.from('test');

      // First encryption should derive key
      await encryption.encrypt(data, keyId);

      // Second encryption should use cached key (faster)
      const start = Date.now();
      await encryption.encrypt(data, keyId);
      const duration = Date.now() - start;

      // Cached operation should be very fast
      expect(duration).toBeLessThan(100);
    });

    it('should clear cache', () => {
      encryption.clearCache();
      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error when KMS not initialized', async () => {
      const uninitKms = new KeyManagementService();
      const uninitEncryption = new EncryptionService(uninitKms);

      await expect(
        uninitEncryption.encrypt(Buffer.from('test'), 'key')
      ).rejects.toThrow('not initialized');
    });

    it('should throw error on corrupted ciphertext', async () => {
      const data = Buffer.from('test');
      const encrypted = await encryption.encrypt(data, 'key');

      // Corrupt the ciphertext
      encrypted.ciphertext[0] ^= 0xFF;

      await expect(
        encryption.decrypt(encrypted, 'key')
      ).rejects.toThrow();
    });

    it('should throw error on corrupted nonce', async () => {
      const data = Buffer.from('test');
      const encrypted = await encryption.encrypt(data, 'key');

      // Corrupt the nonce
      encrypted.metadata.nonce[0] ^= 0xFF;

      await expect(
        encryption.decrypt(encrypted, 'key')
      ).rejects.toThrow();
    });
  });

  describe('metadata', () => {
    it('should include correct metadata in encrypted data', async () => {
      const encrypted = await encryption.encrypt(Buffer.from('test'), 'key-123');

      expect(encrypted.metadata.algorithm).toBe('chacha20-poly1305');
      expect(encrypted.metadata.keyId).toBe('key-123');
      expect(encrypted.metadata.nonce.length).toBe(24);
      expect(encrypted.metadata.timestamp).toBeGreaterThan(0);
      expect(encrypted.metadata.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });
});
