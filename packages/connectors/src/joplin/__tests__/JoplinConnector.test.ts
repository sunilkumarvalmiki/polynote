import axios from 'axios';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { JoplinConnector } from '../JoplinConnector.js';

vi.mock('axios');

describe('JoplinConnector', () => {
  let connector: JoplinConnector;
  const mockConfig = {
    apiToken: 'test-token',
    apiUrl: 'http://localhost:41184',
    enabled: true,
  };

  beforeEach(() => {
    connector = new JoplinConnector(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await connector.close();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(connector.name).toBe('joplin');
      expect(connector.enabled).toBe(true);
    });

    it('should set enabled state from config', () => {
      const disabledConnector = new JoplinConnector({
        ...mockConfig,
        enabled: false,
      });
      expect(disabledConnector.enabled).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should throw error if API token is missing', async () => {
      const invalidConnector = new JoplinConnector({
        apiToken: '',
        apiUrl: mockConfig.apiUrl,
        enabled: true,
      });

      await expect(invalidConnector.initialize()).rejects.toThrow('Joplin API token is required');
    });

    it('should create axios client with correct config', async () => {
      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: 'pong' }),
      });
      (axios.create as any) = mockCreate;

      await connector.initialize();

      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: mockConfig.apiUrl,
        headers: {
          Authorization: `Bearer ${mockConfig.apiToken}`,
        },
        timeout: 10000,
      });
    });

    it('should use default API URL if not provided', async () => {
      const connectorWithoutUrl = new JoplinConnector({
        apiToken: 'test-token',
        apiUrl: '',
        enabled: true,
      });

      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: 'pong' }),
      });
      (axios.create as any) = mockCreate;

      await connectorWithoutUrl.initialize();

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:41184',
        })
      );
    });

    it('should verify API connection with ping', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: 'pong' });
      const mockCreate = vi.fn().mockReturnValue({
        get: mockGet,
      });
      (axios.create as any) = mockCreate;

      await connector.initialize();

      expect(mockGet).toHaveBeenCalledWith('/ping');
    });

    it('should handle ping failure', async () => {
      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error('Connection failed')),
      });
      (axios.create as any) = mockCreate;

      await expect(connector.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('authenticate', () => {
    it('should throw error if client not initialized', async () => {
      await expect(connector.authenticate()).rejects.toThrow('Joplin client not initialized');
    });

    it('should succeed if client is initialized', async () => {
      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: 'pong' }),
      });
      (axios.create as any) = mockCreate;

      await connector.initialize();
      await expect(connector.authenticate()).resolves.not.toThrow();
    });
  });

  describe('pullChanges', () => {
    beforeEach(async () => {
      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: 'pong' }),
      });
      (axios.create as any) = mockCreate;
      await connector.initialize();
    });

    it('should throw error if client not initialized', async () => {
      const uninitializedConnector = new JoplinConnector(mockConfig);
      await expect(uninitializedConnector.pullChanges()).rejects.toThrow(
        'Joplin client not initialized'
      );
    });

    it('should fetch all notes with pagination', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          title: 'Test Note 1',
          body: 'Content 1',
          created_time: Date.now(),
          updated_time: Date.now(),
          user_created_time: Date.now(),
          user_updated_time: Date.now(),
          is_todo: 0,
          todo_completed: 0,
          parent_id: '',
        },
      ];

      const mockGet = vi.fn().mockResolvedValueOnce({
        data: { items: mockNotes, has_more: false },
      });

      (connector as any).client = { get: mockGet };

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Test Note 1');
      expect(mockGet).toHaveBeenCalledWith('/notes', {
        params: expect.objectContaining({
          fields: expect.any(String),
          limit: 100,
          page: 1,
        }),
      });
    });

    it('should handle multiple pages of notes', async () => {
      const mockGet = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: 'note-1',
                title: 'Note 1',
                body: 'Content 1',
                created_time: Date.now(),
                updated_time: Date.now(),
                user_created_time: Date.now(),
                user_updated_time: Date.now(),
                is_todo: 0,
                todo_completed: 0,
                parent_id: '',
              },
            ],
            has_more: true,
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: 'note-2',
                title: 'Note 2',
                body: 'Content 2',
                created_time: Date.now(),
                updated_time: Date.now(),
                user_created_time: Date.now(),
                user_updated_time: Date.now(),
                is_todo: 0,
                todo_completed: 0,
                parent_id: '',
              },
            ],
            has_more: false,
          },
        });

      (connector as any).client = { get: mockGet };

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(2);
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenCalledWith('/notes', {
        params: expect.objectContaining({ page: 1 }),
      });
      expect(mockGet).toHaveBeenCalledWith('/notes', {
        params: expect.objectContaining({ page: 2 }),
      });
    });

    it('should filter notes by date when since parameter provided', async () => {
      const oldTime = Date.now() - 10000;
      const newTime = Date.now();

      const mockGet = vi.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: 'old-note',
              title: 'Old Note',
              body: 'Old Content',
              created_time: oldTime,
              updated_time: oldTime,
              user_created_time: oldTime,
              user_updated_time: oldTime,
              is_todo: 0,
              todo_completed: 0,
              parent_id: '',
            },
            {
              id: 'new-note',
              title: 'New Note',
              body: 'New Content',
              created_time: newTime,
              updated_time: newTime,
              user_created_time: newTime,
              user_updated_time: newTime,
              is_todo: 0,
              todo_completed: 0,
              parent_id: '',
            },
          ],
          has_more: false,
        },
      });

      (connector as any).client = { get: mockGet };

      const since = new Date(Date.now() - 5000);
      const notes = await connector.pullChanges(since);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('new-note');
    });

    it('should handle empty response', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        data: { items: [], has_more: false },
      });

      (connector as any).client = { get: mockGet };

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(0);
    });
  });

  describe('getNote', () => {
    beforeEach(async () => {
      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: 'pong' }),
      });
      (axios.create as any) = mockCreate;
      await connector.initialize();
    });

    it('should fetch specific note by id', async () => {
      const mockNote = {
        id: 'test-id',
        title: 'Test Note',
        body: 'Test Content',
        created_time: Date.now(),
        updated_time: Date.now(),
        user_created_time: Date.now(),
        user_updated_time: Date.now(),
        is_todo: 0,
        todo_completed: 0,
        parent_id: '',
      };

      const mockGet = vi.fn().mockResolvedValue({ data: mockNote });
      (connector as any).client = { get: mockGet };

      const note = await connector.getNote('test-id');

      expect(note).not.toBeNull();
      expect(note?.title).toBe('Test Note');
      expect(mockGet).toHaveBeenCalledWith('/notes/test-id', {
        params: expect.objectContaining({
          fields: expect.any(String),
        }),
      });
    });

    it('should return null for 404 errors', async () => {
      const mockGet = vi.fn().mockRejectedValue({
        response: { status: 404 },
      });
      (connector as any).client = { get: mockGet };

      // Mock retry to bypass retry logic for this test
      vi.spyOn(connector as any, 'retry').mockImplementation((fn: any) => fn());

      const note = await connector.getNote('nonexistent-id');

      expect(note).toBeNull();
    });

    it('should throw for other errors', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Server error'));
      (connector as any).client = { get: mockGet };

      // Mock retry to bypass retry logic for this test
      vi.spyOn(connector as any, 'retry').mockImplementation((fn: any) => fn());

      await expect(connector.getNote('test-id')).rejects.toThrow('Server error');
    });
  });

  describe('createNote', () => {
    beforeEach(async () => {
      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: 'pong' }),
      });
      (axios.create as any) = mockCreate;
      await connector.initialize();
    });

    it('should create new note', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        data: { id: 'new-id' },
      });
      (connector as any).client = { post: mockPost };

      const note = await connector.createNote({
        title: 'New Note',
        body: 'New Content',
        created_at: Date.now(),
        updated_at: Date.now(),
        source_connector: 'joplin',
        source_id: 'test',
        checksum: 'abc123',
        tags: [],
      });

      expect(note.id).toBe('new-id');
      expect(note.title).toBe('New Note');
      expect(mockPost).toHaveBeenCalledWith('/notes', {
        title: 'New Note',
        body: 'New Content',
      });
    });

    it('should throw if client not initialized', async () => {
      const uninitializedConnector = new JoplinConnector(mockConfig);

      await expect(
        uninitializedConnector.createNote({
          title: 'Test',
          body: 'Test',
          created_at: Date.now(),
          updated_at: Date.now(),
          source_connector: 'joplin',
          source_id: 'test',
          checksum: 'abc',
          tags: [],
        })
      ).rejects.toThrow('Joplin client not initialized');
    });
  });

  describe('updateNote', () => {
    beforeEach(async () => {
      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: 'pong' }),
      });
      (axios.create as any) = mockCreate;
      await connector.initialize();
    });

    it('should update existing note', async () => {
      const existingNote = {
        id: 'existing-id',
        title: 'Old Title',
        body: 'Old Body',
        created_time: Date.now(),
        updated_time: Date.now(),
        user_created_time: Date.now(),
        user_updated_time: Date.now(),
        is_todo: 0,
        todo_completed: 0,
        parent_id: '',
      };

      const mockGet = vi.fn().mockResolvedValue({ data: existingNote });
      const mockPut = vi.fn().mockResolvedValue({ data: {} });
      (connector as any).client = { get: mockGet, put: mockPut };

      const updated = await connector.updateNote('existing-id', {
        title: 'New Title',
        body: 'New Body',
      });

      expect(updated.title).toBe('New Title');
      expect(updated.body).toBe('New Body');
      expect(mockPut).toHaveBeenCalledWith('/notes/existing-id', {
        title: 'New Title',
        body: 'New Body',
      });
    });

    it('should throw if note not found', async () => {
      const mockGet = vi.fn().mockRejectedValue({
        response: { status: 404 },
      });
      (connector as any).client = { get: mockGet };

      // Mock retry to bypass retry logic for this test
      vi.spyOn(connector as any, 'retry').mockImplementation((fn: any) => fn());

      await expect(connector.updateNote('nonexistent', { title: 'New' })).rejects.toThrow(
        'Note not found'
      );
    });
  });

  describe('deleteNote', () => {
    beforeEach(async () => {
      const mockCreate = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: 'pong' }),
      });
      (axios.create as any) = mockCreate;
      await connector.initialize();
    });

    it('should delete note by id', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ data: {} });
      (connector as any).client = { delete: mockDelete };

      await connector.deleteNote('test-id');

      expect(mockDelete).toHaveBeenCalledWith('/notes/test-id');
    });

    it('should throw if client not initialized', async () => {
      const uninitializedConnector = new JoplinConnector(mockConfig);

      await expect(uninitializedConnector.deleteNote('test-id')).rejects.toThrow(
        'Joplin client not initialized'
      );
    });
  });

  describe('close', () => {
    it('should close without errors', async () => {
      await expect(connector.close()).resolves.not.toThrow();
    });
  });
});
