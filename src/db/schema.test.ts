import { getTableColumns } from 'drizzle-orm';

import { characters, chatMessages, lobbies } from '@/db/schema';

describe('local schema', () => {
  it('keeps Firestore field names on characters', () => {
    const columns = getTableColumns(characters);
    expect(columns.lastUpdatedBy.name).toBe('lastUpdatedBy');
    expect(columns.userId.name).toBe('userId');
    expect(columns.playerClass.name).toBe('playerClass');
    expect(columns.pastHistory.name).toBe('pastHistory');
    expect(columns.additionalInfo.name).toBe('additionalInfo');
  });

  it('stores chat timestamps as text', () => {
    const columns = getTableColumns(chatMessages);
    expect(columns.timestamp.name).toBe('timestamp');
    expect(columns.timestamp.columnType).toBe('SQLiteText');
    expect(columns.senderId.name).toBe('senderId');
    expect(columns.receiverId.name).toBe('receiverId');
  });

  it('keeps lobby host, members, and countdown', () => {
    const columns = getTableColumns(lobbies);
    expect(columns.host.name).toBe('host');
    expect(columns.members.name).toBe('members');
    expect(columns.countdown.name).toBe('countdown');
  });
});
