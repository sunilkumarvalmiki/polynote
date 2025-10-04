import { Note } from '@polynote/shared';
import { BaseConnector } from '../base/BaseConnector.js';
import { watch, FSWatcher } from 'chokidar';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import matter from 'gray-matter';
import { generateChecksum } from '@polynote/shared';
import { v4 as uuidv4 } from 'uuid';

interface ObsidianConfig {
  vaultPath: string;
  enabled: boolean;
}

export class ObsidianConnector extends BaseConnector {
  name = 'obsidian';
  private config: ObsidianConfig;
  private watcher?: FSWatcher;

  constructor(config: ObsidianConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.config.vaultPath)) {
      throw new Error(`Obsidian vault not found: ${this.config.vaultPath}`);
    }

    // Start file watcher
    this.watcher = watch(this.config.vaultPath, {
      persistent: true,
      ignoreInitial: false,
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (path) => this.handleFileChange(path));
    this.watcher.on('change', (path) => this.handleFileChange(path));
    this.watcher.on('unlink', (path) => this.handleFileDelete(path));
  }

  async authenticate(): Promise<void> {
    // Obsidian is local, no authentication needed
    return Promise.resolve();
  }

  async pullChanges(since?: Date): Promise<Note[]> {
    // Read all markdown files from vault
    const files = this.getAllMarkdownFiles(this.config.vaultPath);
    const notes: Note[] = [];

    for (const filePath of files) {
      const note = await this.parseMarkdownFile(filePath);
      if (note && (!since || note.updated_at >= since.getTime())) {
        notes.push(note);
      }
    }

    return notes;
  }

  async pushChanges(notes: Note[]): Promise<void> {
    for (const note of notes) {
      await this.writeNote(note);
    }
  }

  async getNote(id: string): Promise<Note | null> {
    const filePath = this.getFilePath(id);
    if (!existsSync(filePath)) return null;
    return this.parseMarkdownFile(filePath);
  }

  async createNote(note: Omit<Note, 'id'>): Promise<Note> {
    const newNote: Note = {
      ...note,
      id: uuidv4(),
      source_connector: this.name,
      source_id: uuidv4(),
      created_at: Date.now(),
      updated_at: Date.now(),
      checksum: generateChecksum(note.body),
    };

    await this.writeNote(newNote);
    return newNote;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const existing = await this.getNote(id);
    if (!existing) {
      throw new Error(`Note not found: ${id}`);
    }

    const updated: Note = {
      ...existing,
      ...updates,
      updated_at: Date.now(),
      checksum: generateChecksum(updates.body || existing.body),
    };

    await this.writeNote(updated);
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    const filePath = this.getFilePath(id);
    if (existsSync(filePath)) {
      // Mark as deleted instead of actually deleting
      const note = await this.getNote(id);
      if (note) {
        note.deleted_at = Date.now();
        await this.writeNote(note);
      }
    }
  }

  private async parseMarkdownFile(filePath: string): Promise<Note | null> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content: body } = matter(content);

      const stats = require('node:fs').statSync(filePath);
      const id = frontmatter.id || basename(filePath, extname(filePath));

      return {
        id,
        title: frontmatter.title || basename(filePath, '.md'),
        body,
        created_at: frontmatter.created_at || stats.birthtimeMs,
        updated_at: frontmatter.updated_at || stats.mtimeMs,
        deleted_at: frontmatter.deleted_at,
        source_connector: this.name,
        source_id: id,
        checksum: generateChecksum(body),
        tags: frontmatter.tags || [],
      };
    } catch (error) {
      console.error(`Failed to parse ${filePath}:`, error);
      return null;
    }
  }

  private async writeNote(note: Note): Promise<void> {
    const filePath = this.getFilePath(note.id);
    const frontmatter = {
      id: note.id,
      title: note.title,
      created_at: note.created_at,
      updated_at: note.updated_at,
      deleted_at: note.deleted_at,
      tags: note.tags,
    };

    const content = matter.stringify(note.body, frontmatter);
    
    const dir = join(this.config.vaultPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, content, 'utf-8');
  }

  private getFilePath(id: string): string {
    return join(this.config.vaultPath, `${id}.md`);
  }

  private getAllMarkdownFiles(dir: string): string[] {
    const fs = require('node:fs');
    const files: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.getAllMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async handleFileChange(path: string): Promise<void> {
    if (!path.endsWith('.md')) return;
    console.log(`Obsidian file changed: ${path}`);
    // TODO: Trigger sync
  }

  private async handleFileDelete(path: string): Promise<void> {
    if (!path.endsWith('.md')) return;
    console.log(`Obsidian file deleted: ${path}`);
    // TODO: Trigger sync
  }

  async close(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }
  }
}