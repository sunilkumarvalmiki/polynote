import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Types for IPC channels
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

// Expose protected methods to renderer process
const api: IElectronAPI = {
  // Notes API
  getNotes: (filter) => ipcRenderer.invoke('notes:get-all', filter),
  getNote: (noteId) => ipcRenderer.invoke('notes:get-one', noteId),
  createNote: (note) => ipcRenderer.invoke('notes:create', note),
  updateNote: (noteId, updates) => ipcRenderer.invoke('notes:update', noteId, updates),
  deleteNote: (noteId) => ipcRenderer.invoke('notes:delete', noteId),

  // Search API
  searchNotes: (query, options) => ipcRenderer.invoke('search:notes', query, options),

  // Sync API
  getSyncStatus: () => ipcRenderer.invoke('sync:get-status'),
  startSync: (connectorId) => ipcRenderer.invoke('sync:start', connectorId),
  pauseSync: () => ipcRenderer.invoke('sync:pause'),
  onSyncProgress: (callback) => {
    const subscription = (_event: IpcRendererEvent, progress: any) => callback(progress);
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
  getGraph: (options) => ipcRenderer.invoke('graph:get', options),

  // Rules API
  getRules: () => ipcRenderer.invoke('rules:get-all'),
  createRule: (rule) => ipcRenderer.invoke('rules:create', rule),
  updateRule: (ruleId, updates) => ipcRenderer.invoke('rules:update', ruleId, updates),
  deleteRule: (ruleId) => ipcRenderer.invoke('rules:delete', ruleId),

  // Settings API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (updates) => ipcRenderer.invoke('settings:update', updates),

  // System API
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  getAppVersion: () => ipcRenderer.invoke('system:get-version'),
  getAppPath: (name) => ipcRenderer.invoke('system:get-path', name),
};

// Expose API to renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
