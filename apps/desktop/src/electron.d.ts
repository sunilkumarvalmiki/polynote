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

interface Connector {
  id: string;
  name: string;
  status: string;
  enabled: boolean;
}

interface SyncStatus {
  isRunning: boolean;
  lastSync: string;
  connectors: Connector[];
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

interface Condition {
  field: 'title' | 'content' | 'tags';
  operator: 'contains' | 'matches' | 'equals';
  value: string;
}

interface Action {
  type: 'addTag' | 'moveToFolder' | 'notify' | 'summarize';
  params: Record<string, any>;
}

interface Rule {
  id: string;
  name: string;
  trigger: 'onCreate' | 'onUpdate' | 'onTag';
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  syncEnabled: boolean;
  aiProvider?: string;
  [key: string]: unknown;
}

interface ShareBundleOptions {
  includeAttachments?: boolean;
  expiresAt?: number;
}

interface ShareBundleMetadata {
  version: string;
  createdAt: number;
  expiresAt?: number;
  noteCount: number;
  hasAttachments: boolean;
  algorithm: string;
}

interface ShareBundleResult {
  bundle: string; // base64 encoded
  size: number;
}

interface ExtractedBundle {
  notes: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
  }>;
  attachments?: Array<{
    id: string;
    noteId: string;
    filename: string;
    data: Buffer;
  }>;
  metadata: ShareBundleMetadata;
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

  // Share Bundle API
  createShareBundle: (
    noteIds: string[],
    password: string,
    options?: ShareBundleOptions
  ) => Promise<ShareBundleResult>;
  extractShareBundle: (bundleBase64: string, password: string) => Promise<ExtractedBundle>;
  verifyShareBundle: (bundleBase64: string) => Promise<{ isValid: boolean }>;
  getShareBundleMetadata: (bundleBase64: string) => Promise<ShareBundleMetadata>;

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