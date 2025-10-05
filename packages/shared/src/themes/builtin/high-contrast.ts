import type { ThemeConfig } from '../types.js';

export const highContrastTheme: ThemeConfig = {
  id: 'high-contrast',
  name: 'high-contrast',
  displayName: 'High Contrast',
  type: 'light',
  author: 'PolyNote',
  version: '1.0.0',
  description: 'High contrast theme for better accessibility',

  colors: {
    background: 'hsl(0, 0%, 100%)',
    backgroundSecondary: 'hsl(0, 0%, 98%)',
    backgroundTertiary: 'hsl(0, 0%, 95%)',

    foreground: 'hsl(0, 0%, 0%)',
    foregroundSecondary: 'hsl(0, 0%, 20%)',
    foregroundMuted: 'hsl(0, 0%, 40%)',

    primary: 'hsl(0, 0%, 0%)',
    primaryForeground: 'hsl(0, 0%, 100%)',
    secondary: 'hsl(0, 0%, 95%)',
    secondaryForeground: 'hsl(0, 0%, 0%)',
    accent: 'hsl(211, 100%, 50%)',
    accentForeground: 'hsl(0, 0%, 100%)',

    destructive: 'hsl(0, 100%, 40%)',
    destructiveForeground: 'hsl(0, 0%, 100%)',
    success: 'hsl(120, 100%, 25%)',
    successForeground: 'hsl(0, 0%, 100%)',
    warning: 'hsl(45, 100%, 35%)',
    warningForeground: 'hsl(0, 0%, 100%)',
    info: 'hsl(211, 100%, 35%)',
    infoForeground: 'hsl(0, 0%, 100%)',

    border: 'hsl(0, 0%, 0%)',
    borderFocus: 'hsl(211, 100%, 50%)',
    input: 'hsl(0, 0%, 0%)',
    ring: 'hsl(211, 100%, 50%)',

    card: 'hsl(0, 0%, 100%)',
    cardForeground: 'hsl(0, 0%, 0%)',
    popover: 'hsl(0, 0%, 100%)',
    popoverForeground: 'hsl(0, 0%, 0%)',

    muted: 'hsl(0, 0%, 95%)',
    mutedForeground: 'hsl(0, 0%, 40%)',
  },

  metadata: {
    isBuiltIn: true,
    createdAt: Date.now(),
    tags: ['accessibility', 'high-contrast'],
  },
};
