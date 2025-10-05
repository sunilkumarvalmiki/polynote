import type { ThemeConfig } from '../types.js';

export const defaultLightTheme: ThemeConfig = {
  id: 'default-light',
  name: 'default-light',
  displayName: 'Default Light',
  type: 'light',
  author: 'PolyNote',
  version: '1.0.0',
  description: 'Clean and modern light theme',
  
  colors: {
    background: 'hsl(0, 0%, 100%)',
    backgroundSecondary: 'hsl(210, 40%, 98%)',
    backgroundTertiary: 'hsl(210, 40%, 96%)',
    
    foreground: 'hsl(222.2, 84%, 4.9%)',
    foregroundSecondary: 'hsl(215.4, 16.3%, 46.9%)',
    foregroundMuted: 'hsl(215.4, 16.3%, 65%)',
    
    primary: 'hsl(221.2, 83.2%, 53.3%)',
    primaryForeground: 'hsl(210, 40%, 98%)',
    secondary: 'hsl(210, 40%, 96.1%)',
    secondaryForeground: 'hsl(222.2, 47.4%, 11.2%)',
    accent: 'hsl(210, 40%, 96.1%)',
    accentForeground: 'hsl(222.2, 47.4%, 11.2%)',
    
    destructive: 'hsl(0, 84.2%, 60.2%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
    success: 'hsl(142, 76%, 36%)',
    successForeground: 'hsl(0, 0%, 100%)',
    warning: 'hsl(38, 92%, 50%)',
    warningForeground: 'hsl(0, 0%, 100%)',
    info: 'hsl(199, 89%, 48%)',
    infoForeground: 'hsl(0, 0%, 100%)',
    
    border: 'hsl(214.3, 31.8%, 91.4%)',
    borderFocus: 'hsl(221.2, 83.2%, 53.3%)',
    input: 'hsl(214.3, 31.8%, 91.4%)',
    ring: 'hsl(221.2, 83.2%, 53.3%)',
    
    card: 'hsl(0, 0%, 100%)',
    cardForeground: 'hsl(222.2, 84%, 4.9%)',
    popover: 'hsl(0, 0%, 100%)',
    popoverForeground: 'hsl(222.2, 84%, 4.9%)',
    
    muted: 'hsl(210, 40%, 96.1%)',
    mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
  },
  
  metadata: {
    isBuiltIn: true,
    createdAt: Date.now(),
  },
};