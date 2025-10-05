# PolyNote v1.0 - Missing Features PRD

**Document Version**: 1.0
**Date**: October 5, 2025
**Status**: Final
**Priority**: Critical for v1.0 Release

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Validation Results](#2-validation-results)
3. [Critical Integration Gaps](#3-critical-integration-gaps)
4. [Missing Features by Category](#4-missing-features-by-category)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Risk Assessment](#7-risk-assessment)

---

## 1. Executive Summary

### 1.1 Current State

After comprehensive validation against `VALIDATION_REPORT.md` and `implementation-gaps-report.md`, PolyNote is **70% complete**. The application has excellent architectural foundation with most backend services fully implemented, but critical integration gaps prevent features from being accessible to users.

### 1.2 Key Findings

**✅ What's Working:**
- Real SQLite database with FTS5 search (95% complete)
- AI services fully implemented (AIService class with all providers)
- Authentication system with Google OAuth (80% complete)
- Comprehensive documentation (100% complete)
- Core UI components and navigation (90% complete)

**❌ Critical Gaps:**
- Authentication not integrated into app flow (0% user-facing)
- AI features not exposed in UI (backend ready, frontend missing)
- Connectors implemented but not user-configurable
- Some UI polish items incomplete

**Impact:** Users cannot access ~30% of implemented features because they're not connected to the UI.

### 1.3 Completion Metrics

| Component | Implementation | UI Integration | Gap |
|-----------|---------------|----------------|-----|
| Authentication | 80% | 0% | **80%** |
| AI Features | 70% | 20% | **50%** |
| Connectors | 60% | 30% | **30%** |
| Database | 95% | 95% | **0%** |
| UI Polish | 70% | 70% | **0%** |
| Documentation | 100% | 100% | **0%** |

---

## 2. Validation Results

### 2.1 Implementation Status Matrix

| Feature | Backend Status | Frontend Status | Priority | Effort |
|---------|---------------|-----------------|----------|--------|
| **Authentication Flow** | ✅ Implemented | ❌ Not integrated | P0 | 5h |
| **AI Editor Toolbar** | ✅ Implemented | ❌ Missing UI | P0 | 6h |
| **Connector Configuration** | 🟡 Partial | ❌ Missing UI | P0 | 8h |
| **AI Provider Setup** | ✅ Implemented | ❌ No registration | P1 | 3h |
| **Session Persistence** | 🟡 Partial | ❌ No restore | P1 | 3h |
| **Notion OAuth** | 🟡 Partial | ❌ No flow | P1 | 8h |
| **Real-time Sync Progress** | ❌ Missing | ❌ Missing | P1 | 4h |
| **Graph Enable/Disable** | 🟡 Partial | 🟡 Broken | P2 | 1h |
| **Theme Preview** | ✅ Implemented | ❌ No preview | P2 | 2h |
| **Performance Metrics** | ❌ Missing | ❌ Missing | P2 | 4h |

**Priority Levels:**
- **P0**: Blocking v1.0 release (must have)
- **P1**: Critical for user experience (should have)
- **P2**: Polish and optimization (nice to have)

---

## 3. Critical Integration Gaps

### 3.1 Authentication Not User-Facing

**Current State:**
- ✅ `ElectronAuthHandler` fully implemented in `auth-handler.ts`
- ✅ `LoginScreen.tsx` component exists with Google OAuth UI
- ✅ IPC handlers for all auth operations (login, logout, session)
- ❌ **NOT initialized in `main.ts`**
- ❌ **NOT integrated into `App.tsx`** routing
- ❌ No session check on app startup

**Impact:** Users can't log in or use authentication features.

**Required Changes:**

```typescript
// 1. apps/desktop/electron/main.ts - Initialize auth handler
import { ElectronAuthHandler } from './auth-handler';

let authHandler: ElectronAuthHandler;

app.whenReady().then(() => {
  authHandler = new ElectronAuthHandler();
  global.authHandler = authHandler;

  createWindow();
  setupIpcHandlers();
});
```

```typescript
// 2. apps/desktop/src/App.tsx - Add auth routing
import { LoginScreen } from './components/LoginScreen';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    window.electronAPI.auth.isAuthenticated()
      .then(setIsAuthenticated)
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <Router>...</Router>;
}
```

**Effort:** 5 hours
**Priority:** P0 (Blocking)

---

### 3.2 AI Features Hidden from Users

**Current State:**
- ✅ `AIService` fully implemented with summarize, translate, rewrite
- ✅ IPC handlers wired to real AIService (not mocks)
- ✅ Token tracking and budget management
- ❌ **No AI buttons in Notes editor toolbar**
- ❌ No visual feedback during AI processing
- ❌ AI provider not auto-registered

**Impact:** Users can't access AI features despite backend being ready.

**Required Changes:**

```typescript
// apps/desktop/src/components/NoteEditor.tsx
import { Sparkles, Languages, RefreshCw } from 'lucide-react';

// Add AI toolbar section (after line 289)
<div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
  <button
    onClick={handleAISummarize}
    disabled={aiLoading}
    className="p-2 hover:bg-muted rounded flex items-center gap-1"
    title="AI Summarize"
  >
    <Sparkles size={16} />
    {aiLoading && <Loader2 className="animate-spin" size={14} />}
  </button>

  <div className="relative">
    <button
      onClick={() => setShowTranslateMenu(!showTranslateMenu)}
      className="p-2 hover:bg-muted rounded"
      title="Translate"
    >
      <Languages size={16} />
    </button>
    {showTranslateMenu && (
      <div className="absolute top-full mt-1 bg-card border rounded shadow-lg">
        <button onClick={() => handleTranslate('te')} className="px-3 py-2 hover:bg-muted w-full text-left">Telugu</button>
        <button onClick={() => handleTranslate('hi')} className="px-3 py-2 hover:bg-muted w-full text-left">Hindi</button>
      </div>
    )}
  </div>

  <div className="relative">
    <button
      onClick={() => setShowRewriteMenu(!showRewriteMenu)}
      className="p-2 hover:bg-muted rounded"
      title="Rewrite"
    >
      <RefreshCw size={16} />
    </button>
    {showRewriteMenu && (
      <div className="absolute top-full mt-1 bg-card border rounded shadow-lg">
        <button onClick={() => handleRewrite('professional')} className="px-3 py-2 hover:bg-muted w-full text-left">Professional</button>
        <button onClick={() => handleRewrite('casual')} className="px-3 py-2 hover:bg-muted w-full text-left">Casual</button>
        <button onClick={() => handleRewrite('concise')} className="px-3 py-2 hover:bg-muted w-full text-left">Concise</button>
        <button onClick={() => handleRewrite('detailed')} className="px-3 py-2 hover:bg-muted w-full text-left">Detailed</button>
      </div>
    )}
  </div>
</div>

// Implement handlers
const handleAISummarize = async () => {
  if (!selectedNote) return;

  setAiLoading(true);
  try {
    const result = await window.electronAPI.ai.summarize(selectedNote.id);
    // Append summary to note content
    await window.electronAPI.notes.update(selectedNote.id, {
      body: `${selectedNote.body}\n\n## AI Summary\n\n${result.summary}`
    });
    toast.success('Summary added to note');
  } catch (error) {
    toast.error('AI summarization failed');
  } finally {
    setAiLoading(false);
  }
};
```

**Effort:** 6 hours
**Priority:** P0 (Blocking)

---

### 3.3 Connector Configuration Missing UI

**Current State:**
- ✅ ObsidianConnector, NotionConnector, JoplinConnector implemented
- ✅ IPC handlers support connector operations
- ❌ **Requires environment variables** to enable connectors
- ❌ No UI to configure vault paths, API keys
- ❌ Settings page has no connector configuration panel

**Impact:** Users can't connect their note apps without editing env vars.

**Required Changes:**

```typescript
// apps/desktop/src/pages/SettingsPage.tsx
// Add Connectors section

