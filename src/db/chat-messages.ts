import { and, asc, eq, or } from 'drizzle-orm';

import { getDatabase, type AppDatabase } from '@/db/client';
import { lobbyChatCollectionPath, toFirestoreChatMessage } from '@/db/firestore-shape';
import { enqueueOutbox } from '@/db/outbox';
import { chatMessages, type ChatMessageRecord } from '@/db/schema';

export async function listChatThread(
  lobbyCode: string,
  participantA: string,
  participantB: string,
): Promise<ChatMessageRecord[]> {
  return getDatabase()
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.lobbyCode, lobbyCode),
        or(
          and(eq(chatMessages.senderId, participantA), eq(chatMessages.receiverId, participantB)),
          and(eq(chatMessages.senderId, participantB), eq(chatMessages.receiverId, participantA)),
        ),
      ),
    )
    .orderBy(asc(chatMessages.timestamp));
}

export async function saveChatMessage(row: ChatMessageRecord): Promise<void> {
  const payload = toFirestoreChatMessage(row);
  const database = getDatabase();
  await database.transaction(async (tx) => {
    await tx
      .insert(chatMessages)
      .values(row)
      .onConflictDoUpdate({
        target: [chatMessages.lobbyCode, chatMessages.id],
        set: {
          senderId: row.senderId,
          receiverId: row.receiverId,
          message: row.message,
          timestamp: row.timestamp,
          read: row.read,
        },
      });
    await enqueueOutbox(tx as unknown as AppDatabase, {
      op: 'upsert',
      collectionPath: lobbyChatCollectionPath(row.lobbyCode),
      docId: row.id,
      payload,
    });
  });
}

export async function replaceChatMessageFromRemote(row: ChatMessageRecord): Promise<void> {
  await getDatabase()
    .insert(chatMessages)
    .values(row)
    .onConflictDoUpdate({
      target: [chatMessages.lobbyCode, chatMessages.id],
      set: {
        senderId: row.senderId,
        receiverId: row.receiverId,
        message: row.message,
        timestamp: row.timestamp,
        read: row.read,
      },
    });
}
