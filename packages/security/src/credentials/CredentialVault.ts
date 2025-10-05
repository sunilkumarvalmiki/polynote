/**
 * Credential Vault
 * Secure storage for API keys and sensitive credentials using Electron's safeStorage
 */

import { safeStorage } from 'electron';
import { getDatabase, execute, queryOne, query } from '@polynote/shared';

export interface Credential {
  id: string;
  service: string;
  key: string;
  username?: string;
  encryptedValue: string;
  createdAt: number;
  updatedAt: number;
  lastUsed?: number;
}

export interface CredentialInput {
  service: string;
  key: string;
  value: string;
  username?: string;
}

export class CredentialVault {
  private static instance: CredentialVault;

  private constructor() {
    this.initializeVaultTable();
  }

  static getInstance(): CredentialVault {
    if (!CredentialVault.instance) {
      CredentialVault.instance = new CredentialVault();
    }
    return CredentialVault.instance;
  }

  /**
   * Initialize credential vault table
   */
  private initializeVaultTable(): void {
    const db = getDatabase();
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS CredentialVault (
        id TEXT PRIMARY KEY,
        service TEXT NOT NULL,
        key TEXT NOT NULL,
        username TEXT,
        encrypted_value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used INTEGER,
        UNIQUE(service, key)
      );
      
      CREATE INDEX IF NOT EXISTS idx_vault_service ON CredentialVault(service);
      CREATE INDEX IF NOT EXISTS idx_vault_key ON CredentialVault(key);
    `);
  }

  /**
   * Check if safeStorage is available
   */
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Store a credential securely
   */
  async store(credential: CredentialInput): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Credential storage is not available on this system');
    }

    // Encrypt the credential value
    const encryptedBuffer = safeStorage.encryptString(credential.value);
    const encryptedValue = encryptedBuffer.toString('base64');

    const id = crypto.randomUUID();
    const now = Date.now();

    // Store encrypted credential
    execute(
      `INSERT OR REPLACE INTO CredentialVault 
       (id, service, key, username, encrypted_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        credential.service,
        credential.key,
        credential.username || null,
        encryptedValue,
        now,
        now,
      ]
    );

    return id;
  }

  /**
   * Retrieve a credential by service and key
   */
  async retrieve(service: string, key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      throw new Error('Credential storage is not available on this system');
    }

    const row = queryOne<{
      encrypted_value: string;
      id: string;
    }>(
      'SELECT id, encrypted_value FROM CredentialVault WHERE service = ? AND key = ?',
      [service, key]
    );

    if (!row) {
      return null;
    }

    // Update last used timestamp
    execute(
      'UPDATE CredentialVault SET last_used = ? WHERE id = ?',
      [Date.now(), row.id]
    );

    // Decrypt the credential
    const encryptedBuffer = Buffer.from(row.encrypted_value, 'base64');
    const decryptedValue = safeStorage.decryptString(encryptedBuffer);

    return decryptedValue;
  }

  /**
   * Delete a credential
   */
  async delete(service: string, key: string): Promise<boolean> {
    const result = execute(
      'DELETE FROM CredentialVault WHERE service = ? AND key = ?',
      [service, key]
    );

    return result.changes > 0;
  }

  /**
   * List all credentials (without values)
   */
  async list(service?: string): Promise<Array<Omit<Credential, 'encryptedValue'>>> {
    const sql = service
      ? 'SELECT id, service, key, username, created_at, updated_at, last_used FROM CredentialVault WHERE service = ?'
      : 'SELECT id, service, key, username, created_at, updated_at, last_used FROM CredentialVault';

    const params = service ? [service] : [];
    const rows = query<{
      id: string;
      service: string;
      key: string;
      username: string | null;
      created_at: number;
      updated_at: number;
      last_used: number | null;
    }>(sql, params);

    return rows.map(row => ({
      id: row.id,
      service: row.service,
      key: row.key,
      username: row.username || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsed: row.last_used || undefined,
    }));
  }

  /**
   * Update a credential
   */
  async update(service: string, key: string, newValue: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Credential storage is not available on this system');
    }

    // Encrypt new value
    const encryptedBuffer = safeStorage.encryptString(newValue);
    const encryptedValue = encryptedBuffer.toString('base64');

    const result = execute(
      `UPDATE CredentialVault 
       SET encrypted_value = ?, updated_at = ?
       WHERE service = ? AND key = ?`,
      [encryptedValue, Date.now(), service, key]
    );

    return result.changes > 0;
  }

  /**
   * Clear all credentials for a service
   */
  async clearService(service: string): Promise<number> {
    const result = execute(
      'DELETE FROM CredentialVault WHERE service = ?',
      [service]
    );

    return result.changes;
  }

  /**
   * Migrate plaintext API keys from settings to vault
   */
  async migrateFromSettings(settings: Record<string, string>): Promise<number> {
    let migrated = 0;

    // Common API key patterns in settings
    const apiKeyPatterns = [
      /api[_-]?key/i,
      /token/i,
      /secret/i,
      /password/i,
      /credentials?/i,
    ];

    for (const [key, value] of Object.entries(settings)) {
      // Check if key matches API key pattern
      const isApiKey = apiKeyPatterns.some(pattern => pattern.test(key));
      
      if (isApiKey && value) {
        try {
          // Extract service name from key (e.g., "openai_api_key" -> "openai")
          const service = key.split(/[_-]/)[0] || 'unknown';
          
          await this.store({
            service,
            key,
            value,
          });

          migrated++;
        } catch (error) {
          console.error(`Failed to migrate credential ${key}:`, error);
        }
      }
    }

    return migrated;
  }

  /**
   * Export vault (for backup - still encrypted)
   */
  async export(): Promise<Array<Omit<Credential, 'encryptedValue'>>> {
    return this.list();
  }

  /**
   * Check if a credential exists
   */
  async has(service: string, key: string): Promise<boolean> {
    const row = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM CredentialVault WHERE service = ? AND key = ?',
      [service, key]
    );

    return (row?.count || 0) > 0;
  }
}

// Export singleton instance
export const credentialVault = CredentialVault.getInstance();