import { Client } from '@notionhq/client';

import { Note, generateChecksum } from '@polynote/shared';

import { BaseConnector } from '../base/BaseConnector.js';

interface NotionConfig {
  apiKey: string;
  enabled: boolean;
}

interface NotionBlock {
  id: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class NotionConnector extends BaseConnector {
  name = 'notion';
  private config: NotionConfig;
  private client?: Client;
  private rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>;
  private syncCursor?: string;

  constructor(config: NotionConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
    // Notion API rate limit: 3 requests per second
    this.rateLimiter = this.createRateLimiter(3);
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Notion API key is required');
    }

    this.client = new Client({
      auth: this.config.apiKey,
    });

    // Verify authentication by attempting to list databases
    await this.rateLimiter(() =>
      this.client!.search({
        filter: { property: 'object', value: 'database' },
        page_size: 1,
      })
    );
  }

  async authenticate(): Promise<void> {
    // OAuth 2.0 flow would be implemented here for production
    // For now, we use API key authentication
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }
    await Promise.resolve();
  }

  async pullChanges(since?: Date): Promise<Note[]> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    const notes: Note[] = [];
    let hasMore = true;
    let startCursor: string | undefined = this.syncCursor;

    while (hasMore) {
      const response = await this.rateLimiter(() =>
        this.client!.search({
          filter: { property: 'object', value: 'page' },
          sort: { direction: 'descending', timestamp: 'last_edited_time' },
          start_cursor: startCursor,
          page_size: 100,
        })
      );

      for (const page of response.results) {
        if (page.object === 'page') {
          const note = await this.convertPageToNote(page);
          if (note && (!since || note.updated_at >= since.getTime())) {
            notes.push(note);
          }
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;

      // Update sync cursor for delta sync
      if (!hasMore && startCursor) {
        this.syncCursor = startCursor;
      }
    }

    return notes;
  }

  async pushChanges(notes: Note[]): Promise<void> {
    for (const note of notes) {
      await this.updateOrCreatePage(note);
    }
  }

  async getNote(id: string): Promise<Note | null> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    try {
      const page = await this.rateLimiter(() => this.client!.pages.retrieve({ page_id: id }));
      return this.convertPageToNote(page);
    } catch (error) {
      interface NotionError {
        code?: string;
      }
      if ((error as NotionError).code === 'object_not_found') {
        return null;
      }
      throw error;
    }
  }

  async createNote(note: Omit<Note, 'id'>): Promise<Note> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    const blocks = this.markdownToNotionBlocks(note.body);

    const page = await this.rateLimiter(() =>
      this.client!.pages.create({
        parent: { type: 'page_id', page_id: process.env.NOTION_PARENT_PAGE_ID || '' },
        properties: {
          title: {
            title: [{ text: { content: note.title } }],
          },
        },
        children: blocks,
      })
    );

    const createdNote: Note = {
      id: page.id,
      title: note.title,
      body: note.body,
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: this.name,
      source_id: page.id,
      checksum: generateChecksum(note.body),
      tags: note.tags,
    };

    return createdNote;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    const existing = await this.getNote(id);
    if (!existing) {
      throw new Error(`Note not found: ${id}`);
    }

    // Update page properties
    if (updates.title) {
      await this.rateLimiter(() =>
        this.client!.pages.update({
          page_id: id,
          properties: {
            title: {
              title: [{ text: { content: updates.title! } }],
            },
          },
        })
      );
    }

    // Update page content if body changed
    if (updates.body) {
      // Delete existing blocks
      const blocks = await this.rateLimiter(() =>
        this.client!.blocks.children.list({ block_id: id })
      );

      for (const block of blocks.results) {
        await this.rateLimiter(() => this.client!.blocks.delete({ block_id: block.id }));
      }

      // Add new blocks
      const newBlocks = this.markdownToNotionBlocks(updates.body);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      await this.rateLimiter(() =>
        this.client!.blocks.children.append({
          block_id: id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          children: newBlocks,
        })
      );
    }

    const updated: Note = {
      ...existing,
      ...updates,
      updated_at: Date.now(),
      checksum: generateChecksum(updates.body || existing.body),
    };

    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.client) {
      throw new Error('Notion client not initialized');
    }

    await this.rateLimiter(() =>
      this.client!.pages.update({
        page_id: id,
        archived: true,
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async convertPageToNote(page: any): Promise<Note | null> {
    if (!this.client) return null;

    try {
      const title = this.extractTitle(page);
      const blocks = await this.rateLimiter(() =>
        this.client!.blocks.children.list({ block_id: (page as { id: string }).id })
      );

      const body = this.notionBlocksToMarkdown(blocks.results as NotionBlock[]);
      const createdTime = new Date((page as { created_time: string }).created_time).getTime();
      const updatedTime = new Date((page as { last_edited_time: string }).last_edited_time).getTime();

      return {
        id: (page as { id: string }).id,
        title,
        body,
        created_at: createdTime,
        updated_at: updatedTime,
        source_connector: this.name,
        source_id: (page as { id: string }).id,
        checksum: generateChecksum(body),
        tags: [],
      };
    } catch (error) {
      console.error(`Failed to convert page ${(page as { id: string }).id}:`, error);
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractTitle(page: any): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (page.properties?.title?.title?.[0]?.text?.content) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      return page.properties.title.title[0].text.content;
    }
    if (page.properties?.Name?.title?.[0]?.text?.content) {
      return page.properties.Name.title[0].text.content;
    }
    return 'Untitled';
  }

  private notionBlocksToMarkdown(blocks: NotionBlock[]): string {
    const lines: string[] = [];

    for (const block of blocks) {
      switch (block.type) {
        case 'paragraph':
          lines.push(this.richTextToMarkdown(block.paragraph?.rich_text || []));
          lines.push('');
          break;
        case 'heading_1':
          lines.push(`# ${this.richTextToMarkdown(block.heading_1?.rich_text || [])}`);
          lines.push('');
          break;
        case 'heading_2':
          lines.push(`## ${this.richTextToMarkdown(block.heading_2?.rich_text || [])}`);
          lines.push('');
          break;
        case 'heading_3':
          lines.push(`### ${this.richTextToMarkdown(block.heading_3?.rich_text || [])}`);
          lines.push('');
          break;
        case 'bulleted_list_item':
          lines.push(`- ${this.richTextToMarkdown(block.bulleted_list_item?.rich_text || [])}`);
          break;
        case 'numbered_list_item':
          lines.push(`1. ${this.richTextToMarkdown(block.numbered_list_item?.rich_text || [])}`);
          break;
        case 'code':
          const language = block.code?.language || '';
          const code = this.richTextToMarkdown(block.code?.rich_text || []);
          lines.push(`\`\`\`${language}`);
          lines.push(code);
          lines.push('```');
          lines.push('');
          break;
        case 'quote':
          lines.push(`> ${this.richTextToMarkdown(block.quote?.rich_text || [])}`);
          lines.push('');
          break;
      }
    }

    return lines.join('\n').trim();
  }

  private richTextToMarkdown(richText: any[]): string {
    return richText
      .map(text => {
        let content = text.plain_text || '';
        if (text.annotations?.bold) content = `**${content}**`;
        if (text.annotations?.italic) content = `*${content}*`;
        if (text.annotations?.code) content = `\`${content}\``;
        if (text.annotations?.strikethrough) content = `~~${content}~~`;
        if (text.href) content = `[${content}](${text.href})`;
        return content;
      })
      .join('');
  }

  private markdownToNotionBlocks(markdown: string): any[] {
    const blocks: any[] = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        blocks.push({
          type: 'heading_3',
          heading_3: {
            rich_text: [{ text: { content: trimmed.slice(4) } }],
          },
        });
      } else if (trimmed.startsWith('## ')) {
        blocks.push({
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: trimmed.slice(3) } }],
          },
        });
      } else if (trimmed.startsWith('# ')) {
        blocks.push({
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: trimmed.slice(2) } }],
          },
        });
      }
      // Lists
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: trimmed.slice(2) } }],
          },
        });
      } else if (/^\d+\.\s/.test(trimmed)) {
        blocks.push({
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{ text: { content: trimmed.replace(/^\d+\.\s/, '') } }],
          },
        });
      }
      // Code blocks
      else if (trimmed.startsWith('```')) {
        const language = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        let i = lines.indexOf(line) + 1;

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        blocks.push({
          type: 'code',
          code: {
            rich_text: [{ text: { content: codeLines.join('\n') } }],
            language: language || 'plain text',
          },
        });
      }
      // Quote
      else if (trimmed.startsWith('> ')) {
        blocks.push({
          type: 'quote',
          quote: {
            rich_text: [{ text: { content: trimmed.slice(2) } }],
          },
        });
      }
      // Regular paragraph
      else {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: trimmed } }],
          },
        });
      }
    }

    return blocks;
  }

  private async updateOrCreatePage(note: Note): Promise<void> {
    const existing = await this.getNote(note.id);
    if (existing) {
      await this.updateNote(note.id, note);
    } else {
      await this.createNote(note);
    }
  }

  async close(): Promise<void> {
    // Notion client doesn't require explicit cleanup
  }
}
