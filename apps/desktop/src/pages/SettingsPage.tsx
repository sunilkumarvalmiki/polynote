import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
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

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

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
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Appearance</h2>
          <ThemeSwitcher
            currentMode={localSettings.theme}
            onModeChange={(mode) => {
              setLocalSettings(prev => (prev ? { ...prev, theme: mode } : null));
              updateMutation.mutate({ theme: mode });
            }}
          />
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
