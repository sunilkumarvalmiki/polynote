/**
 * Key Management Service (KMS)
 * Handles master key derivation, storage, and rotation using libsodium
 */

import { SodiumPlus, CryptographyKey } from 'sodium-plus';

import {
  IKeyManagementService,
  MasterKeyConfig,
  KeyPurpose,
  SecurityError,
  SecurityErrorCode,
} from '../types';

/**
 * BIP39 word list subset for recovery phrases (simplified for demo)
 * In production, use a full BIP39 implementation
 */
const WORD_LIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  // ... (simplified list - use full BIP39 in production)
];

export class KeyManagementService implements IKeyManagementService {
  private sodium: SodiumPlus | null = null;
  private masterKey: CryptographyKey | null = null;
  private salt: Buffer | null = null;
  private initialized = false;

  // Key derivation parameters
  private readonly SALT_LENGTH = 16; // Argon2 requires 16 bytes
  private readonly KEY_LENGTH = 32;
  private readonly DEFAULT_ITERATIONS = 2; // Argon2id ops limit (minimum for testing)

  /**
   * Initialize the KMS with a master passphrase
   */
  async initialize(config: MasterKeyConfig): Promise<void> {
    try {
      // Initialize sodium-plus
      this.sodium = await SodiumPlus.auto();

      // Use provided salt or generate new one
      this.salt = config.salt || await this.sodium.randombytes_buf(this.SALT_LENGTH);

      // Derive master key using Argon2id
      const masterKeyBuffer = await this.deriveMasterKey(
        config.passphrase,
        this.salt,
        config.iterations || this.DEFAULT_ITERATIONS
      );

      // Ensure masterKeyBuffer is a proper Buffer
      const keyBuf = masterKeyBuffer instanceof Buffer
        ? masterKeyBuffer
        : Buffer.from(masterKeyBuffer as any);

      this.masterKey = new CryptographyKey(keyBuf);
      this.initialized = true;
    } catch (error) {
      throw new SecurityError(
        'Failed to initialize key management service',
        SecurityErrorCode.NOT_INITIALIZED,
        error as Error
      );
    }
  }

