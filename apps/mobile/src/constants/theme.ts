/**
 * Theme constants & color palette.
 * Matching DESIGN.md tokens & semantically mapped colors.
 */

import { Platform } from 'react-native';

export const COLORS = {
  primary: '#FFC81E',
  onPrimary: '#1E1B16',
  background: '#FAFAF8',
  surface: '#FFFFFF',
  foreground: '#1E1B16',
  muted: '#64748B',
  border: '#E4E4DF',
  success: '#16A34A',
  successBg: '#DCFCE7',
  successText: '#166534',
  warning: '#EA580C',
  warningBg: '#FFEDD5',
  warningText: '#9A3412',
  info: '#2563EB',
  infoBg: '#DBEAFE',
  infoText: '#1E40AF',
  destructive: '#DC2626',
  destructiveBg: '#FEE2E2',
  destructiveText: '#991B1B',
  amber: '#D97706',
  slate50: '#F8FAFC',
  slate400: '#94A3B8',
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
