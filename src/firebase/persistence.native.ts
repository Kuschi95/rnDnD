import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';

type ReactNativeStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/**
 * Native bundles resolve `firebase/auth` to the React Native build
 * (`metro.config.js`). That build exports `getReactNativePersistence`, which
 * is not on the browser type declarations.
 */
export function createAuthPersistence(): Persistence {
  const getReactNativePersistence = (
    FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence?: (storage: ReactNativeStorage) => Persistence;
    }
  ).getReactNativePersistence;

  if (!getReactNativePersistence) {
    throw new Error(
      'firebase/auth is missing getReactNativePersistence. Native bundles must resolve the React Native auth build (see metro.config.js).',
    );
  }

  return getReactNativePersistence(AsyncStorage);
}
