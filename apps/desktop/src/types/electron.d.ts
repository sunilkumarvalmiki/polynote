export interface IElectronAPI {
  // Notes API
  getNotes: (filter?: { search?: string; tags?: string[] }) => Promise<any[]>;
  getNote: (noteId: string) => Promise<any>;
  createNote: (note: any) => Promise<any>;
  updateNote: (noteId: string, updates: any) => Promise<any>;
  deleteNote: (noteId: string) => Promise<void>;

  // Search API
  searchNotes: (query: string, options?: any) => Promise<any[]>;

  // Sync API
  getSyncStatus: () => Promise<any>;
  startSync: (connectorId?: string) => Promise<void>;
  pauseSync: () => Promise<void>;
  onSyncProgress: (callback: (progress: any) => void) => () => void;

  // AI API
  summarizeNote: (noteId: string, options?: any) => Promise<string>;
  translateNote: (noteId: string, targetLang: string) => Promise<string>;
  rewriteNote: (noteId: string, style: string) => Promise<string>;

  // Graph API
  getGraph: (options?: any) => Promise<any>;

  // Rules API
  getRules: () => Promise<any[]>;
  createRule: (rule: any) => Promise<any>;
  updateRule: (ruleId: string, updates: any) => Promise<any>;
  deleteRule: (ruleId: string) => Promise<void>;

  // Settings API
  getSettings: () => Promise<any>;
  updateSettings: (updates: any) => Promise<void>;

  // System API
  openExternal: (url: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  getAppPath: (name: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export {};
