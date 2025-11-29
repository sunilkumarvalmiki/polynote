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
/**
 * Initialize security module with all services
 */
export async function initializeSecurity(passphrase) {
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
    kms;
    encryption;
    access;
    share;
    constructor(kms, encryption, access, share) {
        this.kms = kms;
        this.encryption = encryption;
        this.access = access;
        this.share = share;
    }
    /**
     * Create and initialize security service
     */
    static async create(passphrase) {
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
    shutdown() {
        this.kms.clear();
        this.encryption.clearCache();
    }
}
