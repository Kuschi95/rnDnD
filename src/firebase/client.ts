import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';

import { FirebaseConfigError, isFirebaseConfigured, readFirebaseConfig } from '@/firebase/config';
import { createAuthPersistence } from '@/firebase/persistence';

export type AuthUser = {
  uid: string;
  email: string | null;
};

/**
 * Only Firebase entry point.
 *
 * This module uses the modular JS SDK so the app can run in Expo Go.
 * Do not import `firebase/auth` or `firebase/firestore` anywhere else.
 * Do not import `firebase/compat` or `expo-firebase-analytics`.
 *
 * Later switch, in an EAS development build, not in this Expo Go setup:
 * 1. Add `expo-dev-client`.
 * 2. Add `@react-native-firebase/app`, `auth`, and `firestore` (one Firestore
 *    implementation per binary — remove this JS Firestore client in the same change).
 * 3. Register those config plugins in `app.config.ts`.
 * 4. Add the iOS app in Firebase and let the config plugin apply
 *    `GoogleService-Info.plist`. Android can keep package `com.kuschi95.rndnd`.
 * 5. Replace the functions in this file. Keep the `AuthUser` shape and the
 *    Firestore document field names.
 *
 * Metro already aliases `firebase/auth` and `firebase/firestore` to the
 * React Native builds on Android and iOS. See `metro.config.js`.
 */

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }
  if (!isFirebaseConfigured()) {
    throw new FirebaseConfigError();
  }
  app = getApps().length > 0 ? getApp() : initializeApp(readFirebaseConfig());
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) {
    return auth;
  }
  const firebaseApp = getFirebaseApp();
  try {
    auth = initializeAuth(firebaseApp, { persistence: createAuthPersistence() });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code !== 'auth/already-initialized') {
      throw error;
    }
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function subscribeToAuth(listener: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    listener(user ? { uid: user.uid, email: user.email } : null);
  });
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function createAccount(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function signOutCurrent(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}