<section className="bg-card border border-border rounded-lg p-6">
  <h2 className="text-xl font-semibold mb-4">Connectors</h2>

  {/* Obsidian */}
  <div className="mb-6 pb-6 border-b border-border">
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="font-medium">Obsidian</h3>
        <p className="text-sm text-muted-foreground">Connect your Obsidian vault</p>
      </div>
      <Switch
        checked={connectors.obsidian.enabled}
        onChange={() => toggleConnector('obsidian')}
      />
    </div>

    {connectors.obsidian.enabled && (
      <div className="space-y-3 mt-3">
        <div>
          <label className="text-sm font-medium">Vault Path</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={connectors.obsidian.vaultPath}
              onChange={(e) => updateConnector('obsidian', { vaultPath: e.target.value })}
              className="flex-1 px-3 py-2 border rounded"
              placeholder="/Users/you/Documents/MyVault"
            />
            <button
              onClick={() => selectFolder('obsidian')}
              className="px-3 py-2 border rounded hover:bg-muted"
            >
              Browse
            </button>
          </div>
        </div>

        <button
          onClick={() => testConnection('obsidian')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Test Connection
        </button>
      </div>
    )}
  </div>

  {/* Notion */}
  <div className="mb-6 pb-6 border-b border-border">
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="font-medium">Notion</h3>
        <p className="text-sm text-muted-foreground">Sync with Notion workspace</p>
      </div>
      <Switch
        checked={connectors.notion.enabled}
        onChange={() => toggleConnector('notion')}
      />
    </div>

    {connectors.notion.enabled && (
      <div className="space-y-3 mt-3">
        {!connectors.notion.authorized ? (
          <button
            onClick={() => authorizeNotion()}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 flex items-center gap-2"
          >
            <img src="/notion-icon.svg" className="w-5 h-5" />
            Authorize with Notion
          </button>
        ) : (
          <div>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle size={16} />
              Connected to Notion
            </p>
            <button
              onClick={() => disconnectNotion()}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )}
  </div>

  {/* Joplin */}
  <div>
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="font-medium">Joplin</h3>
        <p className="text-sm text-muted-foreground">Connect via Web Clipper API</p>
      </div>
      <Switch
        checked={connectors.joplin.enabled}
        onChange={() => toggleConnector('joplin')}
      />
    </div>

    {connectors.joplin.enabled && (
      <div className="space-y-3 mt-3">
        <div>
          <label className="text-sm font-medium">API Token</label>
          <input
            type="password"
            value={connectors.joplin.token}
            onChange={(e) => updateConnector('joplin', { token: e.target.value })}
            className="w-full px-3 py-2 border rounded mt-1"
            placeholder="Your Joplin Web Clipper token"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Find in Joplin: Tools → Options → Web Clipper
          </p>
        </div>

        <button
          onClick={() => testConnection('joplin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Test Connection
        </button>
      </div>
    )}
  </div>
</section>
```

```typescript
// IPC handlers for connector management
ipcMain.handle('connectors:configure', async (_, connectorId, config) => {
  switch (connectorId) {
    case 'obsidian':
      process.env.OBSIDIAN_VAULT_PATH = config.vaultPath;
      await initializeConnectorRegistry(); // Re-register with new path
      break;
    case 'notion':
      // Will use OAuth flow (see next section)
      break;
    case 'joplin':
      process.env.JOPLIN_API_TOKEN = config.token;
      await initializeConnectorRegistry();
      break;
  }

  return { success: true };
});

ipcMain.handle('connectors:test', async (_, connectorId) => {
  const registry = ConnectorRegistry.getInstance();
  const connector = registry.getConnector(connectorId);

  try {
    await connector.authenticate();
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Effort:** 8 hours
**Priority:** P0 (Blocking)

---

## 4. Missing Features by Category

### 4.1 Authentication & Security (P0)

#### 4.1.1 Session Persistence
**Gap:** Session not restored on app restart
**Current:** `isAuthenticated()` checks current session but doesn't restore from storage
**Required:**
```typescript
// In ElectronAuthHandler constructor
async initialize() {
  const storedSession = await this.sessionManager.getCurrentSession();
  if (storedSession && !this.isTokenExpired(storedSession.accessToken)) {
    this.currentSession = storedSession;
  }
}
```
**Effort:** 3 hours
**Priority:** P1

#### 4.1.2 Secure Token Storage
**Gap:** Tokens may not use OS keychain
**Current:** SessionManager uses file-based storage
**Required:** Use `safeStorage` from Electron for encryption
**Effort:** 2 hours
**Priority:** P1

---

### 4.2 AI Features (P0)

#### 4.2.1 AI Provider Auto-Registration
**Gap:** Ollama provider not auto-detected
**Current:** Code initializes Ollama but doesn't verify availability
**Required:**
```typescript
// In ipc-handlers.ts
async function initializeAIProviders() {
  const ollama = new OllamaProvider({ baseUrl: 'http://localhost:11434' });

  try {
    await ollama.initialize();
    ProviderRegistry.getInstance().register(ollama);
    console.log('✅ Ollama provider registered');
  } catch (error) {
    console.warn('⚠️ Ollama not available, using cloud fallback');
  }

  // Register cloud providers with API keys from settings
  const settings = await getSettings();

  if (settings.openaiApiKey) {
    const openai = new OpenAIProvider({ apiKey: settings.openaiApiKey });
    ProviderRegistry.getInstance().register(openai);
  }

  if (settings.claudeApiKey) {
    const claude = new ClaudeProvider({ apiKey: settings.claudeApiKey });
    ProviderRegistry.getInstance().register(claude);
  }
}

// Call in app.whenReady()
await initializeAIProviders();
```
**Effort:** 3 hours
**Priority:** P1

#### 4.2.2 AI Model Selection UI
**Gap:** No UI to choose AI models
**Current:** Settings page has provider dropdown but no model input
**Required:** Add model selector for each provider (llama2, mistral, gpt-4, etc.)
**Effort:** 4 hours
**Priority:** P1

#### 4.2.3 Streaming UI for AI Responses
**Gap:** No real-time streaming display
**Current:** AI responses shown after completion
**Required:** Stream tokens to UI as they're generated
**Effort:** 6 hours
**Priority:** P2

---

### 4.3 Connectors (P0-P1)

#### 4.3.1 Notion OAuth Flow
**Gap:** OAuth 2.0 not implemented
**Current:** Uses API key (security risk)
**Required:**
```typescript
// packages/connectors/src/notion/NotionOAuth.ts
export class NotionOAuth {
  private clientId = process.env.NOTION_CLIENT_ID!;
  private clientSecret = process.env.NOTION_CLIENT_SECRET!;
  private redirectUri = 'http://localhost:3000/notion/callback';

  async startAuthFlow(): Promise<void> {
    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('response_type', 'code');

    // Open in browser
    shell.openExternal(authUrl.toString());

    // Start local server to receive callback
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:3000`);
      const code = url.searchParams.get('code');

      if (code) {
        const token = await this.exchangeCodeForToken(code);
        await safeStorage.encryptString(token); // Secure storage

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success! You can close this window.</h1>');
        server.close();
      }
    });

    server.listen(3000);
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri
      })
    });

    const data = await response.json();
    return data.access_token;
  }
}
```
**Effort:** 8 hours
**Priority:** P1

#### 4.3.2 OneNote & Apple Notes Connectors
**Gap:** Not implemented
**Status:** Out of scope for v1.0 (defer to v1.1)
**Priority:** P3

---

### 4.4 UI Polish (P2)

#### 4.4.1 Real-time Sync Progress
**Gap:** Sync progress bar doesn't update
**Current:** Dashboard shows "Syncing" but no actual progress
**Required:**
```typescript
// Emit progress events from sync engine
syncEngine.on('progress', (progress) => {
  mainWindow.webContents.send('sync:progress', {
    current: progress.current,
    total: progress.total,
    percentage: progress.current / progress.total
  });
});

