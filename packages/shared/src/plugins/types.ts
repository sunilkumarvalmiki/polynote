/**
 * Plugin System Type Definitions
 * Enables extensible functionality through a plugin architecture
 */

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  dependencies?: Record<string, string>;
  permissions?: PluginPermission[];
}

export type PluginPermission = 
  | 'database:read'
  | 'database:write'
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network:request'
  | 'ui:extend'
  | 'settings:manage';

export interface Plugin {
  manifest: PluginManifest;
  init(): Promise<void>;
  destroy(): Promise<void>;
  onSettingsChanged?(settings: Record<string, unknown>): Promise<void>;
}

export interface PluginContext {
  database: PluginDatabaseAPI;
  ui: PluginUIAPI;
  settings: PluginSettingsAPI;
  logger: PluginLogger;
}

export interface PluginDatabaseAPI {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

export interface PluginUIAPI {
  registerCommand(command: PluginCommand): void;
  registerView(view: PluginView): void;
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
}

export interface PluginCommand {
  id: string;
  name: string;
  callback: () => void | Promise<void>;
  hotkey?: string;
}

export interface PluginView {
  id: string;
  name: string;
  icon?: string;
  component: any; // React component type, imported dynamically
}

export interface PluginSettingsAPI {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): Promise<void>;
  getAll(): Record<string, unknown>;
}

export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface PluginLoadResult {
  success: boolean;
  plugin?: Plugin;
  error?: string;
}