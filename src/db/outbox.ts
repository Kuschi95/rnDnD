import { and, asc, eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { syncOutbox, type SyncOutboxRecord } from '@/db/schema';

export type OutboxOp = 'upsert' | 'delete';

export async function enqueueOutbox(
  database: AppDatabase,
  entry: {
    op: OutboxOp;
    collectionPath: string;
    docId: string;
    payload: Record<string, unknown> | null;
  },
): Promise<void> {
  await database.insert(syncOutbox).values({
    op: entry.op,
    collectionPath: entry.collectionPath,
    docId: entry.docId,
    payload: entry.payload,
    enqueuedAt: Date.now(),
    attempts: 0,
    lastError: null,
  });
}

export async function hasPendingOutbox(
  database: AppDatabase,
  collectionPath: string,
  docId: string,
): Promise<boolean> {
  const rows = await database
    .select({ id: syncOutbox.id })
    .from(syncOutbox)
    .where(and(eq(syncOutbox.collectionPath, collectionPath), eq(syncOutbox.docId, docId)))
    .limit(1);
  return rows.length > 0;
}

export async function listOutbox(database: AppDatabase): Promise<SyncOutboxRecord[]> {
  return database.select().from(syncOutbox).orderBy(asc(syncOutbox.id));
}

export async function removeOutbox(database: AppDatabase, id: number): Promise<void> {
  await database.delete(syncOutbox).where(eq(syncOutbox.id, id));
}

export async function markOutboxFailed(
  database: AppDatabase,
  id: number,
  attempts: number,
  lastError: string,
): Promise<void> {
  await database.update(syncOutbox).set({ attempts, lastError }).where(eq(syncOutbox.id, id));
}
