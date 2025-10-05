/**
 * Custom Fields Type Definitions
 * Enables user-defined metadata fields for notes
 */

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multi-select';

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string; // JSON string for select/multi-select options
  created_at: number;
}

export interface NoteCustomField {
  id: string;
  note_id: string;
  field_id: string;
  value: string; // Stored as string, parsed based on field type
  created_at: number;
  updated_at: number;
}

export interface CustomFieldValue {
  fieldId: string;
  value: string | number | Date | string[] | null;
}

export interface CustomFieldDefinition extends CustomField {
  parsedOptions?: string[]; // Parsed from options JSON
}

export interface CustomFieldValidationResult {
  valid: boolean;
  error?: string;
}