/**
 * Theme System Type Definitions
 * Based on VALIDATION_REPORT.md Section 4.15
 */

export interface ColorScheme {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Foreground/text colors
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  
  // UI element colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  
  // Semantic colors
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  
  // Border and input colors
  border: string;
  borderFocus: string;
  input: string;
  ring: string;
  
  // Card and popover colors
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  
  // Muted colors
  muted: string;
  mutedForeground: string;
}

export interface Typography {
  fontFamily: string;
  fontFamilyMono: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface Spacing {
  unit: number;
  scale: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

export interface BorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  displayName: string;
  type: 'light' | 'dark';
  author?: string;
  version?: string;
  description?: string;
  
  colors: ColorScheme;
  typography?: Typography;
  spacing?: Spacing;
  borderRadius?: BorderRadius;
  
  customCSS?: string;
  
  metadata?: {
    createdAt?: number;
    updatedAt?: number;
    tags?: string[];
    isBuiltIn?: boolean;
  };
}

export interface ThemePreset {
  id: string;
  name: string;
  themes: {
    light?: ThemeConfig;
    dark?: ThemeConfig;
  };
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSettings {
  mode: ThemeMode;
  activeThemeId: string;
  customThemes?: ThemeConfig[];
  followSystemTheme: boolean;
}

export interface ThemeExport {
  version: string;
  theme: ThemeConfig;
  exportedAt: number;
}

export interface ThemeValidationError {
  field: string;
  message: string;
}

export interface ThemeValidationResult {
  valid: boolean;
  errors: ThemeValidationError[];
}