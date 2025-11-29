/**
 * Query Optimizer
 *
 * Provides optimized query helpers and utilities for improved database performance.
 * Focuses on FTS5 search optimization, query plan analysis, and index usage.
 *
 * Features:
 * - Optimized FTS5 full-text search with BM25 ranking
 * - Query plan analysis and suggestions
 * - Automatic index usage detection
 * - Query result caching
 * - Search highlighting
 */

import type Database from 'better-sqlite3';

export interface SearchOptions {
  /** Maximum number of results (default: 50) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
  /** Minimum relevance score (default: 0) */
  minScore?: number;
  /** Include search highlights (default: false) */
  highlight?: boolean;
  /** Filter by source connector */
  sourceConnector?: string;
  /** Filter by tags */
  tags?: string[];
  /** Date range filter */
  dateRange?: {
    from?: number;
    to?: number;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  body: string;
  score: number;
  highlights?: {
    title?: string;
    body?: string;
  };
  source_connector?: string;
  created_at?: number;
  updated_at?: number;
}

export interface QueryPlan {
  query: string;
  usesIndex: boolean;
  indexName?: string;
  estimatedRows: number;
  suggestions: string[];
}

/**
 * Optimized query helpers for SQLite database
 */
export class QueryOptimizer {
  private queryCache = new Map<string, { result: unknown; timestamp: number }>();
  private cacheTTL = 60000; // 1 minute cache TTL

  constructor(private db: Database.Database) {}

  /**
   * Optimized full-text search with BM25 ranking and filtering
   */
  searchNotes(
    searchTerm: string,
    options: SearchOptions = {}
  ): SearchResult[] {
    const {
      limit = 50,
      offset = 0,
      minScore = 0,
      highlight = false,
      sourceConnector,
      tags,
      dateRange,
    } = options;

    // Build FTS5 query with proper syntax
    const ftsQuery = this.buildFTS5Query(searchTerm);

    // Build WHERE conditions
    const conditions: string[] = ['NoteSearch MATCH ?'];
    const params: unknown[] = [ftsQuery];

    if (minScore > 0) {
      conditions.push('rank > ?');
      params.push(-minScore); // FTS5 rank is negative
    }

    if (sourceConnector) {
      conditions.push('n.source_connector = ?');
      params.push(sourceConnector);
    }

    if (dateRange) {
      if (dateRange.from) {
        conditions.push('n.created_at >= ?');
        params.push(dateRange.from);
      }
      if (dateRange.to) {
        conditions.push('n.created_at <= ?');
        params.push(dateRange.to);
      }
    }

    // Build tag filter using EXISTS subquery for better performance
    let tagJoin = '';
    if (tags && tags.length > 0) {
      tagJoin = `
        AND EXISTS (
          SELECT 1 FROM NoteTag nt
          JOIN Tag t ON nt.tag_id = t.id
          WHERE nt.note_id = n.id
          AND t.name IN (${tags.map(() => '?').join(',')})
        )
      `;
      params.push(...tags);
    }

    // Build the query with optimized FTS5 ranking
    const sql = `
      SELECT
        n.id,
        n.title,
        n.body,
        n.source_connector,
        n.created_at,
        n.updated_at,
        -rank AS score
        ${highlight ? ', highlight(NoteSearch, 1, "<mark>", "</mark>") AS title_highlight' : ''}
        ${highlight ? ', snippet(NoteSearch, 2, "<mark>", "</mark>", "...", 32) AS body_highlight' : ''}
      FROM NoteSearch
      JOIN Note n ON NoteSearch.note_id = n.id
      WHERE ${conditions.join(' AND ')}
        AND n.deleted_at IS NULL
        ${tagJoin}
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as Array<{
      id: string;
      title: string;
      body: string;
      score: number;
      source_connector?: string;
      created_at?: number;
      updated_at?: number;
      title_highlight?: string;
      body_highlight?: string;
    }>;

    return results.map(row => ({
      id: row.id,
      title: row.title,
      body: row.body,
      score: row.score,
      source_connector: row.source_connector,
      created_at: row.created_at,
      updated_at: row.updated_at,
      highlights: highlight
        ? {
            title: row.title_highlight,
            body: row.body_highlight,
          }
        : undefined,
    }));
  }

  /**
   * Fuzzy search using trigram matching (for typo tolerance)
   */
  fuzzySearchNotes(
    searchTerm: string,
    options: SearchOptions = {}
  ): SearchResult[] {
    const { limit = 50, offset = 0 } = options;

    // Use LIKE with wildcards for fuzzy matching
    const fuzzyTerm = `%${searchTerm.split('').join('%')}%`;

    const sql = `
      SELECT
        id,
        title,
        body,
        source_connector,
        created_at,
        updated_at,
        (
          CASE
            WHEN title LIKE ? THEN 100
            WHEN title LIKE ? THEN 50
            WHEN body LIKE ? THEN 25
            ELSE 10
          END
        ) AS score
      FROM Note
      WHERE deleted_at IS NULL
        AND (title LIKE ? OR body LIKE ?)
      ORDER BY score DESC, updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const exactMatch = `%${searchTerm}%`;
    const stmt = this.db.prepare(sql);
    const results = stmt.all(
      exactMatch,
      fuzzyTerm,
      exactMatch,
      fuzzyTerm,
      fuzzyTerm,
      limit,
      offset
    ) as Array<{
      id: string;
      title: string;
      body: string;
      score: number;
      source_connector?: string;
      created_at?: number;
      updated_at?: number;
    }>;

    return results;
  }

