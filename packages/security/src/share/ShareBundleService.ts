/**
 * Share Bundle Service
 * Creates encrypted, shareable bundles of notes using password-based encryption
 */

import { createHash } from 'node:crypto';

import * as openpgp from 'openpgp';
import { SodiumPlus, CryptographyKey } from 'sodium-plus';

import {
  IShareBundleService,
  ShareBundleConfig,
  ShareBundleMetadata,
  SecurityError,
  SecurityErrorCode,
} from '../types';
import { ensureBuffer } from '../utils/buffer';

interface BundleNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

interface BundleAttachment {
  id: string;
  noteId: string;
  data: Buffer;
  filename: string;
}

interface BundleData {
  metadata: ShareBundleMetadata;
  notes: BundleNote[];
  attachments?: BundleAttachment[];
}

export class ShareBundleService implements IShareBundleService {
  private sodium: SodiumPlus | null = null;

  private async ensureSodium(): Promise<SodiumPlus> {
    if (!this.sodium) {
      this.sodium = await SodiumPlus.auto();
    }
    return this.sodium;
  }

  /**
   * Create encrypted share bundle
   */
  async createBundle(config: ShareBundleConfig): Promise<Buffer> {
    try {
      await this.ensureSodium();

      // Prepare metadata
      const metadata: ShareBundleMetadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        expiresAt: config.expiresAt,
        noteCount: config.noteIds.length,
        hasAttachments: config.includeAttachments || false,
        algorithm: 'openpgp-aes256',
      };

      // TODO: In production, fetch actual note data from database
      // For now, create placeholder data
      const notes: BundleNote[] = config.noteIds.map(id => ({
        id,
        title: `Note ${id}`,
        content: `Content for note ${id}`,
        tags: [],
      }));

      const attachments: BundleAttachment[] | undefined = config.includeAttachments
        ? []
        : undefined;

      const bundleData: BundleData = {
        metadata,
        notes,
        attachments,
      };

      // Serialize to JSON
      const jsonData = JSON.stringify(bundleData);

      // Encrypt using OpenPGP (symmetric encryption with password)
      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: jsonData }),
        passwords: [config.password],
        format: 'binary',
      });

      // Convert to Buffer and append integrity checksum
      const encryptedBuffer = Buffer.from(encrypted as Uint8Array);
      const checksum = createHash('sha256').update(encryptedBuffer).digest();

      return Buffer.concat([encryptedBuffer, checksum]);
    } catch (error) {
      throw new SecurityError(
        'Failed to create share bundle',
        SecurityErrorCode.ENCRYPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Extract share bundle
   */
  async extractBundle(
    bundle: Buffer,
    password: string
  ): Promise<{
    notes: BundleNote[];
    attachments?: BundleAttachment[];
    metadata: ShareBundleMetadata;
  }> {
    try {
      await this.ensureSodium();

      if (bundle.length <= 32) {
        throw new SecurityError('Share bundle is corrupted', SecurityErrorCode.INVALID_BUNDLE);
      }

      const payload = bundle.subarray(0, bundle.length - 32);
      const checksum = bundle.subarray(bundle.length - 32);
      const expectedChecksum = createHash('sha256').update(payload).digest();

      if (!checksum.equals(expectedChecksum)) {
        throw new SecurityError('Share bundle checksum mismatch', SecurityErrorCode.INVALID_BUNDLE);
      }

      // Decrypt using OpenPGP
      const message = await openpgp.readMessage({
        binaryMessage: new Uint8Array(payload),
      });

      const decrypted = await openpgp.decrypt({
        message,
        passwords: [password],
        format: 'utf8',
      });

      // Parse JSON
      const bundleData: BundleData = JSON.parse(decrypted.data as string);

      // Verify expiration
      if (bundleData.metadata.expiresAt && bundleData.metadata.expiresAt < Date.now()) {
        throw new SecurityError('Share bundle has expired', SecurityErrorCode.BUNDLE_EXPIRED);
      }

      return {
        notes: bundleData.notes,
        attachments: bundleData.attachments,
        metadata: bundleData.metadata,
      };
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }

      throw new SecurityError(
        'Failed to extract share bundle - invalid password or corrupted data',
        SecurityErrorCode.DECRYPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Verify bundle integrity (without decrypting)
   */
  async verifyBundle(bundle: Buffer): Promise<boolean> {
    try {
      if (bundle.length <= 32) {
        return false;
      }

      const payload = bundle.subarray(0, bundle.length - 32);
      const checksum = bundle.subarray(bundle.length - 32);
      const expectedChecksum = createHash('sha256').update(payload).digest();

      if (!checksum.equals(expectedChecksum)) {
        return false;
      }

      // Try to read the message structure to ensure it's a valid OpenPGP payload
      await openpgp.readMessage({
        binaryMessage: new Uint8Array(payload),
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get bundle metadata without decrypting
   * Note: This is limited because OpenPGP encrypts everything
   * We can only verify structure, not read metadata
   */
  async getBundleMetadata(bundle: Buffer): Promise<ShareBundleMetadata> {
    try {
      // For OpenPGP, we can't read metadata without password
      // Return minimal metadata
      const isValid = await this.verifyBundle(bundle);

      if (!isValid) {
        throw new Error('Invalid bundle format');
      }

      return {
        version: 'unknown',
        createdAt: 0,
        noteCount: 0,
        hasAttachments: false,
        algorithm: 'openpgp-aes256',
      };
    } catch (error) {
      throw new SecurityError(
        'Failed to read bundle metadata',
        SecurityErrorCode.INVALID_BUNDLE,
        error as Error
      );
    }
  }

  /**
   * Create bundle with libsodium (alternative to OpenPGP)
   * Allows reading metadata without password
   */
  async createBundleWithSodium(config: ShareBundleConfig): Promise<Buffer> {
    try {
      const sodium = await this.ensureSodium();

      // Prepare metadata
      const metadata: ShareBundleMetadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        expiresAt: config.expiresAt,
        noteCount: config.noteIds.length,
        hasAttachments: config.includeAttachments || false,
        algorithm: 'chacha20-poly1305',
      };

      // Create bundle data (same as OpenPGP version)
      const notes: BundleNote[] = config.noteIds.map(id => ({
        id,
        title: `Note ${id}`,
        content: `Content for note ${id}`,
        tags: [],
      }));

      const bundleData: BundleData = {
        metadata,
        notes,
        attachments: config.includeAttachments ? [] : undefined,
      };

      // Serialize
      const jsonData = JSON.stringify(bundleData);
      const dataBuffer = Buffer.from(jsonData, 'utf-8');

      // Derive key from password
      const salt = ensureBuffer(await sodium.randombytes_buf(16)); // Argon2 requires 16 bytes
      const key = ensureBuffer(
        await sodium.crypto_pwhash(
          32,
          config.password,
          salt,
          2, // opsLimit (minimum)
          64 * 1024 * 1024, // memLimit (64 MB)
          sodium.CRYPTO_PWHASH_ALG_ARGON2ID13
        )
      );

      // Encrypt
      const nonce = ensureBuffer(await sodium.randombytes_buf(24));
      const ciphertext = await sodium.crypto_secretbox(
        dataBuffer,
        nonce,
        new CryptographyKey(ensureBuffer(key))
      );

      // Serialize metadata separately (unencrypted for quick access)
      const metadataJson = JSON.stringify(metadata);
      const metadataBuffer = Buffer.from(metadataJson, 'utf-8');
      const metadataLength = Buffer.alloc(4);
      metadataLength.writeUInt32BE(metadataBuffer.length, 0);

      // Bundle format: [metadata_length][metadata][salt][nonce][ciphertext]
      return Buffer.concat([metadataLength, metadataBuffer, salt, nonce, ciphertext]);
    } catch (error) {
      throw new SecurityError(
        'Failed to create bundle with libsodium',
        SecurityErrorCode.ENCRYPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Extract bundle created with libsodium
   */
  async extractBundleWithSodium(
    bundle: Buffer,
    password: string
  ): Promise<{
    notes: BundleNote[];
    attachments?: BundleAttachment[];
    metadata: ShareBundleMetadata;
  }> {
    try {
      const sodium = await this.ensureSodium();

      // Parse bundle format
      const metadataLength = bundle.readUInt32BE(0);
      let offset = 4;

      const metadataBuffer = bundle.subarray(offset, offset + metadataLength);
      offset += metadataLength;

      const metadata: ShareBundleMetadata = JSON.parse(metadataBuffer.toString('utf-8'));

      const salt = bundle.subarray(offset, offset + 16); // Argon2 requires 16 bytes
      offset += 16;

      const nonce = bundle.subarray(offset, offset + 24);
      offset += 24;

      const ciphertext = bundle.subarray(offset);

      // Verify expiration
      if (metadata.expiresAt && metadata.expiresAt < Date.now()) {
        throw new SecurityError('Share bundle has expired', SecurityErrorCode.BUNDLE_EXPIRED);
      }

      // Derive key from password
      const key = ensureBuffer(
        await sodium.crypto_pwhash(
          32,
          password,
          salt,
          2,
          64 * 1024 * 1024,
          sodium.CRYPTO_PWHASH_ALG_ARGON2ID13
        )
      );

      // Decrypt
      const plaintext = await sodium.crypto_secretbox_open(
        ciphertext,
        nonce,
        new CryptographyKey(ensureBuffer(key))
      );

      // Parse data
      const bundleData: BundleData = JSON.parse(plaintext.toString('utf-8'));

      return {
        notes: bundleData.notes,
        attachments: bundleData.attachments,
        metadata: bundleData.metadata,
      };
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }

      throw new SecurityError(
        'Failed to extract bundle - invalid password or corrupted data',
        SecurityErrorCode.DECRYPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Get metadata from libsodium bundle (without password)
   */
  async getSodiumBundleMetadata(bundle: Buffer): Promise<ShareBundleMetadata> {
    try {
      // Read unencrypted metadata
      const metadataLength = bundle.readUInt32BE(0);
      const metadataBuffer = bundle.subarray(4, 4 + metadataLength);
      const metadata: ShareBundleMetadata = JSON.parse(metadataBuffer.toString('utf-8'));

      return metadata;
    } catch (error) {
      throw new SecurityError(
        'Failed to read bundle metadata',
        SecurityErrorCode.INVALID_BUNDLE,
        error as Error
      );
    }
  }
}
