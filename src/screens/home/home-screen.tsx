import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, useTheme } from 'react-native-paper';

import { useAuth } from '@/auth/auth-context';

export function HomeScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
        Placeholder
      </Text>
      <Text variant="headlineMedium">Host or join</Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        Signed in as {user?.email ?? user?.uid}. Hosting a lobby and joining with a six-character
        code will land here. Neither flow is built yet.
      </Text>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button mode="contained" onPress={() => void handleSignOut()} loading={busy} disabled={busy}>
        Sign out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
});
