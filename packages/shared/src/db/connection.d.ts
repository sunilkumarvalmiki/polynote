import Database from 'better-sqlite3';
export declare function initializeDatabase(): void;
export declare function getDatabase(): Database.Database;
export declare function closeDatabase(): void;
export declare function transaction<T>(fn: () => T): T;
export declare function batchTransaction(operations: Array<() => void>): void;
export declare function query<T = unknown>(sql: string, params?: unknown[]): T[];
export declare function queryOne<T = unknown>(sql: string, params?: unknown[]): T | undefined;
export declare function execute(sql: string, params?: unknown[]): Database.RunResult;
export declare function searchNotes(searchTerm: string, limit?: number): Array<{
    id: string;
    title: string;
    body: string;
    rank: number;
}>;
export { Database };
//# sourceMappingURL=connection.d.ts.map