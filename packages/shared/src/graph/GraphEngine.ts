/**
 * Graph Engine
 * Builds knowledge graphs by detecting wikilinks and relationships between notes
 */

import { query, queryOne } from '../db/connection.js';

export interface GraphNode {
  id: string;
  label: string;
  type: 'note' | 'tag' | 'orphan';
  noteCount?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  type: 'wikilink' | 'tag' | 'backlink';
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class GraphEngine {
  /**
   * Extract wikilinks from note content
   * Matches [[link]], [[link|alias]], and [[folder/link]]
   */
  private extractWikilinks(content: string): string[] {
    const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    const links: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      links.push(match[1].trim());
    }
    
    return links;
  }

  /**
   * Find note by title (case-insensitive)
   */
  private async findNoteByTitle(title: string): Promise<{ id: string; title: string } | null> {
    try {
      const note = await queryOne<{ id: string; title: string }>(
        'SELECT id, title FROM Note WHERE LOWER(title) = LOWER(?) AND deleted_at IS NULL LIMIT 1',
        [title]
      );
      return note || null;
    } catch {
      return null;
    }
  }

  /**
   * Build complete knowledge graph
   */
  async buildGraph(): Promise<Graph> {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    // Get all notes
    const notes = query<{ id: string; title: string; body: string; tags: string }>(
      'SELECT id, title, body, tags FROM Note WHERE deleted_at IS NULL'
    );

    // Process each note
    for (const note of notes) {
      // Add note as node
      nodes.set(note.id, {
        id: note.id,
        label: note.title,
        type: 'note',
      });

      // Extract and process wikilinks
      const wikilinks = this.extractWikilinks(note.body || '');
      
      for (const link of wikilinks) {
        const target = await this.findNoteByTitle(link);
        
        if (target) {
          // Add edge for existing link
          edges.push({
            source: note.id,
            target: target.id,
            type: 'wikilink',
          });

          // Ensure target is in nodes
          if (!nodes.has(target.id)) {
            nodes.set(target.id, {
              id: target.id,
              label: target.title,
              type: 'note',
            });
          }
        } else {
          // Add orphan node for broken link
          const orphanId = `orphan:${link}`;
          if (!nodes.has(orphanId)) {
            nodes.set(orphanId, {
              id: orphanId,
              label: link,
              type: 'orphan',
            });
          }
          
          edges.push({
            source: note.id,
            target: orphanId,
            type: 'wikilink',
          });
        }
      }

      // Process tags
      if (note.tags) {
        try {
          const tags = JSON.parse(note.tags) as string[];
          
          for (const tag of tags) {
            const tagId = `tag:${tag}`;
            
            // Add or update tag node
            const existingTag = nodes.get(tagId);
            if (existingTag) {
              existingTag.noteCount = (existingTag.noteCount || 0) + 1;
            } else {
              nodes.set(tagId, {
                id: tagId,
                label: `#${tag}`,
                type: 'tag',
                noteCount: 1,
              });
            }

            // Add edge from note to tag
            edges.push({
              source: note.id,
              target: tagId,
              type: 'tag',
            });
          }
        } catch {
          // Skip invalid JSON tags
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
    };
  }

  /**
   * Build graph for a specific note and its immediate connections
   */
  async buildNoteGraph(noteId: string): Promise<Graph> {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    // Get the central note
    const note = await queryOne<{ id: string; title: string; body: string; tags: string }>(
      'SELECT id, title, body, tags FROM Note WHERE id = ? AND deleted_at IS NULL',
      [noteId]
    );

    if (!note) {
      return { nodes: [], edges: [] };
    }

    // Add central note
    nodes.set(note.id, {
      id: note.id,
      label: note.title,
      type: 'note',
    });

    // Extract wikilinks
    const wikilinks = this.extractWikilinks(note.body || '');
    
    for (const link of wikilinks) {
      const target = await this.findNoteByTitle(link);
      
      if (target) {
        nodes.set(target.id, {
          id: target.id,
          label: target.title,
          type: 'note',
        });

        edges.push({
          source: note.id,
          target: target.id,
          type: 'wikilink',
        });
      }
    }

    // Find backlinks (notes that link to this note)
    const backlinks = query<{ id: string; title: string; body: string }>(
      'SELECT id, title, body FROM Note WHERE deleted_at IS NULL AND id != ?',
      [noteId]
    );

    for (const backlink of backlinks) {
      const links = this.extractWikilinks(backlink.body || '');
      
      if (links.some(link => link.toLowerCase() === note.title.toLowerCase())) {
        nodes.set(backlink.id, {
          id: backlink.id,
          label: backlink.title,
          type: 'note',
        });

        edges.push({
          source: backlink.id,
          target: note.id,
          type: 'backlink',
        });
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
    };
  }

  /**
   * Get backlinks for a note
   */
  async getBacklinks(noteId: string): Promise<Array<{ id: string; title: string }>> {
    const note = await queryOne<{ title: string }>(
      'SELECT title FROM Note WHERE id = ? AND deleted_at IS NULL',
      [noteId]
    );

    if (!note) {
      return [];
    }

    const backlinks: Array<{ id: string; title: string }> = [];
    const allNotes = query<{ id: string; title: string; body: string }>(
      'SELECT id, title, body FROM Note WHERE deleted_at IS NULL AND id != ?',
      [noteId]
    );

    for (const other of allNotes) {
      const links = this.extractWikilinks(other.body || '');
      
      if (links.some(link => link.toLowerCase() === note.title.toLowerCase())) {
        backlinks.push({
          id: other.id,
          title: other.title,
        });
      }
    }

    return backlinks;
  }

  /**
   * Get orphan links (wikilinks with no target note)
   */
  async getOrphanLinks(): Promise<Array<{ link: string; sources: string[] }>> {
    const orphans = new Map<string, string[]>();
    
    const notes = query<{ id: string; title: string; body: string }>(
      'SELECT id, title, body FROM Note WHERE deleted_at IS NULL'
    );

    const noteTitles = new Set(notes.map((n: { title: string }) => n.title.toLowerCase()));

    for (const note of notes) {
      const links = this.extractWikilinks(note.body || '');
      
      for (const link of links) {
        if (!noteTitles.has(link.toLowerCase())) {
          if (!orphans.has(link)) {
            orphans.set(link, []);
          }
          orphans.get(link)!.push(note.title);
        }
      }
    }

    return Array.from(orphans.entries()).map(([link, sources]) => ({
      link,
      sources,
    }));
  }
}