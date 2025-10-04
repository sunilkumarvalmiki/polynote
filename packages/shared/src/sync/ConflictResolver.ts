/**
 * ConflictResolver - Three-way merge and conflict detection
 * 
 * Handles conflicts between note versions from different connectors:
 * - Detects conflicts by comparing checksums and timestamps
 * - Performs automatic three-way merge when possible
 * - Generates .conflict.md files for manual resolution
 * - Tracks conflict resolution status
 */

import { Note, Conflict, Tag } from '../types/index.js';
import { generateChecksum } from '../utils/checksum.js';

export interface MergeResult {
  merged: boolean;
  note?: Note;
  conflict?: Conflict;
  conflictFile?: string;
}

export interface ConflictResolution {
  id: string;
  resolution: 'auto' | 'manual' | 'choose_a' | 'choose_b';
  resolvedNote: Note;
  timestamp: number;
}

export class ConflictResolver {
  /**
   * Detect if two notes are in conflict
   * Notes conflict if they have different checksums but same source_id
   */
  detectConflict(noteA: Note, noteB: Note, base?: Note): boolean {
    // Same checksum = no conflict
    if (noteA.checksum === noteB.checksum) {
      return false;
    }

    // Different source_id = not same note
    if (noteA.source_id !== noteB.source_id) {
      return false;
    }

    // If we have a common base, check if both diverged from it
    if (base) {
      const aChanged = noteA.checksum !== base.checksum;
      const bChanged = noteB.checksum !== base.checksum;
      return aChanged && bChanged;
    }

    // No base - assume conflict if checksums differ
    return true;
  }

  /**
   * Attempt three-way merge of two notes with a common base
   * Returns merged note if successful, or conflict info if manual resolution needed
   */
  merge(noteA: Note, noteB: Note, base?: Note): MergeResult {
    // No conflict - return whichever is newer
    if (!this.detectConflict(noteA, noteB, base)) {
      const newer = noteA.updated_at > noteB.updated_at ? noteA : noteB;
      return {
        merged: true,
        note: newer
      };
    }

    // Try automatic three-way merge
    if (base) {
      const autoMerged = this.attemptAutoMerge(noteA, noteB, base);
      if (autoMerged) {
        return {
          merged: true,
          note: autoMerged
        };
      }
    }

    // Automatic merge failed - create conflict
    const conflict = this.createConflict(noteA, noteB);
    const conflictFile = this.generateConflictFile(noteA, noteB, base);

    return {
      merged: false,
      conflict,
      conflictFile
    };
  }

  /**
   * Attempt automatic three-way merge
   * Returns merged note if successful, null if conflicts exist
   */
  private attemptAutoMerge(noteA: Note, noteB: Note, base: Note): Note | null {
    // Check what changed in each version
    const aChanges = this.detectChanges(base, noteA);
    const bChanges = this.detectChanges(base, noteB);

    // Check for conflicting changes
    if (this.hasConflictingChanges(aChanges, bChanges)) {
      return null;
    }

    // Merge non-conflicting changes
    const merged: Note = {
      ...base,
      id: noteA.id, // Preserve ID
      updated_at: Math.max(noteA.updated_at, noteB.updated_at)
    };

    // Apply changes from A
    if (aChanges.title) merged.title = noteA.title;
    if (aChanges.body) merged.body = noteA.body;
    if (aChanges.tags) merged.tags = noteA.tags;
    if (aChanges.attachments) merged.attachments = noteA.attachments;
    if (aChanges.links) merged.links = noteA.links;

    // Apply non-conflicting changes from B
    if (bChanges.title && !aChanges.title) merged.title = noteB.title;
    if (bChanges.body && !aChanges.body) merged.body = noteB.body;
    if (bChanges.tags && !aChanges.tags) merged.tags = noteB.tags;
    if (bChanges.attachments && !aChanges.attachments) merged.attachments = noteB.attachments;
    if (bChanges.links && !aChanges.links) merged.links = noteB.links;

    // Recompute checksum
    merged.checksum = generateChecksum(`${merged.title}|${merged.body}|${merged.updated_at}`);

    return merged;
  }

  /**
   * Detect which fields changed between base and modified version
   */
  private detectChanges(base: Note, modified: Note): Record<string, boolean> {
    return {
      title: base.title !== modified.title,
      body: base.body !== modified.body,
      tags: JSON.stringify(base.tags) !== JSON.stringify(modified.tags),
      attachments: JSON.stringify(base.attachments) !== JSON.stringify(modified.attachments),
      links: JSON.stringify(base.links) !== JSON.stringify(modified.links)
    };
  }

