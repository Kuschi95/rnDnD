import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/auth/auth-context';

export function LoginScreen() {
  const { signIn, resetPassword, configError } = useAuth();
  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      alternateHref="/register"
      alternateLabel="Create an account"
      configError={configError}
      onSubmit={signIn}
      onResetPassword={resetPassword}
    />
  );
}
