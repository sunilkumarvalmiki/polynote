/**
 * ThemeManager - Core theme management system
 * Based on VALIDATION_REPORT.md Section 4.15
 */

import type { ThemeConfig, ThemeMode, ThemeSettings, ThemeValidationResult, ThemeValidationError } from './types.js';
import { ThemePersistence } from './ThemePersistence.js';

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: ThemeConfig | null = null;
  private builtInThemes: Map<string, ThemeConfig> = new Map();
  private customThemes: Map<string, ThemeConfig> = new Map();
  private settings: ThemeSettings;

  private constructor() {
    // Load saved settings or use defaults
    this.settings = ThemePersistence.loadSettings() || ThemePersistence.getDefaultSettings();
    this.initializeSystemThemeListener();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Register a built-in theme
   */
  registerBuiltInTheme(theme: ThemeConfig): void {
    if (!theme.metadata) {
      theme.metadata = {};
    }
    theme.metadata.isBuiltIn = true;
    this.builtInThemes.set(theme.id, theme);
  }

  /**
   * Register a custom theme
   */
  registerCustomTheme(theme: ThemeConfig): ThemeValidationResult {
    const validation = this.validateTheme(theme);
    if (!validation.valid) {
      return validation;
    }

    this.customThemes.set(theme.id, theme);
    return { valid: true, errors: [] };
  }

  /**
   * Get a theme by ID
   */
  getTheme(id: string): ThemeConfig | null {
    return this.builtInThemes.get(id) || this.customThemes.get(id) || null;
  }

  /**
   * Get all available themes
   */
  getAllThemes(): ThemeConfig[] {
    return [
      ...Array.from(this.builtInThemes.values()),
      ...Array.from(this.customThemes.values()),
    ];
  }

  /**
   * Get themes by type
   */
  getThemesByType(type: 'light' | 'dark'): ThemeConfig[] {
    return this.getAllThemes().filter(theme => theme.type === type);
  }

  /**
   * Apply a theme to the document
   */
  applyTheme(themeId: string): boolean {
    const theme = this.getTheme(themeId);
    if (!theme) {
      console.error(`Theme not found: ${themeId}`);
      return false;
    }

    this.currentTheme = theme;
    this.settings.activeThemeId = themeId;

    // Apply CSS variables to root element
    this.applyCSSVariables(theme);

    // Apply dark mode class if needed
    this.applyDarkModeClass(theme.type);

    // Apply custom CSS if provided
    if (theme.customCSS) {
      this.applyCustomCSS(theme.customCSS);
    }

    // Persist theme selection
    ThemePersistence.saveActiveTheme(themeId);

    // Emit theme change event
    this.emitThemeChangeEvent(theme);

    return true;
  }

  /**
   * Apply CSS variables to document root
   */
  private applyCSSVariables(theme: ThemeConfig): void {
    const root = document.documentElement;
    const { colors, typography, spacing, borderRadius } = theme;

    // Apply color variables
    Object.entries(colors).forEach(([key, value]) => {
      const cssVarName = `--${this.camelToKebab(key)}`;
      root.style.setProperty(cssVarName, value);
    });

    // Apply typography variables if provided
    if (typography) {
      root.style.setProperty('--font-family', typography.fontFamily);
      root.style.setProperty('--font-family-mono', typography.fontFamilyMono);

      Object.entries(typography.fontSize).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value);
      });

      Object.entries(typography.fontWeight).forEach(([key, value]) => {
        root.style.setProperty(`--font-weight-${key}`, String(value));
      });

      Object.entries(typography.lineHeight).forEach(([key, value]) => {
        root.style.setProperty(`--line-height-${key}`, String(value));
      });
    }

    // Apply spacing variables if provided
    if (spacing) {
      root.style.setProperty('--spacing-unit', spacing.unit.toString());
      Object.entries(spacing.scale).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
    }

    // Apply border radius variables if provided
    if (borderRadius) {
      Object.entries(borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--radius-${key}`, value);
      });
    }
  }

  /**
   * Apply dark mode class to document
   */
  private applyDarkModeClass(type: 'light' | 'dark'): void {
    if (type === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  /**
   * Apply custom CSS to document
   */
  private applyCustomCSS(css: string): void {
    // Remove existing custom theme CSS
    const existingStyle = document.getElementById('custom-theme-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new custom CSS
    const style = document.createElement('style');
    style.id = 'custom-theme-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Set theme mode (light/dark/system)
   */
  setThemeMode(mode: ThemeMode): void {
    this.settings.mode = mode;
    this.settings.followSystemTheme = mode === 'system';

    // Persist theme mode
    ThemePersistence.saveThemeMode(mode);

    if (mode === 'system') {
      this.applySystemTheme();
    } else {
      const themes = this.getThemesByType(mode);
      if (themes.length > 0) {
        this.applyTheme(themes[0].id);
      }
    }
  }

  /**
   * Get current theme mode
   */
  getThemeMode(): ThemeMode {
    return this.settings.mode;
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeConfig | null {
    return this.currentTheme;
  }

  /**
   * Initialize system theme listener
   */
  private initializeSystemThemeListener(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (this.settings.followSystemTheme) {
        this.applySystemTheme();
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handleChange);
    }

    // Apply system theme on initialization if needed
    if (this.settings.followSystemTheme) {
      this.applySystemTheme();
    }
  }

  /**
   * Apply system theme based on OS preference
   */
  private applySystemTheme(): void {
    if (typeof window === 'undefined') return;

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const type = prefersDark ? 'dark' : 'light';
    const themes = this.getThemesByType(type);

    if (themes.length > 0) {
      // Apply the first available theme of the detected type
      this.applyTheme(themes[0].id);
    }
  }

  /**
   * Validate theme configuration
   */
  validateTheme(theme: ThemeConfig): ThemeValidationResult {
    const errors: ThemeValidationError[] = [];

    // Required fields validation
    if (!theme.id || typeof theme.id !== 'string') {
      errors.push({ field: 'id', message: 'Theme ID is required and must be a string' });
    }

    if (!theme.name || typeof theme.name !== 'string') {
      errors.push({ field: 'name', message: 'Theme name is required and must be a string' });
    }

    if (!theme.displayName || typeof theme.displayName !== 'string') {
      errors.push({ field: 'displayName', message: 'Display name is required and must be a string' });
    }

    if (!theme.type || !['light', 'dark'].includes(theme.type)) {
      errors.push({ field: 'type', message: 'Theme type must be either "light" or "dark"' });
    }

    // Color scheme validation
    if (!theme.colors || typeof theme.colors !== 'object') {
      errors.push({ field: 'colors', message: 'Color scheme is required' });
    } else {
      const requiredColors = [
        'background', 'foreground', 'primary', 'primaryForeground',
        'secondary', 'secondaryForeground', 'border', 'input', 'ring'
      ];

      requiredColors.forEach(color => {
        if (!(color in theme.colors)) {
          errors.push({ field: `colors.${color}`, message: `Required color "${color}" is missing` });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export theme to JSON
   */
  exportTheme(themeId: string): string | null {
    const theme = this.getTheme(themeId);
    if (!theme) return null;

    const exportData = {
      version: '1.0',
      theme,
      exportedAt: Date.now(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import theme from JSON
   */
  importTheme(jsonString: string): ThemeValidationResult {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.theme) {
        return {
          valid: false,
          errors: [{ field: 'theme', message: 'Invalid theme export format' }],
        };
      }

      return this.registerCustomTheme(data.theme);
    } catch (error) {
      return {
        valid: false,
        errors: [{ field: 'json', message: `Failed to parse JSON: ${error}` }],
      };
    }
  }

  /**
   * Remove a custom theme
   */
  removeCustomTheme(themeId: string): boolean {
    const theme = this.customThemes.get(themeId);
    if (!theme) return false;

    // Don't allow removing built-in themes
    if (theme.metadata?.isBuiltIn) return false;

    this.customThemes.delete(themeId);

    // If the removed theme was active, switch to default
    if (this.currentTheme?.id === themeId) {
      const defaultTheme = this.builtInThemes.get('default-light');
      if (defaultTheme) {
        this.applyTheme(defaultTheme.id);
      }
    }

    return true;
  }

  /**
   * Convert camelCase to kebab-case
   */
  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Emit theme change event
   */
  private emitThemeChangeEvent(theme: ThemeConfig): void {
    if (typeof window === 'undefined') return;

    const event = new CustomEvent('themechange', {
      detail: { theme },
    });
    window.dispatchEvent(event);
  }

  /**
   * Get theme settings
   */
  getSettings(): ThemeSettings {
    return { ...this.settings };
  }

  /**
   * Update theme settings
   */
  updateSettings(settings: Partial<ThemeSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Persist updated settings
    ThemePersistence.saveSettings(this.settings);

    if (settings.mode) {
      this.setThemeMode(settings.mode);
    } else if (settings.activeThemeId) {
      this.applyTheme(settings.activeThemeId);
    }
  }
}

export const themeManager = ThemeManager.getInstance();