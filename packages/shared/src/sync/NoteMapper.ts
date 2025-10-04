/**
 * NoteMapper - Maps between connector-specific formats and internal Note format
 * 
 * Handles bidirectional transformation of notes between external connectors
 * (Obsidian, Notion, Joplin, etc.) and the internal PolyNote format.
 */

import type { Note, Tag } from '../types/index.js';
import { generateChecksum } from '../utils/checksum.js';

/**
 * Generic note format from connectors
 */
export interface ExternalNote {
  id: string;
  title: string;
  body: string;
  createdAt: Date | number;
  updatedAt: Date | number;
  deletedAt?: Date | number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Mapping configuration for a connector
 */
export interface MappingConfig {
  connector: string;
  fieldMappings: {
    id?: string;
    title?: string;
    body?: string;
    createdAt?: string;
    updatedAt?: string;
    tags?: string;
  };
  transformations?: {
    beforeImport?: (note: ExternalNote) => ExternalNote;
    afterImport?: (note: Note) => Note;
    beforeExport?: (note: Note) => Note;
    afterExport?: (note: ExternalNote) => ExternalNote;
  };
}

/**
 * Maps notes between external and internal formats
 */
export class NoteMapper {
  private configs: Map<string, MappingConfig> = new Map();

  /**
   * Register a mapping configuration for a connector
   */
  registerMapping(config: MappingConfig): void {
    this.configs.set(config.connector, config);
  }

  /**
   * Import external note to internal format
   */
  importNote(externalNote: ExternalNote, connector: string, sourceId: string): Note {
    const config = this.configs.get(connector);
    
    // Apply pre-import transformation if configured
    let transformed = externalNote;
    if (config?.transformations?.beforeImport) {
      transformed = config.transformations.beforeImport(externalNote);
    }

    // Convert timestamps to milliseconds
    const createdAt = typeof transformed.createdAt === 'number' 
      ? transformed.createdAt 
      : transformed.createdAt.getTime();
    const updatedAt = typeof transformed.updatedAt === 'number'
      ? transformed.updatedAt
      : transformed.updatedAt.getTime();
    const deletedAt = transformed.deletedAt 
      ? (typeof transformed.deletedAt === 'number' 
          ? transformed.deletedAt 
          : transformed.deletedAt.getTime())
      : undefined;

    // Create internal note
    let note: Note = {
      id: transformed.id,
      title: transformed.title || 'Untitled',
      body: transformed.body || '',
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt,
      source_connector: connector,
      source_id: sourceId,
      checksum: generateChecksum(transformed.body || ''),
      tags: this.normalizeTags(transformed.tags)
    };

    // Apply post-import transformation if configured
    if (config?.transformations?.afterImport) {
      note = config.transformations.afterImport(note);
    }

    return note;
  }

  /**
   * Export internal note to external format
   */
  exportNote(note: Note, connector: string): ExternalNote {
    const config = this.configs.get(connector);

    // Apply pre-export transformation if configured
    let transformed = note;
    if (config?.transformations?.beforeExport) {
      transformed = config.transformations.beforeExport(note);
    }

    // Create external note
    let externalNote: ExternalNote = {
      id: transformed.id,
      title: transformed.title,
      body: transformed.body,
      createdAt: transformed.created_at,
      updatedAt: transformed.updated_at,
      deletedAt: transformed.deleted_at,
      tags: transformed.tags?.map(t => t.name)
    };

    // Apply post-export transformation if configured
    if (config?.transformations?.afterExport) {
      externalNote = config.transformations.afterExport(externalNote);
    }

    return externalNote;
  }

  /**
   * Batch import multiple external notes
   */
  importNotes(externalNotes: ExternalNote[], connector: string): Note[] {
    return externalNotes.map(en => 
      this.importNote(en, connector, this.generateSourceId(en, connector))
    );
  }

  /**
   * Batch export multiple internal notes
   */
  exportNotes(notes: Note[], connector: string): ExternalNote[] {
    return notes.map(n => this.exportNote(n, connector));
  }

  /**
   * Normalize tags from various formats
   */
  private normalizeTags(tags?: string[]): Tag[] | undefined {
    if (!tags || tags.length === 0) {
      return undefined;
    }

    return tags.map(tag => ({
      id: this.generateTagId(tag),
      name: this.normalizeTagName(tag),
      created_at: Date.now()
    }));
  }