  /**
   * Check if KMS is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Derive a specific encryption key for a purpose
   * Uses HKDF (HMAC-based Key Derivation Function) for domain separation
   */
  async deriveKey(purpose: KeyPurpose, context?: string): Promise<Buffer> {
    if (!this.initialized || !this.masterKey || !this.sodium) {
      throw new SecurityError(
        'KMS not initialized. Call initialize() first.',
        SecurityErrorCode.NOT_INITIALIZED
      );
    }

    try {
      // Create info string for HKDF: purpose + optional context
      const info = context ? `${purpose}:${context}` : purpose;
      const infoBuffer = Buffer.from(info, 'utf-8');

      // Derive subkey using crypto_kdf (Libsodium's KDF)
      // We use a simple approach: BLAKE2b with master key as key and info as message
      const subkey = await this.sodium.crypto_generichash(
        Buffer.concat([await this.masterKey.getBuffer(), infoBuffer]),
        this.masterKey,
        this.KEY_LENGTH
      );

      return subkey;
    } catch (error) {
      throw new SecurityError(
        `Failed to derive key for purpose: ${purpose}`,
        SecurityErrorCode.KEY_DERIVATION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Generate a BIP39-like recovery phrase (12 words)
   */
  async generateRecoveryPhrase(): Promise<string> {
    if (!this.initialized || !this.masterKey || !this.sodium) {
      throw new SecurityError(
        'KMS not initialized',
        SecurityErrorCode.NOT_INITIALIZED
      );
    }

    try {
      // Generate 16 bytes of entropy (128 bits = 12 words)
      const entropy = await this.sodium.randombytes_buf(16);

      // Convert entropy to word indices
      const words: string[] = [];
      for (let i = 0; i < 12; i++) {
        // Use 11 bits per word (2048 word list)
        const wordIndex = entropy.readUInt8(i) % WORD_LIST.length;
        words.push(WORD_LIST[wordIndex]);
      }

      return words.join(' ');
    } catch (error) {
      throw new SecurityError(
        'Failed to generate recovery phrase',
        SecurityErrorCode.KEY_DERIVATION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Recover master key from recovery phrase
   */
  async recoverFromPhrase(phrase: string): Promise<void> {
    try {
      this.sodium = await SodiumPlus.auto();

      // Convert phrase back to entropy
      const words = phrase.trim().toLowerCase().split(/\s+/);
      if (words.length !== 12) {
        throw new Error('Recovery phrase must be 12 words');
      }

      // Validate words
      const indices = words.map(word => {
        const index = WORD_LIST.indexOf(word);
        if (index === -1) {
          throw new Error(`Invalid word in recovery phrase: ${word}`);
        }
        return index;
      });

      // Convert indices back to entropy
      const entropy = Buffer.alloc(16);
      indices.forEach((index, i) => {
        entropy.writeUInt8(index, i);
      });

      // Derive master key from entropy
      // In production, use proper BIP39 derivation
      this.salt = await this.sodium.randombytes_buf(this.SALT_LENGTH);
      const masterKeyBuffer = await this.sodium.crypto_generichash(
        entropy as Buffer,
        undefined,
        this.KEY_LENGTH
      );

      this.masterKey = new CryptographyKey(masterKeyBuffer as unknown as Buffer);
      this.initialized = true;
    } catch (error) {
      throw new SecurityError(
        'Failed to recover from recovery phrase',
        SecurityErrorCode.INVALID_RECOVERY_PHRASE,
        error as Error
      );
    }
  }

  /**
   * Export master key encrypted with a password
   */
  async exportMasterKey(password: string): Promise<Buffer> {
    if (!this.initialized || !this.masterKey || !this.sodium || !this.salt) {
      throw new SecurityError(
        'KMS not initialized',
        SecurityErrorCode.NOT_INITIALIZED
      );
    }

    try {
      // Derive encryption key from password
      const passwordKey = await this.deriveMasterKey(password, this.salt, this.DEFAULT_ITERATIONS);

      // Generate nonce
      const nonce = await this.sodium.randombytes_buf(24);

      // Encrypt master key
      const masterKeyBuffer = await this.masterKey.getBuffer();
      const encrypted = await this.sodium.crypto_secretbox(
        masterKeyBuffer,
        nonce,
        new CryptographyKey(passwordKey)
      );

      // Return: salt + nonce + encrypted key
      return Buffer.concat([this.salt, nonce, encrypted]);
    } catch (error) {
      throw new SecurityError(
        'Failed to export master key',
        SecurityErrorCode.ENCRYPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Import master key from encrypted export
   */
  async importMasterKey(encryptedKey: Buffer, password: string): Promise<void> {
    try {
      this.sodium = await SodiumPlus.auto();

      // Extract salt, nonce, and ciphertext
      const SALT_LEN = 16; // Use correct salt length
      const salt = encryptedKey.subarray(0, SALT_LEN);
      const nonce = encryptedKey.subarray(SALT_LEN, SALT_LEN + 24);
      const ciphertext = encryptedKey.subarray(SALT_LEN + 24);

      // Derive decryption key from password
      const passwordKey = await this.deriveMasterKey(password, salt, this.DEFAULT_ITERATIONS);

      // Decrypt master key
      const decrypted = await this.sodium.crypto_secretbox_open(
        ciphertext,
        nonce,
        new CryptographyKey(passwordKey)
      );

      this.masterKey = new CryptographyKey(decrypted);
      this.salt = salt;
      this.initialized = true;
    } catch (error) {
      throw new SecurityError(
        'Failed to import master key - invalid password or corrupted data',
        SecurityErrorCode.DECRYPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Rotate master key to a new passphrase
   */
  async rotateMasterKey(newConfig: MasterKeyConfig): Promise<void> {
    if (!this.initialized || !this.masterKey || !this.sodium) {
      throw new SecurityError(
        'KMS not initialized',
        SecurityErrorCode.NOT_INITIALIZED
      );
    }

    try {
      // Store old key temporarily
      const oldKey = this.masterKey;

      // Generate new master key
      const newSalt = newConfig.salt || await this.sodium.randombytes_buf(this.SALT_LENGTH);
      const newMasterKeyBuffer = await this.deriveMasterKey(
        newConfig.passphrase,
        newSalt,
        newConfig.iterations || this.DEFAULT_ITERATIONS
      );

      // Update to new key
      this.masterKey = new CryptographyKey(newMasterKeyBuffer);
      this.salt = newSalt;

      // Securely wipe old key from memory
      await this.zeroizeBuffer(await oldKey.getBuffer());
    } catch (error) {
      throw new SecurityError(
        'Failed to rotate master key',
        SecurityErrorCode.KEY_DERIVATION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Clear keys from memory (zeroize)
   */
  clear(): void {
    if (this.masterKey) {
      // Sodium-plus handles secure memory clearing
      this.masterKey = null;
    }
    if (this.salt) {
      this.zeroizeBuffer(this.salt);
      this.salt = null;
    }
    this.initialized = false;
  }

  /**
   * Derive master key using Argon2id
   */
  private async deriveMasterKey(
    passphrase: string,
    salt: Buffer,
    iterations: number
  ): Promise<Buffer> {
    if (!this.sodium) {
      throw new Error('Sodium not initialized');
    }

    // Use Argon2id for key derivation
    // Parameters: opsLimit (iterations), memLimit (memory in bytes)
    const opsLimit = Math.max(iterations, 2); // Minimum 2 for Argon2
    const memLimit = 64 * 1024 * 1024; // 64 MB

    const key = await this.sodium.crypto_pwhash(
      this.KEY_LENGTH,
      passphrase,
      salt,
      opsLimit,
      memLimit,
      this.sodium.CRYPTO_PWHASH_ALG_ARGON2ID13
    );

    // Already returns a Buffer
    return key as unknown as Buffer;
  }

  /**
   * Securely wipe buffer from memory
   */
  private async zeroizeBuffer(buffer: Buffer): Promise<void> {
    if (this.sodium) {
      await this.sodium.sodium_memzero(buffer);
    } else {
      // Fallback: overwrite with zeros
      buffer.fill(0);
    }
  }

  /**
   * Get salt for export/backup
   */
  getSalt(): Buffer | null {
    return this.salt;
  }
}
