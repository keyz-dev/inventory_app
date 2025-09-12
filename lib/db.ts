import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

let database: SQLite.SQLiteDatabase | null = null;

export function getDb() {
  if (!database) {
    database = SQLite.openDatabaseSync('inventory.db');
  }
  return database;
}

function getSchemaVersion(db: SQLite.SQLiteDatabase): number {
  try {
    const result = db.getFirstSync<{ value: string }>(
      `SELECT value FROM meta WHERE key = 'schema_version'`
    );
    if (!result?.value) return 0;
    const parsed = Number(result.value);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function runMigrations(): void {
  const db = getDb();
  db.execSync('PRAGMA foreign_keys = ON;');

  // Ensure meta table exists first
  db.execSync(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);`);

  const current = getSchemaVersion(db);
  const pending = migrations.filter(m => m.id > current).sort((a, b) => a.id - b.id);

  for (const m of pending) {
    db.execSync('BEGIN');
    try {
      db.execSync(m.up);
      db.execSync(`INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', '${m.id}');`);
      db.execSync('COMMIT');
    } catch (e) {
      db.execSync('ROLLBACK');
      throw e;
    }
  }
}

export function execute(sql: string, params: any[] = []): void {
  const db = getDb();
  try {
    if (!params || params.length === 0) {
      db.execSync(sql);
    } else {
      // Use runSync for parameterized statements
      db.runSync(sql, params as any);
    }
  } catch (error) {
    console.error('Database execute error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const res = db.getAllSync<T>(sql, params as any);
  return (res as any) ?? [];
}

export function getFirst<T = any>(sql: string, params: any[] = []): T | null {
  const db = getDb();
  const res = db.getFirstSync<T>(sql, params as any);
  return (res as any) ?? null;
}