// In Dashboard.tsx
useEffect(() => {
  const unsubscribe = window.electronAPI.onSyncProgress((progress) => {
    setSyncProgress(progress.percentage);
  });

  return unsubscribe;
}, []);
```
**Effort:** 4 hours
**Priority:** P1

#### 4.4.2 Graph Enable/Disable Fix
**Gap:** Toggle button doesn't actually disable graph
**Current:** Button changes icon but graph still renders
**Required:**
```typescript
// GraphPage.tsx line 99
{graphEnabled && (
  <ForceGraph2D
    // ... existing props
  />
)}

{!graphEnabled && (
  <div className="flex-1 flex items-center justify-center text-muted-foreground">
    <div className="text-center">
      <EyeOff size={48} className="mx-auto mb-2 opacity-50" />
      <p>Graph view is disabled</p>
      <button
        onClick={() => setGraphEnabled(true)}
        className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        Enable Graph View
      </button>
    </div>
  </div>
)}
```
**Effort:** 1 hour
**Priority:** P2

#### 4.4.3 Theme Preview in Settings
**Gap:** No live preview when changing theme
**Current:** Theme changes require app restart to see
**Required:** Apply theme immediately in Settings page preview area
**Effort:** 2 hours
**Priority:** P2

#### 4.4.4 Performance Metrics Display
**Gap:** No visibility into query performance
**Current:** No timing logs or metrics
**Required:**
```typescript
// Add performance monitoring wrapper
async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    auditLog({
      operation,
      duration,
      status: 'success'
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    auditLog({
      operation,
      duration,
      status: 'error',
      error: error.message
    });

    throw error;
  }
}

