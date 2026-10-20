import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

type DrizzleStudioGateProps = {
  database: SQLiteDatabase;
};

/**
 * Dev-only Drizzle Studio. Open the Expo dev tools menu (shift+m in the
 * terminal running `expo start`) and pick `expo-drizzle-studio-plugin`.
 * Web is not supported by the plugin.
 */
export function DrizzleStudioGate({ database }: DrizzleStudioGateProps) {
  if (!__DEV__ || Platform.OS === 'web') {
    return null;
  }
  return <DrizzleStudio database={database} />;
}

function DrizzleStudio({ database }: { database: SQLiteDatabase }) {
  useDrizzleStudio(database);
  return null;
}
