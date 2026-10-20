import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { FirebaseConfigError, isFirebaseConfigured } from '@/firebase/config';
import {
  createAccount,
  sendPasswordReset,
  signInWithEmail,
  signOutCurrent,
  subscribeToAuth,
  type AuthUser,
} from '@/firebase/client';

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(!configured);
  const [configError] = useState<string | null>(
    configured ? null : new FirebaseConfigError().message,
  );

  useEffect(() => {
    if (!configured) {
      return;
    }

    return subscribeToAuth((next) => {
      setUser(next);
      setIsReady(true);
    });
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await createAccount(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await signOutCurrent();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordReset(email);
  }, []);

  const value = useMemo(
    () => ({ user, isReady, configError, signIn, register, signOut, resetPassword }),
    [user, isReady, configError, signIn, register, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return value;
}
