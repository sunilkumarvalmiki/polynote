/**
 * Custom Field Manager
 * Manages custom field definitions and values
 */

import {
  CustomField,
  CustomFieldType,
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldValidationResult,
  NoteCustomField
} from './types.js';

export class CustomFieldManager {
  constructor(
    private executeSQL: (sql: string, params?: unknown[]) => Promise<void>,
    private querySQL: <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>
  ) {}

  /**
   * Initialize custom fields tables
   */
  async initialize(): Promise<void> {
    await this.executeSQL(`
      CREATE TABLE IF NOT EXISTS CustomField (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('text', 'number', 'date', 'select', 'multi-select')),
        options TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    await this.executeSQL(`
      CREATE TABLE IF NOT EXISTS NoteCustomField (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        field_id TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (note_id) REFERENCES Note(id) ON DELETE CASCADE,
        FOREIGN KEY (field_id) REFERENCES CustomField(id) ON DELETE CASCADE,
        UNIQUE(note_id, field_id)
      );
    `);

    await this.executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_note_custom_field_note_id ON NoteCustomField(note_id);
    `);

    await this.executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_note_custom_field_field_id ON NoteCustomField(field_id);
    `);
  }

  /**
   * Create a custom field definition
   */
  async createField(
    name: string,
    type: CustomFieldType,
    options?: string[]
  ): Promise<CustomField> {
    const id = this.generateId();
    const optionsJson = options ? JSON.stringify(options) : null;
    const created_at = Date.now();

    await this.executeSQL(
      'INSERT INTO CustomField (id, name, type, options, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, type, optionsJson, created_at]
    );

    return {
      id,
      name,
      type,
      options: optionsJson || undefined,
      created_at
    };
  }

  /**
   * Get all custom field definitions
   */
  async getAllFields(): Promise<CustomFieldDefinition[]> {
    const fields = await this.querySQL<CustomField>(
      'SELECT * FROM CustomField ORDER BY name'
    );

    return fields.map(field => ({
      ...field,
      parsedOptions: field.options ? JSON.parse(field.options) : undefined
    }));
  }

  /**
   * Get a custom field by ID
   */
  async getField(fieldId: string): Promise<CustomFieldDefinition | null> {
    const fields = await this.querySQL<CustomField>(
      'SELECT * FROM CustomField WHERE id = ?',
      [fieldId]
    );

    if (fields.length === 0) {
      return null;
    }

    const field = fields[0];
    return {
      ...field,
      parsedOptions: field.options ? JSON.parse(field.options) : undefined
    };
  }

  /**
   * Update a custom field definition
   */
  async updateField(
    fieldId: string,
    updates: { name?: string; options?: string[] }
  ): Promise<void> {
    const field = await this.getField(fieldId);
    if (!field) {
      throw new Error(`Custom field ${fieldId} not found`);
    }

    const name = updates.name ?? field.name;
    const optionsJson = updates.options ? JSON.stringify(updates.options) : field.options;

    await this.executeSQL(
      'UPDATE CustomField SET name = ?, options = ? WHERE id = ?',
      [name, optionsJson, fieldId]
    );
  }

  /**
   * Delete a custom field definition
   */
  async deleteField(fieldId: string): Promise<void> {
    await this.executeSQL('DELETE FROM CustomField WHERE id = ?', [fieldId]);
  }

  /**
   * Set a custom field value for a note
   */
  async setFieldValue(
    noteId: string,
    fieldId: string,
    value: string | number | Date | string[]
  ): Promise<void> {
    const field = await this.getField(fieldId);
    if (!field) {
      throw new Error(`Custom field ${fieldId} not found`);
    }

    // Validate value
    const validation = this.validateValue(value, field);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Serialize value
    const serializedValue = this.serializeValue(value, field.type);
    const now = Date.now();

    // Upsert the value
    await this.executeSQL(
      `INSERT INTO NoteCustomField (id, note_id, field_id, value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(note_id, field_id) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [this.generateId(), noteId, fieldId, serializedValue, now, now]
    );
  }

  /**
   * Get custom field values for a note
   */
  async getFieldValues(noteId: string): Promise<CustomFieldValue[]> {
    const values = await this.querySQL<NoteCustomField>(
      'SELECT * FROM NoteCustomField WHERE note_id = ?',
      [noteId]
    );

    const result: CustomFieldValue[] = [];

    for (const value of values) {
      const field = await this.getField(value.field_id);
      if (field) {
        result.push({
          fieldId: value.field_id,
          value: this.deserializeValue(value.value, field.type)
        });
      }
    }

    return result;
  }

  /**
   * Delete a custom field value
   */
  async deleteFieldValue(noteId: string, fieldId: string): Promise<void> {
    await this.executeSQL(
      'DELETE FROM NoteCustomField WHERE note_id = ? AND field_id = ?',
      [noteId, fieldId]
    );
  }

  /**
   * Validate a value against field type
   */
  private validateValue(
    value: string | number | Date | string[],
    field: CustomFieldDefinition
  ): CustomFieldValidationResult {
    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Value must be a string' };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: 'Value must be a valid number' };
        }
        break;

      case 'date':
        if (!(value instanceof Date) || isNaN(value.getTime())) {
          return { valid: false, error: 'Value must be a valid date' };
        }
        break;

      case 'select':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Value must be a string' };
        }
        if (field.parsedOptions && !field.parsedOptions.includes(value)) {
          return { valid: false, error: `Value must be one of: ${field.parsedOptions.join(', ')}` };
        }
        break;

      case 'multi-select':
        if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) {
          return { valid: false, error: 'Value must be an array of strings' };
        }
        if (field.parsedOptions) {
          const invalid = value.filter(v => !field.parsedOptions!.includes(v));
          if (invalid.length > 0) {
            return {
              valid: false,
              error: `Invalid values: ${invalid.join(', ')}. Must be one of: ${field.parsedOptions.join(', ')}`
            };
          }
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Serialize value for storage
   */
  private serializeValue(
    value: string | number | Date | string[],
    type: CustomFieldType
  ): string {
    switch (type) {
      case 'text':
      case 'select':
        return String(value);
      case 'number':
        return String(value);
      case 'date':
        return (value as Date).toISOString();
      case 'multi-select':
        return JSON.stringify(value);
    }
  }

  /**
   * Deserialize value from storage
   */
  private deserializeValue(
    value: string,
    type: CustomFieldType
  ): string | number | Date | string[] | null {
    try {
      switch (type) {
        case 'text':
        case 'select':
          return value;
        case 'number':
          return parseFloat(value);
        case 'date':
          return new Date(value);
        case 'multi-select':
          return JSON.parse(value);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}