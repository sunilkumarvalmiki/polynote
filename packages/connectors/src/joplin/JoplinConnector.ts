import axios, { AxiosInstance } from 'axios';

import { Note , generateChecksum } from '@polynote/shared';

import { BaseConnector } from '../base/BaseConnector.js';

interface JoplinConfig {
  apiToken: string;
  apiUrl: string;
  enabled: boolean;
}

interface JoplinNote {
  id: string;
  title: string;
  body: string;
  created_time: number;
  updated_time: number;
  is_todo: number;
  todo_completed: number;
  parent_id: string;
  user_created_time: number;
  user_updated_time: number;
}

export class JoplinConnector extends BaseConnector {
  name = 'joplin';
  private config: JoplinConfig;
  private client?: AxiosInstance;

  constructor(config: JoplinConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
  }

  async initialize(): Promise<void> {
    if (!this.config.apiToken) {
      throw new Error('Joplin API token is required');
    }

    this.client = axios.create({
      baseURL: this.config.apiUrl || 'http://localhost:41184',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
      },
      timeout: 10000,
    });

    // Verify API connection by pinging
    await this.client.get('/ping');
  }

  async authenticate(): Promise<void> {
    // Joplin uses token-based authentication
    if (!this.client) {
      throw new Error('Joplin client not initialized');
    }
  }

  async pullChanges(since?: Date): Promise<Note[]> {
    if (!this.client) {
      throw new Error('Joplin client not initialized');
    }

    const notes: Note[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const params: any = {
        fields: 'id,title,body,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed,parent_id',
        limit,
        page,
      };

      const response = await this.retry(() =>
        this.client!.get('/notes', { params })
      );

      const joplinNotes = response.data.items as JoplinNote[];
      
      for (const joplinNote of joplinNotes) {
        const note = this.convertJoplinToNote(joplinNote);
        if (note && (!since || note.updated_at >= since.getTime())) {
          notes.push(note);
        }
      }

      hasMore = response.data.has_more;
      page++;
    }

    return notes;
  }

  async pushChanges(notes: Note[]): Promise<void> {
    for (const note of notes) {
      await this.updateOrCreateNote(note);
    }
  }

  async getNote(id: string): Promise<Note | null> {
    if (!this.client) {
      throw new Error('Joplin client not initialized');
    }

    try {
      const response = await this.retry(() =>
        this.client!.get(`/notes/${id}`, {
          params: {
            fields: 'id,title,body,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed,parent_id',
          },
        })
      );

      return this.convertJoplinToNote(response.data);
    } catch (error) {
      if ((error as any).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createNote(note: Omit<Note, 'id'>): Promise<Note> {
    if (!this.client) {
      throw new Error('Joplin client not initialized');
    }

    const joplinNote = {
      title: note.title,
      body: note.body,
    };

    const response = await this.retry(() =>
      this.client!.post('/notes', joplinNote)
    );

    const createdNote: Note = {
      id: response.data.id,
      title: note.title,
      body: note.body,
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: this.name,
      source_id: response.data.id,
      checksum: generateChecksum(note.body),
      tags: note.tags,
    };

    return createdNote;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    if (!this.client) {
      throw new Error('Joplin client not initialized');
    }

    const existing = await this.getNote(id);
    if (!existing) {
      throw new Error(`Note not found: ${id}`);
    }

    const joplinUpdate: any = {};
    if (updates.title) joplinUpdate.title = updates.title;
    if (updates.body) joplinUpdate.body = updates.body;

    await this.retry(() =>
      this.client!.put(`/notes/${id}`, joplinUpdate)
    );

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
      throw new Error('Joplin client not initialized');
    }

    await this.retry(() =>
      this.client!.delete(`/notes/${id}`)
    );
  }

  private convertJoplinToNote(joplinNote: JoplinNote): Note {
    return {
      id: joplinNote.id,
      title: joplinNote.title,
      body: joplinNote.body,
      created_at: joplinNote.user_created_time || joplinNote.created_time,
      updated_at: joplinNote.user_updated_time || joplinNote.updated_time,
      source_connector: this.name,
      source_id: joplinNote.id,
      checksum: generateChecksum(joplinNote.body),
      tags: [],
    };
  }

  private async updateOrCreateNote(note: Note): Promise<void> {
    const existing = await this.getNote(note.id);
    if (existing) {
      await this.updateNote(note.id, note);
    } else {
      await this.createNote(note);
    }
  }

  async close(): Promise<void> {
    // Axios client doesn't require explicit cleanup
  }
}