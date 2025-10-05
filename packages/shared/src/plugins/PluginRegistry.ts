/**
 * Plugin Registry
 * Manages plugin lifecycle, loading, and coordination
 */

import {
  Plugin,
  PluginContext,
  PluginLoadResult,
  PluginManifest,
  PluginPermission,
  PluginDatabaseAPI,
  PluginUIAPI,
  PluginSettingsAPI,
  PluginLogger,
  PluginCommand,
  PluginView
} from './types.js';

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private contexts: Map<string, PluginContext> = new Map();
  private enabledPlugins: Set<string> = new Set();

  constructor(
    private databaseAPI: PluginDatabaseAPI,
    private uiAPI: PluginUIAPI,
    private settingsAPI: PluginSettingsAPI,
    private logger: PluginLogger
  ) {}

  /**
   * Load and register a plugin
   */
  async loadPlugin(plugin: Plugin): Promise<PluginLoadResult> {
    try {
      // Validate manifest
      if (!plugin.manifest.id || !plugin.manifest.name) {
        return {
          success: false,
          error: 'Invalid plugin manifest: missing id or name'
        };
      }

      // Check if already loaded
      if (this.plugins.has(plugin.manifest.id)) {
        return {
          success: false,
          error: `Plugin ${plugin.manifest.id} is already loaded`
        };
      }

      // Validate dependencies
      const missingDeps = this.validateDependencies(plugin.manifest);
      if (missingDeps.length > 0) {
        return {
          success: false,
          error: `Missing dependencies: ${missingDeps.join(', ')}`
        };
      }

      // Create plugin context with permission filtering
      const context = this.createContext(plugin.manifest);
      this.contexts.set(plugin.manifest.id, context);

      // Initialize plugin
      await plugin.init();

      // Register plugin
      this.plugins.set(plugin.manifest.id, plugin);
      this.enabledPlugins.add(plugin.manifest.id);

      this.logger.info(`Plugin loaded successfully: ${plugin.manifest.name}`);

      return {
        success: true,
        plugin
      };
    } catch (error) {
      this.logger.error(`Failed to load plugin: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        this.logger.warn(`Plugin not found: ${pluginId}`);
        return false;
      }

      // Call destroy lifecycle
      await plugin.destroy();

      // Remove from registry
      this.plugins.delete(pluginId);
      this.contexts.delete(pluginId);
      this.enabledPlugins.delete(pluginId);

      this.logger.info(`Plugin unloaded: ${plugin.manifest.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unload plugin ${pluginId}: ${error}`);
      return false;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (this.enabledPlugins.has(pluginId)) {
      return true; // Already enabled
    }

    try {
      await plugin.init();
      this.enabledPlugins.add(pluginId);
      this.logger.info(`Plugin enabled: ${plugin.manifest.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to enable plugin ${pluginId}: ${error}`);
      return false;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (!this.enabledPlugins.has(pluginId)) {
      return true; // Already disabled
    }

    try {
      await plugin.destroy();
      this.enabledPlugins.delete(pluginId);
      this.logger.info(`Plugin disabled: ${plugin.manifest.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to disable plugin ${pluginId}: ${error}`);
      return false;
    }
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugin context
   */
  getContext(pluginId: string): PluginContext | undefined {
    return this.contexts.get(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.enabledPlugins)
      .map(id => this.plugins.get(id))
      .filter((p): p is Plugin => p !== undefined);
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }

  /**
   * Notify plugin of settings changes
   */
  async notifySettingsChanged(
    pluginId: string,
    settings: Record<string, unknown>
  ): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin?.onSettingsChanged) {
      try {
        await plugin.onSettingsChanged(settings);
      } catch (error) {
        this.logger.error(
          `Plugin ${pluginId} settings change handler failed: ${error}`
        );
      }
    }
  }

  /**
   * Validate plugin dependencies
   */
  private validateDependencies(manifest: PluginManifest): string[] {
    const missing: string[] = [];

    if (manifest.dependencies) {
      for (const [depId] of Object.entries(manifest.dependencies)) {
        if (!this.plugins.has(depId)) {
          missing.push(depId);
        }
      }
    }

    return missing;
  }

  /**
   * Create plugin context with permission filtering
   */
  private createContext(manifest: PluginManifest): PluginContext {
    const permissions = new Set(manifest.permissions || []);

    return {
      database: this.createDatabaseAPI(permissions),
      ui: this.createUIAPI(permissions),
      settings: this.createSettingsAPI(permissions),
      logger: this.createLoggerAPI(manifest.id)
    };
  }

  /**
   * Create database API with permission checks
   */
  private createDatabaseAPI(permissions: Set<PluginPermission>): PluginDatabaseAPI {
    return {
      query: async <T = unknown>(sql: string, params?: unknown[]) => {
        if (!permissions.has('database:read')) {
          throw new Error('Plugin does not have database:read permission');
        }
        return this.databaseAPI.query<T>(sql, params);
      },
      execute: async (sql: string, params?: unknown[]) => {
        if (!permissions.has('database:write')) {
          throw new Error('Plugin does not have database:write permission');
        }
        return this.databaseAPI.execute(sql, params);
      }
    };
  }

  /**
   * Create UI API with permission checks
   */
  private createUIAPI(permissions: Set<PluginPermission>): PluginUIAPI {
    return {
      registerCommand: (command: PluginCommand) => {
        if (!permissions.has('ui:extend')) {
          throw new Error('Plugin does not have ui:extend permission');
        }
        return this.uiAPI.registerCommand(command);
      },
      registerView: (view: PluginView) => {
        if (!permissions.has('ui:extend')) {
          throw new Error('Plugin does not have ui:extend permission');
        }
        return this.uiAPI.registerView(view);
      },
      showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => {
        if (!permissions.has('ui:extend')) {
          throw new Error('Plugin does not have ui:extend permission');
        }
        return this.uiAPI.showNotification(message, type);
      }
    };
  }

  /**
   * Create settings API with permission checks
   */
  private createSettingsAPI(permissions: Set<PluginPermission>): PluginSettingsAPI {
    return {
      get: <T = unknown>(key: string) => {
        if (!permissions.has('settings:manage')) {
          throw new Error('Plugin does not have settings:manage permission');
        }
        return this.settingsAPI.get<T>(key);
      },
      set: async <T = unknown>(key: string, value: T) => {
        if (!permissions.has('settings:manage')) {
          throw new Error('Plugin does not have settings:manage permission');
        }
        return this.settingsAPI.set(key, value);
      },
      getAll: () => {
        if (!permissions.has('settings:manage')) {
          throw new Error('Plugin does not have settings:manage permission');
        }
        return this.settingsAPI.getAll();
      }
    };
  }

  /**
   * Create logger API for plugin
   */
  private createLoggerAPI(pluginId: string): PluginLogger {
    const prefix = `[Plugin:${pluginId}]`;
    return {
      debug: (message: string, ...args: unknown[]) => this.logger.debug(`${prefix} ${message}`, ...args),
      info: (message: string, ...args: unknown[]) => this.logger.info(`${prefix} ${message}`, ...args),
      warn: (message: string, ...args: unknown[]) => this.logger.warn(`${prefix} ${message}`, ...args),
      error: (message: string, ...args: unknown[]) => this.logger.error(`${prefix} ${message}`, ...args)
    };
  }
}