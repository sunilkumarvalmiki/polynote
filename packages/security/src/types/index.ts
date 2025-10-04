/**
 * Security module types for PolyNote
 * Defines interfaces for key management, encryption, and access control
 */

/**
 * Master key configuration
 */
export interface MasterKeyConfig {
  /** Passphrase for key derivation */
  passphrase: string;
  /** Optional salt (auto-generated if not provided) */
  salt?: Buffer;
  /** Key derivation iterations (default: 100000) */
  iterations?: number;
}

/**
 * Encryption metadata stored with encrypted data
 */
export interface EncryptionMetadata {
  /** Algorithm used */
  algorithm: 'chacha20-poly1305' | 'aes-256-gcm';
  /** Nonce/IV used for encryption */
  nonce: Buffer;
  /** Key ID that was used */
  keyId: string;
  /** Timestamp of encryption */
  timestamp: number;
  /** Optional additional authenticated data */
  aad?: Buffer;
}

/**
 * Encrypted data package
 */
export interface EncryptedData {
  /** Encrypted ciphertext */
  ciphertext: Buffer;
  /** Encryption metadata */
  metadata: EncryptionMetadata;
}

/**
 * Key management interface
 */
export interface IKeyManagementService {
  /** Initialize with master passphrase */
  initialize(config: MasterKeyConfig): Promise<void>;

  /** Check if initialized */
  isInitialized(): boolean;

  /** Derive a specific encryption key */
  deriveKey(purpose: KeyPurpose, context?: string): Promise<Buffer>;

  /** Generate recovery phrase (BIP39 mnemonic) */
  generateRecoveryPhrase(): Promise<string>;

  /** Recover from recovery phrase */
  recoverFromPhrase(phrase: string): Promise<void>;

  /** Export master key (encrypted with password) */
  exportMasterKey(password: string): Promise<Buffer>;

  /** Import master key */
  importMasterKey(encryptedKey: Buffer, password: string): Promise<void>;

  /** Rotate master key */
  rotateMasterKey(newConfig: MasterKeyConfig): Promise<void>;

  /** Clear keys from memory (zeroize) */
  clear(): void;
}

/**
 * Key derivation purposes
 */
export enum KeyPurpose {
  /** For encrypting note content */
  NOTE_ENCRYPTION = 'note-encryption',
  /** For encrypting attachments */
  ATTACHMENT_ENCRYPTION = 'attachment-encryption',
  /** For share bundle encryption */
  SHARE_ENCRYPTION = 'share-encryption',
  /** For database encryption */
  DATABASE_ENCRYPTION = 'database-encryption',
  /** For API credentials encryption */
  CREDENTIAL_ENCRYPTION = 'credential-encryption',
}

/**
 * File encryption service interface
 */
export interface IEncryptionService {
  /** Encrypt data with a specific key */
  encrypt(data: Buffer, keyId: string): Promise<EncryptedData>;

  /** Decrypt data */
  decrypt(encrypted: EncryptedData, keyId: string): Promise<Buffer>;

  /** Encrypt file in place */
  encryptFile(filePath: string, keyId: string): Promise<void>;

  /** Decrypt file in place */
  decryptFile(filePath: string, keyId: string): Promise<void>;

  /** Encrypt note content */
  encryptNote(noteId: string, content: string): Promise<EncryptedData>;

  /** Decrypt note content */
  decryptNote(noteId: string, encrypted: EncryptedData): Promise<string>;

  /** Encrypt attachment */
  encryptAttachment(attachmentId: string, data: Buffer): Promise<EncryptedData>;

  /** Decrypt attachment */
  decryptAttachment(attachmentId: string, encrypted: EncryptedData): Promise<Buffer>;
}

/**
 * Access control permission levels
 */
export enum PermissionLevel {
  /** No access */
  NONE = 'none',
  /** Read-only access */
  READ = 'read',
  /** Read and write access */
  WRITE = 'write',
  /** Full control including sharing */
  ADMIN = 'admin',
}

/**
 * Access control rule
 */
export interface AccessRule {
  /** Rule ID */
  id: string;
  /** Resource type (note, folder, tag) */
  resourceType: 'note' | 'folder' | 'tag';
  /** Resource ID or pattern */
  resourceId: string;
  /** Permission level */
  permission: PermissionLevel;
  /** Optional user/group ID */
  principal?: string;
  /** Rule priority (higher = more important) */
  priority: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

/**
 * Access control service interface
 */
export interface IAccessControlService {
  /** Check if action is allowed */
  isAllowed(
    resourceType: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete' | 'share',
    principal?: string
  ): Promise<boolean>;

  /** Add access rule */
  addRule(rule: Omit<AccessRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccessRule>;

  /** Remove access rule */
  removeRule(ruleId: string): Promise<void>;

  /** Get all rules for a resource */
  getRules(resourceType: string, resourceId: string): Promise<AccessRule[]>;

  /** Update rule */
  updateRule(ruleId: string, updates: Partial<AccessRule>): Promise<AccessRule>;

  /** Clear all rules */
  clearRules(): Promise<void>;
}

/**
 * Share bundle configuration
 */
export interface ShareBundleConfig {
  /** Notes to include */
  noteIds: string[];
  /** Password for encryption */
  password: string;
  /** Expiration timestamp (optional) */
  expiresAt?: number;
  /** Allow recipients to reshare */
  allowReshare?: boolean;
  /** Include attachments */
  includeAttachments?: boolean;
}

/**
 * Share bundle metadata
 */
export interface ShareBundleMetadata {
  /** Bundle version */
  version: string;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt?: number;
  /** Number of notes */
  noteCount: number;
  /** Whether attachments are included */
  hasAttachments: boolean;
  /** Encryption algorithm */
  algorithm: string;
}

/**
 * Share bundle service interface
 */
export interface IShareBundleService {
  /** Create encrypted share bundle */
  createBundle(config: ShareBundleConfig): Promise<Buffer>;

  /** Extract share bundle */
  extractBundle(bundle: Buffer, password: string): Promise<{
    notes: Array<{ id: string; title: string; content: string; tags: string[] }>;
    attachments?: Array<{ id: string; noteId: string; data: Buffer; filename: string }>;
    metadata: ShareBundleMetadata;
  }>;

  /** Verify bundle integrity */
  verifyBundle(bundle: Buffer): Promise<boolean>;

  /** Get bundle metadata without decrypting */
  getBundleMetadata(bundle: Buffer): Promise<ShareBundleMetadata>;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Key management service */
  kms: IKeyManagementService;
  /** Encryption service */
  encryption: IEncryptionService;
  /** Access control service */
  access: IAccessControlService;
  /** Share bundle service */
  share: IShareBundleService;
  /** Enable/disable features */
  features: {
    noteEncryption: boolean;
    attachmentEncryption: boolean;
    accessControl: boolean;
    shareBundles: boolean;
  };
}

/**
 * Error types for security module
 */
export class SecurityError extends Error {
  constructor(
    message: string,
    public code: SecurityErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export enum SecurityErrorCode {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  INVALID_PASSPHRASE = 'INVALID_PASSPHRASE',
  INVALID_KEY = 'INVALID_KEY',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_BUNDLE = 'INVALID_BUNDLE',
  BUNDLE_EXPIRED = 'BUNDLE_EXPIRED',
  INVALID_RECOVERY_PHRASE = 'INVALID_RECOVERY_PHRASE',
}
