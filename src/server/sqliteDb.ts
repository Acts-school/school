import Database from "better-sqlite3";

let dbInstance: Database.Database | null = null;

export function getSqliteDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = process.env.EACTS_SQLITE_PATH ?? "eacts-desktop.db";
    const instance = new Database(dbPath);
    instance.pragma("journal_mode = WAL");
    dbInstance = instance;
  }

  return dbInstance;
}
