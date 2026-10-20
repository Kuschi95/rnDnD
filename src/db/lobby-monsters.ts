import { and, eq } from 'drizzle-orm';

import { getDatabase, type AppDatabase } from '@/db/client';
import { lobbyMonsterCollectionPath, toFirestoreMonster } from '@/db/firestore-shape';
import { enqueueOutbox } from '@/db/outbox';
import { lobbyMonsters, type LobbyMonsterRecord } from '@/db/schema';

function withDocumentId(row: LobbyMonsterRecord): LobbyMonsterRecord {
  return {
    ...row,
    body: {
      ...row.body,
      id: row.id,
    },
  };
}

export async function listLobbyMonsters(lobbyCode: string): Promise<LobbyMonsterRecord[]> {
  return getDatabase().select().from(lobbyMonsters).where(eq(lobbyMonsters.lobbyCode, lobbyCode));
}

export async function saveLobbyMonster(row: LobbyMonsterRecord): Promise<void> {
  const stored = withDocumentId(row);
  const database = getDatabase();
  await database.transaction(async (tx) => {
    await tx
      .insert(lobbyMonsters)
      .values(stored)
      .onConflictDoUpdate({
        target: [lobbyMonsters.lobbyCode, lobbyMonsters.id],
        set: { body: stored.body },
      });
    await enqueueOutbox(tx as unknown as AppDatabase, {
      op: 'upsert',
      collectionPath: lobbyMonsterCollectionPath(stored.lobbyCode),
      docId: stored.id,
      payload: toFirestoreMonster(stored),
    });
  });
}

export async function deleteLobbyMonster(lobbyCode: string, id: string): Promise<void> {
  const database = getDatabase();
  await database.transaction(async (tx) => {
    await tx
      .delete(lobbyMonsters)
      .where(and(eq(lobbyMonsters.lobbyCode, lobbyCode), eq(lobbyMonsters.id, id)));
    await enqueueOutbox(tx as unknown as AppDatabase, {
      op: 'delete',
      collectionPath: lobbyMonsterCollectionPath(lobbyCode),
      docId: id,
      payload: null,
    });
  });
}

export async function replaceLobbyMonsterFromRemote(row: LobbyMonsterRecord): Promise<void> {
  const stored = withDocumentId(row);
  await getDatabase()
    .insert(lobbyMonsters)
    .values(stored)
    .onConflictDoUpdate({
      target: [lobbyMonsters.lobbyCode, lobbyMonsters.id],
      set: { body: stored.body },
    });
}

export async function deleteLobbyMonsterFromRemote(lobbyCode: string, id: string): Promise<void> {
  await getDatabase()
    .delete(lobbyMonsters)
    .where(and(eq(lobbyMonsters.lobbyCode, lobbyCode), eq(lobbyMonsters.id, id)));
}
