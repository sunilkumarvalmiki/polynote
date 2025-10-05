import type { ThemeConfig } from '../types.js';

export const solarizedDarkTheme: ThemeConfig = {
  id: 'solarized-dark',
  name: 'solarized-dark',
  displayName: 'Solarized Dark',
  type: 'dark',
  author: 'Ethan Schoonover',
  version: '1.0.0',
  description: 'Precision colors for machines and people',
  
  colors: {
    background: 'hsl(192, 100%, 11%)',
    backgroundSecondary: 'hsl(193, 100%, 13%)',
    backgroundTertiary: 'hsl(194, 25%, 20%)',
    
    foreground: 'hsl(186, 8%, 55%)',
    foregroundSecondary: 'hsl(192, 13%, 46%)',
    foregroundMuted: 'hsl(194, 14%, 40%)',
    
    primary: 'hsl(205, 69%, 49%)',
    primaryForeground: 'hsl(192, 100%, 11%)',
    secondary: 'hsl(194, 25%, 20%)',
    secondaryForeground: 'hsl(186, 8%, 55%)',
    accent: 'hsl(68, 100%, 30%)',
    accentForeground: 'hsl(192, 100%, 11%)',
    
    destructive: 'hsl(1, 79%, 55%)',
    destructiveForeground: 'hsl(44, 87%, 94%)',
    success: 'hsl(68, 100%, 30%)',
    successForeground: 'hsl(44, 87%, 94%)',
    warning: 'hsl(45, 100%, 51%)',
    warningForeground: 'hsl(192, 100%, 11%)',
    info: 'hsl(205, 69%, 49%)',
    infoForeground: 'hsl(44, 87%, 94%)',
    
    border: 'hsl(194, 25%, 20%)',
    borderFocus: 'hsl(205, 69%, 49%)',
    input: 'hsl(194, 25%, 20%)',
    ring: 'hsl(205, 69%, 49%)',
    
    card: 'hsl(192, 100%, 11%)',
    cardForeground: 'hsl(186, 8%, 55%)',
    popover: 'hsl(192, 100%, 11%)',
    popoverForeground: 'hsl(186, 8%, 55%)',
    
    muted: 'hsl(194, 25%, 20%)',
    mutedForeground: 'hsl(192, 13%, 46%)',
  },
  
  metadata: {
    isBuiltIn: true,
    createdAt: Date.now(),
  },
};