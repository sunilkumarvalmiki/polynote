/**
 * Security module types for PolyNote
 * Defines interfaces for key management, encryption, and access control
 */
/**
 * Key derivation purposes
 */
export var KeyPurpose;
(function (KeyPurpose) {
    /** For encrypting note content */
    KeyPurpose["NOTE_ENCRYPTION"] = "note-encryption";
    /** For encrypting attachments */
    KeyPurpose["ATTACHMENT_ENCRYPTION"] = "attachment-encryption";
    /** For share bundle encryption */
    KeyPurpose["SHARE_ENCRYPTION"] = "share-encryption";
    /** For database encryption */
    KeyPurpose["DATABASE_ENCRYPTION"] = "database-encryption";
    /** For API credentials encryption */
    KeyPurpose["CREDENTIAL_ENCRYPTION"] = "credential-encryption";
})(KeyPurpose || (KeyPurpose = {}));
/**
 * Access control permission levels
 */
export var PermissionLevel;
(function (PermissionLevel) {
    /** No access */
    PermissionLevel["NONE"] = "none";
    /** Read-only access */
    PermissionLevel["READ"] = "read";
    /** Read and write access */
    PermissionLevel["WRITE"] = "write";
    /** Full control including sharing */
    PermissionLevel["ADMIN"] = "admin";
})(PermissionLevel || (PermissionLevel = {}));
/**
 * Error types for security module
 */
export class SecurityError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'SecurityError';
    }
}
export var SecurityErrorCode;
(function (SecurityErrorCode) {
    SecurityErrorCode["NOT_INITIALIZED"] = "NOT_INITIALIZED";
    SecurityErrorCode["INVALID_PASSPHRASE"] = "INVALID_PASSPHRASE";
    SecurityErrorCode["INVALID_KEY"] = "INVALID_KEY";
    SecurityErrorCode["ENCRYPTION_FAILED"] = "ENCRYPTION_FAILED";
    SecurityErrorCode["DECRYPTION_FAILED"] = "DECRYPTION_FAILED";
    SecurityErrorCode["KEY_DERIVATION_FAILED"] = "KEY_DERIVATION_FAILED";
    SecurityErrorCode["ACCESS_DENIED"] = "ACCESS_DENIED";
    SecurityErrorCode["INVALID_BUNDLE"] = "INVALID_BUNDLE";
    SecurityErrorCode["BUNDLE_EXPIRED"] = "BUNDLE_EXPIRED";
    SecurityErrorCode["INVALID_RECOVERY_PHRASE"] = "INVALID_RECOVERY_PHRASE";
})(SecurityErrorCode || (SecurityErrorCode = {}));
