import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type {
  Ability,
  FirestoreCharacter,
  Item,
  LobbyMonsterDocument,
  PlayerClass,
  PlayerNotes,
  SecondaryAttribute,
} from './types';

/**
 * Local mirror of Firestore. Column names on characters, lobbies, monsters,
 * and chats match the Kotlin documents. `sync_outbox` is local-only and is
 * never written to Firestore.
 *
 * `characters.notes` is a JSON array. See `PlayerNotes` in types.ts.
 */

export const characters = sqliteTable(
  'characters',
  {
    id: text('id').primaryKey().notNull(),
    userId: text('userId').notNull(),
    name: text('name').notNull(),
    age: integer('age'),
    sex: text('sex'),
    height: integer('height'),
    weight: integer('weight'),
    race: text('race'),
    level: integer('level').notNull().default(1),
    experience: integer('experience').notNull().default(0),
    strength: integer('strength').notNull().default(0),
    intelligence: integer('intelligence').notNull().default(0),
    dexterity: integer('dexterity').notNull().default(0),
    charisma: integer('charisma').notNull().default(0),
    stamina: integer('stamina').notNull().default(0),
    wisdom: integer('wisdom').notNull().default(0),
    secondaryAttributes: text('secondaryAttributes', { mode: 'json' })
      .$type<SecondaryAttribute[]>()
      .notNull(),
    playerClass: text('playerClass', { mode: 'json' }).$type<PlayerClass | null>(),
    abilities: text('abilities', { mode: 'json' }).$type<Ability[]>().notNull(),
    inventory: text('inventory', { mode: 'json' }).$type<Item[]>().notNull(),
    gold: integer('gold').notNull().default(0),
    notes: text('notes', { mode: 'json' }).$type<PlayerNotes>().notNull(),
    languages: text('languages'),
    pastHistory: text('pastHistory'),
    additionalInfo: text('additionalInfo'),
    lastUpdatedBy: text('lastUpdatedBy'),
  },
  (table) => [index('characters_user_id').on(table.userId)],
);

export const lobbies = sqliteTable('lobbies', {
  /** Firestore document id. Not a field inside the document. */
  code: text('code').primaryKey().notNull(),
  host: text('host').notNull(),
  members: text('members', { mode: 'json' }).$type<string[]>().notNull(),
  countdown: integer('countdown', { mode: 'boolean' }).notNull().default(false),
});

export const lobbyMonsters = sqliteTable(
  'lobby_monsters',
  {
    lobbyCode: text('lobbyCode').notNull(),
    id: text('id').notNull(),
    /** Full monster document, including nested stat-block fields. */
    body: text('body', { mode: 'json' }).$type<LobbyMonsterDocument>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.lobbyCode, table.id] })],
);

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    lobbyCode: text('lobbyCode').notNull(),
    id: text('id').notNull(),
    senderId: text('senderId').notNull(),
    receiverId: text('receiverId').notNull(),
    message: text('message').notNull(),
    timestamp: text('timestamp').notNull(),
    read: integer('read', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.lobbyCode, table.id] }),
    index('chat_messages_thread').on(table.lobbyCode, table.senderId, table.receiverId),
  ],
);

export const syncOutbox = sqliteTable(
  'sync_outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    op: text('op', { enum: ['upsert', 'delete'] }).notNull(),
    collectionPath: text('collection_path').notNull(),
    docId: text('doc_id').notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    enqueuedAt: integer('enqueued_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => [index('sync_outbox_target').on(table.collectionPath, table.docId)],
);

export type CharacterRecord = typeof characters.$inferSelect;
export type LobbyRecord = typeof lobbies.$inferSelect;
export type LobbyMonsterRecord = typeof lobbyMonsters.$inferSelect;
export type ChatMessageRecord = typeof chatMessages.$inferSelect;
export type SyncOutboxRecord = typeof syncOutbox.$inferSelect;

export type CharacterWrite = FirestoreCharacter;
