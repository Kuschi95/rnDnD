import type { CharacterRecord, ChatMessageRecord, LobbyRecord } from '@/db/schema';
import {
  epochMillisString,
  lobbyChatCollectionPath,
  shouldApplyRemoteSnapshot,
  toFirestoreCharacter,
  toFirestoreChatMessage,
  toFirestoreLobby,
  toFirestoreMonster,
} from '@/db/firestore-shape';

const character: CharacterRecord = {
  id: 'char-1',
  userId: 'user-1',
  name: 'Ada',
  age: 30,
  sex: 'female',
  height: 170,
  weight: 60,
  race: 'human',
  level: 1,
  experience: 0,
  strength: 10,
  intelligence: 12,
  dexterity: 14,
  charisma: 8,
  stamina: 11,
  wisdom: 13,
  secondaryAttributes: [],
  playerClass: {
    name: 'Rogue',
    itemRes: 'class_rouge',
    description: 'A rogue',
    subClass: '',
  },
  abilities: [],
  inventory: [
    {
      name: 'Leather',
      details: '',
      count: 1,
      category: 'Armour',
      subCategory: '',
      icon: 'item_leather',
      haltbarkeitsValue: 12,
      armorRating: 2,
    },
  ],
  gold: 5,
  notes: [],
  languages: 'common',
  pastHistory: '',
  additionalInfo: '',
  lastUpdatedBy: 'dm-1',
};

describe('firestore document shape', () => {
  it('preserves lastUpdatedBy, itemRes, and haltbarkeitsValue', () => {
    const document = toFirestoreCharacter(character);
    expect(document.lastUpdatedBy).toBe('dm-1');
    expect(document.playerClass?.itemRes).toBe('class_rouge');
    expect(document.inventory[0]?.haltbarkeitsValue).toBe(12);
    expect(document).not.toHaveProperty('syncStatus');
  });

  it('omits the lobby code from the lobby document', () => {
    const lobby: LobbyRecord = {
      code: 'AB12CD',
      host: 'user-1',
      members: ['user-1', 'char-2'],
      countdown: false,
    };
    expect(toFirestoreLobby(lobby)).toEqual({
      host: 'user-1',
      members: ['user-1', 'char-2'],
      countdown: false,
    });
  });

  it('keeps chat timestamps as digit strings', () => {
    const message: Pick<
      ChatMessageRecord,
      'senderId' | 'receiverId' | 'message' | 'timestamp' | 'read'
    > = {
      senderId: 'host',
      receiverId: 'player',
      message: 'hello',
      timestamp: epochMillisString(new Date(1_700_000_000_000)),
      read: false,
    };
    expect(toFirestoreChatMessage(message)).toEqual({
      senderId: 'host',
      receiverId: 'player',
      message: 'hello',
      timestamp: '1700000000000',
      read: false,
    });
    expect(lobbyChatCollectionPath('AB12CD')).toBe('lobbies/AB12CD/chats');
  });

  it('rejects a numeric chat timestamp', () => {
    expect(() =>
      toFirestoreChatMessage({
        senderId: 'host',
        receiverId: 'player',
        message: 'hello',
        timestamp: 1700000000000 as unknown as string,
        read: false,
      }),
    ).toThrow(/epoch-millis string/);
  });

  it('writes the monster document id onto the body', () => {
    expect(
      toFirestoreMonster({
        lobbyCode: 'AB12CD',
        id: 'npc-1',
        body: { id: 'stale', name: 'Goblin', icon: 'monster_goblin' },
      }).id,
    ).toBe('npc-1');
  });

  it('holds a remote snapshot while a local write is queued', () => {
    expect(shouldApplyRemoteSnapshot(true)).toBe(false);
    expect(shouldApplyRemoteSnapshot(false)).toBe(true);
  });
});
