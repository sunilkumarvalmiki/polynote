/**
 * PolyNote Security Module
 * Provides encryption, key management, access control, and secure sharing
 */

export * from './types';
export * from './kms/KeyManagementService';
export * from './encryption/EncryptionService';
export * from './access/AccessControlService';
export * from './share/ShareBundleService';

import { KeyManagementService } from './kms/KeyManagementService';
import { EncryptionService } from './encryption/EncryptionService';
import { AccessControlService } from './access/AccessControlService';
import { ShareBundleService } from './share/ShareBundleService';
import { SecurityConfig } from './types';

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
