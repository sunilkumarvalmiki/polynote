import { query, execute } from '../db/connection.js';
export class RuleEngine {
    /**
     * Evaluate rules for a note based on the trigger event
     */
    async evaluate(note, trigger) {
        const rules = await query('SELECT * FROM rules WHERE trigger = ? AND enabled = 1', [trigger]);
        for (const rule of rules) {
            if (this.matchesConditions(note, rule.conditions)) {
                await this.executeActions(note, rule.actions);
            }
        }
    }
    /**
     * Check if a note matches all conditions in a rule
     */
    matchesConditions(note, conditions) {
        return conditions.every(cond => {
            const value = this.getFieldValue(note, cond.field);
            switch (cond.operator) {
                case 'contains':
                    return value.toLowerCase().includes(cond.value.toLowerCase());
                case 'matches':
                    return new RegExp(cond.value).test(value);
                case 'equals':
                    return value === cond.value;
                default:
                    return false;
            }
        });
    }
    /**
     * Get the value of a field from a note
     */
    getFieldValue(note, field) {
        switch (field) {
            case 'title':
                return note.title || '';
            case 'content':
                return note.content || '';
            case 'tags':
                return (note.tags || []).join(',');
            default:
                return '';
        }
    }
    /**
     * Execute actions on a note
     */
    async executeActions(note, actions) {
        for (const action of actions) {
            await this.executeAction(note, action);
        }
    }
    /**
     * Execute a single action on a note
     */
    async executeAction(note, action) {
        switch (action.type) {
            case 'addTag':
                await this.addTag(note.id, action.params.tag);
                break;
            case 'moveToFolder':
                await this.moveToFolder(note.id, action.params.folderId);
                break;
            case 'notify':
                await this.notify(action.params.message);
                break;
            case 'summarize':
                await this.summarize(note.id);
                break;
        }
    }
    /**
     * Add a tag to a note
     */
    async addTag(noteId, tag) {
        await execute('INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?, ?)', [noteId, tag]);
    }
    /**
     * Move a note to a folder
     */
    async moveToFolder(noteId, folderId) {
        await execute('UPDATE notes SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [folderId, noteId]);
    }
    /**
     * Send a notification
     */
    async notify(message) {
        // This would integrate with a notification system
        console.log('[Rule Engine Notification]:', message);
    }
    /**
     * Generate a summary for a note using AI
     */
    async summarize(noteId) {
        // This would integrate with the AI service
        console.log('[Rule Engine] Summarization requested for note:', noteId);
    }
    /**
     * Create a new rule
     */
    async createRule(rule) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await execute(`INSERT INTO rules (id, name, trigger, conditions, actions, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            rule.name,
            rule.trigger,
            JSON.stringify(rule.conditions),
            JSON.stringify(rule.actions),
            rule.enabled ? 1 : 0,
            now,
            now
        ]);
        return id;
    }
    /**
     * Update an existing rule
     */
    async updateRule(id, updates) {
        const fields = [];
        const values = [];
        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.trigger !== undefined) {
            fields.push('trigger = ?');
            values.push(updates.trigger);
        }
        if (updates.conditions !== undefined) {
            fields.push('conditions = ?');
            values.push(JSON.stringify(updates.conditions));
        }
        if (updates.actions !== undefined) {
            fields.push('actions = ?');
            values.push(JSON.stringify(updates.actions));
        }
        if (updates.enabled !== undefined) {
            fields.push('enabled = ?');
            values.push(updates.enabled ? 1 : 0);
        }
        if (fields.length === 0)
            return;
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        await execute(`UPDATE rules SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    /**
     * Delete a rule
     */
    async deleteRule(id) {
        await execute('DELETE FROM rules WHERE id = ?', [id]);
    }
    /**
     * Get all rules
     */
    async getAllRules() {
        const rows = await query('SELECT * FROM rules ORDER BY created_at DESC');
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            trigger: row.trigger,
            conditions: JSON.parse(row.conditions),
            actions: JSON.parse(row.actions),
            enabled: row.enabled === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }
    /**
     * Get a rule by ID
     */
    async getRule(id) {
        const rows = await query('SELECT * FROM rules WHERE id = ?', [id]);
        if (rows.length === 0)
            return null;
        const row = rows[0];
        return {
            id: row.id,
            name: row.name,
            trigger: row.trigger,
            conditions: JSON.parse(row.conditions),
            actions: JSON.parse(row.actions),
            enabled: row.enabled === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
