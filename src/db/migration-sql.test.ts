import initialMigration from '../../drizzle/0000_initial.sql';
import { splitMigrationSql } from '@/db/migration-sql';

describe('splitMigrationSql', () => {
  it('drops breakpoints and blank fragments', () => {
    expect(splitMigrationSql('CREATE TABLE a (id int);\n--> statement-breakpoint\n\n')).toEqual([
      'CREATE TABLE a (id int);',
    ]);
  });

  it('splits the initial migration into one statement per breakpoint', () => {
    const statements = splitMigrationSql(initialMigration);
    expect(statements).toHaveLength(8);
    expect(statements[0]).toMatch(/^CREATE TABLE `characters`/);
    expect(statements.at(-1)).toMatch(/^CREATE INDEX `sync_outbox_target`/);
  });
});
