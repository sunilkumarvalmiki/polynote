/**
 * Session Manager
 * Handles user session storage with encryption
 */
import { AuthError, AuthErrorCode } from './types.js';
/**
 * Session Manager implementation with encrypted storage
 */
export class SessionManager {
    db;
    encryptionService;
    currentSessionId = null;
    constructor(db, encryptionService) {
        this.db = db;
        this.encryptionService = encryptionService;
        this.initializeDatabase();
    }
    /**
     * Initialize database schema for sessions
     */
    initializeDatabase() {
        // Create user_sessions table if it doesn't exist
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        user_id TEXT PRIMARY KEY,
        encrypted_session_data TEXT NOT NULL,
        provider TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_accessed_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_session_provider ON user_sessions(provider);
      CREATE INDEX IF NOT EXISTS idx_session_expires ON user_sessions(expires_at);
    `);
    }
    /**
     * Save user session with encryption
     */
    async saveSession(session) {
        try {
            // Serialize session data
            const sessionData = JSON.stringify({
                userId: session.userId,
                email: session.email,
                name: session.name,
                picture: session.picture,
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
                expiresAt: session.expiresAt.getTime(),
                provider: session.provider,
                createdAt: session.createdAt.getTime(),
            });
            // Encrypt session data
            const encrypted = await this.encryptionService.encrypt(Buffer.from(sessionData, 'utf-8'), session.userId);
            // Serialize encrypted data for storage
            const encryptedDataStr = JSON.stringify({
                ciphertext: encrypted.ciphertext.toString('base64'),
                metadata: {
                    algorithm: encrypted.metadata.algorithm,
                    nonce: encrypted.metadata.nonce.toString('base64'),
                    keyId: encrypted.metadata.keyId,
                    timestamp: encrypted.metadata.timestamp,
                },
            });
            const now = Date.now();
            // Upsert session
            this.db
                .prepare(`
        INSERT INTO user_sessions (user_id, encrypted_session_data, provider, expires_at, created_at, updated_at, last_accessed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          encrypted_session_data = excluded.encrypted_session_data,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at,
          last_accessed_at = excluded.last_accessed_at
      `)
                .run(session.userId, encryptedDataStr, session.provider, session.expiresAt.getTime(), session.createdAt.getTime(), now, now);
            // Set as current session
            this.currentSessionId = session.userId;
        }
        catch (error) {
            throw new AuthError(`Failed to save session for user ${session.userId}`, AuthErrorCode.OAUTH_FAILED, error);
        }
    }
    /**
     * Get user session by user ID
     */
    async getSession(userId) {
        try {
            const row = this.db
                .prepare(`
        SELECT encrypted_session_data, provider, expires_at, created_at
        FROM user_sessions
        WHERE user_id = ?
      `)
                .get(userId);
            if (!row) {
                return null;
            }
            // Check if session has expired
            if (row.expires_at < Date.now()) {
                // Delete expired session
                await this.deleteSession(userId);
                return null;
            }
            // Decrypt session data
            const encryptedData = JSON.parse(row.encrypted_session_data);
            const encrypted = {
                ciphertext: Buffer.from(encryptedData.ciphertext, 'base64'),
                metadata: {
                    algorithm: encryptedData.metadata.algorithm,
                    nonce: Buffer.from(encryptedData.metadata.nonce, 'base64'),
                    keyId: encryptedData.metadata.keyId,
                    timestamp: encryptedData.metadata.timestamp,
                },
            };
            const decrypted = await this.encryptionService.decrypt(encrypted, userId);
            const sessionData = JSON.parse(decrypted.toString('utf-8'));
            // Update last accessed timestamp
            this.db
                .prepare('UPDATE user_sessions SET last_accessed_at = ? WHERE user_id = ?')
                .run(Date.now(), userId);
            // Reconstruct session object
            const session = {
                userId: sessionData.userId,
                email: sessionData.email,
                name: sessionData.name,
                picture: sessionData.picture,
                accessToken: sessionData.accessToken,
                refreshToken: sessionData.refreshToken,
                expiresAt: new Date(sessionData.expiresAt),
                provider: sessionData.provider,
                createdAt: new Date(sessionData.createdAt),
            };
            return session;
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            throw new AuthError(`Failed to get session for user ${userId}`, AuthErrorCode.SESSION_NOT_FOUND, error);
        }
    }
    /**
     * Check if session is valid and not expired
     */
    async isSessionValid(userId) {
        try {
            const session = await this.getSession(userId);
            if (!session) {
                return false;
            }
            return session.expiresAt > new Date();
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Delete user session
     */
    async deleteSession(userId) {
        try {
            this.db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
            if (this.currentSessionId === userId) {
                this.currentSessionId = null;
            }
        }
        catch (error) {
            throw new AuthError(`Failed to delete session for user ${userId}`, AuthErrorCode.OAUTH_FAILED, error);
        }
    }
    /**
     * Get current active session
     */
    async getCurrentSession() {
        if (!this.currentSessionId) {
            // Try to find the most recent valid session
            const row = this.db
                .prepare(`
        SELECT user_id
        FROM user_sessions
        WHERE expires_at > ?
        ORDER BY last_accessed_at DESC
        LIMIT 1
      `)
                .get(Date.now());
            if (!row) {
                return null;
            }
            this.currentSessionId = row.user_id;
        }
        return this.getSession(this.currentSessionId);
    }
    /**
     * Update session data
     */
    async updateSession(userId, updates) {
        try {
            const existingSession = await this.getSession(userId);
            if (!existingSession) {
                throw new AuthError(`Session not found for user ${userId}`, AuthErrorCode.SESSION_NOT_FOUND);
            }
            // Merge updates with existing session
            const updatedSession = {
                ...existingSession,
                ...updates,
                userId: existingSession.userId, // Prevent userId from being changed
            };
            // Save updated session
            await this.saveSession(updatedSession);
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            throw new AuthError(`Failed to update session for user ${userId}`, AuthErrorCode.OAUTH_FAILED, error);
        }
    }
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        try {
            const result = this.db
                .prepare('DELETE FROM user_sessions WHERE expires_at < ?')
                .run(Date.now());
            console.log(`Cleaned up ${result.changes} expired sessions`);
        }
        catch (error) {
            console.error('Failed to cleanup expired sessions:', error);
        }
    }
    /**
     * Get all active sessions (for admin/debugging)
     */
    async getAllActiveSessions() {
        try {
            const rows = this.db
                .prepare(`
        SELECT user_id
        FROM user_sessions
        WHERE expires_at > ?
        ORDER BY last_accessed_at DESC
      `)
                .all(Date.now());
            const sessions = [];
            for (const row of rows) {
                const session = await this.getSession(row.user_id);
                if (session) {
                    sessions.push(session);
                }
            }
            return sessions;
        }
        catch (error) {
            throw new AuthError('Failed to get all active sessions', AuthErrorCode.OAUTH_FAILED, error);
        }
    }
}
