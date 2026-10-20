/**
 * Local-first sync between SQLite and Cloud Firestore.
 *
 * Reads: screens call the repositories in `src/db`. Those functions read SQLite
 * only. Do not bind a screen to a Firestore snapshot.
 *
 * Writes: repositories update SQLite and append `sync_outbox`. The payload is
 * the Firestore document. Local-only columns (`sync_outbox`, lobby `code` as a
 * path, monster `lobbyCode`) are not part of that payload. `pushOutbox()`
 * sends the queue with `setDoc` / `deleteDoc` and drops a row after success.
 *
 * Remote: the `subscribe*` functions below attach `onSnapshot` listeners and
 * write through the `*FromRemote` repository methods. Each returns the
 * unsubscribe function. Call it when the screen blurs. The Kotlin listeners
 * were never removed; do not copy that.
 *
 * Conflicts: last writer wins, with one guard. A remote snapshot is ignored
 * while an outbox row for that document is still pending, so an offline edit
 * is not overwritten by an older snapshot. Characters have no server clock.
 * `lastUpdatedBy` is a display hint for the "DM edited your sheet" snackbar,
 * not a version. Chat `timestamp` stays an epoch-millis string.
 *
 * Field names that must survive a round trip: `lastUpdatedBy`, `itemRes`,
 * `haltbarkeitsValue`, string `timestamp`.
 *
 * Not started from any screen yet. Call `pushOutbox()` when a session feature
 * is ready, and call `subscribeLobby` (and the others) from a focus effect.
 *
 * Still to do before two clients share production data:
 * - Repair `members` so every entry is a character id. Today the host entry is
 *   a Firebase uid. This module does not rewrite that array.
 * - Deploy `firestore.rules` and `firestore.indexes.json` by hand. This app
 *   does not deploy them.
 */

import { deleteCharacterFromRemote, replaceCharacterFromRemote } from '@/db/characters';
import { replaceChatMessageFromRemote } from '@/db/chat-messages';
import { getDatabase } from '@/db/client';
import {
  characterCollectionPath,
  lobbyChatCollectionPath,
  lobbyCollectionPath,
  lobbyMonsterCollectionPath,
  shouldApplyRemoteSnapshot,
  toFirestoreChatMessage,
} from '@/db/firestore-shape';
import { replaceLobbyFromRemote } from '@/db/lobbies';
import { replaceLobbyMonsterFromRemote } from '@/db/lobby-monsters';
import { hasPendingOutbox, listOutbox, markOutboxFailed, removeOutbox } from '@/db/outbox';
import type { CharacterRecord, ChatMessageRecord, LobbyRecord } from '@/db/schema';
import type { LobbyMonsterDocument } from '@/db/types';
import type { RemoteDoc } from '@/firebase/firestore';
import {
  deleteFirestoreDocument,
  setFirestoreDocument,
  subscribeChatThread as subscribeRemoteChatThread,
  subscribeFirestoreCollection,
  subscribeFirestoreDocument,
} from '@/firebase/firestore';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function characterFromRemote(id: string, data: Record<string, unknown>): CharacterRecord {
  return {
    id,
    userId: String(data.userId ?? ''),
    name: String(data.name ?? ''),
    age: typeof data.age === 'number' ? data.age : null,
    sex: typeof data.sex === 'string' ? data.sex : null,
    height: typeof data.height === 'number' ? data.height : null,
    weight: typeof data.weight === 'number' ? data.weight : null,
    race: typeof data.race === 'string' ? data.race : null,
    level: typeof data.level === 'number' ? data.level : 1,
    experience: typeof data.experience === 'number' ? data.experience : 0,
    strength: typeof data.strength === 'number' ? data.strength : 0,
    intelligence: typeof data.intelligence === 'number' ? data.intelligence : 0,
    dexterity: typeof data.dexterity === 'number' ? data.dexterity : 0,
    charisma: typeof data.charisma === 'number' ? data.charisma : 0,
    stamina: typeof data.stamina === 'number' ? data.stamina : 0,
    wisdom: typeof data.wisdom === 'number' ? data.wisdom : 0,
    secondaryAttributes: Array.isArray(data.secondaryAttributes) ? data.secondaryAttributes : [],
    playerClass: asRecord(data.playerClass) as CharacterRecord['playerClass'],
    abilities: Array.isArray(data.abilities) ? data.abilities : [],
    inventory: Array.isArray(data.inventory) ? data.inventory : [],
    gold: typeof data.gold === 'number' ? data.gold : 0,
    notes: Array.isArray(data.notes) ? data.notes : [],
    languages: typeof data.languages === 'string' ? data.languages : null,
    pastHistory: typeof data.pastHistory === 'string' ? data.pastHistory : null,
    additionalInfo: typeof data.additionalInfo === 'string' ? data.additionalInfo : null,
    lastUpdatedBy: typeof data.lastUpdatedBy === 'string' ? data.lastUpdatedBy : null,
  };
}

