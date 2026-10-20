import 'react-native-gesture-handler';

import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { AuthProvider, useAuth } from '@/auth/auth-context';
import { BootMessage } from '@/components/boot-message';
import { getSqlite } from '@/db/client';
import { DrizzleStudioGate } from '@/db/drizzle-studio';
import { useLocalMigrations } from '@/db/use-local-migrations';
import { appTheme, navigationTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  if (Platform.OS === 'web' && typeof document === 'undefined') {
    return null;
  }

  return (
    <PaperProvider theme={appTheme}>
      <ClientRoot />
    </PaperProvider>
  );
}

function ClientRoot() {
  const migration = useLocalMigrations();

  useEffect(() => {
    if (migration.status !== 'pending') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [migration.status]);

  if (migration.status === 'error') {
    return <BootMessage title="Could not open the local database" body={migration.error.message} />;
  }
  if (migration.status === 'pending') {
    return <BootMessage title="Preparing the local database" busy />;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <DrizzleStudioGate database={getSqlite()} />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return <BootMessage title="Checking session" busy />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(user)} redirectTo="/login">
        <Stack.Screen name="(home)" />
        <Stack.Screen name="lobby/[code]" options={{ headerShown: true, title: 'Lobby' }} />
        <Stack.Screen name="dm/[code]" />
        <Stack.Screen name="player/[code]" />
      </Stack.Protected>
    </Stack>
  );
}
