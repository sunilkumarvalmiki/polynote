/**
 * Theme Persistence Service
 * Handles saving and loading theme preferences
 */

import type { ThemeSettings, ThemeMode } from './types.js';

const THEME_STORAGE_KEY = 'polynote-theme-settings';

export class ThemePersistence {
  /**
   * Save theme settings to localStorage
   */
  static saveSettings(settings: ThemeSettings): void {
    try {
      if (typeof window === 'undefined') return;

      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  }

  /**
   * Load theme settings from localStorage
   */
  static loadSettings(): ThemeSettings | null {
    try {
      if (typeof window === 'undefined') return null;

      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) return null;

      const settings = JSON.parse(stored) as ThemeSettings;

      // Validate loaded settings
      if (!this.validateSettings(settings)) {
        console.warn('Invalid theme settings in storage, using defaults');
        return null;
      }

      return settings;
    } catch (error) {
      console.error('Failed to load theme settings:', error);
      return null;
    }
  }

  /**
   * Clear theme settings from localStorage
   */
  static clearSettings(): void {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear theme settings:', error);
    }
  }

  /**
   * Save active theme ID
   */
  static saveActiveTheme(themeId: string): void {
    const settings = this.loadSettings() || this.getDefaultSettings();
    settings.activeThemeId = themeId;
    this.saveSettings(settings);
  }

  /**
   * Save theme mode
   */
  static saveThemeMode(mode: ThemeMode): void {
    const settings = this.loadSettings() || this.getDefaultSettings();
    settings.mode = mode;
    settings.followSystemTheme = mode === 'system';
    this.saveSettings(settings);
  }

  /**
   * Get default theme settings
   */
  static getDefaultSettings(): ThemeSettings {
    return {
      mode: 'system',
      activeThemeId: 'default-light',
      followSystemTheme: true,
    };
  }

  /**
   * Validate theme settings structure
   */
  private static validateSettings(settings: unknown): settings is ThemeSettings {
    if (!settings || typeof settings !== 'object') return false;

    const s = settings as Record<string, unknown>;

    return (
      typeof s.mode === 'string' &&
      ['light', 'dark', 'system'].includes(s.mode) &&
      typeof s.activeThemeId === 'string' &&
      typeof s.followSystemTheme === 'boolean'
    );
  }
}
