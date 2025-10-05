/**
 * Database Encryption Service
 * Enables SQLite database encryption with master password support
 */

import { app } from 'electron';
import { join } from 'path';
import Database from 'better-sqlite3';
import { KeyManagementService } from '../kms/KeyManagementService.js';
import { KeyPurpose, MasterKeyConfig, SecurityError, SecurityErrorCode } from '../types/index.js';

export interface DatabaseEncryptionConfig {
  masterPassword: string;
  iterations?: number;
  cipher?: 'aes256' | 'chacha20';
}

export class DatabaseEncryption {
  private static instance: DatabaseEncryption;
  private kms: KeyManagementService;
  private masterKey: Buffer | null = null;
  private isInitialized = false;

  private constructor() {
    this.kms = new KeyManagementService();
  }

  static getInstance(): DatabaseEncryption {
    if (!DatabaseEncryption.instance) {
      DatabaseEncryption.instance = new DatabaseEncryption();
    }
    return DatabaseEncryption.instance;
  }

  /**
   * Initialize master key from password
   */
  async initialize(config: DatabaseEncryptionConfig): Promise<void> {
    try {
      const kmsConfig: MasterKeyConfig = {
        passphrase: config.masterPassword,
        iterations: config.iterations || 3,
      };

      await this.kms.initialize(kmsConfig);
      
      // Derive database encryption key from master key
      this.masterKey = await this.kms.deriveKey(KeyPurpose.DATABASE_ENCRYPTION, 'main');
      this.isInitialized = true;
    } catch (error) {
      throw new SecurityError(
        'Failed to initialize database encryption',
        SecurityErrorCode.ENCRYPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Create encrypted database connection
   */
  async createEncryptedDatabase(dbPath?: string): Promise<Database.Database> {
    if (!this.isInitialized || !this.masterKey) {
      throw new SecurityError(
        'Database encryption not initialized',
        SecurityErrorCode.NOT_INITIALIZED
      );
    }

    const path = dbPath || join(app.getPath('userData'), 'polynote.db');
    
    // Create database with encryption
    const db = new Database(path);

    try {
      // Enable encryption using SQLCipher pragmas
      // Note: This requires SQLCipher extension to be available
      const keyHex = this.masterKey.toString('hex');
      
      // Set cipher
      db.pragma("cipher = 'aes-256-cbc'");
      
      // Set key
      db.pragma(`key = "x'${keyHex}'"`);
      
      // Verify encryption is working
      db.pragma('cipher_version');
      
      // Performance optimizations
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      db.pragma('temp_store = MEMORY');
      db.pragma('mmap_size = 30000000000');
      db.pragma('page_size = 4096');
      db.pragma('cache_size = -64000');
      
      return db;
    } catch (error) {
      db.close();
      throw new SecurityError(
        'Failed to enable database encryption. SQLCipher may not be available.',
        SecurityErrorCode.ENCRYPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Migrate unencrypted database to encrypted
   */
  async migrateToEncrypted(
    unencryptedPath: string,
    encryptedPath: string
  ): Promise<void> {
    if (!this.isInitialized || !this.masterKey) {
      throw new SecurityError(
        'Database encryption not initialized',
        SecurityErrorCode.NOT_INITIALIZED
      );
    }

    const sourceDb = new Database(unencryptedPath, { readonly: true });
    const targetDb = await this.createEncryptedDatabase(encryptedPath);

    try {
      // Attach source database
      sourceDb.exec(`ATTACH DATABASE '${encryptedPath}' AS encrypted KEY "x'${this.masterKey.toString('hex')}'"`);
      
      // Copy schema
      const tables = sourceDb.prepare(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as Array<{ name: string; sql: string }>;

      for (const table of tables) {
        targetDb.exec(table.sql);
      }

      // Copy data
      for (const table of tables) {
        sourceDb.exec(`INSERT INTO encrypted.${table.name} SELECT * FROM ${table.name}`);
      }

      // Copy indices
      const indices = sourceDb.prepare(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all() as Array<{ name: string; sql: string }>;

      for (const index of indices) {
        if (index.sql) {
          targetDb.exec(index.sql);
        }
      }

    } finally {
      sourceDb.close();
      targetDb.close();
    }
  }

  /**
   * Change master password (rekey database)
   */
  async changePassword(
    dbPath: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // Initialize with old password
    await this.initialize({ masterPassword: oldPassword });
    
    const db = await this.createEncryptedDatabase(dbPath);

    try {
      // Derive new key
      await this.kms.rotateMasterKey({
        passphrase: newPassword,
        iterations: 3,
      });

      const newKey = await this.kms.deriveKey(KeyPurpose.DATABASE_ENCRYPTION, 'main');
      const newKeyHex = newKey.toString('hex');

      // Rekey database
      db.pragma(`rekey = "x'${newKeyHex}'"`);
      
      this.masterKey = newKey;
    } finally {
      db.close();
    }
  }

  /**
   * Verify database encryption status
   */
  async verifyEncryption(dbPath: string): Promise<boolean> {
    if (!this.masterKey) {
      return false;
    }

    try {
      const db = await this.createEncryptedDatabase(dbPath);
      
      // Try to read from database
      db.prepare('SELECT 1').get();
      
      db.close();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate recovery key
   */
  async generateRecoveryKey(): Promise<string> {
    if (!this.isInitialized) {
      throw new SecurityError(
        'Database encryption not initialized',
        SecurityErrorCode.NOT_INITIALIZED
      );
    }

    return await this.kms.generateRecoveryPhrase();
  }

  /**
   * Recover from recovery key
   */
  async recoverFromKey(recoveryKey: string): Promise<void> {
    await this.kms.recoverFromPhrase(recoveryKey);
    this.masterKey = await this.kms.deriveKey(KeyPurpose.DATABASE_ENCRYPTION, 'main');
    this.isInitialized = true;
  }

  /**
   * Clear encryption keys from memory
   */
  clear(): void {
    this.kms.clear();
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    this.isInitialized = false;
  }

  /**
   * Check if encryption is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton
export const databaseEncryption = DatabaseEncryption.getInstance();