/**
 * Tests for Share Bundle Service
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { ShareBundleService } from '../share/ShareBundleService';

describe('ShareBundleService', () => {
  let share: ShareBundleService;

  beforeEach(() => {
    share = new ShareBundleService();
  });

  describe('bundle creation and extraction (OpenPGP)', () => {
    it('should create encrypted bundle', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1', 'note-2'],
        password: 'test-password',
      });

      expect(bundle).toBeInstanceOf(Buffer);
      expect(bundle.length).toBeGreaterThan(0);
    });

    it('should extract bundle with correct password', async () => {
      const config = {
        noteIds: ['note-1', 'note-2', 'note-3'],
        password: 'test-password',
      };

      const bundle = await share.createBundle(config);
      const extracted = await share.extractBundle(bundle, 'test-password');

      expect(extracted.notes.length).toBe(3);
      expect(extracted.metadata.noteCount).toBe(3);
      expect(extracted.metadata.hasAttachments).toBe(false);
    });

    it('should fail to extract with wrong password', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: 'correct-password',
      });

      await expect(share.extractBundle(bundle, 'wrong-password')).rejects.toThrow();
    });

    it('should include attachments when requested', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: 'test-password',
        includeAttachments: true,
      });

      const extracted = await share.extractBundle(bundle, 'test-password');
      expect(extracted.metadata.hasAttachments).toBe(true);
    });

    it('should enforce expiration time', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: 'test-password',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });

      await expect(share.extractBundle(bundle, 'test-password')).rejects.toThrow('expired');
    });

    it('should allow extraction before expiration', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: 'test-password',
        expiresAt: Date.now() + 60000, // Expires in 1 minute
      });

      const extracted = await share.extractBundle(bundle, 'test-password');
      expect(extracted.notes.length).toBe(1);
    });
  });

  describe('bundle verification', () => {
    it('should verify valid bundle', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: 'test-password',
      });

      const isValid = await share.verifyBundle(bundle);
      expect(isValid).toBe(true);
    });

    it('should reject invalid bundle', async () => {
      const invalidBundle = Buffer.from('not a valid bundle');
      const isValid = await share.verifyBundle(invalidBundle);
      expect(isValid).toBe(false);
    });

    it('should reject corrupted bundle', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: 'test-password',
      });

      // Corrupt the bundle
      bundle[10] ^= 0xff;

      const isValid = await share.verifyBundle(bundle);
      expect(isValid).toBe(false);
    });
  });

  describe('metadata access', () => {
    it('should get bundle metadata', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1', 'note-2'],
        password: 'test-password',
      });

      const metadata = await share.getBundleMetadata(bundle);
      expect(metadata).toBeTruthy();
      expect(metadata.algorithm).toBe('openpgp-aes256');
    });

    it('should throw error for invalid bundle metadata', async () => {
      const invalidBundle = Buffer.from('invalid');
      await expect(share.getBundleMetadata(invalidBundle)).rejects.toThrow();
    });
  });

  describe('libsodium bundle (alternative)', () => {
    it('should create bundle with libsodium', async () => {
      const bundle = await share.createBundleWithSodium({
        noteIds: ['note-1', 'note-2'],
        password: 'test-password',
      });

      expect(bundle).toBeInstanceOf(Buffer);
      expect(bundle.length).toBeGreaterThan(0);
    });

    it('should extract libsodium bundle', async () => {
      const config = {
        noteIds: ['note-1', 'note-2'],
        password: 'test-password',
      };

      const bundle = await share.createBundleWithSodium(config);
      const extracted = await share.extractBundleWithSodium(bundle, 'test-password');

      expect(extracted.notes.length).toBe(2);
      expect(extracted.metadata.algorithm).toBe('chacha20-poly1305');
    });

    it('should fail to extract libsodium bundle with wrong password', async () => {
      const bundle = await share.createBundleWithSodium({
        noteIds: ['note-1'],
        password: 'correct-password',
      });

      await expect(share.extractBundleWithSodium(bundle, 'wrong-password')).rejects.toThrow();
    });

    it('should get metadata without password (libsodium)', async () => {
      const bundle = await share.createBundleWithSodium({
        noteIds: ['note-1', 'note-2', 'note-3'],
        password: 'test-password',
        expiresAt: 9999999999999,
      });

      const metadata = await share.getSodiumBundleMetadata(bundle);

      expect(metadata.noteCount).toBe(3);
      expect(metadata.algorithm).toBe('chacha20-poly1305');
      expect(metadata.expiresAt).toBe(9999999999999);
    });

    it('should enforce expiration in libsodium bundle', async () => {
      const bundle = await share.createBundleWithSodium({
        noteIds: ['note-1'],
        password: 'test-password',
        expiresAt: Date.now() - 1000, // Expired
      });

      await expect(share.extractBundleWithSodium(bundle, 'test-password')).rejects.toThrow(
        'expired'
      );
    });
  });

  describe('note content preservation', () => {
    it('should preserve note structure in OpenPGP bundle', async () => {
      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: 'password',
      });

      const extracted = await share.extractBundle(bundle, 'password');
      const note = extracted.notes[0];

      expect(note).toHaveProperty('id');
      expect(note).toHaveProperty('title');
      expect(note).toHaveProperty('content');
      expect(note).toHaveProperty('tags');
      expect(Array.isArray(note.tags)).toBe(true);
    });

    it('should preserve note structure in libsodium bundle', async () => {
      const bundle = await share.createBundleWithSodium({
        noteIds: ['note-1'],
        password: 'password',
      });

      const extracted = await share.extractBundleWithSodium(bundle, 'password');
      const note = extracted.notes[0];

      expect(note).toHaveProperty('id');
      expect(note).toHaveProperty('title');
      expect(note).toHaveProperty('content');
      expect(note).toHaveProperty('tags');
    });
  });

  describe('edge cases', () => {
    it('should handle empty note list', async () => {
      const bundle = await share.createBundle({
        noteIds: [],
        password: 'password',
      });

      const extracted = await share.extractBundle(bundle, 'password');
      expect(extracted.notes.length).toBe(0);
      expect(extracted.metadata.noteCount).toBe(0);
    });

    it('should handle large bundles', async () => {
      const noteIds = Array.from({ length: 100 }, (_, i) => `note-${i}`);

      const bundle = await share.createBundle({
        noteIds,
        password: 'password',
      });

      const extracted = await share.extractBundle(bundle, 'password');
      expect(extracted.notes.length).toBe(100);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: specialPassword,
      });

      const extracted = await share.extractBundle(bundle, specialPassword);
      expect(extracted.notes.length).toBe(1);
    });

    it('should handle Unicode in password', async () => {
      const unicodePassword = 'పాస్వర్డ్-密码-पासवर्ड';

      const bundle = await share.createBundle({
        noteIds: ['note-1'],
        password: unicodePassword,
      });

      const extracted = await share.extractBundle(bundle, unicodePassword);
      expect(extracted.notes.length).toBe(1);
    });
  });
});
