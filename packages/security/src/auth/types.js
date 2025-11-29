/**
 * Authentication types for PolyNote
 * Defines interfaces for user sessions and OAuth providers
 */
/**
 * Auth error codes
 */
export var AuthErrorCode;
(function (AuthErrorCode) {
    /** OAuth flow failed */
    AuthErrorCode["OAUTH_FAILED"] = "OAUTH_FAILED";
    /** Invalid authorization code */
    AuthErrorCode["INVALID_CODE"] = "INVALID_CODE";
    /** Token refresh failed */
    AuthErrorCode["TOKEN_REFRESH_FAILED"] = "TOKEN_REFRESH_FAILED";
    /** Session not found */
    AuthErrorCode["SESSION_NOT_FOUND"] = "SESSION_NOT_FOUND";
    /** Session expired */
    AuthErrorCode["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    /** Invalid configuration */
    AuthErrorCode["INVALID_CONFIG"] = "INVALID_CONFIG";
    /** Network error */
    AuthErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
})(AuthErrorCode || (AuthErrorCode = {}));
/**
 * Authentication error
 */
export class AuthError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'AuthError';
    }
}
