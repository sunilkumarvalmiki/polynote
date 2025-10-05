import type { ThemeConfig } from '../types.js';

export const defaultDarkTheme: ThemeConfig = {
  id: 'default-dark',
  name: 'default-dark',
  displayName: 'Default Dark',
  type: 'dark',
  author: 'PolyNote',
  version: '1.0.0',
  description: 'Clean and modern dark theme',
  
  colors: {
    background: 'hsl(222.2, 84%, 4.9%)',
    backgroundSecondary: 'hsl(217.2, 32.6%, 17.5%)',
    backgroundTertiary: 'hsl(217.2, 32.6%, 20%)',
    
    foreground: 'hsl(210, 40%, 98%)',
    foregroundSecondary: 'hsl(215, 20.2%, 65.1%)',
    foregroundMuted: 'hsl(215, 20.2%, 55%)',
    
    primary: 'hsl(217.2, 91.2%, 59.8%)',
    primaryForeground: 'hsl(222.2, 47.4%, 11.2%)',
    secondary: 'hsl(217.2, 32.6%, 17.5%)',
    secondaryForeground: 'hsl(210, 40%, 98%)',
    accent: 'hsl(217.2, 32.6%, 17.5%)',
    accentForeground: 'hsl(210, 40%, 98%)',
    
    destructive: 'hsl(0, 62.8%, 30.6%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
    success: 'hsl(142, 70%, 45%)',
    successForeground: 'hsl(0, 0%, 100%)',
    warning: 'hsl(38, 92%, 50%)',
    warningForeground: 'hsl(0, 0%, 100%)',
    info: 'hsl(199, 89%, 48%)',
    infoForeground: 'hsl(0, 0%, 100%)',
    
    border: 'hsl(217.2, 32.6%, 17.5%)',
    borderFocus: 'hsl(224.3, 76.3%, 48%)',
    input: 'hsl(217.2, 32.6%, 17.5%)',
    ring: 'hsl(224.3, 76.3%, 48%)',
    
    card: 'hsl(222.2, 84%, 4.9%)',
    cardForeground: 'hsl(210, 40%, 98%)',
    popover: 'hsl(222.2, 84%, 4.9%)',
    popoverForeground: 'hsl(210, 40%, 98%)',
    
    muted: 'hsl(217.2, 32.6%, 17.5%)',
    mutedForeground: 'hsl(215, 20.2%, 65.1%)',
  },
  
  metadata: {
    isBuiltIn: true,
    createdAt: Date.now(),
  },
};