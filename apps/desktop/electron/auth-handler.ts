/**
 * Electron Authentication Handler
 * Manages OAuth flow in Electron main process
 */

import { shell, BrowserWindow } from 'electron';
import * as http from 'http';
import { URL } from 'url';
import { GoogleAuthProvider, SessionManager, UserSession, AuthError } from '@polynote/security';
import type { Database } from 'better-sqlite3';
import type { IEncryptionService } from '@polynote/security';

/**
 * OAuth configuration from environment variables
 */
interface AuthConfig {
  googleClientId: string;
  googleClientSecret: string;
  redirectUri: string;
  callbackPort: number;
}

/**
 * Electron auth handler for managing OAuth flows
 */
export class ElectronAuthHandler {
  private googleAuthProvider: GoogleAuthProvider;
  private sessionManager: SessionManager;
  private authConfig: AuthConfig;
  private callbackServer: http.Server | null = null;

  constructor(
    db: Database,
    encryptionService: IEncryptionService,
    config?: Partial<AuthConfig>
  ) {
    // Default configuration
    this.authConfig = {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || 'http://localhost:3000/auth/google/callback',
      callbackPort: config?.callbackPort || 3000,
    };

    // Initialize providers
    this.googleAuthProvider = new GoogleAuthProvider({
      clientId: this.authConfig.googleClientId,
      clientSecret: this.authConfig.googleClientSecret,
      redirectUri: this.authConfig.redirectUri,
    });

    this.sessionManager = new SessionManager(db, encryptionService);
  }

  /**
   * Initiate Google OAuth login flow
   */
  async initiateGoogleLogin(): Promise<UserSession> {
    try {
      // Validate configuration
      if (!this.authConfig.googleClientId || !this.authConfig.googleClientSecret) {
        throw new Error(
          'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
        );
      }

      // Get authorization URL
      const authUrl = await this.googleAuthProvider.getAuthUrl();

      // Open browser for OAuth
      await shell.openExternal(authUrl);

      // Start local server to receive callback
      const session = await this.startCallbackServer();

      // Save session
      await this.sessionManager.saveSession(session);

      return session;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Failed to initiate Google login',
        'OAUTH_FAILED' as any,
        error as Error
      );
    }
  }

  /**
   * Start local HTTP server to handle OAuth callback
   */
  private startCallbackServer(): Promise<UserSession> {
    return new Promise((resolve, reject) => {
      // Create callback server
      this.callbackServer = http.createServer(async (req, res) => {
        try {
          if (!req.url) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Bad Request</h1>');
            return;
          }

          const url = new URL(req.url, `http://localhost:${this.authConfig.callbackPort}`);

          // Check for OAuth callback path
          if (url.pathname === '/auth/google/callback') {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`<h1>Authentication Failed</h1><p>Error: ${error}</p>`);
              this.stopCallbackServer();
              reject(new Error(`OAuth error: ${error}`));
              return;
            }

            if (code) {
              try {
                // Exchange code for tokens
                const session = await this.googleAuthProvider.handleCallback(code);

                // Send success response
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Authentication Successful</title>
                      <style>
                        body {
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          height: 100vh;
                          margin: 0;
                          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        }
                        .container {
                          text-align: center;
                          background: white;
                          padding: 3rem;
                          border-radius: 10px;
                          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        }
                        h1 {
                          color: #667eea;
                          margin: 0 0 1rem 0;
                        }
                        p {
                          color: #555;
                          margin: 0;
                        }
                        .checkmark {
                          font-size: 4rem;
                          color: #4caf50;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="checkmark">✓</div>
                        <h1>Login Successful!</h1>
                        <p>You can now close this window and return to PolyNote.</p>
                      </div>
                      <script>
                        setTimeout(() => {
                          window.close();
                        }, 3000);
                      </script>
                    </body>
                  </html>
                `);

                // Stop server and resolve
                this.stopCallbackServer();
                resolve(session);
              } catch (error) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`<h1>Authentication Error</h1><p>${(error as Error).message}</p>`);
                this.stopCallbackServer();
                reject(error);
              }
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<h1>Bad Request</h1><p>No authorization code received</p>');
            }
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>Not Found</h1>');
          }
        } catch (error) {
          console.error('Callback server error:', error);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Internal Server Error</h1>');
          this.stopCallbackServer();
          reject(error);
        }
      });

      // Start listening
      this.callbackServer.listen(this.authConfig.callbackPort, () => {
        console.log(`OAuth callback server listening on port ${this.authConfig.callbackPort}`);
      });

      // Handle server errors
      this.callbackServer.on('error', (error) => {
        console.error('Callback server error:', error);
        this.stopCallbackServer();
        reject(error);
      });

      // Set timeout (5 minutes)
      setTimeout(() => {
        if (this.callbackServer) {
          this.stopCallbackServer();
          reject(new Error('OAuth callback timeout - please try again'));
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Stop callback server
   */
  private stopCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close();
      this.callbackServer = null;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<UserSession | null> {
    return this.sessionManager.getCurrentSession();
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string): Promise<void> {
    try {
      const session = await this.sessionManager.getSession(userId);
      if (!session || !session.refreshToken) {
        throw new Error('No refresh token available');
      }

      const newAccessToken = await this.googleAuthProvider.refreshAccessToken(
        session.refreshToken
      );

      // Update session with new token
      await this.sessionManager.updateSession(userId, {
        accessToken: newAccessToken,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      });
    } catch (error) {
      throw new AuthError(
        'Failed to refresh access token',
        'TOKEN_REFRESH_FAILED' as any,
        error as Error
      );
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    try {
      const session = await this.sessionManager.getSession(userId);

      if (session) {
        // Revoke access token
        try {
          await this.googleAuthProvider.revokeAccess(session.accessToken);
        } catch (error) {
          console.error('Failed to revoke access token:', error);
          // Continue with logout even if revocation fails
        }

        // Delete local session
        await this.sessionManager.deleteSession(userId);
      }
    } catch (error) {
      throw new AuthError('Failed to logout', 'OAUTH_FAILED' as any, error as Error);
    }
  }

  /**
   * Validate if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.sessionManager.getCurrentSession();
    if (!session) {
      return false;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Try to refresh token
      if (session.refreshToken) {
        try {
          await this.refreshToken(session.userId);
          return true;
        } catch (error) {
          return false;
        }
      }
      return false;
    }

    return true;
  }

  /**
   * Get session manager for direct access
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopCallbackServer();
    this.sessionManager.cleanupExpiredSessions();
  }
}
