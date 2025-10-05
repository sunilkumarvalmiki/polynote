/**
 * ThemePersistence Test Suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemePersistence } from '../ThemePersistence.js';
import type { ThemeSettings } from '../types.js';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ThemePersistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Save and Load Settings', () => {
    it('should save settings to localStorage', () => {
      const settings: ThemeSettings = {
        mode: 'dark',
        activeThemeId: 'default-dark',
        followSystemTheme: false,
      };

      ThemePersistence.saveSettings(settings);

      const stored = localStorage.getItem('polynote-theme-settings');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.mode).toBe('dark');
      expect(parsed.activeThemeId).toBe('default-dark');
      expect(parsed.followSystemTheme).toBe(false);
    });

    it('should load settings from localStorage', () => {
      const settings: ThemeSettings = {
        mode: 'light',
        activeThemeId: 'default-light',
        followSystemTheme: true,
      };

      ThemePersistence.saveSettings(settings);
      const loaded = ThemePersistence.loadSettings();

      expect(loaded).toBeDefined();
      expect(loaded?.mode).toBe('light');
      expect(loaded?.activeThemeId).toBe('default-light');
      expect(loaded?.followSystemTheme).toBe(true);
    });

    it('should return null when no settings exist', () => {
      const loaded = ThemePersistence.loadSettings();

      expect(loaded).toBeNull();
    });

    it('should return null for invalid settings', () => {
      localStorage.setItem('polynote-theme-settings', '{ invalid json }');

      const loaded = ThemePersistence.loadSettings();

      expect(loaded).toBeNull();
    });
  });

  describe('Clear Settings', () => {
    it('should clear settings from localStorage', () => {
      const settings: ThemeSettings = {
        mode: 'dark',
        activeThemeId: 'default-dark',
        followSystemTheme: false,
      };

      ThemePersistence.saveSettings(settings);
      ThemePersistence.clearSettings();

      const stored = localStorage.getItem('polynote-theme-settings');
      expect(stored).toBeNull();
    });
  });

  describe('Save Active Theme', () => {
    it('should save active theme ID', () => {
      ThemePersistence.saveActiveTheme('solarized-dark');

      const loaded = ThemePersistence.loadSettings();
      expect(loaded?.activeThemeId).toBe('solarized-dark');
    });

    it('should update existing settings', () => {
      const initialSettings: ThemeSettings = {
        mode: 'light',
        activeThemeId: 'default-light',
        followSystemTheme: true,
      };

      ThemePersistence.saveSettings(initialSettings);
      ThemePersistence.saveActiveTheme('dracula');

      const loaded = ThemePersistence.loadSettings();
      expect(loaded?.activeThemeId).toBe('dracula');
      expect(loaded?.mode).toBe('light'); // Other settings preserved
    });
  });

  describe('Save Theme Mode', () => {
    it('should save theme mode', () => {
      ThemePersistence.saveThemeMode('dark');

      const loaded = ThemePersistence.loadSettings();
      expect(loaded?.mode).toBe('dark');
      expect(loaded?.followSystemTheme).toBe(false);
    });

    it('should set followSystemTheme for system mode', () => {
      ThemePersistence.saveThemeMode('system');

      const loaded = ThemePersistence.loadSettings();
      expect(loaded?.mode).toBe('system');
      expect(loaded?.followSystemTheme).toBe(true);
    });
  });

  describe('Default Settings', () => {
    it('should return default settings', () => {
      const defaults = ThemePersistence.getDefaultSettings();

      expect(defaults.mode).toBe('system');
      expect(defaults.activeThemeId).toBe('default-light');
      expect(defaults.followSystemTheme).toBe(true);
    });
  });

  describe('Settings Validation', () => {
    it('should reject settings with invalid mode', () => {
      localStorage.setItem(
        'polynote-theme-settings',
        JSON.stringify({
          mode: 'invalid',
          activeThemeId: 'default-light',
          followSystemTheme: true,
        })
      );

      const loaded = ThemePersistence.loadSettings();
      expect(loaded).toBeNull();
    });

    it('should reject settings with missing activeThemeId', () => {
      localStorage.setItem(
        'polynote-theme-settings',
        JSON.stringify({
          mode: 'light',
          followSystemTheme: true,
        })
      );

      const loaded = ThemePersistence.loadSettings();
      expect(loaded).toBeNull();
    });

    it('should reject settings with invalid followSystemTheme', () => {
      localStorage.setItem(
        'polynote-theme-settings',
        JSON.stringify({
          mode: 'light',
          activeThemeId: 'default-light',
          followSystemTheme: 'yes', // Should be boolean
        })
      );

      const loaded = ThemePersistence.loadSettings();
      expect(loaded).toBeNull();
    });
  });
});
