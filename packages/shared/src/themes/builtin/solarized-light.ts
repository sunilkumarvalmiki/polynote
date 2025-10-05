import type { ThemeConfig } from '../types.js';

export const solarizedLightTheme: ThemeConfig = {
  id: 'solarized-light',
  name: 'solarized-light',
  displayName: 'Solarized Light',
  type: 'light',
  author: 'Ethan Schoonover',
  version: '1.0.0',
  description: 'Precision colors for machines and people',
  
  colors: {
    background: 'hsl(44, 87%, 94%)',
    backgroundSecondary: 'hsl(44, 87%, 90%)',
    backgroundTertiary: 'hsl(45, 85%, 88%)',
    
    foreground: 'hsl(194, 14%, 40%)',
    foregroundSecondary: 'hsl(192, 13%, 46%)',
    foregroundMuted: 'hsl(186, 8%, 55%)',
    
    primary: 'hsl(205, 69%, 49%)',
    primaryForeground: 'hsl(44, 87%, 94%)',
    secondary: 'hsl(45, 85%, 88%)',
    secondaryForeground: 'hsl(194, 14%, 40%)',
    accent: 'hsl(68, 100%, 30%)',
    accentForeground: 'hsl(44, 87%, 94%)',
    
    destructive: 'hsl(1, 79%, 55%)',
    destructiveForeground: 'hsl(44, 87%, 94%)',
    success: 'hsl(68, 100%, 30%)',
    successForeground: 'hsl(44, 87%, 94%)',
    warning: 'hsl(45, 100%, 51%)',
    warningForeground: 'hsl(194, 14%, 40%)',
    info: 'hsl(205, 69%, 49%)',
    infoForeground: 'hsl(44, 87%, 94%)',
    
    border: 'hsl(45, 85%, 88%)',
    borderFocus: 'hsl(205, 69%, 49%)',
    input: 'hsl(45, 85%, 88%)',
    ring: 'hsl(205, 69%, 49%)',
    
    card: 'hsl(44, 87%, 94%)',
    cardForeground: 'hsl(194, 14%, 40%)',
    popover: 'hsl(44, 87%, 94%)',
    popoverForeground: 'hsl(194, 14%, 40%)',
    
    muted: 'hsl(45, 85%, 88%)',
    mutedForeground: 'hsl(192, 13%, 46%)',
  },
  
  metadata: {
    isBuiltIn: true,
    createdAt: Date.now(),
  },
};