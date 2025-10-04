import { describe, it, expect, beforeEach } from 'vitest';

import { Note } from '@polynote/shared';

import { ConnectorRegistry } from '../ConnectorRegistry';
import { BaseConnector } from '../base/BaseConnector';

class MockConnector extends BaseConnector {
  name = 'mock-connector';

  async initialize(): Promise<void> {}
  async authenticate(): Promise<void> {}
  async pullChanges(since?: Date): Promise<Note[]> {
    return [];
  }
  async pushChanges(notes: Note[]): Promise<void> {}
  async getNote(id: string): Promise<Note | null> {
    return null;
  }
  async createNote(note: Omit<Note, 'id'>): Promise<Note> {
    return {
      id: 'mock-id',
      ...note,
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: this.name,
      source_id: 'mock-id',
      checksum: 'abc',
    };
  }
  async updateNote(id: string, note: Partial<Note>): Promise<Note> {
    return {
      id,
      title: 'Mock',
      body: 'Mock',
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: this.name,
      source_id: id,
      checksum: 'abc',
      ...note,
    };
  }
  async deleteNote(id: string): Promise<void> {}
}

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;
  let connector1: MockConnector;
  let connector2: MockConnector;

  beforeEach(() => {
    registry = new ConnectorRegistry();
    connector1 = new MockConnector();
    connector1.name = 'connector-1';
    connector2 = new MockConnector();
    connector2.name = 'connector-2';
  });

  describe('register', () => {
    it('should register a connector', () => {
      registry.register(connector1);
      expect(registry.has('connector-1')).toBe(true);
    });

    it('should throw when registering duplicate connector', () => {
      registry.register(connector1);
      expect(() => registry.register(connector1)).toThrow(
        'Connector connector-1 is already registered'
      );
    });

    it('should allow registering multiple different connectors', () => {
      registry.register(connector1);
      registry.register(connector2);

      expect(registry.has('connector-1')).toBe(true);
      expect(registry.has('connector-2')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister a connector', () => {
      registry.register(connector1);
      registry.unregister('connector-1');

      expect(registry.has('connector-1')).toBe(false);
    });

    it('should not throw when unregistering non-existent connector', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('get', () => {
    it('should retrieve registered connector', () => {
      registry.register(connector1);
      const retrieved = registry.get('connector-1');

      expect(retrieved).toBe(connector1);
    });

    it('should return undefined for non-existent connector', () => {
      const retrieved = registry.get('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no connectors registered', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });

    it('should return all registered connectors', () => {
      registry.register(connector1);
      registry.register(connector2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(connector1);
      expect(all).toContain(connector2);
    });
  });

  describe('getEnabled', () => {
    it('should return only enabled connectors', () => {
      connector1.enabled = true;
      connector2.enabled = false;

      registry.register(connector1);
      registry.register(connector2);

      const enabled = registry.getEnabled();
      expect(enabled).toHaveLength(1);
      expect(enabled[0]).toBe(connector1);
    });

    it('should return empty array when no connectors enabled', () => {
      connector1.enabled = false;
      connector2.enabled = false;

      registry.register(connector1);
      registry.register(connector2);

      const enabled = registry.getEnabled();
      expect(enabled).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for registered connector', () => {
      registry.register(connector1);
      expect(registry.has('connector-1')).toBe(true);
    });

    it('should return false for non-existent connector', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('initializeAll', () => {
    it('should initialize all connectors', async () => {
      let init1 = false;
      let init2 = false;

      connector1.initialize = async () => {
        init1 = true;
      };
      connector2.initialize = async () => {
        init2 = true;
      };

      registry.register(connector1);
      registry.register(connector2);

      await registry.initializeAll();

      expect(init1).toBe(true);
      expect(init2).toBe(true);
    });

    it('should not fail if no connectors registered', async () => {
      await expect(registry.initializeAll()).resolves.not.toThrow();
    });
  });

  describe('authenticateAll', () => {
    it('should authenticate only enabled connectors', async () => {
      let auth1 = false;
      let auth2 = false;

      connector1.enabled = true;
      connector1.authenticate = async () => {
        auth1 = true;
      };

      connector2.enabled = false;
      connector2.authenticate = async () => {
        auth2 = true;
      };

      registry.register(connector1);
      registry.register(connector2);

      await registry.authenticateAll();

      expect(auth1).toBe(true);
      expect(auth2).toBe(false);
    });

    it('should not fail if no enabled connectors', async () => {
      connector1.enabled = false;
      registry.register(connector1);

      await expect(registry.authenticateAll()).resolves.not.toThrow();
    });
  });
});
