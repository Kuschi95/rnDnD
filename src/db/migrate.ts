import type { SQLiteDatabase } from 'expo-sqlite';

import { openAppDatabase } from '@/db/client';
import { splitMigrationSql } from '@/db/migration-sql';
import migrations from '../../drizzle/migrations';

const MIGRATIONS_TABLE = '__drizzle_migrations';

type MigrationJournalEntry = {
  idx: number;
  when: number;
  tag: string;
};

type MigrationBundle = {
  journal: { entries: MigrationJournalEntry[] };
  migrations: Record<string, string>;
};

const bundle = migrations as MigrationBundle;

/**
 * Apply bundled Drizzle SQL at startup.
 *
 * `useMigrations` from drizzle-orm prepares each statement and does not finalize
 * it. On the web worker that leaves the CREATE of `__drizzle_migrations`
 * unfinished, so the following SELECT fails with "no such table". `execAsync`
 * steps and finalizes, which is the path expo-sqlite's wa-sqlite expects.
 * The tracking table still uses Drizzle's name and `created_at` column so a
 * later switch back to the Drizzle migrator sees the same history.
 */
export async function applyMigrations(sqlite?: SQLiteDatabase): Promise<void> {
  const database = sqlite ?? (await openAppDatabase());
  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      hash text NOT NULL,
      created_at numeric
    )`,
  );

  const applied = await database.getAllAsync<{ created_at: number | null }>(
    `SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`,
  );
  const lastCreatedAt = Number(applied[0]?.created_at ?? 0);

  for (const entry of bundle.journal.entries) {
    if (lastCreatedAt >= entry.when) {
      continue;
    }

    const key = `m${entry.idx.toString().padStart(4, '0')}`;
    const sql = bundle.migrations[key];
    if (!sql) {
      throw new Error(`Missing migration: ${entry.tag}`);
    }

    const statements = splitMigrationSql(sql);
    await database.withTransactionAsync(async () => {
      for (const statement of statements) {
        await database.execAsync(statement);
      }
      await database.runAsync(
        `INSERT INTO ${MIGRATIONS_TABLE} ("hash", "created_at") VALUES (?, ?)`,
        entry.tag,
        entry.when,
      );
    });
  }
}
