import type { ThemeConfig } from '../types.js';

export const draculaTheme: ThemeConfig = {
  id: 'dracula',
  name: 'dracula',
  displayName: 'Dracula',
  type: 'dark',
  author: 'Zeno Rocha',
  version: '1.0.0',
  description: 'A dark theme for those who live on the edge',
  
  colors: {
    background: 'hsl(231, 15%, 18%)',
    backgroundSecondary: 'hsl(232, 14%, 23%)',
    backgroundTertiary: 'hsl(233, 14%, 28%)',
    
    foreground: 'hsl(60, 30%, 96%)',
    foregroundSecondary: 'hsl(231, 15%, 72%)',
    foregroundMuted: 'hsl(231, 15%, 60%)',
    
    primary: 'hsl(265, 89%, 78%)',
    primaryForeground: 'hsl(231, 15%, 18%)',
    secondary: 'hsl(232, 14%, 23%)',
    secondaryForeground: 'hsl(60, 30%, 96%)',
    accent: 'hsl(326, 100%, 74%)',
    accentForeground: 'hsl(231, 15%, 18%)',
    
    destructive: 'hsl(0, 100%, 67%)',
    destructiveForeground: 'hsl(231, 15%, 18%)',
    success: 'hsl(135, 94%, 65%)',
    successForeground: 'hsl(231, 15%, 18%)',
    warning: 'hsl(65, 92%, 76%)',
    warningForeground: 'hsl(231, 15%, 18%)',
    info: 'hsl(191, 97%, 77%)',
    infoForeground: 'hsl(231, 15%, 18%)',
    
    border: 'hsl(232, 14%, 31%)',
    borderFocus: 'hsl(265, 89%, 78%)',
    input: 'hsl(232, 14%, 31%)',
    ring: 'hsl(265, 89%, 78%)',
    
    card: 'hsl(231, 15%, 18%)',
    cardForeground: 'hsl(60, 30%, 96%)',
    popover: 'hsl(231, 15%, 18%)',
    popoverForeground: 'hsl(60, 30%, 96%)',
    
    muted: 'hsl(232, 14%, 31%)',
    mutedForeground: 'hsl(231, 15%, 72%)',
  },
  
  metadata: {
    isBuiltIn: true,
    createdAt: Date.now(),
  },
};