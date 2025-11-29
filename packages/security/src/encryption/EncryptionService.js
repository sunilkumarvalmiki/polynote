/**
 * Encryption Service
 * Handles file and content encryption using ChaCha20-Poly1305
 */
import { promises as fs } from 'fs';
import { SodiumPlus, CryptographyKey } from 'sodium-plus';
import { KeyPurpose, SecurityError, SecurityErrorCode, } from '../types/index.js';
import { ensureBuffer } from '../utils/buffer.js';
export class EncryptionService {
    kms;
    sodium = null;
    keyCache = new Map();
    constructor(kms) {
        this.kms = kms;
    }
    /**
     * Initialize sodium-plus
     */
    async ensureSodium() {
        if (!this.sodium) {
            this.sodium = await SodiumPlus.auto();
        }
        return this.sodium;
    }
    /**
     * Get or derive encryption key
     */
    async getKey(keyId, purpose) {
        if (!this.kms.isInitialized()) {
            throw new SecurityError('Key management service not initialized', SecurityErrorCode.NOT_INITIALIZED);
        }
        // Check cache first
        const cacheKey = `${purpose}:${keyId}`;
        if (this.keyCache.has(cacheKey)) {
            return this.keyCache.get(cacheKey);
        }
        // Derive new key
        const key = await this.kms.deriveKey(purpose, keyId);
        const normalizedKey = ensureBuffer(key);
        this.keyCache.set(cacheKey, normalizedKey);
        return normalizedKey;
    }
    /**
     * Encrypt data with ChaCha20-Poly1305
     */
    async encrypt(data, keyId) {
        try {
            const sodium = await this.ensureSodium();
            const key = await this.getKey(keyId, KeyPurpose.NOTE_ENCRYPTION);
            // Generate random nonce
            const nonce = await sodium.randombytes_buf(24); // XChaCha20 uses 24-byte nonce
            // Encrypt using XChaCha20-Poly1305
            const ciphertext = await sodium.crypto_secretbox(data, nonce, new CryptographyKey(ensureBuffer(key)));
            const metadata = {
                algorithm: 'chacha20-poly1305',
                nonce,
                keyId,
                timestamp: Date.now(),
            };
            return {
                ciphertext,
                metadata,
            };
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError('Encryption failed', SecurityErrorCode.ENCRYPTION_FAILED, error);
        }
    }
    /**
     * Decrypt data with ChaCha20-Poly1305
     */
    async decrypt(encrypted, keyId) {
        try {
            const sodium = await this.ensureSodium();
            const key = await this.getKey(keyId, KeyPurpose.NOTE_ENCRYPTION);
            // Verify key ID matches
            if (encrypted.metadata.keyId !== keyId) {
                throw new Error('Key ID mismatch');
            }
            // Decrypt using XChaCha20-Poly1305
            const plaintext = await sodium.crypto_secretbox_open(encrypted.ciphertext, encrypted.metadata.nonce, new CryptographyKey(ensureBuffer(key)));
            return plaintext;
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError('Decryption failed - invalid key or corrupted data', SecurityErrorCode.DECRYPTION_FAILED, error);
        }
    }
    /**
     * Encrypt file in place
     */
    async encryptFile(filePath, keyId) {
        try {
            // Read file
            const data = await fs.readFile(filePath);
            // Encrypt
            const encrypted = await this.encrypt(data, keyId);
            // Serialize encrypted data: metadata JSON + ciphertext
            const metadataJson = JSON.stringify({
                algorithm: encrypted.metadata.algorithm,
                nonce: encrypted.metadata.nonce.toString('base64'),
                keyId: encrypted.metadata.keyId,
                timestamp: encrypted.metadata.timestamp,
            });
            const metadataBuffer = Buffer.from(metadataJson, 'utf-8');
            const metadataLength = Buffer.alloc(4);
            metadataLength.writeUInt32BE(metadataBuffer.length, 0);
            const output = Buffer.concat([metadataLength, metadataBuffer, encrypted.ciphertext]);
            // Write back to file with .encrypted extension
            await fs.writeFile(`${filePath}.encrypted`, output);
            // Securely delete original file
            await fs.unlink(filePath);
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(`Failed to encrypt file: ${filePath}`, SecurityErrorCode.ENCRYPTION_FAILED, error);
        }
    }
    /**
     * Decrypt file in place
     */
    async decryptFile(filePath, keyId) {
        try {
            // Read encrypted file
            const data = await fs.readFile(filePath);
            // Parse metadata
            const metadataLength = data.readUInt32BE(0);
            const metadataBuffer = data.subarray(4, 4 + metadataLength);
            const metadataJson = JSON.parse(metadataBuffer.toString('utf-8'));
            const metadata = {
                algorithm: metadataJson.algorithm,
                nonce: Buffer.from(metadataJson.nonce, 'base64'),
                keyId: metadataJson.keyId,
                timestamp: metadataJson.timestamp,
            };
            const ciphertext = data.subarray(4 + metadataLength);
            // Decrypt
            const plaintext = await this.decrypt({ ciphertext, metadata }, keyId);
            // Remove .encrypted extension
            const outputPath = filePath.replace(/\.encrypted$/, '');
            // Write decrypted file
            await fs.writeFile(outputPath, plaintext);
            // Delete encrypted file
            await fs.unlink(filePath);
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(`Failed to decrypt file: ${filePath}`, SecurityErrorCode.DECRYPTION_FAILED, error);
        }
    }
    /**
     * Encrypt note content
     */
    async encryptNote(noteId, content) {
        try {
            const contentBuffer = Buffer.from(content, 'utf-8');
            return await this.encrypt(contentBuffer, noteId);
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(`Failed to encrypt note: ${noteId}`, SecurityErrorCode.ENCRYPTION_FAILED, error);
        }
    }
    /**
     * Decrypt note content
     */
    async decryptNote(noteId, encrypted) {
        try {
            const plaintext = await this.decrypt(encrypted, noteId);
            return plaintext.toString('utf-8');
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(`Failed to decrypt note: ${noteId}`, SecurityErrorCode.DECRYPTION_FAILED, error);
        }
    }
    /**
     * Encrypt attachment
     */
    async encryptAttachment(attachmentId, data) {
        try {
            // Use attachment-specific key purpose
            const sodium = await this.ensureSodium();
            const key = await this.getKey(attachmentId, KeyPurpose.ATTACHMENT_ENCRYPTION);
            const nonce = await sodium.randombytes_buf(24);
            const ciphertext = await sodium.crypto_secretbox(data, nonce, new CryptographyKey(key));
            const metadata = {
                algorithm: 'chacha20-poly1305',
                nonce,
                keyId: attachmentId,
                timestamp: Date.now(),
            };
            return { ciphertext, metadata };
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(`Failed to encrypt attachment: ${attachmentId}`, SecurityErrorCode.ENCRYPTION_FAILED, error);
        }
    }
    /**
     * Decrypt attachment
     */
    async decryptAttachment(attachmentId, encrypted) {
        try {
            const sodium = await this.ensureSodium();
            const key = await this.getKey(attachmentId, KeyPurpose.ATTACHMENT_ENCRYPTION);
            if (encrypted.metadata.keyId !== attachmentId) {
                throw new Error('Attachment ID mismatch');
            }
            const plaintext = await sodium.crypto_secretbox_open(encrypted.ciphertext, encrypted.metadata.nonce, new CryptographyKey(key));
            return plaintext;
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(`Failed to decrypt attachment: ${attachmentId}`, SecurityErrorCode.DECRYPTION_FAILED, error);
        }
    }
    /**
     * Clear key cache
     */
    clearCache() {
        this.keyCache.clear();
    }
}
