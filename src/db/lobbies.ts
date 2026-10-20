import { eq } from 'drizzle-orm';

import { getDatabase, type AppDatabase } from '@/db/client';
import { lobbyCollectionPath, toFirestoreLobby } from '@/db/firestore-shape';
import { enqueueOutbox } from '@/db/outbox';
import { lobbies, type LobbyRecord } from '@/db/schema';

async function upsertLocal(database: AppDatabase, row: LobbyRecord): Promise<void> {
  await database
    .insert(lobbies)
    .values(row)
    .onConflictDoUpdate({
      target: lobbies.code,
      set: {
        host: row.host,
        members: row.members,
        countdown: row.countdown,
      },
    });
}

export async function getLobby(code: string): Promise<LobbyRecord | null> {
  const rows = await getDatabase().select().from(lobbies).where(eq(lobbies.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function saveLobby(row: LobbyRecord): Promise<void> {
  const database = getDatabase();
  await database.transaction(async (tx) => {
    await upsertLocal(tx as unknown as AppDatabase, row);
    await enqueueOutbox(tx as unknown as AppDatabase, {
      op: 'upsert',
      collectionPath: lobbyCollectionPath(),
      docId: row.code,
      payload: toFirestoreLobby(row),
    });
  });
}

export async function replaceLobbyFromRemote(row: LobbyRecord): Promise<void> {
  await upsertLocal(getDatabase(), row);
}