  /**
   * Normalize tag names (remove # prefix, trim, lowercase)
   */
  private normalizeTagName(tag: string): string {
    return tag.replace(/^#/, '').trim().toLowerCase();
  }

  /**
   * Generate consistent tag ID from name
   */
  private generateTagId(tag: string): string {
    const normalized = this.normalizeTagName(tag);
    return `tag-${normalized}`;
  }

  /**
   * Generate source ID for external note
   */
  private generateSourceId(note: ExternalNote, connector: string): string {
    return `${connector}-${note.id}`;
  }

  /**
   * Merge two notes with conflict detection
   */
  mergeNotes(local: Note, remote: Note): {
    merged: Note;
    hasConflict: boolean;
    conflicts: string[];
  } {
    const conflicts: string[] = [];
    let hasConflict = false;

    // Detect conflicts
    if (local.title !== remote.title) {
      conflicts.push('title');
      hasConflict = true;
    }

    if (local.body !== remote.body) {
      conflicts.push('body');
      hasConflict = true;
    }

    // Use newer version for timestamps
    const useRemote = remote.updated_at > local.updated_at;

    const merged: Note = {
      id: local.id,
      title: useRemote ? remote.title : local.title,
      body: useRemote ? remote.body : local.body,
      created_at: Math.min(local.created_at, remote.created_at),
      updated_at: Math.max(local.updated_at, remote.updated_at),
      deleted_at: remote.deleted_at || local.deleted_at,
      source_connector: local.source_connector,
      source_id: local.source_id,
      checksum: generateChecksum(useRemote ? remote.body : local.body),
      tags: this.mergeTags(local.tags, remote.tags),
      attachments: local.attachments || remote.attachments,
      links: local.links || remote.links
    };

    return { merged, hasConflict, conflicts };
  }

  /**
   * Merge tags from two notes
   */
  private mergeTags(localTags?: Tag[], remoteTags?: Tag[]): Tag[] | undefined {
    if (!localTags && !remoteTags) {
      return undefined;
    }

    const tagMap = new Map<string, Tag>();

    // Add local tags
    localTags?.forEach(tag => tagMap.set(tag.name, tag));

    // Add remote tags (newer tags take precedence)
    remoteTags?.forEach(tag => {
      const existing = tagMap.get(tag.name);
      if (!existing || tag.created_at > existing.created_at) {
        tagMap.set(tag.name, tag);
      }
    });

    return Array.from(tagMap.values());
  }

  /**
   * Calculate field-level differences between two notes
   */
  diffNotes(a: Note, b: Note): {
    title: boolean;
    body: boolean;
    tags: boolean;
    metadata: boolean;
  } {
    return {
      title: a.title !== b.title,
      body: a.body !== b.body,
      tags: JSON.stringify(a.tags) !== JSON.stringify(b.tags),
      metadata: a.checksum !== b.checksum
    };
  }

  /**
   * Get registered connectors
   */
  getConnectors(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Check if connector is registered
   */
  hasConnector(connector: string): boolean {
    return this.configs.has(connector);
  }
}

/**
 * Default mapping configurations for built-in connectors
 */
export const defaultMappings: MappingConfig[] = [
  {
    connector: 'obsidian',
    fieldMappings: {
      id: 'id',
      title: 'title',
      body: 'body',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      tags: 'tags'
    }
  },
  {
    connector: 'notion',
    fieldMappings: {
      id: 'id',
      title: 'title',
      body: 'content',
      createdAt: 'created_time',
      updatedAt: 'last_edited_time',
      tags: 'tags'
    },
    transformations: {
      beforeImport: (note) => {
        // Notion uses ISO timestamps, convert to milliseconds
        return note;
      }
    }
  },
  {
    connector: 'joplin',
    fieldMappings: {
      id: 'id',
      title: 'title',
      body: 'body',
      createdAt: 'user_created_time',
      updatedAt: 'user_updated_time',
      tags: 'tags'
    }
  }
];

/**
 * Create a note mapper with default configurations
 */
export function createNoteMapper(): NoteMapper {
  const mapper = new NoteMapper();
  defaultMappings.forEach(config => mapper.registerMapping(config));
  return mapper;
}