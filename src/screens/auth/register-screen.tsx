import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/auth/auth-context';

export function RegisterScreen() {
  const { register, configError } = useAuth();
  return (
    <AuthForm
      title="Create account"
      submitLabel="Register"
      alternateHref="/login"
      alternateLabel="Already have an account? Sign in"
      configError={configError}
      onSubmit={register}
    />
  );
}
