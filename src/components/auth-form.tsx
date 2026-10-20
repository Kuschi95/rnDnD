import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';

type AuthFormProps = {
  title: string;
  submitLabel: string;
  alternateHref: '/login' | '/register';
  alternateLabel: string;
  configError: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
};

export function AuthForm({
  title,
  submitLabel,
  alternateHref,
  alternateLabel,
  configError,
  onSubmit,
  onResetPassword,
}: AuthFormProps) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter your email, then ask for a reset link.');
      return;
    }
    if (!onResetPassword) {
      return;
    }
    setBusy(true);
    try {
      await onResetPassword(email);
      setNotice('If that account exists, a reset email is on its way.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.form}>
        <Text variant="headlineMedium">{title}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Email and password for the existing Firebase project.
        </Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          mode="outlined"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          mode="outlined"
        />
        {configError ? <HelperText type="error">{configError}</HelperText> : null}
        {error ? <HelperText type="error">{error}</HelperText> : null}
        {notice ? <HelperText type="info">{notice}</HelperText> : null}
        <Button mode="contained" onPress={() => void handleSubmit()} loading={busy} disabled={busy}>
          {submitLabel}
        </Button>
        {onResetPassword ? (
          <Button mode="text" onPress={() => void handleReset()} disabled={busy}>
            Forgot password
          </Button>
        ) : null}
        <Link href={alternateHref} style={{ color: theme.colors.primary }}>
          {alternateLabel}
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
});
