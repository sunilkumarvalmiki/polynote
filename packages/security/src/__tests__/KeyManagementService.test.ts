/**
 * Tests for Key Management Service
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { KeyManagementService } from '../kms/KeyManagementService';
import { KeyPurpose, SecurityErrorCode } from '../types';

describe('KeyManagementService', () => {
  let kms: KeyManagementService;

  beforeEach(() => {
    kms = new KeyManagementService();
  });

  describe('initialization', () => {
    it('should initialize with passphrase', async () => {
      await kms.initialize({ passphrase: 'test-passphrase-123' });
      expect(kms.isInitialized()).toBe(true);
    });

    it('should not be initialized before calling initialize()', () => {
      expect(kms.isInitialized()).toBe(false);
    });

    it('should accept custom salt', async () => {
      const customSalt = Buffer.alloc(32, 'a');
      await kms.initialize({
        passphrase: 'test-passphrase',
        salt: customSalt,
      });
      expect(kms.isInitialized()).toBe(true);
    });

    it('should accept custom iterations', async () => {
      await kms.initialize({
        passphrase: 'test-passphrase',
        iterations: 5, // Low for testing
      });
      expect(kms.isInitialized()).toBe(true);
    });
  });

  describe('key derivation', () => {
    beforeEach(async () => {
      await kms.initialize({ passphrase: 'test-passphrase' });
    });

    it('should derive key for note encryption', async () => {
      const key = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should derive key for attachment encryption', async () => {
      const key = await kms.deriveKey(KeyPurpose.ATTACHMENT_ENCRYPTION);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should derive different keys for different purposes', async () => {
      const noteKey = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION);
      const attachmentKey = await kms.deriveKey(KeyPurpose.ATTACHMENT_ENCRYPTION);
      expect(noteKey.equals(attachmentKey)).toBe(false);
    });

    it('should derive same key for same purpose and context', async () => {
      const key1 = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION, 'note-123');
      const key2 = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION, 'note-123');
      expect(key1.equals(key2)).toBe(true);
    });

    it('should derive different keys for different contexts', async () => {
      const key1 = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION, 'note-123');
      const key2 = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION, 'note-456');
      expect(key1.equals(key2)).toBe(false);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedKms = new KeyManagementService();
      await expect(
        uninitializedKms.deriveKey(KeyPurpose.NOTE_ENCRYPTION)
      ).rejects.toThrow();
    });
  });

  describe('recovery phrase', () => {
    beforeEach(async () => {
      await kms.initialize({ passphrase: 'test-passphrase' });
    });

    it('should generate recovery phrase', async () => {
      const phrase = await kms.generateRecoveryPhrase();
      expect(phrase).toBeTruthy();
      expect(typeof phrase).toBe('string');

      const words = phrase.split(' ');
      expect(words.length).toBe(12);
    });

    it('should generate different phrases each time', async () => {
      const phrase1 = await kms.generateRecoveryPhrase();
      const phrase2 = await kms.generateRecoveryPhrase();
      expect(phrase1).not.toBe(phrase2);
    });

    it('should recover from valid recovery phrase', async () => {
      const newKms = new KeyManagementService();

      // Use a valid phrase format
      const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

      await newKms.recoverFromPhrase(phrase);
      expect(newKms.isInitialized()).toBe(true);
    });

    it('should throw error for invalid recovery phrase (wrong word count)', async () => {
      const newKms = new KeyManagementService();
      await expect(
        newKms.recoverFromPhrase('only five words here now')
      ).rejects.toThrow('must be 12 words');
    });

    it('should throw error for invalid recovery phrase (invalid word)', async () => {
      const newKms = new KeyManagementService();
      await expect(
        newKms.recoverFromPhrase('invalid word word word word word word word word word word word')
      ).rejects.toThrow();
    });
  });

  describe('export and import', () => {
    beforeEach(async () => {
      await kms.initialize({ passphrase: 'test-passphrase' });
    });

    it('should export master key encrypted with password', async () => {
      const exported = await kms.exportMasterKey('export-password');
      expect(exported).toBeInstanceOf(Buffer);
      expect(exported.length).toBeGreaterThan(0);
    });

    it('should import exported master key with correct password', async () => {
      const exported = await kms.exportMasterKey('export-password');

      const newKms = new KeyManagementService();
      await newKms.importMasterKey(exported, 'export-password');

      expect(newKms.isInitialized()).toBe(true);
    });

    it('should fail to import with wrong password', async () => {
      const exported = await kms.exportMasterKey('correct-password');

      const newKms = new KeyManagementService();
      await expect(
        newKms.importMasterKey(exported, 'wrong-password')
      ).rejects.toThrow();
    });

    it('should derive same keys after export/import', async () => {
      const key1 = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION, 'test');

      const exported = await kms.exportMasterKey('password');

      const newKms = new KeyManagementService();
      await newKms.importMasterKey(exported, 'password');

      const key2 = await newKms.deriveKey(KeyPurpose.NOTE_ENCRYPTION, 'test');

      expect(key1.equals(key2)).toBe(true);
    });
  });

  describe('key rotation', () => {
    beforeEach(async () => {
      await kms.initialize({ passphrase: 'old-passphrase' });
    });

    it('should rotate master key', async () => {
      const oldKey = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION);

      await kms.rotateMasterKey({ passphrase: 'new-passphrase' });

      const newKey = await kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION);
      expect(oldKey.equals(newKey)).toBe(false);
    });

    it('should remain initialized after rotation', async () => {
      await kms.rotateMasterKey({ passphrase: 'new-passphrase' });
      expect(kms.isInitialized()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear keys from memory', async () => {
      await kms.initialize({ passphrase: 'test-passphrase' });
      expect(kms.isInitialized()).toBe(true);

      kms.clear();
      expect(kms.isInitialized()).toBe(false);
    });

    it('should not allow operations after clear', async () => {
      await kms.initialize({ passphrase: 'test-passphrase' });
      kms.clear();

      await expect(
        kms.deriveKey(KeyPurpose.NOTE_ENCRYPTION)
      ).rejects.toThrow();
    });
  });

  describe('salt management', () => {
    it('should return salt after initialization', async () => {
      await kms.initialize({ passphrase: 'test-passphrase' });
      const salt = kms.getSalt();
      expect(salt).toBeInstanceOf(Buffer);
      expect(salt!.length).toBe(32);
    });

    it('should return null before initialization', () => {
      const salt = kms.getSalt();
      expect(salt).toBeNull();
    });
  });
});
