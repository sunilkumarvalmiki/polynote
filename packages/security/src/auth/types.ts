/**
 * Authentication types for PolyNote
 * Defines interfaces for user sessions and OAuth providers
 */

/**
 * User session data
 */
export interface UserSession {
  /** Unique user identifier from OAuth provider */
  userId: string;
  /** User email address */
  email: string;
  /** User display name */
  name: string;
  /** User profile picture URL */
  picture?: string;
  /** OAuth access token */
  accessToken: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** OAuth provider (google, github, etc.) */
  provider: 'google';
  /** Session creation timestamp */
  createdAt: Date;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret */
  clientSecret: string;
  /** Redirect URI for OAuth callback */
  redirectUri: string;
}

/**
 * OAuth provider interface
 */
export interface IOAuthProvider {
  /** Get authorization URL for OAuth flow */
  getAuthUrl(): Promise<string>;

  /** Handle OAuth callback and exchange code for tokens */
  handleCallback(code: string): Promise<UserSession>;

  /** Refresh access token using refresh token */
  refreshAccessToken(refreshToken: string): Promise<string>;

  /** Revoke access token */
  revokeAccess(accessToken: string): Promise<void>;

  /** Validate if token is still valid */
  validateToken(accessToken: string): Promise<boolean>;
}

/**
 * Session storage interface
 */
export interface ISessionStorage {
  /** Save user session */
  saveSession(session: UserSession): Promise<void>;

  /** Get user session by user ID */
  getSession(userId: string): Promise<UserSession | null>;

  /** Check if session is valid */
  isSessionValid(userId: string): Promise<boolean>;

  /** Delete session */
  deleteSession(userId: string): Promise<void>;

  /** Get current active session */
  getCurrentSession(): Promise<UserSession | null>;

  /** Update session data */
  updateSession(userId: string, updates: Partial<UserSession>): Promise<void>;
}

/**
 * Auth error codes
 */
export enum AuthErrorCode {
  /** OAuth flow failed */
  OAUTH_FAILED = 'OAUTH_FAILED',
  /** Invalid authorization code */
  INVALID_CODE = 'INVALID_CODE',
  /** Token refresh failed */
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  /** Session not found */
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  /** Session expired */
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  /** Invalid configuration */
  INVALID_CONFIG = 'INVALID_CONFIG',
  /** Network error */
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * Authentication error
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
