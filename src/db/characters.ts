import { eq, inArray } from 'drizzle-orm';

import { getDatabase, type AppDatabase } from '@/db/client';
import { enqueueOutbox } from '@/db/outbox';
import { characters, type CharacterRecord } from '@/db/schema';
import { characterCollectionPath, toFirestoreCharacter } from '@/db/firestore-shape';

async function upsertLocal(database: AppDatabase, row: CharacterRecord): Promise<void> {
  await database.insert(characters).values(row).onConflictDoUpdate({
    target: characters.id,
    set: row,
  });
}

export async function getCharacterById(id: string): Promise<CharacterRecord | null> {
  const rows = await getDatabase().select().from(characters).where(eq(characters.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listCharactersByUserId(userId: string): Promise<CharacterRecord[]> {
  return getDatabase().select().from(characters).where(eq(characters.userId, userId));
}

export async function listCharactersByIds(ids: string[]): Promise<CharacterRecord[]> {
  if (ids.length === 0) {
    return [];
  }
  return getDatabase().select().from(characters).where(inArray(characters.id, ids));
}

/**
 * Local write plus an outbox row. Screens should call this, not Firestore.
 * `lastUpdatedBy` is whatever the caller passes (usually the signed-in uid).
 */
export async function saveCharacter(row: CharacterRecord): Promise<void> {
  const database = getDatabase();
  const payload = toFirestoreCharacter(row);
  await database.transaction(async (tx) => {
    await upsertLocal(tx as unknown as AppDatabase, row);
    await enqueueOutbox(tx as unknown as AppDatabase, {
      op: 'upsert',
      collectionPath: characterCollectionPath(),
      docId: row.id,
      payload,
    });
  });
}

export async function deleteCharacter(id: string): Promise<void> {
  const database = getDatabase();
  await database.transaction(async (tx) => {
    await tx.delete(characters).where(eq(characters.id, id));
    await enqueueOutbox(tx as unknown as AppDatabase, {
      op: 'delete',
      collectionPath: characterCollectionPath(),
      docId: id,
      payload: null,
    });
  });
}

/** Used by the sync engine when a remote snapshot wins. Does not enqueue. */
export async function replaceCharacterFromRemote(row: CharacterRecord): Promise<void> {
  await upsertLocal(getDatabase(), row);
}

export async function deleteCharacterFromRemote(id: string): Promise<void> {
  await getDatabase().delete(characters).where(eq(characters.id, id));
}
