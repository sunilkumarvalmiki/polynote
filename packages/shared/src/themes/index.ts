/**
 * Theme System - Main Export
 * Based on VALIDATION_REPORT.md Section 4.15
 */

export * from './types.js';
export * from './ThemeManager.js';
export * from './ThemePersistence.js';
export * from './builtin/index.js';

import { themeManager } from './ThemeManager.js';
import { builtInThemes } from './builtin/index.js';

/**
 * Initialize theme system with built-in themes
 */
export function initializeThemeSystem(): void {
  // Register all built-in themes
  builtInThemes.forEach(theme => {
    themeManager.registerBuiltInTheme(theme);
  });

  // Apply default theme or saved theme
  const savedSettings = themeManager.getSettings();
  if (savedSettings.activeThemeId) {
    themeManager.applyTheme(savedSettings.activeThemeId);
  } else {
    // Apply default light theme
    themeManager.applyTheme('default-light');
  }
}

/**
 * Re-export theme manager instance for convenience
 */
export { themeManager };