export async function pushOutbox(): Promise<number> {
  const database = getDatabase();
  const pending = await listOutbox(database);
  let pushed = 0;

  for (const row of pending) {
    try {
      if (row.op === 'delete') {
        await deleteFirestoreDocument(row.collectionPath, row.docId);
      } else {
        await setFirestoreDocument(row.collectionPath, row.docId, row.payload ?? {});
      }
      await removeOutbox(database, row.id);
      pushed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await markOutboxFailed(database, row.id, row.attempts + 1, message);
    }
  }

  return pushed;
}

async function applyIfClear(
  collectionPath: string,
  docId: string,
  apply: () => Promise<void>,
): Promise<void> {
  const pending = await hasPendingOutbox(getDatabase(), collectionPath, docId);
  if (!shouldApplyRemoteSnapshot(pending)) {
    return;
  }
  await apply();
}

export function subscribeCharacter(
  characterId: string,
  onError: (error: Error) => void = () => undefined,
): () => void {
  return subscribeFirestoreDocument(
    characterCollectionPath(),
    characterId,
    (remote) => {
      void applyIfClear(characterCollectionPath(), characterId, async () => {
        if (!remote) {
          await deleteCharacterFromRemote(characterId);
          return;
        }
        await replaceCharacterFromRemote(characterFromRemote(remote.id, remote.data));
      }).catch(onError);
    },
    onError,
  );
}

export function subscribeLobby(
  code: string,
  onError: (error: Error) => void = () => undefined,
): () => void {
  return subscribeFirestoreDocument(
    lobbyCollectionPath(),
    code,
    (remote) => {
      if (!remote) {
        return;
      }
      const members = Array.isArray(remote.data.members) ? remote.data.members.map(String) : [];
      const row: LobbyRecord = {
        code,
        host: String(remote.data.host ?? ''),
        members,
        countdown: remote.data.countdown === true,
      };
      void applyIfClear(lobbyCollectionPath(), code, () => replaceLobbyFromRemote(row)).catch(
        onError,
      );
    },
    onError,
  );
}

export function subscribeLobbyMonsters(
  lobbyCode: string,
  onError: (error: Error) => void = () => undefined,
): () => void {
  return subscribeFirestoreCollection(
    lobbyMonsterCollectionPath(lobbyCode),
    (docs) => {
      void Promise.all(docs.map((remote) => applyRemoteMonster(lobbyCode, remote))).catch(onError);
    },
    onError,
  );
}

async function applyRemoteMonster(lobbyCode: string, remote: RemoteDoc): Promise<void> {
  const body = { ...remote.data, id: remote.id } as LobbyMonsterDocument;
  await applyIfClear(lobbyMonsterCollectionPath(lobbyCode), remote.id, () =>
    replaceLobbyMonsterFromRemote({ lobbyCode, id: remote.id, body }),
  );
}

export function subscribeChatThread(input: {
  lobbyCode: string;
  hostId: string;
  playerId: string;
  onError?: (error: Error) => void;
}): () => void {
  return subscribeRemoteChatThread({
    lobbyCode: input.lobbyCode,
    hostId: input.hostId,
    playerId: input.playerId,
    onError: input.onError ?? (() => undefined),
    onData: (docs) => {
      void Promise.all(
        docs.map(async (remote) => {
          const timestamp = remote.data.timestamp;
          if (typeof timestamp !== 'string') {
            return;
          }
          const row: ChatMessageRecord = {
            lobbyCode: input.lobbyCode,
            id: remote.id,
            senderId: String(remote.data.senderId ?? ''),
            receiverId: String(remote.data.receiverId ?? ''),
            message: String(remote.data.message ?? ''),
            timestamp,
            read: remote.data.read === true,
          };
          toFirestoreChatMessage(row);
          await applyIfClear(lobbyChatCollectionPath(input.lobbyCode), remote.id, () =>
            replaceChatMessageFromRemote(row),
          );
        }),
      ).catch(input.onError ?? (() => undefined));
    },
  });
}
