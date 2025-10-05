import { query, execute } from '../db/connection.js';

export interface Rule {
  id: string;
  name: string;
  trigger: 'onCreate' | 'onUpdate' | 'onTag';
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Condition {
  field: 'title' | 'content' | 'tags';
  operator: 'contains' | 'matches' | 'equals';
  value: string;
}

export interface Action {
  type: 'addTag' | 'moveToFolder' | 'notify' | 'summarize';
  params: Record<string, any>;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  folderId?: string;
}

export class RuleEngine {
  /**
   * Evaluate rules for a note based on the trigger event
   */
  async evaluate(note: Note, trigger: 'onCreate' | 'onUpdate' | 'onTag'): Promise<void> {
    const rules = await query<Rule>(
      'SELECT * FROM rules WHERE trigger = ? AND enabled = 1',
      [trigger]
    );

    for (const rule of rules) {
      if (this.matchesConditions(note, rule.conditions)) {
        await this.executeActions(note, rule.actions);
      }
    }
  }

  /**
   * Check if a note matches all conditions in a rule
   */
  private matchesConditions(note: Note, conditions: Condition[]): boolean {
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
  private getFieldValue(note: Note, field: 'title' | 'content' | 'tags'): string {
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
  private async executeActions(note: Note, actions: Action[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(note, action);
    }
  }

  /**
   * Execute a single action on a note
   */
  private async executeAction(note: Note, action: Action): Promise<void> {
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
  private async addTag(noteId: string, tag: string): Promise<void> {
    await execute(
      'INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?, ?)',
      [noteId, tag]
    );
  }

  /**
   * Move a note to a folder
   */
  private async moveToFolder(noteId: string, folderId: string): Promise<void> {
    await execute(
      'UPDATE notes SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [folderId, noteId]
    );
  }

  /**
   * Send a notification
   */
  private async notify(message: string): Promise<void> {
    // This would integrate with a notification system
    console.log('[Rule Engine Notification]:', message);
  }

  /**
   * Generate a summary for a note using AI
   */
  private async summarize(noteId: string): Promise<void> {
    // This would integrate with the AI service
    console.log('[Rule Engine] Summarization requested for note:', noteId);
  }

  /**
   * Create a new rule
   */
  async createRule(rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await execute(
      `INSERT INTO rules (id, name, trigger, conditions, actions, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rule.name,
        rule.trigger,
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        rule.enabled ? 1 : 0,
        now,
        now
      ]
    );
    
    return id;
  }

  /**
   * Update an existing rule
   */
  async updateRule(id: string, updates: Partial<Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

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

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await execute(
      `UPDATE rules SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: string): Promise<void> {
    await execute('DELETE FROM rules WHERE id = ?', [id]);
  }

  /**
   * Get all rules
   */
  async getAllRules(): Promise<Rule[]> {
    const rows = await query<any>('SELECT * FROM rules ORDER BY created_at DESC');
    
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
  async getRule(id: string): Promise<Rule | null> {
    const rows = await query<any>('SELECT * FROM rules WHERE id = ?', [id]);
    
    if (rows.length === 0) return null;
    
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