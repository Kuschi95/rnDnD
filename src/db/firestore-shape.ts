import type {
  CharacterRecord,
  ChatMessageRecord,
  LobbyMonsterRecord,
  LobbyRecord,
} from '@/db/schema';
import type {
  FirestoreCharacter,
  FirestoreChatMessage,
  FirestoreLobby,
  LobbyMonsterDocument,
} from '@/db/types';

export function characterPath(id: string): string {
  return `characters/${id}`;
}

export function lobbyPath(code: string): string {
  return `lobbies/${code}`;
}

export function lobbyMonsterPath(lobbyCode: string, id: string): string {
  return `lobbies/${lobbyCode}/monsters/${id}`;
}

export function lobbyChatPath(lobbyCode: string, id: string): string {
  return `lobbies/${lobbyCode}/chats/${id}`;
}

export function characterCollectionPath(): string {
  return 'characters';
}

export function lobbyCollectionPath(): string {
  return 'lobbies';
}

export function lobbyMonsterCollectionPath(lobbyCode: string): string {
  return `lobbies/${lobbyCode}/monsters`;
}

export function lobbyChatCollectionPath(lobbyCode: string): string {
  return `lobbies/${lobbyCode}/chats`;
}

/** Epoch milliseconds, kept as a string so lexical order matches the Kotlin client. */
export function epochMillisString(date: Date = new Date()): string {
  return String(date.getTime());
}

export function toFirestoreCharacter(row: CharacterRecord): FirestoreCharacter {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    age: row.age,
    sex: row.sex,
    height: row.height,
    weight: row.weight,
    race: row.race,
    level: row.level,
    experience: row.experience,
    strength: row.strength,
    intelligence: row.intelligence,
    dexterity: row.dexterity,
    charisma: row.charisma,
    stamina: row.stamina,
    wisdom: row.wisdom,
    secondaryAttributes: row.secondaryAttributes,
    playerClass: row.playerClass,
    abilities: row.abilities,
    inventory: row.inventory,
    gold: row.gold,
    notes: row.notes,
    languages: row.languages,
    pastHistory: row.pastHistory,
    additionalInfo: row.additionalInfo,
    lastUpdatedBy: row.lastUpdatedBy,
  };
}

/** Lobby code stays in the path. `members` is copied unchanged, mixed ids and all. */
export function toFirestoreLobby(row: LobbyRecord): FirestoreLobby {
  return {
    host: row.host,
    members: row.members,
    countdown: row.countdown,
  };
}

export function toFirestoreChatMessage(
  row: Pick<ChatMessageRecord, 'senderId' | 'receiverId' | 'message' | 'timestamp' | 'read'>,
): FirestoreChatMessage {
  if (typeof row.timestamp !== 'string' || !/^\d+$/.test(row.timestamp)) {
    throw new Error(
      'Chat timestamp must stay an epoch-millis string so the Kotlin app can order it.',
    );
  }

  return {
    senderId: row.senderId,
    receiverId: row.receiverId,
    message: row.message,
    timestamp: row.timestamp,
    read: row.read,
  };
}

export function toFirestoreMonster(row: LobbyMonsterRecord): LobbyMonsterDocument {
  return {
    ...row.body,
    id: row.id,
  };
}

/**
 * A remote snapshot must not clobber an edit that is still sitting in the outbox.
 */
export function shouldApplyRemoteSnapshot(hasPendingLocalWrite: boolean): boolean {
  return !hasPendingLocalWrite;
}
