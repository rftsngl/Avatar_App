/**
 * colors.ts
 * 
 * Modern color palette for Avatar Learning App.
 * Platform-adaptive colors with iOS/Android design guidelines.
 * 
 * @author Avatar Learning App
 * @date 2025-11-02
 */

import { Platform } from 'react-native';

/**
 * Primary brand colors
 */
export const Colors = {
  // Primary palette
  primary: '#4A90E2', // Calm blue (trust, learning)
  primaryLight: '#7AABEB',
  primaryDark: '#2E6BAE',
  
  // Secondary palette
  secondary: '#6C63FF', // Modern purple (creativity, tech)
  secondaryLight: '#9B95FF',
  secondaryDark: '#4B44CC',
  
  // Accent palette
  accent: '#FF6B9D', // Vibrant pink (energy, engagement)
  accentLight: '#FF8FB3',
  accentDark: '#E04A7A',
  
  // Success palette
  success: '#4CAF50', // Green
  successLight: '#81C784',
  successDark: '#388E3C',
  
  // Warning palette
  warning: '#FFC107', // Amber
  warningLight: '#FFD54F',
  warningDark: '#FFA000',
  
  // Error palette
  error: '#F44336', // Red
  errorLight: '#E57373',
  errorDark: '#D32F2F',
  
  // Info palette
  info: '#2196F3', // Blue
  infoLight: '#64B5F6',
  infoDark: '#1976D2',
  
  // Neutral/Gray scale
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F0F2F5',
  
  // Surface colors (cards, modals)
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  // Border colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderDark: '#BDBDBD',
  
  // Text colors
  text: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  textInverse: '#FFFFFF',
  textDisabled: '#BDBDBD',
  
  // Overlay colors (for modals, dialogs)
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  
  // Transparent
  transparent: 'transparent',
};

/**
 * Platform-specific colors (iOS vs Android Material Design)
 */
export const PlatformColors = Platform.select({
  ios: {
    primary: '#007AFF', // iOS blue
    success: '#34C759', // iOS green
    error: '#FF3B30', // iOS red
    warning: '#FF9500', // iOS orange
    separator: '#C6C6C8',
    background: '#F2F2F7',
    surface: '#FFFFFF',
  },
  android: {
    primary: '#6200EE', // Material purple
    success: '#4CAF50', // Material green
    error: '#B00020', // Material red
    warning: '#FF6F00', // Material amber
    separator: '#E0E0E0',
    background: '#FAFAFA',
    surface: '#FFFFFF',
  },
});

/**
 * Gradient definitions for modern cards and backgrounds
 */
export const Gradients = {
  primary: ['#4A90E2', '#357ABD'],
  secondary: ['#6C63FF', '#4B44CC'],
  accent: ['#FF6B9D', '#E04A7A'],
  success: ['#4CAF50', '#388E3C'],
  warning: ['#FFC107', '#FFA000'],
  error: ['#F44336', '#D32F2F'],
  info: ['#2196F3', '#1976D2'],
  
  // Special gradients
  sunset: ['#FF6B9D', '#FFA07A'],
  ocean: ['#4A90E2', '#2E6BAE'],
  forest: ['#4CAF50', '#2E7D32'],
  sky: ['#87CEEB', '#4A90E2'],
  purple: ['#9B59B6', '#6C63FF'],
  
  // Neutral gradients
  grayLight: ['#F5F5F5', '#E0E0E0'],
  grayDark: ['#757575', '#424242'],
  
  // Shimmer effect gradient
  shimmer: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)'],
};

/**
 * Shadow definitions (iOS-style shadows with Android elevation support)
 */
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

/**
 * Opacity levels for consistent transparency
 */
export const Opacity = {
  transparent: 0,
  disabled: 0.4,
  semiTransparent: 0.6,
  visible: 0.8,
  opaque: 1,
};

/**
 * Spacing constants for consistent layout
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

/**
 * Border radius constants for modern rounded corners
 */
export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999, // Pill-shaped
};

/**
 * Font sizes for typography scale
 */
export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 48,
};

/**
 * Font weights for text hierarchy
 */
export const FontWeight = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/**
 * Semantic colors for user feedback
 */
export const SemanticColors = {
  // Grade colors for accuracy feedback
  gradeA: '#4CAF50', // Excellent (90-100%)
  gradeB: '#FFC107', // Good (70-89%)
  gradeC: '#FF9800', // Fair (50-69%)
  gradeD: '#FF5722', // Poor (30-49%)
  gradeF: '#F44336', // Fail (<30%)
  
  // Status colors
  online: '#4CAF50',
  offline: '#757575',
  busy: '#FF9800',
  away: '#FFC107',
  
  // Learning colors
  vocabulary: '#2196F3',
  grammar: '#9C27B0',
  pronunciation: '#FF6B9D',
  listening: '#4CAF50',
  speaking: '#FF9800',
  reading: '#673AB7',
  writing: '#3F51B5',
};

/**
 * Utility function to get color with opacity
 * @param color - Hex color string
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
export const withOpacity = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Utility function to get grade color based on accuracy percentage
 * @param accuracy - Accuracy percentage (0-100)
 * @returns Grade color
 */
export const getGradeColor = (accuracy: number): string => {
  if (accuracy >= 90) return SemanticColors.gradeA;
  if (accuracy >= 70) return SemanticColors.gradeB;
  if (accuracy >= 50) return SemanticColors.gradeC;
  if (accuracy >= 30) return SemanticColors.gradeD;
  return SemanticColors.gradeF;
};

/**
 * Utility function to get grade label based on accuracy percentage
 * @param accuracy - Accuracy percentage (0-100)
 * @returns Grade label (A, B, C, D, F)
 */
export const getGradeLabel = (accuracy: number): string => {
  if (accuracy >= 90) return 'A';
  if (accuracy >= 70) return 'B';
  if (accuracy >= 50) return 'C';
  if (accuracy >= 30) return 'D';
  return 'F';
};

export default Colors;
