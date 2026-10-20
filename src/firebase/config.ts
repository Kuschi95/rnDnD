import type { FirebaseOptions } from 'firebase/app';

/**
 * Web app config for the existing project `dndniko-4de7a`.
 * Values come from the Firebase console (Project settings → Your apps → Web),
 * not from the Android `google-services.json`.
 */
const fields = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
} as const;

export const FIREBASE_PROJECT_ID = 'dndniko-4de7a';

export class FirebaseConfigError extends Error {
  constructor() {
    super(
      'Firebase is not configured. Copy .env.example to .env and fill the EXPO_PUBLIC_FIREBASE_* values from the Web app in project dndniko-4de7a.',
    );
    this.name = 'FirebaseConfigError';
  }
}

export function readFirebaseConfig(): FirebaseOptions {
  const missing = Object.entries(fields)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new FirebaseConfigError();
  }

  return {
    apiKey: fields.apiKey,
    authDomain: fields.authDomain,
    projectId: fields.projectId,
    storageBucket: fields.storageBucket,
    messagingSenderId: fields.messagingSenderId,
    appId: fields.appId,
  };
}

export function isFirebaseConfigured(): boolean {
  return Object.values(fields).every((value) => Boolean(value));
}
