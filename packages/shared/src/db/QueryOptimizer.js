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
/**
 * Optimized query helpers for SQLite database
 */
export class QueryOptimizer {
    db;
    queryCache = new Map();
    cacheTTL = 60000; // 1 minute cache TTL
    constructor(db) {
        this.db = db;
    }
    /**
     * Optimized full-text search with BM25 ranking and filtering
     */
    searchNotes(searchTerm, options = {}) {
        const { limit = 50, offset = 0, minScore = 0, highlight = false, sourceConnector, tags, dateRange, } = options;
        // Build FTS5 query with proper syntax
        const ftsQuery = this.buildFTS5Query(searchTerm);
        // Build WHERE conditions
        const conditions = ['NoteSearch MATCH ?'];
        const params = [ftsQuery];
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
        const results = stmt.all(...params);
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
    fuzzySearchNotes(searchTerm, options = {}) {
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
        const results = stmt.all(exactMatch, fuzzyTerm, exactMatch, fuzzyTerm, fuzzyTerm, limit, offset);
        return results;
    }
    /**
     * Search by tags with relevance ranking
     */
    searchByTags(tags, options = {}) {
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
        const results = stmt.all(...tags, tags.length, limit, offset);
        return results;
    }
    /**
     * Analyze a query plan to check index usage
     */
    analyzeQuery(sql, params = []) {
        const explainStmt = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`);
        const plan = explainStmt.all(...params);
        const planText = plan.map(row => row.detail).join('\n');
        const usesIndex = planText.includes('USING INDEX') || planText.includes('SEARCH TABLE');
        const indexMatch = planText.match(/USING INDEX (\w+)/);
        const suggestions = [];
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
    optimizeFTS5() {
        // Rebuild FTS5 index for better performance
        this.db.prepare("INSERT INTO NoteSearch(NoteSearch) VALUES('rebuild')").run();
        // Optimize the index structure
        this.db.prepare("INSERT INTO NoteSearch(NoteSearch) VALUES('optimize')").run();
    }
    /**
     * Get statistics about the FTS5 index
     */
    getFTS5Stats() {
        const stats = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM NoteSearch) AS totalDocs,
        (SELECT SUM(length(title) + length(body)) FROM Note) AS totalTokens
    `).get();
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
    clearCache() {
        this.queryCache.clear();
    }
    /**
     * Get cached query result if available and not expired
     * Currently unused but reserved for future query caching feature
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getCached(key) {
        const cached = this.queryCache.get(key);
        if (!cached)
            return null;
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
    setCache(key, result) {
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
    buildFTS5Query(searchTerm) {
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
    estimateRows(planText) {
        const rowsMatch = planText.match(/\(~(\d+) rows\)/);
        return rowsMatch ? parseInt(rowsMatch[1], 10) : 0;
    }
}
