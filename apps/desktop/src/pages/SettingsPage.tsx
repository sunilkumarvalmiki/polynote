import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Moon, Sun, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Settings {
  theme: 'light' | 'dark';
  language: 'en' | 'te' | 'hi';
  syncInterval: number;
  aiProvider: string;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);

  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI?.getSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Settings>) => window.electronAPI?.updateSettings(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
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

  const handleLanguageChange = (language: 'en' | 'te' | 'hi') => {
    setLocalSettings(prev => (prev ? { ...prev, language } : null));
    updateMutation.mutate({ language });
  };

  const handleSyncIntervalChange = (syncInterval: number) => {
    setLocalSettings(prev => (prev ? { ...prev, syncInterval } : null));
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

          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  localSettings.theme === 'light'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Sun size={20} />
                <span>Light</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  localSettings.theme === 'dark'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Moon size={20} />
                <span>Dark</span>
              </button>
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
            <label className="block text-sm font-medium mb-2">Interface Language</label>
            <select
              value={localSettings.language}
              onChange={e => handleLanguageChange(e.target.value as any)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
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
              value={localSettings.syncInterval}
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