  /**
   * Check if two change sets have conflicting modifications
   */
  private hasConflictingChanges(
    aChanges: Record<string, boolean>,
    bChanges: Record<string, boolean>
  ): boolean {
    // Conflict exists if both versions modified the same field
    return Object.keys(aChanges).some(field => aChanges[field] && bChanges[field]);
  }

  /**
   * Create a conflict record
   */
  private createConflict(noteA: Note, noteB: Note): Conflict {
    return {
      id: `conflict-${noteA.id}-${Date.now()}`,
      note_id: noteA.id,
      connector_a: noteA.source_connector,
      connector_b: noteB.source_connector,
      version_a: noteA.checksum,
      version_b: noteB.checksum,
      created_at: Date.now()
    };
  }

  /**
   * Generate a .conflict.md file for manual resolution
   * File contains both versions with conflict markers
   */
  private generateConflictFile(noteA: Note, noteB: Note, base?: Note): string {
    const lines: string[] = [];

    lines.push('---');
    lines.push('conflict: true');
    lines.push(`note_id: ${noteA.id}`);
    lines.push(`connector_a: ${noteA.source_connector}`);
    lines.push(`connector_b: ${noteB.source_connector}`);
    lines.push(`created_at: ${new Date().toISOString()}`);
    lines.push('---');
    lines.push('');
    lines.push('# Conflict Resolution Required');
    lines.push('');
    lines.push('This file was automatically generated because PolyNote detected conflicting changes');
    lines.push(`between ${noteA.source_connector} and ${noteB.source_connector}.`);
    lines.push('');
    lines.push('## Instructions');
    lines.push('');
    lines.push('1. Review both versions below');
    lines.push('2. Edit this file to create your desired merged version');
    lines.push('3. Remove the conflict markers (<<<<<<< ======= >>>>>>>)');
    lines.push('4. Save and sync to resolve the conflict');
    lines.push('');

    // Base version (if available)
    if (base) {
      lines.push('## Base Version (Common Ancestor)');
      lines.push('');
      lines.push('```');
      lines.push(`Title: ${base.title}`);
      lines.push('');
      lines.push(base.body);
      lines.push('```');
      lines.push('');
    }

    // Version A
    lines.push(`## Version A (${noteA.source_connector})`);
    lines.push('');
    lines.push('<<<<<<< VERSION A');
    lines.push(`# ${noteA.title}`);
    lines.push('');
    lines.push(noteA.body);
    lines.push('=======');

    // Version B
    lines.push(`# ${noteB.title}`);
    lines.push('');
    lines.push(noteB.body);
    lines.push(`>>>>>>> VERSION B (${noteB.source_connector})`);
    lines.push('');

    // Metadata comparison
    lines.push('## Metadata');
    lines.push('');
    lines.push(`| Field | ${noteA.source_connector} | ${noteB.source_connector} |`);
    lines.push('|-------|----------|----------|');
    lines.push(`| Updated | ${new Date(noteA.updated_at).toISOString()} | ${new Date(noteB.updated_at).toISOString()} |`);
    lines.push(`| Checksum | ${noteA.checksum.substring(0, 8)}... | ${noteB.checksum.substring(0, 8)}... |`);

    if (noteA.tags || noteB.tags) {
      const tagsA = (noteA.tags || []).map((t: Tag) => t.name).join(', ');
      const tagsB = (noteB.tags || []).map((t: Tag) => t.name).join(', ');
      lines.push(`| Tags | ${tagsA} | ${tagsB} |`);
    }

    return lines.join('\n');
  }

  /**
   * Resolve a conflict by choosing one version
   */
  resolveConflictByChoice(
    conflict: Conflict,
    choice: 'a' | 'b',
    noteA: Note,
    noteB: Note
  ): ConflictResolution {
    const chosen = choice === 'a' ? noteA : noteB;
    
    return {
      id: conflict.id,
      resolution: `choose_${choice}`,
      resolvedNote: {
        ...chosen,
        updated_at: Date.now()
      },
      timestamp: Date.now()
    };
  }

  /**
   * Resolve a conflict with a manually merged note
   */
  resolveConflictManually(
    conflict: Conflict,
    mergedNote: Note
  ): ConflictResolution {
    return {
      id: conflict.id,
      resolution: 'manual',
      resolvedNote: {
        ...mergedNote,
        updated_at: Date.now(),
        checksum: generateChecksum(`${mergedNote.title}|${mergedNote.body}|${Date.now()}`)
      },
      timestamp: Date.now()
    };
  }
}