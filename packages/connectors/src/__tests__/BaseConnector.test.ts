import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Note, SyncResult } from '@polynote/shared';

import { BaseConnector } from '../base/BaseConnector';

// Mock implementation of BaseConnector for testing
class TestConnector extends BaseConnector {
  name = 'test-connector';

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async authenticate(): Promise<void> {
    return Promise.resolve();
  }

  async pullChanges(since?: Date): Promise<Note[]> {
    return Promise.resolve([]);
  }

  async pushChanges(notes: Note[]): Promise<void> {
    return Promise.resolve();
  }

  async getNote(id: string): Promise<Note | null> {
    return Promise.resolve(null);
  }

  async createNote(note: Omit<Note, 'id'>): Promise<Note> {
    return Promise.resolve({
      id: 'test-id',
      ...note,
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: this.name,
      source_id: 'test-id',
      checksum: 'abc123',
    });
  }

  async updateNote(id: string, note: Partial<Note>): Promise<Note> {
    return Promise.resolve({
      id,
      title: note.title || 'Test',
      body: note.body || 'Test body',
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: this.name,
      source_id: id,
      checksum: 'abc123',
    });
  }

  async deleteNote(id: string): Promise<void> {
    return Promise.resolve();
  }
}

describe('BaseConnector', () => {
  let connector: TestConnector;

  beforeEach(() => {
    connector = new TestConnector();
  });

  describe('initialization', () => {
    it('should have enabled property set to false by default', () => {
      expect(connector.enabled).toBe(false);
    });

    it('should have a name property', () => {
      expect(connector.name).toBe('test-connector');
    });
  });

  describe('retry mechanism', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const failTwiceThenSucceed = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await connector['retry'](failTwiceThenSucceed);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      const alwaysFails = async () => {
        throw new Error('Permanent failure');
      };

      await expect(connector['retry'](alwaysFails)).rejects.toThrow('Permanent failure');
    }, 10000);

    it('should succeed on first attempt if no error', async () => {
      let attempts = 0;
      const succeedsImmediately = async () => {
        attempts++;
        return 'immediate success';
      };

      const result = await connector['retry'](succeedsImmediately);
      expect(result).toBe('immediate success');
      expect(attempts).toBe(1);
    });

    it('should respect custom retry count', async () => {
      let attempts = 0;
      const alwaysFails = async () => {
        attempts++;
        throw new Error('Failure');
      };

      try {
        await connector['retry'](alwaysFails, 2);
      } catch (error) {
        // Expected to fail
      }

      expect(attempts).toBe(3); // Initial + 2 retries
    }, 10000);
  });

  describe('sleep utility', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await connector['sleep'](100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow 10ms tolerance
    });
  });

  describe('rate limiter', () => {
    it('should limit request rate', async () => {
      const limiter = connector['createRateLimiter'](10); // 10 requests per second
      const timestamps: number[] = [];

      for (let i = 0; i < 3; i++) {
        await limiter(async () => {
          timestamps.push(Date.now());
          return i;
        });
      }

      // Check that requests are spaced at least 100ms apart (1000ms / 10 req/s)
      for (let i = 1; i < timestamps.length; i++) {
        const gap = timestamps[i] - timestamps[i - 1];
        expect(gap).toBeGreaterThanOrEqual(90); // 10ms tolerance
      }
    });

    it('should pass through return values', async () => {
      const limiter = connector['createRateLimiter'](100);
      const result = await limiter(async () => 'test-value');

      expect(result).toBe('test-value');
    });
  });

  describe('validateNote', () => {
    it('should pass for valid note', () => {
      const validNote: Partial<Note> = {
        title: 'Test Note',
        body: 'Test body content',
      };

      expect(() => connector['validateNote'](validNote)).not.toThrow();
    });

    it('should throw for missing title', () => {
      const invalidNote: Partial<Note> = {
        body: 'Test body',
      };

      expect(() => connector['validateNote'](invalidNote)).toThrow('Note title is required');
    });

    it('should throw for empty title', () => {
      const invalidNote: Partial<Note> = {
        title: '   ',
        body: 'Test body',
      };

      expect(() => connector['validateNote'](invalidNote)).toThrow('Note title is required');
    });

    it('should throw for missing body', () => {
      const invalidNote: Partial<Note> = {
        title: 'Test Note',
      };

      expect(() => connector['validateNote'](invalidNote)).toThrow('Note body is required');
    });
  });

  describe('sync', () => {
    it('should pull changes and return result', async () => {
      const result = await connector.sync();

      expect(result).toHaveProperty('connector', 'test-connector');
      expect(result).toHaveProperty('pulled', 0);
      expect(result).toHaveProperty('pushed', 0);
      expect(result).toHaveProperty('conflicts', 0);
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle pull errors gracefully', async () => {
      class ErrorConnector extends TestConnector {
        async pullChanges(): Promise<Note[]> {
          throw new Error('Pull failed');
        }
      }

      const errorConnector = new ErrorConnector();
      const result = await errorConnector.sync();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Pull failed');
    });

    it('should support since parameter', async () => {
      const since = new Date();
      let receivedSince: Date | undefined;

      class TrackingConnector extends TestConnector {
        async pullChanges(since?: Date): Promise<Note[]> {
          receivedSince = since;
          return [];
        }
      }

      const trackingConnector = new TrackingConnector();
      await trackingConnector.sync(since);

      expect(receivedSince).toBe(since);
    });
  });

  describe('abstract methods', () => {
    it('should require implementation of initialize', () => {
      expect(typeof connector.initialize).toBe('function');
    });

    it('should require implementation of authenticate', () => {
      expect(typeof connector.authenticate).toBe('function');
    });

    it('should require implementation of pullChanges', () => {
      expect(typeof connector.pullChanges).toBe('function');
    });

    it('should require implementation of pushChanges', () => {
      expect(typeof connector.pushChanges).toBe('function');
    });

    it('should require implementation of getNote', () => {
      expect(typeof connector.getNote).toBe('function');
    });

    it('should require implementation of createNote', () => {
      expect(typeof connector.createNote).toBe('function');
    });

    it('should require implementation of updateNote', () => {
      expect(typeof connector.updateNote).toBe('function');
    });

    it('should require implementation of deleteNote', () => {
      expect(typeof connector.deleteNote).toBe('function');
    });
  });
});
