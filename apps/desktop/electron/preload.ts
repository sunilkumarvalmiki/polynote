import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for better type safety
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

// Types for IPC channels
export interface IElectronAPI {
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

// Expose protected methods to renderer process
const api: IElectronAPI = {
  // Notes API
  getNotes: filter => ipcRenderer.invoke('notes:get-all', filter),
  getNote: noteId => ipcRenderer.invoke('notes:get-one', noteId),
  createNote: note => ipcRenderer.invoke('notes:create', note),
  updateNote: (noteId, updates) => ipcRenderer.invoke('notes:update', noteId, updates),
  deleteNote: noteId => ipcRenderer.invoke('notes:delete', noteId),

  // Search API
  searchNotes: (query, options) => ipcRenderer.invoke('search:notes', query, options),

  // Sync API
  getSyncStatus: () => ipcRenderer.invoke('sync:get-status'),
  startSync: connectorId => ipcRenderer.invoke('sync:start', connectorId),
  pauseSync: () => ipcRenderer.invoke('sync:pause'),
  onSyncProgress: callback => {
    const subscription = (_event: IpcRendererEvent, progress: SyncProgress) => callback(progress);
    ipcRenderer.on('sync:progress', subscription);
    return () => {
      ipcRenderer.removeListener('sync:progress', subscription);
    };
  },

  // AI API
  summarizeNote: (noteId, options) => ipcRenderer.invoke('ai:summarize', noteId, options),
  translateNote: (noteId, targetLang) => ipcRenderer.invoke('ai:translate', noteId, targetLang),
  rewriteNote: (noteId, style) => ipcRenderer.invoke('ai:rewrite', noteId, style),

  // Graph API
  getGraph: options => ipcRenderer.invoke('graph:get', options),

  // Rules API
  getRules: () => ipcRenderer.invoke('rules:get-all'),
  createRule: rule => ipcRenderer.invoke('rules:create', rule),
  updateRule: (ruleId, updates) => ipcRenderer.invoke('rules:update', ruleId, updates),
  deleteRule: ruleId => ipcRenderer.invoke('rules:delete', ruleId),

  // Settings API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: updates => ipcRenderer.invoke('settings:update', updates),

  // System API
  openExternal: url => ipcRenderer.invoke('system:open-external', url),
  getAppVersion: () => ipcRenderer.invoke('system:get-version'),
  getAppPath: name => ipcRenderer.invoke('system:get-path', name),
};

// Expose API to renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
