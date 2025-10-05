import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, CheckCircle, AlertCircle, Folder, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { t, setLanguage, getCurrentLanguage } from '../i18n';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  syncEnabled: boolean;
  aiProvider?: string;
  [key: string]: unknown;
}

interface ConnectorConfig {
  obsidian: {
    enabled: boolean;
    vaultPath: string;
  };
  notion: {
    enabled: boolean;
    authorized: boolean;
  };
  joplin: {
    enabled: boolean;
    token: string;
  };
}

interface TestResult {
  success: boolean;
  message?: string;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  // Connector state
  const [connectors, setConnectors] = useState<ConnectorConfig>({
    obsidian: { enabled: false, vaultPath: '' },
    notion: { enabled: false, authorized: false },
    joplin: { enabled: false, token: '' },
  });

  // UI state for testing
  const [testingConnector, setTestingConnector] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const api = window.electronAPI;
      if (!api) return null;
      return await api.getSettings();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      const api = window.electronAPI;
      if (!api) throw new Error('Electron API not available');
      await api.updateSettings(updates);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Load connector configuration on mount
  useEffect(() => {
    const loadConnectorConfig = async () => {
      try {
        const api = window.electronAPI;
        if (!api || !api.connectors) return;

        const connectorList = await api.connectors.list();

        // Parse connector list into our state structure
        const config: ConnectorConfig = {
          obsidian: { enabled: false, vaultPath: '' },
          notion: { enabled: false, authorized: false },
          joplin: { enabled: false, token: '' },
        };

        connectorList.forEach((connector: any) => {
          if (connector.name === 'obsidian') {
            config.obsidian.enabled = connector.enabled;
            config.obsidian.vaultPath = connector.config?.vaultPath || '';
          } else if (connector.name === 'notion') {
            config.notion.enabled = connector.enabled;
            config.notion.authorized = connector.config?.authorized || false;
          } else if (connector.name === 'joplin') {
            config.joplin.enabled = connector.enabled;
            config.joplin.token = connector.config?.token || '';
          }
        });

        setConnectors(config);
      } catch (error) {
        console.error('Failed to load connector config:', error);
      }
    };

    void loadConnectorConfig();
  }, []);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setLocalSettings(prev => (prev ? { ...prev, theme } : null));
    updateMutation.mutate({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
  };

  const handleLanguageChange = (language: string) => {
    setLocalSettings(prev => (prev ? { ...prev, language } : null));
    updateMutation.mutate({ language });
    setLanguage(language as 'en' | 'te' | 'hi');
    setCurrentLang(language as 'en' | 'te' | 'hi');
  };

  const handleSyncIntervalChange = (syncInterval: number) => {
    setLocalSettings(prev => (prev ? { ...prev, syncInterval: syncInterval } : null));
    updateMutation.mutate({ syncInterval });
  };

  const handleAIProviderChange = (aiProvider: string) => {
    setLocalSettings(prev => (prev ? { ...prev, aiProvider } : null));
    updateMutation.mutate({ aiProvider });
  };

  const handleAIModelChange = (provider: string, model: string) => {
    const modelKey = `${provider}Model` as keyof Settings;
    setLocalSettings(prev => (prev ? { ...prev, [modelKey]: model } : null));
    updateMutation.mutate({ [modelKey]: model });
  };

  // Connector handlers
  const toggleConnector = async (connectorId: keyof ConnectorConfig) => {
    const newState = !connectors[connectorId].enabled;

    setConnectors(prev => ({
      ...prev,
      [connectorId]: { ...prev[connectorId], enabled: newState },
    }));

    try {
      const api = window.electronAPI;
      if (api?.connectors) {
        await api.connectors.configure(connectorId, {
          enabled: newState,
          ...connectors[connectorId],
        });
      }
    } catch (error) {
      console.error(`Failed to toggle ${connectorId}:`, error);
      // Revert on error
      setConnectors(prev => ({
        ...prev,
        [connectorId]: { ...prev[connectorId], enabled: !newState },
      }));
    }
  };

  const updateConnectorConfig = async (
    connectorId: keyof ConnectorConfig,
    updates: Partial<ConnectorConfig[typeof connectorId]>
  ) => {
    setConnectors(prev => ({
      ...prev,
      [connectorId]: { ...prev[connectorId], ...updates },
    }));

    try {
      const api = window.electronAPI;
      if (api?.connectors) {
        await api.connectors.configure(connectorId, {
          ...connectors[connectorId],
          ...updates,
        });
      }
    } catch (error) {
      console.error(`Failed to update ${connectorId}:`, error);
    }
  };

  const selectFolder = async (connectorId: string) => {
    try {
      const api = window.electronAPI;
      if (api?.system?.selectFolder) {
        const path = await api.system.selectFolder();
        if (path && connectorId === 'obsidian') {
          await updateConnectorConfig('obsidian', { vaultPath: path });
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const testConnection = async (connectorId: string) => {
    setTestingConnector(connectorId);
    setTestResults(prev => ({ ...prev, [connectorId]: { success: false, message: 'Testing...' } }));

    try {
      const api = window.electronAPI;
      if (api?.connectors) {
        const result = await api.connectors.test(connectorId);
        setTestResults(prev => ({
          ...prev,
          [connectorId]: {
            success: result.success,
            message: result.message || (result.success ? 'Connection successful!' : 'Connection failed'),
          },
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [connectorId]: {
          success: false,
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      }));
    } finally {
      setTestingConnector(null);
    }
  };

  const authorizeNotion = async () => {
    try {
      const api = window.electronAPI;
      if (api?.connectors) {
        await api.connectors.authorizeNotion();
        setConnectors(prev => ({
          ...prev,
          notion: { ...prev.notion, authorized: true },
        }));
      }
    } catch (error) {
      console.error('Notion authorization failed:', error);
      setTestResults(prev => ({
        ...prev,
        notion: {
          success: false,
          message: error instanceof Error ? error.message : 'Authorization failed',
        },
      }));
    }
  };

  const disconnectNotion = async () => {
    try {
      const api = window.electronAPI;
      if (api?.connectors) {
        await api.connectors.configure('notion', { authorized: false });
        setConnectors(prev => ({
          ...prev,
          notion: { ...prev.notion, authorized: false },
        }));
      }
    } catch (error) {
      console.error('Failed to disconnect Notion:', error);
    }
  };

  if (!localSettings) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your PolyNote experience</p>
        </div>

        {/* Appearance */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold">Appearance</h2>

          {/* Theme Switcher */}
          <ThemeSwitcher
            currentMode={localSettings.theme}
            onModeChange={(mode) => {
              setLocalSettings(prev => (prev ? { ...prev, theme: mode } : null));
              updateMutation.mutate({ theme: mode });
            }}
          />

          {/* Theme Preview Panel */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-medium mb-3">Theme Preview</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Preview how your selected theme will look across different UI elements
            </p>

            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
              {/* Sample Text */}
              <div className="space-y-2">
                <h4 className="text-lg font-semibold">Sample Heading</h4>
                <p className="text-foreground">
                  This is a sample paragraph showing normal text in your current theme.
                </p>
                <p className="text-sm text-muted-foreground">
                  This is muted text used for secondary information.
                </p>
              </div>

              {/* Sample Buttons */}
              <div className="flex gap-3 flex-wrap">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Primary Button
                </button>
                <button className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                  Secondary Button
                </button>
                <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                  Outline Button
                </button>
              </div>

              {/* Sample Card */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h5 className="font-medium mb-2">Sample Card</h5>
                <p className="text-sm text-muted-foreground">
                  This card demonstrates how content appears in card containers.
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">Tag 1</span>
                  <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">Tag 2</span>
                </div>
              </div>

              {/* Sample Form Elements */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Sample Input</label>
                  <input
                    type="text"
                    placeholder="Enter some text..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sample Select</label>
                  <select className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
              </div>

              {/* Sample Alert */}
              <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p className="text-sm">This is a success message in your current theme.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Localization */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe size={20} />
            Language & Region
          </h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('settings.interfaceLanguage') || 'Interface Language'}
            </label>
            <select
              value={localSettings.language}
              onChange={e => handleLanguageChange(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
            
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Current language: <span className="font-medium">{currentLang}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Sync Settings */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Sync Settings</h2>

          <div>
            <label className="block text-sm font-medium mb-2">Sync Interval (seconds)</label>
            <input
              type="number"
              min="60"
              max="3600"
              value={(localSettings as Record<string, unknown>).syncInterval as number ?? 300}
              onChange={e => handleSyncIntervalChange(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How often to automatically sync notes (60-3600 seconds)
            </p>
          </div>
        </section>

        {/* AI Settings */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">AI Settings</h2>

          <div>
            <label className="block text-sm font-medium mb-2">Preferred AI Provider</label>
            <select
              value={localSettings.aiProvider}
              onChange={e => handleAIProviderChange(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ollama">Ollama (Local)</option>
              <option value="gpt4all">GPT4All (Local)</option>
              <option value="llamacpp">llama.cpp (Local)</option>
              <option value="openai">OpenAI (Cloud)</option>
              <option value="claude">Claude (Cloud)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Local providers run on your machine, cloud providers require API keys
            </p>
          </div>

          {/* Model Selection for Ollama */}
          {localSettings.aiProvider === 'ollama' && (
            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-2">Ollama Model</label>
              <select
                value={(localSettings as Record<string, unknown>).ollamaModel as string ?? 'llama2'}
                onChange={e => handleAIModelChange('ollama', e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="llama2">Llama 2 (7B)</option>
                <option value="mistral">Mistral (7B)</option>
                <option value="codellama">Code Llama (7B)</option>
                <option value="mixtral">Mixtral (8x7B)</option>
                <option value="neural-chat">Neural Chat (7B)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select which Ollama model to use for AI features
              </p>
            </div>
          )}

          {/* Model Selection for OpenAI */}
          {localSettings.aiProvider === 'openai' && (
            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-2">OpenAI Model</label>
              <select
                value={(localSettings as Record<string, unknown>).openaiModel as string ?? 'gpt-3.5-turbo'}
                onChange={e => handleAIModelChange('openai', e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select which OpenAI model to use for AI features
              </p>
            </div>
          )}

          {/* Model Selection for Claude */}
          {localSettings.aiProvider === 'claude' && (
            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-2">Claude Model</label>
              <select
                value={(localSettings as Record<string, unknown>).claudeModel as string ?? 'claude-3-sonnet'}
                onChange={e => handleAIModelChange('claude', e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="claude-3-haiku">Claude 3 Haiku</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select which Claude model to use for AI features
              </p>
            </div>
          )}

          {/* Model Selection for GPT4All */}
          {localSettings.aiProvider === 'gpt4all' && (
            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-2">GPT4All Model</label>
              <select
                value={(localSettings as Record<string, unknown>).gpt4allModel as string ?? 'mistral'}
                onChange={e => handleAIModelChange('gpt4all', e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="mistral">Mistral 7B</option>
                <option value="llama-2">Llama 2 7B</option>
                <option value="orca-mini">Orca Mini 3B</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select which GPT4All model to use for AI features
              </p>
            </div>
          )}

          {/* Model Selection for llama.cpp */}
          {localSettings.aiProvider === 'llamacpp' && (
            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-2">llama.cpp Model</label>
              <select
                value={(localSettings as Record<string, unknown>).llamacppModel as string ?? 'llama-2-7b'}
                onChange={e => handleAIModelChange('llamacpp', e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="llama-2-7b">Llama 2 7B</option>
                <option value="llama-2-13b">Llama 2 13B</option>
                <option value="mistral-7b">Mistral 7B</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select which llama.cpp model to use for AI features
              </p>
            </div>
          )}
        </section>

        {/* Connectors */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Connectors</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your favorite note-taking apps
            </p>
          </div>

          {/* Obsidian */}
          <div className="pb-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Obsidian</h3>
                <p className="text-sm text-muted-foreground">Connect your Obsidian vault</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={connectors.obsidian.enabled}
                  onChange={() => toggleConnector('obsidian')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {connectors.obsidian.enabled && (
              <div className="space-y-3 mt-4 pl-4 border-l-2 border-primary/20">
                <div>
                  <label className="block text-sm font-medium mb-2">Vault Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={connectors.obsidian.vaultPath}
                      onChange={e => updateConnectorConfig('obsidian', { vaultPath: e.target.value })}
                      className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="/Users/you/Documents/MyVault"
                    />
                    <button
                      onClick={() => selectFolder('obsidian')}
                      className="px-3 py-2 border border-border rounded-lg hover:bg-muted flex items-center gap-2"
                      title="Browse for folder"
                    >
                      <Folder size={16} />
                      Browse
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => testConnection('obsidian')}
                  disabled={testingConnector === 'obsidian'}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {testingConnector === 'obsidian' ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>

                {testResults.obsidian && (
                  <div
                    className={`p-3 rounded-lg flex items-start gap-2 ${
                      testResults.obsidian.success
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {testResults.obsidian.success ? (
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    )}
                    <p className="text-sm">{testResults.obsidian.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notion */}
          <div className="pb-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Notion</h3>
                <p className="text-sm text-muted-foreground">Sync with Notion workspace</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={connectors.notion.enabled}
                  onChange={() => toggleConnector('notion')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {connectors.notion.enabled && (
              <div className="space-y-3 mt-4 pl-4 border-l-2 border-primary/20">
                {!connectors.notion.authorized ? (
                  <button
                    onClick={authorizeNotion}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                  >
                    Authorize with Notion
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">Connected to Notion</span>
                    </div>
                    <button
                      onClick={disconnectNotion}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      Disconnect
                    </button>
                  </div>
                )}

                {testResults.notion && !testResults.notion.success && (
                  <div className="p-3 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{testResults.notion.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Joplin */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Joplin</h3>
                <p className="text-sm text-muted-foreground">Connect via Web Clipper API</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={connectors.joplin.enabled}
                  onChange={() => toggleConnector('joplin')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {connectors.joplin.enabled && (
              <div className="space-y-3 mt-4 pl-4 border-l-2 border-primary/20">
                <div>
                  <label className="block text-sm font-medium mb-2">API Token</label>
                  <input
                    type="password"
                    value={connectors.joplin.token}
                    onChange={e => updateConnectorConfig('joplin', { token: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Your Joplin Web Clipper token"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find in Joplin: Tools → Options → Web Clipper
                  </p>
                </div>

                <button
                  onClick={() => testConnection('joplin')}
                  disabled={testingConnector === 'joplin'}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {testingConnector === 'joplin' ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>

                {testResults.joplin && (
                  <div
                    className={`p-3 rounded-lg flex items-start gap-2 ${
                      testResults.joplin.success
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {testResults.joplin.success ? (
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    )}
                    <p className="text-sm">{testResults.joplin.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Version:</strong> 1.0.0
            </p>
            <p>
              <strong>License:</strong> MIT
            </p>
            <p className="pt-2">
              PolyNote - Universal note sync and AI-powered knowledge management
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
