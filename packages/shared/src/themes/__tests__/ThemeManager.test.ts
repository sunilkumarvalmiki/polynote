/**
 * ThemeManager Test Suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeManager } from '../ThemeManager.js';
import { defaultLightTheme } from '../builtin/default-light.js';
import { defaultDarkTheme } from '../builtin/default-dark.js';
import type { ThemeConfig } from '../types.js';

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset document
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';

    // Get fresh instance
    themeManager = ThemeManager.getInstance();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ThemeManager.getInstance();
      const instance2 = ThemeManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Built-in Theme Registration', () => {
    it('should register built-in themes', () => {
      themeManager.registerBuiltInTheme(defaultLightTheme);
      themeManager.registerBuiltInTheme(defaultDarkTheme);

      const lightTheme = themeManager.getTheme('default-light');
      const darkTheme = themeManager.getTheme('default-dark');

      expect(lightTheme).toBeDefined();
      expect(darkTheme).toBeDefined();
      expect(lightTheme?.metadata?.isBuiltIn).toBe(true);
      expect(darkTheme?.metadata?.isBuiltIn).toBe(true);
    });

    it('should get all themes', () => {
      themeManager.registerBuiltInTheme(defaultLightTheme);
      themeManager.registerBuiltInTheme(defaultDarkTheme);

      const themes = themeManager.getAllThemes();
      expect(themes.length).toBeGreaterThanOrEqual(2);
    });

    it('should get themes by type', () => {
      themeManager.registerBuiltInTheme(defaultLightTheme);
      themeManager.registerBuiltInTheme(defaultDarkTheme);

      const lightThemes = themeManager.getThemesByType('light');
      const darkThemes = themeManager.getThemesByType('dark');

      expect(lightThemes.length).toBeGreaterThan(0);
      expect(darkThemes.length).toBeGreaterThan(0);
      expect(lightThemes.every(t => t.type === 'light')).toBe(true);
      expect(darkThemes.every(t => t.type === 'dark')).toBe(true);
    });
  });

  describe('Theme Application', () => {
    beforeEach(() => {
      themeManager.registerBuiltInTheme(defaultLightTheme);
      themeManager.registerBuiltInTheme(defaultDarkTheme);
    });

    it('should apply theme successfully', () => {
      const result = themeManager.applyTheme('default-light');

      expect(result).toBe(true);
      expect(themeManager.getCurrentTheme()?.id).toBe('default-light');
    });

    it('should return false for non-existent theme', () => {
      const result = themeManager.applyTheme('non-existent');

      expect(result).toBe(false);
    });

    it('should apply CSS variables to document', () => {
      themeManager.applyTheme('default-light');

      const rootStyle = document.documentElement.style;
      expect(rootStyle.getPropertyValue('--background')).toBeTruthy();
      expect(rootStyle.getPropertyValue('--foreground')).toBeTruthy();
      expect(rootStyle.getPropertyValue('--primary')).toBeTruthy();
    });

    it('should add dark class for dark themes', () => {
      themeManager.applyTheme('default-dark');

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class for light themes', () => {
      themeManager.applyTheme('default-dark');
      themeManager.applyTheme('default-light');

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Custom Theme Registration', () => {
    const customTheme: ThemeConfig = {
      id: 'custom-theme',
      name: 'custom-theme',
      displayName: 'Custom Theme',
      type: 'light',
      colors: {
        background: '#ffffff',
        backgroundSecondary: '#f5f5f5',
        backgroundTertiary: '#eeeeee',
        foreground: '#000000',
        foregroundSecondary: '#333333',
        foregroundMuted: '#666666',
        primary: '#0066cc',
        primaryForeground: '#ffffff',
        secondary: '#f0f0f0',
        secondaryForeground: '#000000',
        accent: '#0066cc',
        accentForeground: '#ffffff',
        destructive: '#cc0000',
        destructiveForeground: '#ffffff',
        success: '#00cc00',
        successForeground: '#ffffff',
        warning: '#cccc00',
        warningForeground: '#000000',
        info: '#0066cc',
        infoForeground: '#ffffff',
        border: '#dddddd',
        borderFocus: '#0066cc',
        input: '#ffffff',
        ring: '#0066cc',
        card: '#ffffff',
        cardForeground: '#000000',
        popover: '#ffffff',
        popoverForeground: '#000000',
        muted: '#f0f0f0',
        mutedForeground: '#666666',
      },
    };

    it('should register valid custom theme', () => {
      const result = themeManager.registerCustomTheme(customTheme);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(themeManager.getTheme('custom-theme')).toBeDefined();
    });

    it('should reject invalid custom theme', () => {
      const invalidTheme = { ...customTheme, id: '', name: '' };
      const result = themeManager.registerCustomTheme(invalidTheme as ThemeConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Mode', () => {
    beforeEach(() => {
      themeManager.registerBuiltInTheme(defaultLightTheme);
      themeManager.registerBuiltInTheme(defaultDarkTheme);
    });

    it('should set theme mode to light', () => {
      themeManager.setThemeMode('light');

      expect(themeManager.getThemeMode()).toBe('light');
      expect(themeManager.getCurrentTheme()?.type).toBe('light');
    });

    it('should set theme mode to dark', () => {
      themeManager.setThemeMode('dark');

      expect(themeManager.getThemeMode()).toBe('dark');
      expect(themeManager.getCurrentTheme()?.type).toBe('dark');
    });

    it('should set theme mode to system', () => {
      themeManager.setThemeMode('system');

      expect(themeManager.getThemeMode()).toBe('system');
      const settings = themeManager.getSettings();
      expect(settings.followSystemTheme).toBe(true);
    });
  });

  describe('Theme Export/Import', () => {
    beforeEach(() => {
      themeManager.registerBuiltInTheme(defaultLightTheme);
    });

    it('should export theme to JSON', () => {
      const exported = themeManager.exportTheme('default-light');

      expect(exported).toBeTruthy();
      const data = JSON.parse(exported!);
      expect(data.version).toBe('1.0');
      expect(data.theme.id).toBe('default-light');
    });

    it('should return null for non-existent theme export', () => {
      const exported = themeManager.exportTheme('non-existent');

      expect(exported).toBeNull();
    });

    it('should import valid theme JSON', () => {
      const exported = themeManager.exportTheme('default-light');
      const result = themeManager.importTheme(exported!);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid theme JSON', () => {
      const result = themeManager.importTheme('invalid json');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Removal', () => {
    const customTheme: ThemeConfig = {
      id: 'removable-theme',
      name: 'removable-theme',
      displayName: 'Removable Theme',
      type: 'light',
      colors: {
        background: '#ffffff',
        backgroundSecondary: '#f5f5f5',
        backgroundTertiary: '#eeeeee',
        foreground: '#000000',
        foregroundSecondary: '#333333',
        foregroundMuted: '#666666',
        primary: '#0066cc',
        primaryForeground: '#ffffff',
        secondary: '#f0f0f0',
        secondaryForeground: '#000000',
        accent: '#0066cc',
        accentForeground: '#ffffff',
        destructive: '#cc0000',
        destructiveForeground: '#ffffff',
        success: '#00cc00',
        successForeground: '#ffffff',
        warning: '#cccc00',
        warningForeground: '#000000',
        info: '#0066cc',
        infoForeground: '#ffffff',
        border: '#dddddd',
        borderFocus: '#0066cc',
        input: '#ffffff',
        ring: '#0066cc',
        card: '#ffffff',
        cardForeground: '#000000',
        popover: '#ffffff',
        popoverForeground: '#000000',
        muted: '#f0f0f0',
        mutedForeground: '#666666',
      },
    };

    beforeEach(() => {
      themeManager.registerBuiltInTheme(defaultLightTheme);
    });

    it('should remove custom theme', () => {
      themeManager.registerCustomTheme(customTheme);
      const removed = themeManager.removeCustomTheme('removable-theme');

      expect(removed).toBe(true);
      expect(themeManager.getTheme('removable-theme')).toBeNull();
    });

    it('should not remove built-in theme', () => {
      const removed = themeManager.removeCustomTheme('default-light');

      expect(removed).toBe(false);
      expect(themeManager.getTheme('default-light')).toBeDefined();
    });
  });
});
