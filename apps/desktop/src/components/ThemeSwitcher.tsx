import { useState } from 'react';
import { Palette, Download, Upload, Moon, Sun, Monitor } from 'lucide-react';
import clsx from 'clsx';
import { themeManager } from '../../../../packages/shared/src/themes/index.js';
import type { ThemeConfig, ThemeMode } from '../../../../packages/shared/src/themes/types.js';

interface ThemeSwitcherProps {
  currentMode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
}

export function ThemeSwitcher({ currentMode = 'system', onModeChange }: ThemeSwitcherProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>(
    themeManager.getCurrentTheme()?.id || 'default-light'
  );
  const [mode, setMode] = useState<ThemeMode>(currentMode);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  const availableThemes = themeManager.getAllThemes();
  const lightThemes = availableThemes.filter((t: ThemeConfig) => t.type === 'light');
  const darkThemes = availableThemes.filter((t: ThemeConfig) => t.type === 'dark');

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    themeManager.applyTheme(themeId);
  };

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    themeManager.setThemeMode(newMode);
    onModeChange?.(newMode);
  };

  const handleExportTheme = () => {
    const currentTheme = themeManager.getCurrentTheme();
    if (!currentTheme) return;

    const exportData = themeManager.exportTheme(currentTheme.id);
    if (!exportData) return;

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTheme.name}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTheme = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = themeManager.importTheme(text);
      
      if (result.valid) {
        alert('Theme imported successfully!');
        setShowImportDialog(false);
      } else {
        alert(`Failed to import theme: ${result.errors.map((e: { message: string }) => e.message).join(', ')}`);
      }
    } catch (error) {
      alert(`Failed to import theme: ${error}`);
    }
  };

  const getModeIcon = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case 'light':
        return <Sun size={18} />;
      case 'dark':
        return <Moon size={18} />;
      case 'system':
        return <Monitor size={18} />;
    }
  };

  const handlePreview = (themeId: string) => {
    setPreviewTheme(themeId);
    themeManager.applyTheme(themeId);
  };

  const handleCancelPreview = () => {
    if (previewTheme) {
      themeManager.applyTheme(selectedTheme);
      setPreviewTheme(null);
    }
  };

  const handleConfirmPreview = () => {
    if (previewTheme) {
      setSelectedTheme(previewTheme);
      setPreviewTheme(null);
    }
  };

  const renderThemeCard = (theme: ThemeConfig) => {
    const isSelected = selectedTheme === theme.id;
    const isPreviewing = previewTheme === theme.id;

    return (
      <div key={theme.id} className="relative">
        <button
          onClick={() => handleThemeChange(theme.id)}
          onMouseEnter={() => !previewTheme && handlePreview(theme.id)}
          onMouseLeave={() => !previewTheme && handleCancelPreview()}
          className={clsx(
            'relative p-4 rounded-lg border-2 transition-all text-left w-full',
            isSelected
              ? 'border-primary bg-primary/5'
              : isPreviewing
              ? 'border-primary/50 bg-primary/10'
              : 'border-border hover:border-primary/50'
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium">{theme.displayName}</h4>
              {theme.author && (
                <p className="text-xs text-muted-foreground">by {theme.author}</p>
              )}
            </div>
            {isSelected && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <Palette size={14} />
                <span>Active</span>
              </div>
            )}
            {isPreviewing && !isSelected && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Preview</span>
              </div>
            )}
          </div>

          {theme.description && (
            <p className="text-xs text-muted-foreground mb-3">{theme.description}</p>
          )}

          <div className="flex gap-1">
            {Object.entries(theme.colors).slice(0, 6).map(([key, value]) => (
              <div
                key={key}
                className="w-6 h-6 rounded border border-border"
                style={{ backgroundColor: value as string }}
                title={key}
              />
            ))}
          </div>
        </button>

        {isPreviewing && !isSelected && (
          <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-2 z-10">
            <button
              onClick={handleConfirmPreview}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md shadow-md hover:bg-primary/90"
            >
              Apply
            </button>
            <button
              onClick={handleCancelPreview}
              className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded-md shadow-md hover:bg-muted/80"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Theme Mode Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Theme Mode</label>
        <div className="inline-flex items-center p-1 bg-muted rounded-lg">
          {(['light', 'dark', 'system'] as ThemeMode[]).map(themeMode => (
            <button
              key={themeMode}
              onClick={() => handleModeChange(themeMode)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded transition-colors capitalize',
                mode === themeMode
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-muted-foreground/10'
              )}
              aria-label={`${themeMode} mode`}
              title={`${themeMode} mode`}
            >
              {getModeIcon(themeMode)}
              <span className={mode === themeMode ? 'text-primary' : 'text-muted-foreground'}>
                {themeMode}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {mode === 'system' 
            ? 'Theme automatically matches your system preference'
            : `Using ${mode} theme`}
        </p>
      </div>

      {/* Import/Export Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleExportTheme}
          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
        >
          <Download size={16} />
          Export Current Theme
        </button>
        <label className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm cursor-pointer">
          <Upload size={16} />
          Import Theme
          <input
            type="file"
            accept=".json"
            onChange={handleImportTheme}
            className="hidden"
          />
        </label>
      </div>

      {/* Light Themes */}
      {lightThemes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sun size={20} />
            Light Themes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lightThemes.map(renderThemeCard)}
          </div>
        </div>
      )}

      {/* Dark Themes */}
      {darkThemes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Moon size={20} />
            Dark Themes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {darkThemes.map(renderThemeCard)}
          </div>
        </div>
      )}
    </div>
  );
}