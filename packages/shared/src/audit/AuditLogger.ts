/**
 * Audit Logger
 * Records all security-relevant operations for compliance and monitoring
 */

import { getDatabase, execute } from '../db/connection.js';

export enum AuditEventType {
  // Authentication events
  AUTH_SUCCESS = 'auth.success',
  AUTH_FAILURE = 'auth.failure',
  AUTH_LOGOUT = 'auth.logout',
  
  // Note operations
  NOTE_CREATE = 'note.create',
  NOTE_UPDATE = 'note.update',
  NOTE_DELETE = 'note.delete',
  NOTE_VIEW = 'note.view',
  NOTE_EXPORT = 'note.export',
  
  // Sync operations
  SYNC_START = 'sync.start',
  SYNC_SUCCESS = 'sync.success',
  SYNC_FAILURE = 'sync.failure',
  SYNC_CONFLICT = 'sync.conflict',
  
  // Security events
  ENCRYPTION_ENABLED = 'security.encryption_enabled',
  ENCRYPTION_DISABLED = 'security.encryption_disabled',
  KEY_ROTATION = 'security.key_rotation',
  PASSWORD_CHANGED = 'security.password_changed',
  
  // Settings changes
  SETTINGS_UPDATE = 'settings.update',
  API_KEY_ADD = 'settings.api_key_add',
  API_KEY_REMOVE = 'settings.api_key_remove',
  
  // Suspicious activity
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  INVALID_INPUT = 'security.invalid_input',
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  userId?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  status: 'success' | 'failure' | 'pending';
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export interface AuditQuery {
  eventType?: AuditEventType[];
  userId?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'success' | 'failure' | 'pending';
  limit?: number;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private enabled = true;

  private constructor() {
    this.initializeAuditTable();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Initialize audit log table
   */
  private initializeAuditTable(): void {
    const db = getDatabase();
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS AuditLog (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        resource_id TEXT,
        resource_type TEXT,
        action TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success', 'failure', 'pending')),
        metadata TEXT,
        ip_address TEXT,
        user_agent TEXT,
        error_message TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON AuditLog(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_event_type ON AuditLog(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_user_id ON AuditLog(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_resource_id ON AuditLog(resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_status ON AuditLog(status);
    `);
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.enabled) return;

    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...event,
    };

    try {
      execute(
        `INSERT INTO AuditLog (
          id, timestamp, event_type, user_id, resource_id, resource_type,
          action, status, metadata, ip_address, user_agent, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditEvent.id,
          auditEvent.timestamp,
          auditEvent.eventType,
          auditEvent.userId || null,
          auditEvent.resourceId || null,
          auditEvent.resourceType || null,
          auditEvent.action,
          auditEvent.status,
          auditEvent.metadata ? JSON.stringify(auditEvent.metadata) : null,
          auditEvent.ipAddress || null,
          auditEvent.userAgent || null,
          auditEvent.errorMessage || null,
        ]
      );
    } catch (error) {
      // Don't throw errors from audit logging to avoid breaking the main flow
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Query audit logs
   */
  async query(params: AuditQuery): Promise<AuditEvent[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.eventType && params.eventType.length > 0) {
      conditions.push(`event_type IN (${params.eventType.map(() => '?').join(', ')})`);
      values.push(...params.eventType);
    }

    if (params.userId) {
      conditions.push('user_id = ?');
      values.push(params.userId);
    }

    if (params.resourceId) {
      conditions.push('resource_id = ?');
      values.push(params.resourceId);
    }

    if (params.startDate) {
      conditions.push('timestamp >= ?');
      values.push(params.startDate.getTime());
    }

    if (params.endDate) {
      conditions.push('timestamp <= ?');
      values.push(params.endDate.getTime());
    }

    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit || 100;

    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM AuditLog
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(...values, limit) as unknown[];

    return (rows as any[]).map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      userId: row.user_id,
      resourceId: row.resource_id,
      resourceType: row.resource_type,
      action: row.action,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      errorMessage: row.error_message,
    }));
  }

  /**
   * Export audit logs to JSON
   */
  async export(params: AuditQuery): Promise<string> {
    const logs = await this.query(params);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Delete old audit logs (for retention policy)
   */
  async cleanup(olderThanDays: number): Promise<number> {
    const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = execute(
      'DELETE FROM AuditLog WHERE timestamp < ?',
      [cutoffDate]
    );

    return result.changes;
  }

  /**
   * Enable/disable audit logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get audit statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    failureRate: number;
    recentFailures: AuditEvent[];
  }> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (startDate) {
      conditions.push('timestamp >= ?');
      values.push(startDate.getTime());
    }

    if (endDate) {
      conditions.push('timestamp <= ?');
      values.push(endDate.getTime());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const db = getDatabase();

    // Total events
    const totalResult = db.prepare(`
      SELECT COUNT(*) as count FROM AuditLog ${whereClause}
    `).get(...values) as { count: number };

    // Events by type
    const byTypeResults = db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM AuditLog ${whereClause}
      GROUP BY event_type
    `).all(...values) as Array<{ event_type: string; count: number }>;

    const eventsByType: Record<string, number> = {};
    byTypeResults.forEach(row => {
      eventsByType[row.event_type] = row.count;
    });

    // Failure rate
    const failureResult = db.prepare(`
      SELECT COUNT(*) as count FROM AuditLog
      ${whereClause}${whereClause ? ' AND' : 'WHERE'} status = 'failure'
    `).get(...values) as { count: number };

    const failureRate = totalResult.count > 0
      ? failureResult.count / totalResult.count
      : 0;

    // Recent failures
    const recentFailures = await this.query({
      status: 'failure',
      limit: 10,
      startDate,
      endDate,
    });

    return {
      totalEvents: totalResult.count,
      eventsByType,
      failureRate,
      recentFailures,
    };
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();