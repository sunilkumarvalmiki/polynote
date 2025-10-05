/**
 * Google OAuth Authentication Provider
 * Handles Google OAuth 2.0 flow for user authentication
 */

import { OAuth2Client } from 'google-auth-library';
import type { IOAuthProvider, OAuthConfig, UserSession } from './types.js';
import { AuthError as AuthErrorClass, AuthErrorCode as ErrorCode } from './types.js';

/**
 * Google OAuth scopes
 */
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file', // For cloud sync (future)
];

/**
 * Google user info interface
 */
interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

/**
 * Google OAuth Provider implementation
 */
export class GoogleAuthProvider implements IOAuthProvider {
  private oauth2Client: OAuth2Client;

  constructor(private config: OAuthConfig) {
    this.oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthUrl(): Promise<string> {
    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        prompt: 'consent', // Force consent screen to get refresh token
      });

      return authUrl;
    } catch (error) {
      throw new AuthErrorClass(
        'Failed to generate authorization URL',
        ErrorCode.OAUTH_FAILED,
        error as Error
      );
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string): Promise<UserSession> {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new AuthErrorClass(
          'No access token received from Google',
          ErrorCode.INVALID_CODE
        );
      }

      // Set credentials for user info request
      this.oauth2Client.setCredentials(tokens);

      // Get user information
      const userInfo = await this.getUserInfo(tokens.access_token);

      // Calculate expiration time
      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      // Create session object
      const session: UserSession = {
        userId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt,
        provider: 'google',
        createdAt: new Date(),
      };

      return session;
    } catch (error) {
      if (error instanceof AuthErrorClass) {
        throw error;
      }
      throw new AuthErrorClass(
        'Failed to handle OAuth callback',
        ErrorCode.OAUTH_FAILED,
        error as Error
      );
    }
  }

  /**
   * Fetch user information from Google
   */
  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const userInfo = (await response.json()) as GoogleUserInfo;

      return userInfo;
    } catch (error) {
      throw new AuthErrorClass(
        'Failed to fetch user information from Google',
        ErrorCode.NETWORK_ERROR,
        error as Error
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new AuthErrorClass(
          'No access token received during refresh',
          ErrorCode.TOKEN_REFRESH_FAILED
        );
      }

      return credentials.access_token;
    } catch (error) {
      if (error instanceof AuthErrorClass) {
        throw error;
      }
      throw new AuthErrorClass(
        'Failed to refresh access token',
        ErrorCode.TOKEN_REFRESH_FAILED,
        error as Error
      );
    }
  }

  /**
   * Revoke access token
   */
  async revokeAccess(accessToken: string): Promise<void> {
    try {
      await this.oauth2Client.revokeToken(accessToken);
    } catch (error) {
      throw new AuthErrorClass(
        'Failed to revoke access token',
        ErrorCode.OAUTH_FAILED,
        error as Error
      );
    }
  }

  /**
   * Validate if access token is still valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update OAuth config
   */
  updateConfig(config: Partial<OAuthConfig>): void {
    this.config = { ...this.config, ...config };
    this.oauth2Client = new OAuth2Client(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );
  }
}
