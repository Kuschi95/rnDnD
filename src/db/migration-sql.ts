/** Split a Drizzle Kit migration file into statements. */
export function splitMigrationSql(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
