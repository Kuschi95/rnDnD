import { DefaultTheme, type Theme } from 'expo-router';
import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

/**
 * One light theme. React Native Paper is the UI kit because the Kotlin app is
 * Material, and Paper is the maintained Material 3 library that already has
 * the text fields, buttons, and snackbars the session screens will need.
 * A second design system (Material 2 next to Material 3, or Paper next to
 * another component kit) is what the old client did. This app keeps one.
 *
 * The palette is parchment and ink rather than Paper's default purple, so the
 * shell is readable at a table without pretending to be a finished game UI.
 * Navigation colors follow the same tokens. Paper's navigation adapter targets
 * `@react-navigation/native`, which Expo Router 58 no longer exposes, so the
 * navigation theme is built from Expo Router's `DefaultTheme` directly.
 */
export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6B4F2A',
    onPrimary: '#FFFCF7',
    primaryContainer: '#E7D3B0',
    onPrimaryContainer: '#2B210F',
    secondary: '#3E5C4A',
    onSecondary: '#F4F7F4',
    secondaryContainer: '#D5E6DA',
    onSecondaryContainer: '#163024',
    background: '#F4EFE4',
    surface: '#FFFCF7',
    surfaceVariant: '#E7E0D4',
    onSurface: '#1F1A14',
    onSurfaceVariant: '#5C5348',
    outline: '#C9BBA6',
    error: '#8C2F2F',
    onError: '#FFF8F6',
  },
};

export const navigationTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: appTheme.colors.primary,
    background: appTheme.colors.background,
    card: appTheme.colors.surface,
    text: appTheme.colors.onSurface,
    border: appTheme.colors.outline,
    notification: appTheme.colors.error,
  },
};
