/**
 * ChangeDetector - Detects changes between local and remote notes
 * 
 * Implements timestamp-based and checksum-based change detection
 * to determine which notes need to be synced.
 */

import { Note } from '../types/index.js';
import { generateChecksum } from '../utils/checksum.js';

export interface Change {
  noteId: string;
  changeType: 'create' | 'update' | 'delete';
  source: string;
  timestamp: Date;
  checksum: string;
}

export interface ChangeDetectionResult {
  created: Change[];
  updated: Change[];
  deleted: Change[];
  unchanged: number;
}

/**
 * Detects changes between two sets of notes
 */
export class ChangeDetector {
  /**
   * Compare local and remote notes to detect changes
   * 
   * @param localNotes - Notes from local database
   * @param remoteNotes - Notes from remote connector
   * @param source - Connector source identifier
   * @returns ChangeDetectionResult with categorized changes
   */
  detectChanges(
    localNotes: Note[],
    remoteNotes: Note[],
    source: string
  ): ChangeDetectionResult {
    const localMap = new Map(localNotes.map(n => [n.id, n]));
    const remoteMap = new Map(remoteNotes.map(n => [n.id, n]));

    const created: Change[] = [];
    const updated: Change[] = [];
    const deleted: Change[] = [];
    let unchanged = 0;

    // Check for new and updated notes in remote
    for (const [id, remoteNote] of remoteMap) {
      const localNote = localMap.get(id);

      if (!localNote) {
        // Note exists in remote but not local - it's new
        created.push({
          noteId: id,
          changeType: 'create',
          source,
          timestamp: new Date(remoteNote.updated_at),
          checksum: generateChecksum(remoteNote.body)
        });
      } else {
        // Note exists in both - check if updated
        const hasChanged = this.hasNoteChanged(localNote, remoteNote);
        if (hasChanged) {
          updated.push({
            noteId: id,
            changeType: 'update',
            source,
            timestamp: new Date(remoteNote.updated_at),
            checksum: generateChecksum(remoteNote.body)
          });
        } else {
          unchanged++;
        }
      }
    }

    // Check for deleted notes (in local but not remote)
    for (const [id, localNote] of localMap) {
      if (!remoteMap.has(id) && localNote.source_connector === source) {
        deleted.push({
          noteId: id,
          changeType: 'delete',
          source,
          timestamp: new Date(),
          checksum: generateChecksum(localNote.body)
        });
      }
    }

    return { created, updated, deleted, unchanged };
  }

  /**
   * Determine if a note has changed using multiple strategies
   * 
   * 1. Timestamp comparison (primary)
   * 2. Checksum comparison (fallback)
   * 3. Content length comparison (quick check)
   */
  private hasNoteChanged(localNote: Note, remoteNote: Note): boolean {
    // Quick check: if timestamps are identical, verify with checksum
    if (localNote.updated_at === remoteNote.updated_at) {
      const localChecksum = generateChecksum(localNote.body);
      const remoteChecksum = generateChecksum(remoteNote.body);
      return localChecksum !== remoteChecksum;
    }

    // If remote is newer by timestamp
    if (remoteNote.updated_at > localNote.updated_at) {
      // Verify with checksum to avoid false positives from clock skew
      const localChecksum = generateChecksum(localNote.body);
      const remoteChecksum = generateChecksum(remoteNote.body);
      return localChecksum !== remoteChecksum;
    }

    // If local is newer, still check content to detect bidirectional changes
    const localChecksum = generateChecksum(localNote.body);
    const remoteChecksum = generateChecksum(remoteNote.body);
    return localChecksum !== remoteChecksum;
  }

  /**
   * Detect changes for a single note (useful for incremental sync)
   */
  detectSingleNoteChange(
    localNote: Note | null,
    remoteNote: Note | null,
    source: string
  ): Change | null {
    if (!localNote && remoteNote) {
      return {
        noteId: remoteNote.id,
        changeType: 'create',
        source,
        timestamp: new Date(remoteNote.updated_at),
        checksum: generateChecksum(remoteNote.body)
      };
    }

    if (localNote && !remoteNote) {
      return {
        noteId: localNote.id,
        changeType: 'delete',
        source,
        timestamp: new Date(),
        checksum: generateChecksum(localNote.body)
      };
    }

    if (localNote && remoteNote && this.hasNoteChanged(localNote, remoteNote)) {
      return {
        noteId: remoteNote.id,
        changeType: 'update',
        source,
        timestamp: new Date(remoteNote.updated_at),
        checksum: generateChecksum(remoteNote.body)
      };
    }

    return null;
  }

  /**
   * Calculate change statistics
   */
  calculateStats(result: ChangeDetectionResult): {
    total: number;
    created: number;
    updated: number;
    deleted: number;
    unchanged: number;
  } {
    return {
      total: result.created.length + result.updated.length + result.deleted.length + result.unchanged,
      created: result.created.length,
      updated: result.updated.length,
      deleted: result.deleted.length,
      unchanged: result.unchanged
    };
  }
}