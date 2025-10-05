import type { ThemeConfig } from '../types.js';

export const sepiaTheme: ThemeConfig = {
  id: 'sepia',
  name: 'sepia',
  displayName: 'Sepia',
  type: 'light',
  author: 'PolyNote',
  version: '1.0.0',
  description: 'Warm sepia tones for comfortable reading',

  colors: {
    background: 'hsl(40, 40%, 92%)',
    backgroundSecondary: 'hsl(40, 35%, 88%)',
    backgroundTertiary: 'hsl(40, 30%, 85%)',

    foreground: 'hsl(30, 20%, 25%)',
    foregroundSecondary: 'hsl(30, 15%, 40%)',
    foregroundMuted: 'hsl(30, 10%, 55%)',

    primary: 'hsl(25, 60%, 45%)',
    primaryForeground: 'hsl(40, 40%, 95%)',
    secondary: 'hsl(40, 30%, 85%)',
    secondaryForeground: 'hsl(30, 20%, 25%)',
    accent: 'hsl(20, 70%, 50%)',
    accentForeground: 'hsl(40, 40%, 95%)',

    destructive: 'hsl(0, 60%, 50%)',
    destructiveForeground: 'hsl(40, 40%, 95%)',
    success: 'hsl(130, 40%, 45%)',
    successForeground: 'hsl(40, 40%, 95%)',
    warning: 'hsl(35, 80%, 50%)',
    warningForeground: 'hsl(30, 20%, 25%)',
    info: 'hsl(200, 50%, 50%)',
    infoForeground: 'hsl(40, 40%, 95%)',

    border: 'hsl(40, 25%, 75%)',
    borderFocus: 'hsl(25, 60%, 45%)',
    input: 'hsl(40, 25%, 80%)',
    ring: 'hsl(25, 60%, 45%)',

    card: 'hsl(40, 40%, 92%)',
    cardForeground: 'hsl(30, 20%, 25%)',
    popover: 'hsl(40, 40%, 92%)',
    popoverForeground: 'hsl(30, 20%, 25%)',

    muted: 'hsl(40, 30%, 85%)',
    mutedForeground: 'hsl(30, 15%, 40%)',
  },

  metadata: {
    isBuiltIn: true,
    createdAt: Date.now(),
    tags: ['reading', 'sepia', 'warm'],
  },
};
