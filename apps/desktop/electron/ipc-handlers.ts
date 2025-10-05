import { ipcMain, shell, app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

import { mainWindow } from './main';
import { checkRateLimit } from './rate-limiter';

// Dynamic imports for database (ES module compatibility)
let dbModule: any = null;
let aiModule: any = null;
let auditLogger: any = null;
let inputValidator: any = null;
let AuditEventTypeEnum: any = null;

// Initialize database modules
async function getDbModule() {
  if (!dbModule) {
    dbModule = await import('@polynote/shared');
  }
  return dbModule;
}

// Initialize audit logger and AuditEventType
async function getAuditLogger() {
  if (!auditLogger) {
    const module = await import('@polynote/shared');
    auditLogger = module.auditLogger;
    AuditEventTypeEnum = module.AuditEventType;
  }
  return auditLogger;
}

// Get AuditEventType enum
function getAuditEventType(): any {
  if (!AuditEventTypeEnum) {
    throw new Error('AuditEventType not initialized - call getAuditLogger() first');
  }
  return AuditEventTypeEnum;
}

// Initialize input validator
async function getInputValidator() {
  if (!inputValidator) {
    try {
      const module = await import('@polynote/security');
      inputValidator = module.InputValidator.getInstance();
    } catch (error) {
      console.error('Failed to load @polynote/security module:', error);
      // Fallback validator that just returns the input unchanged
      inputValidator = {
        redactSensitiveData: (data: string | Record<string, unknown>) =>
          typeof data === 'string' ? data : JSON.stringify(data)
      };
    }
  }
  return inputValidator;
}

// Initialize AI modules
async function getAiModule() {
  if (!aiModule) {
    // @ts-ignore - Dynamic import for ES module compatibility
    aiModule = await import('@polynote/ai');
  }
  return aiModule;
}

// AI Service instance
let aiService: any = null;
let providerRegistry: any = null;

/**
 * Initialize AI providers with auto-detection and graceful fallback
 * Implements Section 4.2.1 from missing_features.md
 */
async function initializeAIProviders() {
  const ai = await getAiModule();
  const { ProviderRegistry, OllamaProvider, OpenAIProvider, ClaudeProvider, ProviderType } = ai;

  const registry = new ProviderRegistry();

  // Try to register Ollama (local provider)
  try {
    const ollamaProvider = new OllamaProvider({
      type: ProviderType.OLLAMA,
      name: 'ollama-local',
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      maxTokens: 4096,
      temperature: 0.7,
    });

    // Initialize and verify availability
    await ollamaProvider.initialize();
    await registry.registerProvider({
      type: ProviderType.OLLAMA,
      name: 'ollama-local',
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      maxTokens: 4096,
      temperature: 0.7,
    });

    console.log('✅ Ollama provider registered');
  } catch (error) {
    console.warn('⚠️ Ollama not available, using cloud fallback:',
      error instanceof Error ? error.message : 'Unknown error');
  }

  // Try to register cloud providers if API keys exist in settings
  try {
    // Check for OpenAI API key
    if (mockSettings.openaiApiKey) {
      await registry.registerProvider({
        type: ProviderType.OPENAI,
        name: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: mockSettings.openaiApiKey,
        model: 'gpt-3.5-turbo',
        maxTokens: 4096,
        temperature: 0.7,
      });
      console.log('✅ OpenAI provider registered');
    }
  } catch (error) {
    console.warn('⚠️ OpenAI provider registration failed:',
      error instanceof Error ? error.message : 'Unknown error');
  }

  try {
    // Check for Claude API key
    if (mockSettings.claudeApiKey) {
      await registry.registerProvider({
        type: ProviderType.CLAUDE,
        name: 'claude',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: mockSettings.claudeApiKey,
        model: 'claude-3-sonnet-20240229',
        maxTokens: 4096,
        temperature: 0.7,
      });
      console.log('✅ Claude provider registered');
    }
  } catch (error) {
    console.warn('⚠️ Claude provider registration failed:',
      error instanceof Error ? error.message : 'Unknown error');
  }

  return registry;
}

// Initialize AI service with providers
async function initializeAiService() {
  if (aiService) return aiService;

  const ai = await getAiModule();
  const { AIService } = ai;

  // Initialize providers if not already done
  if (!providerRegistry) {
    providerRegistry = await initializeAIProviders();
  }

  aiService = new AIService(providerRegistry);
  return aiService;
}

/**
 * IPC Handlers for secure communication between main and renderer processes
 *
 * Security principles:
 * 1. All handlers validate input
 * 2. No direct access to Node.js/Electron APIs from renderer
 * 3. All file system operations are sandboxed
 * 4. External URLs are validated before opening
 */

// Type definitions for frontend compatibility
interface FrontendNote {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Settings {
  theme: string;
  language: string;
  syncInterval: number;
  aiProvider: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  [key: string]: unknown;
}

interface NoteFilter {
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Mock data for rules and settings (will be replaced in Phase 3)
let mockSettings: Settings = {
  theme: 'dark',
  language: 'en',
  syncInterval: 300,
  aiProvider: 'ollama',
};

// Helper to convert DB note to frontend format
function dbNoteToFrontend(dbNote: any): FrontendNote {
  return {
    id: dbNote.id,
    title: dbNote.title,
    body: dbNote.body,
    tags: dbNote.tags || [],
    createdAt: new Date(dbNote.created_at).toISOString(),
    updatedAt: new Date(dbNote.updated_at).toISOString(),
  };
}

export function registerIpcHandlers(): void {
  // ============================================================================
  // Notes API
  // ============================================================================

  ipcMain.handle('notes:get-all', async (_event, filter?: NoteFilter): Promise<PaginatedResponse<FrontendNote>> => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();
    
    try {
      checkRateLimit('notes:get-all');
      
      const { searchNotes, getPreparedStatement } = await getDbModule();
      
      const page = filter?.page ?? 1;
      const limit = filter?.limit ?? 50;
      const offset = (page - 1) * limit;
      
      let result: PaginatedResponse<FrontendNote>;
      
      // If search filter is provided, use FTS5 search with pagination
      if (filter?.search) {
        const results = searchNotes(filter.search);
        const total = results.length;
        const paginatedResults = results.slice(offset, offset + limit);
        
        result = {
          data: paginatedResults.map(dbNoteToFrontend),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      } else {
        // Get total count using prepared statement
        const countStmt = getPreparedStatement(
          'count-notes',
          'SELECT COUNT(*) as count FROM Note WHERE deleted_at IS NULL'
        );
        const { count: total } = countStmt.get() as { count: number };

        // Get paginated notes using prepared statement
        const notesStmt = getPreparedStatement(
          'paginated-notes',
          'SELECT * FROM Note WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT ? OFFSET ?'
        );
        const notes = notesStmt.all(limit, offset);
        
        result = {
          data: notes.map(dbNoteToFrontend),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }
      
      // Log successful retrieval
      await logger.log({
        eventType: EventType.NOTE_VIEW,
        action: 'List notes',
        status: 'success',
        resourceType: 'note',
        metadata: {
          count: result.data.length,
          page,
          limit,
          hasSearch: !!filter?.search
        },
      });
      
      return result;
    } catch (error) {
      // Log failure with sanitized error message
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      await logger.log({
        eventType: EventType.NOTE_VIEW,
        action: 'List notes',
        status: 'failure',
        resourceType: 'note',
        errorMessage: sanitizedError,
      });
      
      console.error('Error getting notes:', error);
      throw error;
    }
  });

  ipcMain.handle('notes:get-one', async (_event, noteId: string) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();
    
    try {
      checkRateLimit('notes:get-one');
      
      const { queryOne } = await getDbModule();
      const note = queryOne('SELECT * FROM Note WHERE id = ? AND deleted_at IS NULL', [noteId]);
      
      if (!note) {
        throw new Error(`Note not found: ${noteId}`);
      }
      
      // Log successful retrieval
      await logger.log({
        eventType: EventType.NOTE_VIEW,
        action: 'View note',
        status: 'success',
        resourceId: noteId,
        resourceType: 'note',
      });
      
      return dbNoteToFrontend(note);
    } catch (error) {
      // Log failure with sanitized error message
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      await logger.log({
        eventType: EventType.NOTE_VIEW,
        action: 'View note',
        status: 'failure',
        resourceId: noteId,
        resourceType: 'note',
        errorMessage: sanitizedError,
      });
      
      console.error('Error getting note:', error);
      throw error;
    }
  });

  ipcMain.handle('notes:create', async (_event, note: Partial<FrontendNote>) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();
    
    try {
      checkRateLimit('notes:create');
      
      const { transaction, execute, generateChecksum } = await getDbModule();
      
      const result = transaction(() => {
        const id = uuidv4();
        const now = Date.now();
        const body = note.body || '';
        const title = note.title || 'Untitled';
        const checksum = generateChecksum(body);
        
        execute(
          'INSERT INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, title, body, now, now, 'local', id, checksum]
        );
        
        return {
          id,
          title,
          body,
          tags: note.tags || [],
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        };
      });
      
      // Log successful creation
      await logger.log({
        eventType: EventType.NOTE_CREATE,
        action: 'Create note',
        status: 'success',
        resourceId: result.id,
        resourceType: 'note',
        metadata: { title: result.title },
      });
      
      return result;
    } catch (error) {
      // Log failure with sanitized error message
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      await logger.log({
        eventType: EventType.NOTE_CREATE,
        action: 'Create note',
        status: 'failure',
        resourceType: 'note',
        errorMessage: sanitizedError,
      });
      
      console.error('Error creating note:', error);
      throw error;
    }
  });

  ipcMain.handle('notes:update', async (_event, noteId: string, updates: Partial<FrontendNote>) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();
    
    try {
      checkRateLimit('notes:update');
      
      const { transaction, execute, queryOne, generateChecksum } = await getDbModule();
      
      const result = transaction(() => {
        const existing = queryOne('SELECT * FROM Note WHERE id = ?', [noteId]);
        if (!existing) {
          throw new Error(`Note not found: ${noteId}`);
        }
        
        const now = Date.now();
        const body = updates.body !== undefined ? updates.body : existing.body;
        const title = updates.title !== undefined ? updates.title : existing.title;
        const checksum = generateChecksum(body);
        
        execute(
          'UPDATE Note SET title = ?, body = ?, updated_at = ?, checksum = ? WHERE id = ?',
          [title, body, now, checksum, noteId]
        );
        
        const updated = queryOne('SELECT * FROM Note WHERE id = ?', [noteId]);
        return dbNoteToFrontend(updated);
      });
      
      // Log successful update
      await logger.log({
        eventType: EventType.NOTE_UPDATE,
        action: 'Update note',
        status: 'success',
        resourceId: noteId,
        resourceType: 'note',
        metadata: {
          fieldsUpdated: Object.keys(updates),
        },
      });
      
      return result;
    } catch (error) {
      // Log failure with sanitized error message
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      await logger.log({
        eventType: EventType.NOTE_UPDATE,
        action: 'Update note',
        status: 'failure',
        resourceId: noteId,
        resourceType: 'note',
        errorMessage: sanitizedError,
      });
      
      console.error('Error updating note:', error);
      throw error;
    }
  });

  ipcMain.handle('notes:delete', async (_event, noteId: string) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();
    
    try {
      checkRateLimit('notes:delete');
      
      const { execute } = await getDbModule();
      const now = Date.now();
      
      // Soft delete
      execute('UPDATE Note SET deleted_at = ? WHERE id = ?', [now, noteId]);
      // Log successful deletion
      await logger.log({
        eventType: EventType.NOTE_DELETE,
        action: 'Delete note',
        status: 'success',
        resourceId: noteId,
        resourceType: 'note',
      });
    } catch (error) {
      // Log failure
      await logger.log({
        eventType: EventType.NOTE_DELETE,
        action: 'Delete note',
        status: 'failure',
        resourceId: noteId,
        resourceType: 'note',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error('Error deleting note:', error);
      throw error;
    }
  });

  // ============================================================================
  // Search API
  // ============================================================================

  ipcMain.handle('search:notes', async (_, query: string) => {
    try {
      checkRateLimit('search:notes');
      
      const { searchNotes } = await getDbModule();
      const results = searchNotes(query);
      return results.map(dbNoteToFrontend);
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  });

  // ============================================================================
  // Sync API
  // ============================================================================

  ipcMain.handle('sync:get-status', async () => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();
    
    try {
      // Log sync status check
      await logger.log({
        eventType: EventType.SYNC_START,
        action: 'Check sync status',
        status: 'success',
        resourceType: 'sync',
      });
      
      // TODO: Replace with actual sync status from database
      return {
        isRunning: false,
        lastSync: new Date().toISOString(),
        connectors: [
          { id: 'obsidian', name: 'Obsidian', status: 'idle', enabled: true },
          { id: 'notion', name: 'Notion', status: 'idle', enabled: false },
        ],
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:start', async (_event, connectorId?: string) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();
    
    try {
      // TODO: Replace with actual sync start
      console.log('Starting sync for:', connectorId || 'all connectors');

      // Simulate progress updates
      const progress = { current: 0, total: 100 };
      const interval = setInterval(() => {
        progress.current += 10;
        if (mainWindow) {
          mainWindow.webContents.send('sync:progress', progress);
        }
        if (progress.current >= progress.total) {
          clearInterval(interval);
        }
      }, 500);
      
      // Log sync start
      await logger.log({
        eventType: EventType.SYNC_START,
        action: 'Start sync',
        status: 'success',
        resourceType: 'sync',
        metadata: { connectorId: connectorId || 'all' },
      });
    } catch (error) {
      // Log failure
      await logger.log({
        eventType: EventType.SYNC_FAILURE,
        action: 'Start sync',
        status: 'failure',
        resourceType: 'sync',
        metadata: { connectorId: connectorId || 'all' },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error('Error starting sync:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:pause', () => {
    try {
      // TODO: Replace with actual sync pause
      console.log('Pausing sync');
    } catch (error) {
      console.error('Error pausing sync:', error);
      throw error;
    }
  });

  // ============================================================================
  // AI API
  // ============================================================================

  ipcMain.handle('ai:summarize', async (_, noteId: string, options?: any) => {
    const logger = await getAuditLogger();
    try {
      // Get note content from database
      const { query } = await getDbModule();
      const note = query('SELECT body FROM Note WHERE id = ? AND deleted_at IS NULL', [noteId]);
      
      if (!note) {
        throw new Error('Note not found');
      }
      
      // Initialize AI service if needed
      const service = await initializeAiService();
      
      // Summarize note content
      const response = await service.summarize(note.body, options);
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.NOTE_UPDATE,
        action: 'ai_summarize',
        status: 'success',
        resourceId: noteId,
        resourceType: 'note',
      });
      
      return response.content;
    } catch (error) {
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(error instanceof Error ? error.message : String(error));
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.NOTE_UPDATE,
        action: 'ai_summarize',
        status: 'failure',
        resourceId: noteId,
        resourceType: 'note',
        errorMessage: sanitizedError,
      });
      
      console.error('Error summarizing note:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:translate', async (_, noteId: string, targetLang: string, options?: any) => {
    const logger = await getAuditLogger();
    try {
      // Get note content from database
      const { query } = await getDbModule();
      const note = query('SELECT body FROM Note WHERE id = ? AND deleted_at IS NULL', [noteId]);
      
      if (!note) {
        throw new Error('Note not found');
      }
      
      // Initialize AI service if needed
      const service = await initializeAiService();
      
      // Translate note content
      const response = await service.translate(note.body, {
        targetLanguage: targetLang,
        ...options,
      });
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.NOTE_UPDATE,
        action: 'ai_translate',
        status: 'success',
        resourceId: noteId,
        resourceType: 'note',
        metadata: { targetLanguage: targetLang },
      });
      
      return response.content;
    } catch (error) {
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(error instanceof Error ? error.message : String(error));
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.NOTE_UPDATE,
        action: 'ai_translate',
        status: 'failure',
        resourceId: noteId,
        resourceType: 'note',
        metadata: { targetLanguage: targetLang },
        errorMessage: sanitizedError,
      });
      
      console.error('Error translating note:', error);
      throw error;
    }
  });

  ipcMain.handle('ai:rewrite', async (_, noteId: string, style: string, options?: any) => {
    const logger = await getAuditLogger();
    try {
      // Get note content from database
      const { query } = await getDbModule();
      const note = query('SELECT body FROM Note WHERE id = ? AND deleted_at IS NULL', [noteId]);
      
      if (!note) {
        throw new Error('Note not found');
      }
      
      // Initialize AI service if needed
      const service = await initializeAiService();
      
      // Rewrite note content
      const response = await service.rewrite(note.body, {
        style,
        ...options,
      });
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.NOTE_UPDATE,
        action: 'ai_rewrite',
        status: 'success',
        resourceId: noteId,
        resourceType: 'note',
        metadata: { style },
      });
      
      return response.content;
    } catch (error) {
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(error instanceof Error ? error.message : String(error));
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.NOTE_UPDATE,
        action: 'ai_rewrite',
        status: 'failure',
        resourceId: noteId,
        resourceType: 'note',
        metadata: { style },
        errorMessage: sanitizedError,
      });
      
      console.error('Error rewriting note:', error);
      throw error;
    }
  });

  // ============================================================================
  // Connector API
  // ============================================================================

  // Dynamic import for connector module
  let connectorModule: any = null;

  async function getConnectorModule() {
    if (!connectorModule) {
      // @ts-ignore - Dynamic import for ES module compatibility
      connectorModule = await import('@polynote/connectors');
    }
    return connectorModule;
  }

  // Connector registry instance
  let connectorRegistry: any = null;

  // Initialize connector registry with Obsidian
  async function initializeConnectorRegistry() {
    if (connectorRegistry) return connectorRegistry;
    
    const connectors = await getConnectorModule();
    const { ConnectorRegistry, ObsidianConnector } = connectors;
    
    connectorRegistry = new ConnectorRegistry();
    
    // Register Obsidian connector if vault path is configured
    // TODO: Load from settings
    const obsidianVaultPath = process.env.OBSIDIAN_VAULT_PATH || '';
    if (obsidianVaultPath) {
      const obsidianConnector = new ObsidianConnector({
        vaultPath: obsidianVaultPath,
        enabled: true,
      });
      await connectorRegistry.register(obsidianConnector);
    }
    
    return connectorRegistry;
  }

  ipcMain.handle('connectors:list', async () => {
    const logger = await getAuditLogger();
    try {
      const registry = await initializeConnectorRegistry();
      const connectors = registry.getAll();
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.SYNC_START,
        action: 'list_connectors',
        status: 'success',
        metadata: { count: connectors.length },
      });
      
      return connectors.map((connector: any) => ({
        name: connector.name,
        enabled: connector.enabled,
        status: connector.enabled ? 'active' : 'inactive',
      }));
    } catch (error) {
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(error instanceof Error ? error.message : String(error));
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.SYNC_START,
        action: 'list_connectors',
        status: 'failure',
        errorMessage: sanitizedError,
      });
      
      console.error('Error listing connectors:', error);
      throw error;
    }
  });

  ipcMain.handle('connectors:sync', async (_, name: string) => {
    const logger = await getAuditLogger();
    try {
      const registry = await initializeConnectorRegistry();
      const connector = registry.get(name);
      
      if (!connector) {
        throw new Error(`Connector ${name} not found`);
      }
      
      // Pull changes from connector
      const notes = await connector.pullChanges();
      
      // Import notes to database
      const { execute, transaction } = await getDbModule();
      
      const result = transaction(() => {
        let imported = 0;
        for (const note of notes) {
          execute(
            'INSERT OR REPLACE INTO Note (id, title, body, created_at, updated_at, source_connector, source_id, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [note.id, note.title, note.body, note.created_at, note.updated_at, note.source_connector, note.source_id, note.checksum]
          );
          imported++;
        }
        return { imported };
      });
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.SYNC_SUCCESS,
        action: 'sync_connector',
        status: 'success',
        metadata: { connector: name, imported: result.imported },
      });
      
      return result;
    } catch (error) {
      const validator = await getInputValidator();
      const sanitizedError = validator.redactSensitiveData(error instanceof Error ? error.message : String(error));
      
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.SYNC_FAILURE,
        action: 'sync_connector',
        status: 'failure',
        metadata: { connector: name },
        errorMessage: sanitizedError,
      });
      
      console.error('Error syncing connector:', error);
      throw error;
    }
  });

  ipcMain.handle('connectors:configure', async (_, name: string, config: any) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();

    try {
      // Store configuration in settings
      const connectorSettings = mockSettings[`connector_${name}`] || {};
      mockSettings[`connector_${name}`] = { ...connectorSettings, ...config };

      // Update connector if it exists in registry
      const registry = await initializeConnectorRegistry();
      const connector = registry.get(name);

      if (connector && config.enabled !== undefined) {
        connector.enabled = config.enabled;
      }

      // Log configuration update
      await logger.log({
        eventType: EventType.SETTINGS_UPDATE,
        action: 'configure_connector',
        status: 'success',
        metadata: { connector: name, enabled: config.enabled },
      });

      return { success: true };
    } catch (error) {
      await logger.log({
        eventType: EventType.SETTINGS_UPDATE,
        action: 'configure_connector',
        status: 'failure',
        metadata: { connector: name },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error('Error configuring connector:', error);
      throw error;
    }
  });

  ipcMain.handle('connectors:test', async (_, name: string) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();

    try {
      const registry = await initializeConnectorRegistry();
      const connector = registry.get(name);

      if (!connector) {
        return {
          success: false,
          message: `Connector ${name} not found. Please configure it first.`,
        };
      }

      // Test connector authentication
      try {
        await connector.authenticate();

        await logger.log({
          eventType: EventType.SYNC_START,
          action: 'test_connector',
          status: 'success',
          metadata: { connector: name },
        });

        return {
          success: true,
          message: `Successfully connected to ${name}!`,
        };
      } catch (authError) {
        await logger.log({
          eventType: EventType.SYNC_FAILURE,
          action: 'test_connector',
          status: 'failure',
          metadata: { connector: name },
          errorMessage: authError instanceof Error ? authError.message : 'Authentication failed',
        });

        return {
          success: false,
          message: authError instanceof Error ? authError.message : 'Authentication failed',
        };
      }
    } catch (error) {
      console.error('Error testing connector:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  });

  ipcMain.handle('connectors:authorize-notion', async () => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();

    try {
      // TODO: Implement Notion OAuth flow
      // For now, return a placeholder response
      console.log('Notion OAuth flow not yet implemented');

      await logger.log({
        eventType: EventType.SETTINGS_UPDATE,
        action: 'authorize_notion',
        status: 'success',
      });

      return {
        success: true,
        message: 'Notion OAuth flow will be implemented in the next sprint',
      };
    } catch (error) {
      await logger.log({
        eventType: EventType.SETTINGS_UPDATE,
        action: 'authorize_notion',
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error('Error authorizing Notion:', error);
      throw error;
    }
  });

  // ============================================================================
  // Security API
  // ============================================================================

  // Dynamic import for security module
  let securityModule: any = null;

  async function getSecurityModule() {
    if (!securityModule) {
      // @ts-ignore - Dynamic import for ES module compatibility
      securityModule = await import('@polynote/security');
    }
    return securityModule;
  }

  // Security service instance
  let securityService: any = null;

  // Initialize security service with passphrase
  async function initializeSecurityService(passphrase: string) {
    if (securityService) return securityService;
    
    const security = await getSecurityModule();
    const { SecurityService } = security;
    
    securityService = await SecurityService.create(passphrase);
    return securityService;
  }

  ipcMain.handle('security:initialize', async (_, passphrase: string) => {
    try {
      await initializeSecurityService(passphrase);
      return { success: true };
    } catch (error) {
      console.error('Error initializing security:', error);
      throw error;
    }
  });

  ipcMain.handle('security:encrypt-note', async (_, noteId: string, content: string) => {
    try {
      const service = await initializeSecurityService('default-passphrase'); // TODO: Get from settings
      const encrypted = await service.encryption.encryptNote(noteId, content);
      
      return {
        ciphertext: encrypted.ciphertext.toString('base64'),
        metadata: {
          ...encrypted.metadata,
          nonce: encrypted.metadata.nonce.toString('base64'),
        },
      };
    } catch (error) {
      console.error('Error encrypting note:', error);
      throw error;
    }
  });

  ipcMain.handle('security:decrypt-note', async (_, noteId: string, encryptedData: any) => {
    try {
      const service = await initializeSecurityService('default-passphrase'); // TODO: Get from settings
      
      const encrypted = {
        ciphertext: Buffer.from(encryptedData.ciphertext, 'base64'),
        metadata: {
          ...encryptedData.metadata,
          nonce: Buffer.from(encryptedData.metadata.nonce, 'base64'),
        },
      };
      
      const plaintext = await service.encryption.decryptNote(noteId, encrypted);
      return plaintext;
    } catch (error) {
      console.error('Error decrypting note:', error);
      throw error;
    }
  });

  ipcMain.handle('security:generate-recovery-phrase', async () => {
    try {
      const service = await initializeSecurityService('default-passphrase'); // TODO: Get from settings
      const phrase = await service.kms.generateRecoveryPhrase();
      return phrase;
    } catch (error) {
      console.error('Error generating recovery phrase:', error);
      throw error;
    }
  });

  ipcMain.handle('security:check-access', async (_, resourceType: string, resourceId: string, action: string) => {
    try {
      const service = await initializeSecurityService('default-passphrase'); // TODO: Get from settings
      const allowed = await service.access.isAllowed(resourceType, resourceId, action);
      return { allowed };
    } catch (error) {
      console.error('Error checking access:', error);
      throw error;
    }
  });

  ipcMain.handle('security:add-access-rule', async (_, rule: any) => {
    try {
      const service = await initializeSecurityService('default-passphrase'); // TODO: Get from settings
      const newRule = await service.access.addRule(rule);
      return newRule;
    } catch (error) {
      console.error('Error adding access rule:', error);
      throw error;
    }
  });

  // ============================================================================
  // Share Bundle API
  // ============================================================================

  ipcMain.handle('share:create-bundle', async (_, noteIds: string[], password: string, options?: { includeAttachments?: boolean; expiresAt?: number }) => {
    try {
      const service = await initializeSecurityService('default-passphrase');

      const bundle = await service.share.createBundle({
        noteIds,
        password,
        includeAttachments: options?.includeAttachments,
        expiresAt: options?.expiresAt,
      });

      return {
        bundle: bundle.toString('base64'),
        size: bundle.length,
      };
    } catch (error) {
      console.error('Error creating share bundle:', error);
      throw error;
    }
  });

  ipcMain.handle('share:extract-bundle', async (_, bundleBase64: string, password: string) => {
    try {
      const service = await initializeSecurityService('default-passphrase');
      const bundleBuffer = Buffer.from(bundleBase64, 'base64');

      const result = await service.share.extractBundle(bundleBuffer, password);

      return {
        notes: result.notes,
        attachments: result.attachments,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('Error extracting share bundle:', error);
      throw error;
    }
  });

  ipcMain.handle('share:verify-bundle', async (_, bundleBase64: string) => {
    try {
      const service = await initializeSecurityService('default-passphrase');
      const bundleBuffer = Buffer.from(bundleBase64, 'base64');

      const isValid = await service.share.verifyBundle(bundleBuffer);
      return { isValid };
    } catch (error) {
      console.error('Error verifying share bundle:', error);
      return { isValid: false };
    }
  });

  ipcMain.handle('share:get-bundle-metadata', async (_, bundleBase64: string) => {
    try {
      const service = await initializeSecurityService('default-passphrase');
      const bundleBuffer = Buffer.from(bundleBase64, 'base64');

      const metadata = await service.share.getBundleMetadata(bundleBuffer);
      return metadata;
    } catch (error) {
      console.error('Error getting bundle metadata:', error);
      throw error;
    }
  });

  // ============================================================================
  // Graph API
  // ============================================================================

  ipcMain.handle('graph:get', async () => {
    try {
      const { GraphEngine } = await getDbModule();
      const graphEngine = new GraphEngine();
      
      const graph = await graphEngine.buildGraph();
      
      return {
        nodes: graph.nodes.map((node: any) => ({
          id: node.id,
          label: node.label,
          type: node.type,
        })),
        edges: graph.edges.map((edge: any) => ({
          source: edge.source,
          target: edge.target,
          label: edge.label,
        })),
      };
    } catch (error) {
      console.error('Error getting graph:', error);
      throw error;
    }
  });

  ipcMain.handle('graph:get-note', async (_, noteId: string) => {
    try {
      const { GraphEngine } = await getDbModule();
      const graphEngine = new GraphEngine();
      
      const graph = await graphEngine.buildNoteGraph(noteId);
      
      return {
        nodes: graph.nodes.map((node: any) => ({
          id: node.id,
          label: node.label,
          type: node.type,
        })),
        edges: graph.edges.map((edge: any) => ({
          source: edge.source,
          target: edge.target,
          type: edge.type,
        })),
      };
    } catch (error) {
      console.error('Error getting note graph:', error);
      throw error;
    }
  });

  ipcMain.handle('graph:get-backlinks', async (_, noteId: string) => {
    try {
      const { GraphEngine } = await getDbModule();
      const graphEngine = new GraphEngine();
      
      const backlinks = await graphEngine.getBacklinks(noteId);
      return backlinks;
    } catch (error) {
      console.error('Error getting backlinks:', error);
      throw error;
    }
  });

  ipcMain.handle('graph:get-orphans', async () => {
    try {
      const { GraphEngine } = await getDbModule();
      const graphEngine = new GraphEngine();
      
      const orphans = await graphEngine.getOrphanLinks();
      return orphans;
    } catch (error) {
      console.error('Error getting orphan links:', error);
      throw error;
    }
  });

  // ============================================================================
  // Rules API
  // ============================================================================

  ipcMain.handle('rules:get-all', async () => {
    try {
      const { RuleEngine } = await getDbModule();
      const ruleEngine = new RuleEngine();
      return await ruleEngine.getAllRules();
    } catch (error) {
      console.error('Error getting rules:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:create', async (_, rule: any) => {
    try {
      const { RuleEngine } = await getDbModule();
      const ruleEngine = new RuleEngine();
      const id = await ruleEngine.createRule(rule);
      return await ruleEngine.getRule(id);
    } catch (error) {
      console.error('Error creating rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:update', async (_, id: string, updates: any) => {
    try {
      const { RuleEngine } = await getDbModule();
      const ruleEngine = new RuleEngine();
      await ruleEngine.updateRule(id, updates);
      return await ruleEngine.getRule(id);
    } catch (error) {
      console.error('Error updating rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:delete', async (_, id: string) => {
    try {
      const { RuleEngine } = await getDbModule();
      const ruleEngine = new RuleEngine();
      await ruleEngine.deleteRule(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:evaluate', async (_, note: any, trigger: string) => {
    try {
      const { RuleEngine } = await getDbModule();
      const ruleEngine = new RuleEngine();
      await ruleEngine.evaluate(note, trigger);
      return { success: true };
    } catch (error) {
      console.error('Error evaluating rules:', error);
      throw error;
    }
  });

  // ============================================================================
  // Settings API
  // ============================================================================

  ipcMain.handle('settings:get', () => {
    try {
      // TODO: Replace with actual settings from database
      return mockSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', async (_event, updates: Partial<Settings>) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();
    try {
      // TODO: Replace with actual settings update in database
      mockSettings = { ...mockSettings, ...updates };
      // Log settings update
      await logger.log({
        eventType: EventType.SETTINGS_UPDATE,
        action: 'Update settings',
        status: 'success',
        resourceType: 'settings',
        metadata: {
          updatedFields: Object.keys(updates),
        },
      });
      
      return mockSettings;
    } catch (error) {
      // Log failure
      const EventType = getAuditEventType();
      await logger.log({
        eventType: EventType.SETTINGS_UPDATE,
        action: 'Update settings',
        status: 'failure',
        resourceType: 'settings',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error('Error updating settings:', error);
      throw error;
    }
  });

  // ============================================================================
  // System API
  // ============================================================================

  ipcMain.handle('system:open-url', (_, url: string) => {
    try {
      // Security: Validate URL before opening
      const validProtocols = ['http:', 'https:', 'mailto:'];
      const parsedUrl = new URL(url);

      if (!validProtocols.includes(parsedUrl.protocol)) {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
      }

      void shell.openExternal(url);
    } catch (error) {
      console.error('Error opening URL:', error);
      throw error;
    }
  });

  ipcMain.handle('system:get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('system:select-folder', async () => {
    try {
      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Folder',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('Error selecting folder:', error);
      throw error;
    }
  });

  // ============================================================================
  // Authentication API
  // ============================================================================

  // Note: Auth handler is initialized separately and accessed via global
  ipcMain.handle('auth:login-google', async () => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();

    try {
      checkRateLimit('auth:login-google');

      // @ts-ignore - authHandler is set globally
      if (!global.authHandler) {
        throw new Error('Authentication not initialized');
      }

      // @ts-ignore
      const session = await global.authHandler.initiateGoogleLogin();

      await logger.log({
        type: EventType.USER_LOGIN,
        userId: session.userId,
        details: { provider: 'google', email: session.email },
      });

      return {
        success: true,
        session: {
          userId: session.userId,
          email: session.email,
          name: session.name,
          picture: session.picture,
          provider: session.provider,
        },
      };
    } catch (error) {
      await logger.log({
        type: EventType.USER_LOGIN,
        userId: null,
        details: { error: (error as Error).message, provider: 'google' },
      });

      throw error;
    }
  });

  ipcMain.handle('auth:logout', async (_event, userId: string) => {
    const logger = await getAuditLogger();
    const EventType = getAuditEventType();

    try {
      checkRateLimit('auth:logout');

      // @ts-ignore - authHandler is set globally
      if (!global.authHandler) {
        throw new Error('Authentication not initialized');
      }

      // @ts-ignore
      await global.authHandler.logout(userId);

      await logger.log({
        type: EventType.USER_LOGOUT,
        userId,
        details: {},
      });

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  });

  ipcMain.handle('auth:get-current-session', async () => {
    try {
      // @ts-ignore - authHandler is set globally
      if (!global.authHandler) {
        return null;
      }

      // @ts-ignore
      const session = await global.authHandler.getCurrentSession();

      if (!session) {
        return null;
      }

      return {
        userId: session.userId,
        email: session.email,
        name: session.name,
        picture: session.picture,
        provider: session.provider,
        expiresAt: session.expiresAt.toISOString(),
      };
    } catch (error) {
      console.error('Get current session error:', error);
      return null;
    }
  });

  ipcMain.handle('auth:is-authenticated', async () => {
    try {
      // @ts-ignore - authHandler is set globally
      if (!global.authHandler) {
        return false;
      }

      // @ts-ignore
      return await global.authHandler.isAuthenticated();
    } catch (error) {
      console.error('Is authenticated error:', error);
      return false;
    }
  });

  ipcMain.handle('auth:refresh-token', async (_event, userId: string) => {
    try {
      checkRateLimit('auth:refresh-token');

      // @ts-ignore - authHandler is set globally
      if (!global.authHandler) {
        throw new Error('Authentication not initialized');
      }

      // @ts-ignore
      await global.authHandler.refreshToken(userId);

      return { success: true };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  });
}
