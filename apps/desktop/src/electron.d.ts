/// <reference types="electron" />

interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface SearchOptions {
  caseSensitive?: boolean;
  regex?: boolean;
  maxResults?: number;
}

interface SyncStatus {
  isActive: boolean;
  lastSync?: string;
  connectorId?: string;
  progress?: number;
}

interface SyncProgress {
  stage: string;
  progress: number;
  message?: string;
}

interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GraphOptions {
  depth?: number;
  minConnections?: number;
  includeOrphans?: boolean;
}

interface Graph {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ source: string; target: string; label?: string }>;
}

interface Rule {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  enabled: boolean;
}

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  syncEnabled: boolean;
  aiProvider?: string;
  [key: string]: unknown;
}

interface IElectronAPI {
  // Notes API
  getNotes: (filter?: { search?: string; tags?: string[] }) => Promise<Note[]>;
  getNote: (noteId: string) => Promise<Note>;
  createNote: (note: Partial<Note>) => Promise<Note>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<Note>;
  deleteNote: (noteId: string) => Promise<void>;

  // Search API
  searchNotes: (query: string, options?: SearchOptions) => Promise<Note[]>;

  // Sync API
  getSyncStatus: () => Promise<SyncStatus>;
  startSync: (connectorId?: string) => Promise<void>;
  pauseSync: () => Promise<void>;
  onSyncProgress: (callback: (progress: SyncProgress) => void) => () => void;

  // AI API
  summarizeNote: (noteId: string, options?: AIOptions) => Promise<string>;
  translateNote: (noteId: string, targetLang: string) => Promise<string>;
  rewriteNote: (noteId: string, style: string) => Promise<string>;

  // Graph API
  getGraph: (options?: GraphOptions) => Promise<Graph>;

  // Rules API
  getRules: () => Promise<Rule[]>;
  createRule: (rule: Partial<Rule>) => Promise<Rule>;
  updateRule: (ruleId: string, updates: Partial<Rule>) => Promise<Rule>;
  deleteRule: (ruleId: string) => Promise<void>;

  // Settings API
  getSettings: () => Promise<Settings>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;

  // System API
  openExternal: (url: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  getAppPath: (name: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI | undefined;
  }
}

export {};