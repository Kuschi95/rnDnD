import type { ExpoConfig } from 'expo/config';

/**
 * Bundle id and Android package are easy to change here.
 * Do not add @react-native-firebase or expo-dev-client until the app leaves
 * Expo Go. Those plugins belong in an EAS development build, and that binary
 * must not also keep the JS Firestore client. See AGENTS.md.
 */
const config: ExpoConfig = {
  name: 'rnDnD',
  slug: 'rndnd',
  scheme: 'rndnd',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.kuschi95.rndnd',
    supportsTablet: true,
    icon: './assets/expo.icon',
  },
  android: {
    package: 'com.kuschi95.rndnd',
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#F4EFE4',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
    ],
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F4EFE4',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
