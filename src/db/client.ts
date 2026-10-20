import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from '@/db/schema';

export const DATABASE_NAME = 'rndnd.db';

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

let sqlite: SQLiteDatabase | null = null;
let database: AppDatabase | null = null;
let opening: Promise<SQLiteDatabase> | null = null;

/**
 * Open `rndnd.db` without `openDatabaseSync`. The web worker's synchronous
 * bridge gives up while wa-sqlite is still compiling, which surfaces as
 * "Sync operation timeout" on the first call. Async open waits for that.
 */
export function openAppDatabase(): Promise<SQLiteDatabase> {
  if (sqlite) {
    return Promise.resolve(sqlite);
  }
  if (!opening) {
    opening = openDatabaseAsync(DATABASE_NAME, { enableChangeListener: true }).then((db) => {
      sqlite = db;
      return db;
    });
  }
  return opening;
}

export function getSqlite(): SQLiteDatabase {
  if (!sqlite) {
    throw new Error('Local database is not open yet.');
  }
  return sqlite;
}

export function getDatabase(): AppDatabase {
  if (!database) {
    database = drizzle(getSqlite(), { schema });
  }
  return database;
}
