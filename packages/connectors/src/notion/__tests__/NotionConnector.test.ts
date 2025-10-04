import { Client } from '@notionhq/client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { Note } from '@polynote/shared';

import { NotionConnector } from '../NotionConnector.js';

vi.mock('@notionhq/client');

describe('NotionConnector', () => {
  let connector: NotionConnector;
  const mockConfig = {
    apiKey: 'test-api-key',
    enabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new NotionConnector(mockConfig);
  });

  describe('Initialization', () => {
    it('should create connector with correct config', () => {
      expect(connector.name).toBe('notion');
      expect(connector.enabled).toBe(true);
    });

    it('should throw error if API key is missing', async () => {
      const invalidConnector = new NotionConnector({ apiKey: '', enabled: true });
      await expect(invalidConnector.initialize()).rejects.toThrow('Notion API key is required');
    });

    it('should initialize Notion client with API key', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ results: [] });
      (Client as any).mockImplementation(() => ({
        search: mockSearch,
      }));

      await connector.initialize();

      expect(Client).toHaveBeenCalledWith({ auth: 'test-api-key' });
      expect(mockSearch).toHaveBeenCalled();
    });

    it('should verify authentication during initialization', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ results: [] });
      (Client as any).mockImplementation(() => ({
        search: mockSearch,
      }));

      await connector.initialize();

      expect(mockSearch).toHaveBeenCalledWith({
        filter: { property: 'object', value: 'database' },
        page_size: 1,
      });
    });

    it('should handle initialization failure', async () => {
      (Client as any).mockImplementation(() => ({
        search: vi.fn().mockRejectedValue(new Error('Network error')),
      }));

      await expect(connector.initialize()).rejects.toThrow('Network error');
    });

    it('should respect rate limiter during initialization', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ results: [] });
      (Client as any).mockImplementation(() => ({
        search: mockSearch,
      }));

      const rateLimiterSpy = vi.spyOn(connector as any, 'rateLimiter');
      await connector.initialize();

      expect(rateLimiterSpy).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should authenticate successfully when client is initialized', async () => {
      (connector as any).client = { search: vi.fn() };
      await expect(connector.authenticate()).resolves.toBeUndefined();
    });

    it('should throw error if client not initialized', async () => {
      await expect(connector.authenticate()).rejects.toThrow('Notion client not initialized');
    });
  });

  describe('Pull Changes', () => {
    const mockPage = {
      id: 'page-123',
      object: 'page',
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-02T00:00:00.000Z',
      properties: {
        title: {
          title: [{ text: { content: 'Test Page' } }],
        },
      },
    };

    beforeEach(() => {
      const mockBlocks = vi.fn().mockResolvedValue({ results: [] });
      (connector as any).client = {
        search: vi.fn(),
        blocks: { children: { list: mockBlocks } },
      };
    });

    it('should pull all pages when no since date provided', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        results: [mockPage],
        has_more: false,
        next_cursor: null,
      });
      (connector as any).client.search = mockSearch;

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Test Page');
      expect(mockSearch).toHaveBeenCalledWith({
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        start_cursor: undefined,
        page_size: 100,
      });
    });

    it('should filter notes by since date', async () => {
      const sinceDate = new Date('2024-01-01T12:00:00.000Z');
      const recentPage = {
        ...mockPage,
        last_edited_time: '2024-01-02T00:00:00.000Z',
      };
      const oldPage = {
        ...mockPage,
        id: 'old-page',
        last_edited_time: '2023-12-31T00:00:00.000Z',
      };

      (connector as any).client.search = vi.fn().mockResolvedValue({
        results: [recentPage, oldPage],
        has_more: false,
      });

      const notes = await connector.pullChanges(sinceDate);

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('page-123');
    });

    it('should handle pagination correctly', async () => {
      const mockSearch = vi
        .fn()
        .mockResolvedValueOnce({
          results: [mockPage],
          has_more: true,
          next_cursor: 'cursor-1',
        })
        .mockResolvedValueOnce({
          results: [{ ...mockPage, id: 'page-456' }],
          has_more: false,
          next_cursor: null,
        });

      (connector as any).client.search = mockSearch;

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(2);
      expect(mockSearch).toHaveBeenCalledTimes(2);
      expect(mockSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({ start_cursor: 'cursor-1' })
      );
    });

    it('should update sync cursor after successful pull', async () => {
      (connector as any).client.search = vi.fn().mockResolvedValue({
        results: [mockPage],
        has_more: false,
        next_cursor: 'final-cursor',
      });

      await connector.pullChanges();

      expect((connector as any).syncCursor).toBe('final-cursor');
    });

    it('should throw error if client not initialized', async () => {
      (connector as any).client = undefined;
      await expect(connector.pullChanges()).rejects.toThrow('Notion client not initialized');
    });

    it('should skip non-page objects', async () => {
      (connector as any).client.search = vi.fn().mockResolvedValue({
        results: [{ ...mockPage, object: 'database' }],
        has_more: false,
      });

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(0);
    });

    it('should handle conversion errors gracefully', async () => {
      (connector as any).client.search = vi.fn().mockResolvedValue({
        results: [mockPage],
        has_more: false,
      });
      (connector as any).client.blocks.children.list = vi.fn().mockRejectedValue(
        new Error('Block fetch failed')
      );

      const notes = await connector.pullChanges();

      expect(notes).toHaveLength(0);
    });
  });

  describe('Push Changes', () => {
    const mockNote: Note = {
      id: 'note-123',
      title: 'Test Note',
      body: '# Header\n\nContent',
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: 'notion',
      source_id: 'page-123',
      checksum: 'abc123',
      tags: [],
    };

    beforeEach(() => {
      (connector as any).client = {
        pages: {
          retrieve: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        blocks: {
          children: { list: vi.fn(), append: vi.fn() },
          delete: vi.fn(),
        },
      };
    });

    it('should update existing note', async () => {
      const mockGetNote = vi.spyOn(connector, 'getNote').mockResolvedValue(mockNote);
      const mockUpdateNote = vi.spyOn(connector, 'updateNote').mockResolvedValue(mockNote);

      await connector.pushChanges([mockNote]);

      expect(mockGetNote).toHaveBeenCalledWith('note-123');
      expect(mockUpdateNote).toHaveBeenCalled();
    });

    it('should create new note if not exists', async () => {
      const mockGetNote = vi.spyOn(connector, 'getNote').mockResolvedValue(null);
      const mockCreateNote = vi.spyOn(connector, 'createNote').mockResolvedValue(mockNote);

      await connector.pushChanges([mockNote]);

      expect(mockGetNote).toHaveBeenCalledWith('note-123');
      expect(mockCreateNote).toHaveBeenCalled();
    });

    it('should process multiple notes sequentially', async () => {
      const notes = [mockNote, { ...mockNote, id: 'note-456' }];
      const mockGetNote = vi.spyOn(connector, 'getNote').mockResolvedValue(null);
      const mockCreateNote = vi.spyOn(connector, 'createNote').mockResolvedValue(mockNote);

      await connector.pushChanges(notes);

      expect(mockGetNote).toHaveBeenCalledTimes(2);
      expect(mockCreateNote).toHaveBeenCalledTimes(2);
    });
  });

  describe('Get Note', () => {
    beforeEach(() => {
      (connector as any).client = {
        pages: { retrieve: vi.fn() },
        blocks: { children: { list: vi.fn().mockResolvedValue({ results: [] }) } },
      };
    });

    it('should retrieve note by ID', async () => {
      const mockPage = {
        id: 'page-123',
        created_time: '2024-01-01T00:00:00.000Z',
        last_edited_time: '2024-01-02T00:00:00.000Z',
        properties: {
          title: { title: [{ text: { content: 'Test' } }] },
        },
      };

      (connector as any).client.pages.retrieve = vi.fn().mockResolvedValue(mockPage);

      const note = await connector.getNote('page-123');

      expect(note).not.toBeNull();
      expect(note?.title).toBe('Test');
    });

    it('should return null for 404 errors', async () => {
      (connector as any).client.pages.retrieve = vi.fn().mockRejectedValue({
        code: 'object_not_found',
      });

      // Mock retry to bypass retry logic
      vi.spyOn(connector as any, 'retry').mockImplementation((fn: any) => fn());

      const note = await connector.getNote('nonexistent-id');

      expect(note).toBeNull();
    });

    it('should throw other errors', async () => {
      (connector as any).client.pages.retrieve = vi.fn().mockRejectedValue(
        new Error('Network error')
      );

      // Mock retry to bypass retry logic
      vi.spyOn(connector as any, 'retry').mockImplementation((fn: any) => fn());

      await expect(connector.getNote('page-123')).rejects.toThrow('Network error');
    });

    it('should throw error if client not initialized', async () => {
      (connector as any).client = undefined;
      await expect(connector.getNote('page-123')).rejects.toThrow('Notion client not initialized');
    });
  });

  describe('Create Note', () => {
    beforeEach(() => {
      (connector as any).client = {
        pages: { create: vi.fn() },
      };
    });

    it('should create note successfully', async () => {
      const newNote = {
        title: 'New Note',
        body: 'Content',
        created_at: Date.now(),
        updated_at: Date.now(),
        source_connector: 'notion',
        source_id: '',
        checksum: '',
        tags: [],
      };

      const mockPage = { id: 'new-page-id' };
      (connector as any).client.pages.create = vi.fn().mockResolvedValue(mockPage);

      const created = await connector.createNote(newNote);

      expect(created.id).toBe('new-page-id');
      expect(created.title).toBe('New Note');
    });

    it('should convert markdown to Notion blocks', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: 'page-id' });
      (connector as any).client.pages.create = mockCreate;

      await connector.createNote({
        title: 'Test',
        body: '# Header\n\nParagraph',
        created_at: Date.now(),
        updated_at: Date.now(),
        source_connector: 'notion',
        source_id: '',
        checksum: '',
        tags: [],
      });

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.children).toBeDefined();
      expect(createCall.children.length).toBeGreaterThan(0);
    });

    it('should throw error if client not initialized', async () => {
      (connector as any).client = undefined;
      await expect(
        connector.createNote({
          title: 'Test',
          body: 'Content',
          created_at: Date.now(),
          updated_at: Date.now(),
          source_connector: 'notion',
          source_id: '',
          checksum: '',
          tags: [],
        })
      ).rejects.toThrow('Notion client not initialized');
    });
  });

  describe('Update Note', () => {
    const mockNote: Note = {
      id: 'note-123',
      title: 'Original Title',
      body: 'Original content',
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: 'notion',
      source_id: 'page-123',
      checksum: 'abc123',
      tags: [],
    };

    beforeEach(() => {
      (connector as any).client = {
        pages: { update: vi.fn() },
        blocks: {
          children: {
            list: vi.fn().mockResolvedValue({ results: [] }),
            append: vi.fn(),
          },
          delete: vi.fn(),
        },
      };
    });

    it('should update note title', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(mockNote);
      const mockUpdate = vi.fn().mockResolvedValue({});
      (connector as any).client.pages.update = mockUpdate;

      await connector.updateNote('note-123', { title: 'New Title' });

      expect(mockUpdate).toHaveBeenCalledWith({
        page_id: 'note-123',
        properties: {
          title: {
            title: [{ text: { content: 'New Title' } }],
          },
        },
      });
    });

    it('should update note body by replacing blocks', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(mockNote);
      const mockBlocks = [{ id: 'block-1' }, { id: 'block-2' }];
      (connector as any).client.blocks.children.list = vi.fn().mockResolvedValue({
        results: mockBlocks,
      });
      const mockDelete = vi.fn();
      const mockAppend = vi.fn();
      (connector as any).client.blocks.delete = mockDelete;
      (connector as any).client.blocks.children.append = mockAppend;

      await connector.updateNote('note-123', { body: 'New content' });

      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockAppend).toHaveBeenCalled();
    });

    it('should throw error if note not found', async () => {
      vi.spyOn(connector, 'getNote').mockResolvedValue(null);

      await expect(connector.updateNote('nonexistent', { title: 'New' })).rejects.toThrow(
        'Note not found: nonexistent'
      );
    });

    it('should throw error if client not initialized', async () => {
      (connector as any).client = undefined;
      await expect(connector.updateNote('note-123', {})).rejects.toThrow(
        'Notion client not initialized'
      );
    });
  });

  describe('Delete Note', () => {
    beforeEach(() => {
      (connector as any).client = {
        pages: { update: vi.fn() },
      };
    });

    it('should archive note instead of deleting', async () => {
      const mockUpdate = vi.fn();
      (connector as any).client.pages.update = mockUpdate;

      await connector.deleteNote('page-123');

      expect(mockUpdate).toHaveBeenCalledWith({
        page_id: 'page-123',
        archived: true,
      });
    });

    it('should throw error if client not initialized', async () => {
      (connector as any).client = undefined;
      await expect(connector.deleteNote('page-123')).rejects.toThrow(
        'Notion client not initialized'
      );
    });
  });

  describe('Data Transformation', () => {
    it('should convert Notion blocks to markdown - paragraphs', () => {
      const blocks = [
        {
          type: 'paragraph',
          paragraph: { rich_text: [{ plain_text: 'Test paragraph' }] },
        },
      ];

      const markdown = (connector as any).notionBlocksToMarkdown(blocks);

      expect(markdown).toBe('Test paragraph');
    });

    it('should convert Notion blocks to markdown - headings', () => {
      const blocks = [
        {
          type: 'heading_1',
          heading_1: { rich_text: [{ plain_text: 'H1' }] },
        },
        {
          type: 'heading_2',
          heading_2: { rich_text: [{ plain_text: 'H2' }] },
        },
        {
          type: 'heading_3',
          heading_3: { rich_text: [{ plain_text: 'H3' }] },
        },
      ];

      const markdown = (connector as any).notionBlocksToMarkdown(blocks);

      expect(markdown).toContain('# H1');
      expect(markdown).toContain('## H2');
      expect(markdown).toContain('### H3');
    });

    it('should convert Notion blocks to markdown - lists', () => {
      const blocks = [
        {
          type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: [{ plain_text: 'Bullet' }] },
        },
        {
          type: 'numbered_list_item',
          numbered_list_item: { rich_text: [{ plain_text: 'Numbered' }] },
        },
      ];

      const markdown = (connector as any).notionBlocksToMarkdown(blocks);

      expect(markdown).toContain('- Bullet');
      expect(markdown).toContain('1. Numbered');
    });

    it('should convert Notion blocks to markdown - code blocks', () => {
      const blocks = [
        {
          type: 'code',
          code: {
            rich_text: [{ plain_text: 'const x = 1;' }],
            language: 'javascript',
          },
        },
      ];

      const markdown = (connector as any).notionBlocksToMarkdown(blocks);

      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('const x = 1;');
      expect(markdown).toContain('```');
    });

    it('should convert Notion blocks to markdown - quotes', () => {
      const blocks = [
        {
          type: 'quote',
          quote: { rich_text: [{ plain_text: 'Quoted text' }] },
        },
      ];

      const markdown = (connector as any).notionBlocksToMarkdown(blocks);

      expect(markdown).toContain('> Quoted text');
    });

    it('should handle rich text formatting', () => {
      const richText = [
        { plain_text: 'bold', annotations: { bold: true } },
        { plain_text: 'italic', annotations: { italic: true } },
        { plain_text: 'code', annotations: { code: true } },
        { plain_text: 'strike', annotations: { strikethrough: true } },
        { plain_text: 'link', href: 'https://example.com' },
      ];

      const markdown = (connector as any).richTextToMarkdown(richText);

      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('*italic*');
      expect(markdown).toContain('`code`');
      expect(markdown).toContain('~~strike~~');
      expect(markdown).toContain('[link](https://example.com)');
    });

    it('should convert markdown to Notion blocks - headings', () => {
      const markdown = '# H1\n## H2\n### H3';
      const blocks = (connector as any).markdownToNotionBlocks(markdown);

      expect(blocks).toHaveLength(3);
      expect(blocks[0].type).toBe('heading_1');
      expect(blocks[1].type).toBe('heading_2');
      expect(blocks[2].type).toBe('heading_3');
    });

    it('should convert markdown to Notion blocks - lists', () => {
      const markdown = '- Bullet\n* Another bullet\n1. Numbered';
      const blocks = (connector as any).markdownToNotionBlocks(markdown);

      expect(blocks[0].type).toBe('bulleted_list_item');
      expect(blocks[1].type).toBe('bulleted_list_item');
      expect(blocks[2].type).toBe('numbered_list_item');
    });

    it('should convert markdown to Notion blocks - code', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const blocks = (connector as any).markdownToNotionBlocks(markdown);

      expect(blocks[0].type).toBe('code');
      expect(blocks[0].code.language).toBe('javascript');
    });

    it('should convert markdown to Notion blocks - quotes', () => {
      const markdown = '> Quoted text';
      const blocks = (connector as any).markdownToNotionBlocks(markdown);

      expect(blocks[0].type).toBe('quote');
    });

    it('should extract title from page properties', () => {
      const page1 = {
        properties: {
          title: { title: [{ text: { content: 'Title 1' } }] },
        },
      };

      const page2 = {
        properties: {
          Name: { title: [{ text: { content: 'Title 2' } }] },
        },
      };

      const page3 = { properties: {} };

      expect((connector as any).extractTitle(page1)).toBe('Title 1');
      expect((connector as any).extractTitle(page2)).toBe('Title 2');
      expect((connector as any).extractTitle(page3)).toBe('Untitled');
    });
  });

  describe('Close', () => {
    it('should close without errors', async () => {
      await expect(connector.close()).resolves.toBeUndefined();
    });
  });
});