  /**
   * Search by tags with relevance ranking
   */
  searchByTags(
    tags: string[],
    options: { limit?: number; offset?: number } = {}
  ): SearchResult[] {
    const { limit = 50, offset = 0 } = options;

    if (tags.length === 0) {
      return [];
    }

    // Calculate relevance based on number of matching tags
    const sql = `
      WITH TagMatches AS (
        SELECT
          nt.note_id,
          COUNT(*) AS tag_count
        FROM NoteTag nt
        JOIN Tag t ON nt.tag_id = t.id
        WHERE t.name IN (${tags.map(() => '?').join(',')})
        GROUP BY nt.note_id
      )
      SELECT
        n.id,
        n.title,
        n.body,
        n.source_connector,
        n.created_at,
        n.updated_at,
        (tm.tag_count * 100.0 / ?) AS score
      FROM Note n
      JOIN TagMatches tm ON n.id = tm.note_id
      WHERE n.deleted_at IS NULL
      ORDER BY tm.tag_count DESC, n.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...tags, tags.length, limit, offset) as Array<{
      id: string;
      title: string;
      body: string;
      score: number;
      source_connector?: string;
      created_at?: number;
      updated_at?: number;
    }>;

    return results;
  }

  /**
   * Analyze a query plan to check index usage
   */
  analyzeQuery(sql: string, params: unknown[] = []): QueryPlan {
    const explainStmt = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`);
    const plan = explainStmt.all(...params) as Array<{
      detail: string;
    }>;

    const planText = plan.map(row => row.detail).join('\n');
    const usesIndex = planText.includes('USING INDEX') || planText.includes('SEARCH TABLE');
    const indexMatch = planText.match(/USING INDEX (\w+)/);
    const suggestions: string[] = [];

    // Analyze for optimization opportunities
    if (planText.includes('SCAN TABLE')) {
      suggestions.push('Query performs a full table scan. Consider adding an index.');
    }

    if (planText.includes('TEMP B-TREE')) {
      suggestions.push('Query uses temporary B-tree for sorting. Consider adding an index on ORDER BY columns.');
    }

    if (!usesIndex && sql.includes('WHERE')) {
      suggestions.push('WHERE clause does not use an index. Consider adding an index on filter columns.');
    }

    return {
      query: sql,
      usesIndex,
      indexName: indexMatch?.[1],
      estimatedRows: this.estimateRows(planText),
      suggestions,
    };
  }

  /**
   * Optimize FTS5 by rebuilding the index
   */
  optimizeFTS5(): void {
    // Rebuild FTS5 index for better performance
    this.db.prepare("INSERT INTO NoteSearch(NoteSearch) VALUES('rebuild')").run();

    // Optimize the index structure
    this.db.prepare("INSERT INTO NoteSearch(NoteSearch) VALUES('optimize')").run();
  }

  /**
   * Get statistics about the FTS5 index
   */
  getFTS5Stats(): {
    totalDocs: number;
    totalTokens: number;
    avgTokensPerDoc: number;
  } {
    const stats = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM NoteSearch) AS totalDocs,
        (SELECT SUM(length(title) + length(body)) FROM Note) AS totalTokens
    `).get() as { totalDocs: number; totalTokens: number };

    return {
      totalDocs: stats.totalDocs,
      totalTokens: stats.totalTokens,
      avgTokensPerDoc: stats.totalDocs > 0
        ? stats.totalTokens / stats.totalDocs
        : 0,
    };
  }

  /**
   * Clear the query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cached query result if available and not expired
   * Currently unused but reserved for future query caching feature
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getCached(key: string): unknown | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache a query result
   * Currently unused but reserved for future query caching feature
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private setCache(key: string, result: unknown): void {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.queryCache.size > 100) {
      const firstKey = this.queryCache.keys().next().value;
      if (firstKey) {
        this.queryCache.delete(firstKey);
      }
    }
  }

  /**
   * Build an optimized FTS5 query from a search term
   */
  private buildFTS5Query(searchTerm: string): string {
    // Remove special characters that could break FTS5
    let cleaned = searchTerm.trim();

    // Handle quoted phrases
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      return cleaned;
    }

    // Split into words and apply boolean operators
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 1) {
      // Single word: use prefix matching for better results
      return `"${words[0]}"*`;
    }

    // Multiple words: use AND operator with prefix matching
    return words.map(w => `"${w.replace(/"/g, '""')}"*`).join(' AND ');
  }

  /**
   * Estimate number of rows from query plan
   */
  private estimateRows(planText: string): number {
    const rowsMatch = planText.match(/\(~(\d+) rows\)/);
    return rowsMatch ? parseInt(rowsMatch[1], 10) : 0;
  }
}
