/**
 * PolyNote Security Module
 * Provides encryption, key management, access control, secure sharing, and authentication
 */

export * from './types/index.js';
export * from './kms/KeyManagementService.js';
export * from './encryption/EncryptionService.js';
export * from './access/AccessControlService.js';
export * from './share/ShareBundleService.js';
export * from './validation/InputValidator.js';
export * from './auth/index.js';

import { AccessControlService } from './access/AccessControlService.js';
import { EncryptionService } from './encryption/EncryptionService.js';
import { KeyManagementService } from './kms/KeyManagementService.js';
import { ShareBundleService } from './share/ShareBundleService.js';
import { SecurityConfig } from './types/index.js';

/**
 * Initialize security module with all services
 */
export async function initializeSecurity(passphrase: string): Promise<SecurityConfig> {
  // Initialize KMS
  const kms = new KeyManagementService();
  await kms.initialize({ passphrase });

  // Initialize other services
  const encryption = new EncryptionService(kms);
  const access = new AccessControlService();
  const share = new ShareBundleService();

  return {
    kms,
    encryption,
    access,
    share,
    features: {
      noteEncryption: true,
      attachmentEncryption: true,
      accessControl: true,
      shareBundles: true,
    },
  };
}

/**
 * Security service factory
 */
export class SecurityService {
  private constructor(
    public readonly kms: KeyManagementService,
    public readonly encryption: EncryptionService,
    public readonly access: AccessControlService,
    public readonly share: ShareBundleService
  ) {}

  /**
   * Create and initialize security service
   */
  static async create(passphrase: string): Promise<SecurityService> {
    const kms = new KeyManagementService();
    await kms.initialize({ passphrase });

    const encryption = new EncryptionService(kms);
    const access = new AccessControlService();
    const share = new ShareBundleService();

    return new SecurityService(kms, encryption, access, share);
  }

  /**
   * Shutdown and clear sensitive data
   */
  shutdown(): void {
    this.kms.clear();
    this.encryption.clearCache();
  }
}
