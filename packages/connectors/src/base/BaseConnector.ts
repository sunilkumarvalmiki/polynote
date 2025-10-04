import { IConnector, Note, SyncResult } from '@polynote/shared';

export abstract class BaseConnector implements IConnector {
  abstract name: string;
  enabled: boolean = false;

  protected maxRetries: number = 3;
  protected retryDelay: number = 1000;

  abstract initialize(): Promise<void>;
  abstract authenticate(): Promise<void>;
  abstract pullChanges(since?: Date): Promise<Note[]>;
  abstract pushChanges(notes: Note[]): Promise<void>;
  abstract getNote(id: string): Promise<Note | null>;
  abstract createNote(note: Omit<Note, 'id'>): Promise<Note>;
  abstract updateNote(id: string, note: Partial<Note>): Promise<Note>;
  abstract deleteNote(id: string): Promise<void>;

  /**
   * Retry logic with exponential backoff
   */
  protected async retry<T>(fn: () => Promise<T>, retries: number = this.maxRetries): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;

      await this.sleep(this.retryDelay * (this.maxRetries - retries + 1));
      return this.retry(fn, retries - 1);
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Rate limiter helper
   */
  protected createRateLimiter(requestsPerSecond: number) {
    const minInterval = 1000 / requestsPerSecond;
    let lastCall = 0;

    return async <T>(fn: () => Promise<T>): Promise<T> => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;

      if (timeSinceLastCall < minInterval) {
        await this.sleep(minInterval - timeSinceLastCall);
      }

      lastCall = Date.now();
      return fn();
    };
  }

  /**
   * Validate note structure
   */
  protected validateNote(note: Partial<Note>): void {
    if (!note.title || note.title.trim() === '') {
      throw new Error('Note title is required');
    }
    if (!note.body) {
      throw new Error('Note body is required');
    }
  }

  /**
   * Sync helper
   */
  async sync(since?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      connector: this.name,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      const changes = await this.pullChanges(since);
      result.pulled = changes.length;
    } catch (error) {
      result.errors.push(`Pull failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}
