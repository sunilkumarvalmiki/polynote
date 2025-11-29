import axios from 'axios';
import { generateChecksum } from '@polynote/shared';
import { BaseConnector } from '../base/BaseConnector.js';
export class JoplinConnector extends BaseConnector {
    name = 'joplin';
    config;
    client;
    constructor(config) {
        super();
        this.config = config;
        this.enabled = config.enabled;
    }
    async initialize() {
        if (!this.config.apiToken) {
            throw new Error('Joplin API token is required');
        }
        this.client = axios.create({
            baseURL: this.config.apiUrl || 'http://localhost:41184',
            headers: {
                Authorization: `Bearer ${this.config.apiToken}`,
            },
            timeout: 10000,
        });
        // Verify API connection by pinging
        await this.client.get('/ping');
    }
    async authenticate() {
        // Joplin uses token-based authentication
        if (!this.client) {
            throw new Error('Joplin client not initialized');
        }
        await Promise.resolve();
    }
    async pullChanges(since) {
        if (!this.client) {
            throw new Error('Joplin client not initialized');
        }
        const notes = [];
        let page = 1;
        const limit = 100;
        let hasMore = true;
        while (hasMore) {
            const params = {
                fields: 'id,title,body,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed,parent_id',
                limit,
                page,
            };
            const response = await this.retry(() => this.client.get('/notes', { params }));
            const apiData = response.data;
            const joplinNotes = apiData.items;
            for (const joplinNote of joplinNotes) {
                const note = this.convertJoplinToNote(joplinNote);
                if (note && (!since || note.updated_at >= since.getTime())) {
                    notes.push(note);
                }
            }
            hasMore = apiData.has_more;
            page++;
        }
        return notes;
    }
    async pushChanges(notes) {
        for (const note of notes) {
            await this.updateOrCreateNote(note);
        }
    }
    async getNote(id) {
        if (!this.client) {
            throw new Error('Joplin client not initialized');
        }
        try {
            const response = await this.retry(() => this.client.get(`/notes/${id}`, {
                params: {
                    fields: 'id,title,body,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed,parent_id',
                },
            }));
            return this.convertJoplinToNote(response.data);
        }
        catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }
    async createNote(note) {
        if (!this.client) {
            throw new Error('Joplin client not initialized');
        }
        const joplinNote = {
            title: note.title,
            body: note.body,
        };
        const response = await this.retry(() => this.client.post('/notes', joplinNote));
        const createdNote = {
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
    async updateNote(id, updates) {
        if (!this.client) {
            throw new Error('Joplin client not initialized');
        }
        const existing = await this.getNote(id);
        if (!existing) {
            throw new Error(`Note not found: ${id}`);
        }
        const joplinUpdate = {};
        if (updates.title)
            joplinUpdate.title = updates.title;
        if (updates.body)
            joplinUpdate.body = updates.body;
        await this.retry(() => this.client.put(`/notes/${id}`, joplinUpdate));
        const updated = {
            ...existing,
            ...updates,
            updated_at: Date.now(),
            checksum: generateChecksum(updates.body || existing.body),
        };
        return updated;
    }
    async deleteNote(id) {
        if (!this.client) {
            throw new Error('Joplin client not initialized');
        }
        await this.retry(() => this.client.delete(`/notes/${id}`));
    }
    convertJoplinToNote(joplinNote) {
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
    async updateOrCreateNote(note) {
        const existing = await this.getNote(note.id);
        if (existing) {
            await this.updateNote(note.id, note);
        }
        else {
            await this.createNote(note);
        }
    }
    async close() {
        // Axios client doesn't require explicit cleanup
    }
}
