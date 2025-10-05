/**
 * Database Connection Pool
 *
 * Manages a pool of read-only SQLite connections for concurrent read operations.
 * This prevents lock contention and improves read performance under load.
 *
 * Features:
 * - Multiple read-only connections for concurrent queries
 * - Single write connection for data modifications
 * - Automatic connection reuse and cleanup
 * - Connection health monitoring
 * - Configurable pool size
 */

import Database from 'better-sqlite3';
import { EventEmitter } from 'node:events';

export interface PoolConfig {
  /** Path to the database file */
  dbPath: string;
  /** Maximum number of read connections (default: 4) */
  maxReadConnections?: number;
  /** Connection idle timeout in ms (default: 60000) */
  idleTimeout?: number;
  /** Enable connection monitoring (default: true) */
  monitoring?: boolean;
}

export interface PoolStats {
  activeReadConnections: number;
  idleReadConnections: number;
  totalReadQueries: number;
  totalWriteQueries: number;
  averageReadTime: number;
  averageWriteTime: number;
}

interface PooledConnection {
  connection: Database.Database;
  inUse: boolean;
  lastUsed: number;
  queryCount: number;
}

/**
 * Connection pool for SQLite database
 */
export class ConnectionPool extends EventEmitter {
  private writeConnection: Database.Database | null = null;
  private readConnections: PooledConnection[] = [];
  private config: Required<PoolConfig>;
  private stats: PoolStats = {
    activeReadConnections: 0,
    idleReadConnections: 0,
    totalReadQueries: 0,
    totalWriteQueries: 0,
    averageReadTime: 0,
    averageWriteTime: 0,
  };
  private totalReadTime = 0;
  private totalWriteTime = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: PoolConfig) {
    super();
    this.config = {
      dbPath: config.dbPath,
      maxReadConnections: config.maxReadConnections ?? 4,
      idleTimeout: config.idleTimeout ?? 60000,
      monitoring: config.monitoring ?? true,
    };
  }

  /**
   * Initialize the connection pool
   */
  initialize(): void {
    // Create write connection with WAL mode
    this.writeConnection = this.createConnection(false);

    // Pre-create one read connection
    this.createReadConnection();

    // Start cleanup interval
    if (this.config.monitoring) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupIdleConnections();
      }, this.config.idleTimeout);
    }

    this.emit('initialized', { maxReadConnections: this.config.maxReadConnections });
  }

  /**
   * Execute a read query using a connection from the pool
   */
  async read<T = unknown>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]> {
    const connection = await this.acquireReadConnection();
    const startTime = Date.now();

    try {
      const stmt = connection.prepare(sql);
      const results = params ? stmt.all(...params) : stmt.all();

      // Update stats
      const duration = Date.now() - startTime;
      this.updateReadStats(duration);

      return results as T[];
    } finally {
      this.releaseReadConnection(connection);
    }
  }

  /**
   * Execute a read query and return the first result
   */
  async readOne<T = unknown>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null> {
    const results = await this.read<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a write query using the write connection
   */
  write(
    sql: string,
    params?: unknown[]
  ): Database.RunResult {
    if (!this.writeConnection) {
      throw new Error('Connection pool not initialized');
    }

    const startTime = Date.now();

    try {
      const stmt = this.writeConnection.prepare(sql);
      const result = params ? stmt.run(...params) : stmt.run();

      // Update stats
      const duration = Date.now() - startTime;
      this.updateWriteStats(duration);

      return result;
    } catch (error) {
      this.emit('write-error', { sql, error });
      throw error;
    }
  }

  /**
   * Execute multiple write operations in a transaction
   */
  writeTransaction(
    operations: Array<{ sql: string; params?: unknown[] }>
  ): void {
    if (!this.writeConnection) {
      throw new Error('Connection pool not initialized');
    }

    const startTime = Date.now();

    try {
      const transaction = this.writeConnection.transaction(() => {
        for (const op of operations) {
          const stmt = this.writeConnection!.prepare(op.sql);
          if (op.params) {
            stmt.run(...op.params);
          } else {
            stmt.run();
          }
        }
      });

      transaction();

      // Update stats
      const duration = Date.now() - startTime;
      this.updateWriteStats(duration);

      this.emit('transaction-complete', {
        operations: operations.length,
        duration,
      });
    } catch (error) {
      this.emit('transaction-error', { operations, error });
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    this.stats.activeReadConnections = this.readConnections.filter(c => c.inUse).length;
    this.stats.idleReadConnections = this.readConnections.filter(c => !c.inUse).length;
    return { ...this.stats };
  }

  /**
   * Close all connections in the pool
   */
  close(): void {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all read connections
    for (const pooledConn of this.readConnections) {
      try {
        pooledConn.connection.close();
      } catch (error) {
        this.emit('error', { type: 'close-read-connection', error });
      }
    }
    this.readConnections = [];

    // Close write connection
    if (this.writeConnection) {
      try {
        this.writeConnection.close();
        this.writeConnection = null;
      } catch (error) {
        this.emit('error', { type: 'close-write-connection', error });
      }
    }

    this.emit('closed');
  }

  /**
   * Create a new database connection
   */
  private createConnection(readOnly: boolean): Database.Database {
    const connection = new Database(this.config.dbPath, {
      readonly: readOnly,
    });

    // Apply optimizations
    if (!readOnly) {
      // Write connection optimizations
      connection.pragma('journal_mode = WAL');
      connection.pragma('foreign_keys = ON');
      connection.pragma('synchronous = NORMAL');
      connection.pragma('temp_store = MEMORY');
      connection.pragma('mmap_size = 30000000000');
      connection.pragma('page_size = 4096');
      connection.pragma('cache_size = -64000');
      connection.pragma('busy_timeout = 5000');
    } else {
      // Read-only connection optimizations
      connection.pragma('temp_store = MEMORY');
      connection.pragma('cache_size = -32000'); // 32MB cache for reads
      connection.pragma('mmap_size = 30000000000');
      connection.pragma('page_size = 4096');
      connection.pragma('locking_mode = NORMAL');
      connection.pragma('read_uncommitted = true'); // Allow dirty reads
    }

    return connection;
  }

  /**
   * Create a new read connection and add it to the pool
   */
  private createReadConnection(): PooledConnection {
    const connection = this.createConnection(true);
    const pooledConn: PooledConnection = {
      connection,
      inUse: false,
      lastUsed: Date.now(),
      queryCount: 0,
    };

    this.readConnections.push(pooledConn);
    this.emit('read-connection-created', {
      total: this.readConnections.length,
    });

    return pooledConn;
  }

  /**
   * Acquire a read connection from the pool
   */
  private async acquireReadConnection(): Promise<Database.Database> {
    // Try to find an idle connection
    const idle = this.readConnections.find(c => !c.inUse);

    if (idle) {
      idle.inUse = true;
      idle.lastUsed = Date.now();
      idle.queryCount++;
      return idle.connection;
    }

    // Create a new connection if we haven't reached the limit
    if (this.readConnections.length < this.config.maxReadConnections) {
      const newConn = this.createReadConnection();
      newConn.inUse = true;
      newConn.lastUsed = Date.now();
      newConn.queryCount++;
      return newConn.connection;
    }

    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.readConnections.find(c => !c.inUse);
        if (available) {
          clearInterval(checkInterval);
          available.inUse = true;
          available.lastUsed = Date.now();
          available.queryCount++;
          resolve(available.connection);
        }
      }, 10);
    });
  }

  /**
   * Release a read connection back to the pool
   */
  private releaseReadConnection(connection: Database.Database): void {
    const pooledConn = this.readConnections.find(c => c.connection === connection);
    if (pooledConn) {
      pooledConn.inUse = false;
      pooledConn.lastUsed = Date.now();
    }
  }

  /**
   * Clean up idle connections that haven't been used recently
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const threshold = now - this.config.idleTimeout;

    // Keep at least one read connection
    if (this.readConnections.length <= 1) return;

    const toRemove = this.readConnections.filter(
      c => !c.inUse && c.lastUsed < threshold
    );

    for (const pooledConn of toRemove) {
      try {
        pooledConn.connection.close();
        const index = this.readConnections.indexOf(pooledConn);
        if (index > -1) {
          this.readConnections.splice(index, 1);
        }
        this.emit('connection-cleaned', {
          lastUsed: new Date(pooledConn.lastUsed),
          queryCount: pooledConn.queryCount,
        });
      } catch (error) {
        this.emit('error', { type: 'cleanup-connection', error });
      }
    }
  }

  /**
   * Update read statistics
   */
  private updateReadStats(duration: number): void {
    this.stats.totalReadQueries++;
    this.totalReadTime += duration;
    this.stats.averageReadTime = this.totalReadTime / this.stats.totalReadQueries;
  }

  /**
   * Update write statistics
   */
  private updateWriteStats(duration: number): void {
    this.stats.totalWriteQueries++;
    this.totalWriteTime += duration;
    this.stats.averageWriteTime = this.totalWriteTime / this.stats.totalWriteQueries;
  }
}
