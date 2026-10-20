import { useLocalSearchParams } from 'expo-router';

export function useLobbyCode(): string {
  const { code } = useLocalSearchParams<{ code: string }>();
  if (Array.isArray(code)) {
    return code[0] ?? '';
  }
  return code ?? '';
}