// Use in IPC handlers
ipcMain.handle('notes:search', async (_, query) => {
  return measurePerformance('notes:search', async () => {
    const db = await getDatabase();
    return searchNotes(db, query);
  });
});

// Display in DevTools
ipcMain.handle('metrics:get', async () => {
  const logs = await getAuditLogs({ type: 'performance' });
  return logs.map(log => ({
    operation: log.operation,
    avgDuration: calculateAverage(log.durations),
    p95Duration: calculateP95(log.durations)
  }));
});
```
**Effort:** 4 hours
**Priority:** P2

---

## 5. Implementation Roadmap

### 5.1 Sprint 1: Critical Integrations (14 hours)

**Goal:** Make existing features accessible to users

**Tasks:**
1. ✅ Initialize auth handler in main.ts (1h) - **P0**
2. ✅ Add auth routing to App.tsx (4h) - **P0**
3. ✅ Add AI toolbar to NoteEditor (6h) - **P0**
4. ✅ Auto-register AI providers (3h) - **P1**

**Outcome:** Users can log in and use AI features

---

### 5.2 Sprint 2: Connector Configuration (19 hours)

**Goal:** Enable connector setup without env vars

**Tasks:**
1. ✅ Build connector settings UI (8h) - **P0**
2. ✅ Implement Notion OAuth flow (8h) - **P1**
3. ✅ Add session persistence (3h) - **P1**

**Outcome:** Users can configure Obsidian, Notion, Joplin connectors

---

### 5.3 Sprint 3: Polish & Performance (11 hours)

**Goal:** Improve user experience and visibility

**Tasks:**
1. ✅ Real-time sync progress (4h) - **P1**
2. ✅ AI model selection UI (4h) - **P1**
3. ✅ Theme preview (2h) - **P2**
4. ✅ Graph enable/disable fix (1h) - **P2**

**Outcome:** Polished, production-ready UI

---

### 5.4 Sprint 4: Metrics & Monitoring (8 hours)

**Goal:** Add observability and diagnostics

**Tasks:**
1. ✅ Performance metrics logging (4h) - **P2**
2. ✅ Metrics display in DevTools (2h) - **P2**
3. ✅ Secure token storage (2h) - **P1**

**Outcome:** Developers can diagnose issues, users have secure storage

---

### 5.5 Total Effort Estimate

| Sprint | Hours | Priority | Dependencies |
|--------|-------|----------|--------------|
| Sprint 1 | 14h | P0-P1 | None |
| Sprint 2 | 19h | P0-P1 | None |
| Sprint 3 | 11h | P1-P2 | Sprint 1 |
| Sprint 4 | 8h | P1-P2 | Sprint 1-2 |

**Total: 52 hours (~6.5 days for 1 developer, ~3 days for 2 developers)**

---

## 6. Acceptance Criteria

### 6.1 Sprint 1 - Critical Integrations

**Authentication:**
- [ ] User sees LoginScreen on first launch
- [ ] User can click "Sign in with Google"
- [ ] OAuth flow opens browser and redirects back to app
- [ ] Authenticated user sees main app, not LoginScreen
- [ ] Session persists across app restarts

**AI Features:**
- [ ] Notes editor has AI toolbar with Summarize, Translate, Rewrite buttons
- [ ] Clicking Summarize appends summary to note
- [ ] Translate menu shows Telugu and Hindi options
- [ ] Rewrite menu shows 4 tone options (professional, casual, concise, detailed)
- [ ] Loading spinner shows during AI processing
- [ ] Error toast appears if AI fails

**AI Providers:**
- [ ] Ollama auto-detected and registered if available
- [ ] OpenAI registered if API key in settings
- [ ] Claude registered if API key in settings
- [ ] No crashes if no providers available

---

### 6.2 Sprint 2 - Connector Configuration

**Connector Settings UI:**
- [ ] Settings page has "Connectors" section
- [ ] Each connector (Obsidian, Notion, Joplin) has toggle switch
- [ ] Obsidian config shows vault path input and Browse button
- [ ] Browse button opens folder picker dialog
- [ ] Test Connection button validates connector setup
- [ ] Success/error message shown after test

**Notion OAuth:**
- [ ] "Authorize with Notion" button in Notion connector settings
- [ ] Clicking button opens Notion OAuth in browser
- [ ] After authorization, shows "Connected to Notion" with green checkmark
- [ ] Token stored securely (encrypted)
- [ ] Disconnect button revokes access and clears token

**Session Persistence:**
- [ ] User stays logged in after closing and reopening app
- [ ] Expired sessions redirect to login
- [ ] Token refresh happens automatically in background

---

### 6.3 Sprint 3 - Polish & Performance

**Real-time Sync Progress:**
- [ ] Dashboard Sync Status card shows progress bar when syncing
- [ ] Progress bar updates in real-time (0-100%)
- [ ] Shows "Last synced: X minutes ago" when idle
- [ ] No lag or jank during updates

**AI Model Selection:**
- [ ] Settings → AI has model dropdown for each provider
- [ ] Ollama shows available models (llama2, mistral, etc.)
- [ ] OpenAI shows gpt-3.5-turbo, gpt-4, gpt-4-turbo
- [ ] Selected model saved to settings
- [ ] AI operations use selected model

**Theme Preview:**
- [ ] Settings → Appearance has theme preview panel
- [ ] Preview shows sample UI with current theme
- [ ] Changing theme updates preview immediately
- [ ] Apply button saves theme persistently

**Graph Enable/Disable:**
- [ ] Graph page Enable/Disable toggle works correctly
- [ ] When disabled, graph canvas hidden and shows message
- [ ] Message has "Enable Graph View" button
- [ ] Clicking button re-enables graph

---

### 6.4 Sprint 4 - Metrics & Monitoring

**Performance Metrics:**
- [ ] All database queries logged with duration
- [ ] All IPC calls logged with duration
- [ ] Metrics stored in audit log table
- [ ] Metrics viewable in DevTools (Help → Developer Tools → Metrics tab)

**Metrics Display:**
- [ ] DevTools shows table of operations with avg/p95 durations
- [ ] Slow queries highlighted (>100ms)
- [ ] Can filter by operation type, date range
- [ ] Can export metrics to CSV

**Secure Storage:**
- [ ] All auth tokens encrypted with safeStorage
- [ ] Connector API keys encrypted
- [ ] No plaintext secrets in app data folder
- [ ] Encryption key derived from OS keychain

---

## 7. Risk Assessment

### 7.1 High Risk Items

**Authentication Integration (Sprint 1)**
- **Risk:** Breaking existing routing, infinite redirect loops
- **Mitigation:** Test all auth states (logged out, logged in, expired session)
- **Contingency:** Feature flag to disable auth and allow guest mode

**Notion OAuth (Sprint 2)**
- **Risk:** OAuth callback server conflicts with other apps on port 3000
- **Mitigation:** Use dynamic port allocation, handle port conflicts gracefully
- **Contingency:** Fall back to API key method if OAuth fails

### 7.2 Medium Risk Items

**AI Provider Auto-Registration (Sprint 1)**
- **Risk:** False positives (detecting provider but it's not working)
- **Mitigation:** Comprehensive health checks before registration
- **Contingency:** Manual provider enable/disable in settings

**Real-time Sync Progress (Sprint 3)**
- **Risk:** Event emitter memory leaks, UI lag from frequent updates
- **Mitigation:** Debounce updates (max 10 per second), proper cleanup on unmount
- **Contingency:** Disable real-time updates, show pulse animation instead

### 7.3 Low Risk Items

**UI Polish (Sprint 3-4)**
- **Risk:** Low - purely cosmetic changes
- **Mitigation:** None needed
- **Contingency:** Can be deferred to v1.1 if time constrained

---

## 8. Success Metrics

### 8.1 Technical Metrics

**Code Coverage:**
- Target: 80% overall
- Current: ~70%
- Gap: Need 10% more coverage for new integration code

**Performance:**
- Search: <100ms for 10k notes ✅ (Already met)
- Sync: <60s for 1000 notes ❌ (Needs validation)
- AI: <30s for summarization ✅ (Already met with Ollama)

**Security:**
- All secrets encrypted ❌ (Sprint 4)
- OAuth flows secure ❌ (Sprint 2)
- Session management secure 🟡 (Sprint 1)

### 8.2 User Experience Metrics

**Onboarding:**
- Time to first note: <2 minutes (with auth)
- Connector setup time: <5 minutes (with OAuth)

**Feature Discovery:**
- Users should discover AI features within first session
- Connector setup should be obvious in Settings

**Error Recovery:**
- Auth errors should have clear remediation steps
- Connector errors should have "Test Connection" retry

---

## 9. Out of Scope (v1.1+)

The following features are **NOT** required for v1.0:

1. **OneNote Connector** - Complex OAuth with Microsoft Graph API
2. **Apple Notes Connector** - Requires macOS-specific APIs
3. **AI Streaming UI** - Real-time token-by-token display
4. **Plugin Architecture** - Extensibility for third-party connectors
5. **End-to-End Encryption** - Additional security layer
6. **Collaborative Editing** - Multi-user real-time editing
7. **Mobile Apps** - iOS and Android versions
8. **Web Version** - Browser-based PolyNote

These will be considered for future releases based on user demand and technical feasibility.

---

## 10. Rollout Plan

### 10.1 Internal Testing (After Sprint 1-2)

**Scope:** Core team testing with real data
- Test auth flow with multiple Google accounts
- Test AI features with various note types
- Test connector setup with Obsidian, Notion, Joplin
- Validate performance with 1000+ notes

**Duration:** 2-3 days
**Success Criteria:** No critical bugs, all P0 features work

---

### 10.2 Beta Release (After Sprint 3)

**Scope:** Limited external users (50-100)
- Invite beta testers from mailing list
- Collect feedback on UI/UX
- Monitor error logs and crash reports
- Measure performance metrics

**Duration:** 1 week
**Success Criteria:** <5% crash rate, positive feedback

---

### 10.3 v1.0 Production Release (After Sprint 4)

**Scope:** Public release on GitHub
- Update README with complete feature list
- Publish release notes
- Build and distribute .dmg (macOS), .exe (Windows), .AppImage (Linux)
- Monitor adoption and error rates

**Launch Checklist:**
- [ ] All P0 acceptance criteria met
- [ ] Documentation complete (user guide, developer guide)
- [ ] No known critical bugs
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Release assets built and tested

---

## Appendix A: File Modification Summary

### Files to Create
- None (all features use existing files)

### Files to Modify

| File | Changes | Lines | Sprint |
|------|---------|-------|--------|
| `apps/desktop/electron/main.ts` | Initialize auth handler | +5 | Sprint 1 |
| `apps/desktop/src/App.tsx` | Add auth routing | +25 | Sprint 1 |
| `apps/desktop/src/components/NoteEditor.tsx` | Add AI toolbar | +80 | Sprint 1 |
| `apps/desktop/electron/ipc-handlers.ts` | Auto-register AI providers | +30 | Sprint 1 |
| `apps/desktop/src/pages/SettingsPage.tsx` | Add connector config UI | +150 | Sprint 2 |
| `packages/connectors/src/notion/NotionOAuth.ts` | Implement OAuth | +60 | Sprint 2 |
| `apps/desktop/electron/auth-handler.ts` | Add session persistence | +15 | Sprint 2 |
| `apps/desktop/src/pages/Dashboard.tsx` | Real-time sync progress | +20 | Sprint 3 |
| `apps/desktop/src/pages/SettingsPage.tsx` | AI model selection | +40 | Sprint 3 |
| `apps/desktop/src/pages/GraphPage.tsx` | Fix enable/disable | +15 | Sprint 3 |
| `apps/desktop/electron/ipc-handlers.ts` | Performance metrics | +50 | Sprint 4 |

**Total Lines Changed:** ~490 lines across 8 files

---

## Appendix B: Testing Plan

### Unit Tests

**New Tests Required:**
- `auth-handler.spec.ts`: Session persistence, token refresh
- `NotionOAuth.spec.ts`: OAuth flow, token exchange
- `ai-toolbar.spec.ts`: AI button actions, loading states
- `connector-settings.spec.ts`: UI interactions, validation

**Total New Tests:** ~20 test cases

### Integration Tests

**Critical Flows:**
1. **Auth Flow End-to-End**
   - User clicks "Sign in with Google"
   - OAuth redirect to Google
   - Callback receives code
   - Token stored securely
   - User sees main app

2. **AI Feature Flow**
   - User selects text in note
   - Clicks AI Summarize
   - Backend calls AIService
   - Summary appended to note
   - UI updates with new content

3. **Connector Setup Flow**
   - User enables Obsidian
   - Browses for vault path
   - Clicks Test Connection
   - Connection succeeds
   - Sync starts automatically

### Manual Testing Checklist

**Pre-Release Testing:**
- [ ] Fresh install on macOS (Intel and M1)
- [ ] Fresh install on Windows (10 and 11)
- [ ] Fresh install on Linux (Ubuntu 22.04)
- [ ] Upgrade from v0.9.0 to v1.0
- [ ] 10,000 note stress test
- [ ] All connectors (Obsidian, Notion, Joplin)
- [ ] All AI features (Summarize, Translate, Rewrite)
- [ ] All themes (Light, Dark, System)
- [ ] All languages (EN, TE, HI)

---

**Document Status:** Ready for Implementation
**Next Steps:**
1. Review and approve this PRD
2. Begin Sprint 1 implementation
3. Track progress in GitHub project board
4. Update this document as requirements evolve

---

*Last Updated: October 5, 2025*
*Owner: Development Team*
*Reviewers: Product Manager, Tech Lead*
