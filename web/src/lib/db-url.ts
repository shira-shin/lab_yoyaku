export function getRuntimeDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL;
  const db = process.env.DATABASE_URL;

  if (direct && direct.length > 0) {
    // migrate が使っているのと同じクラスタを runtime でも使う
    return direct;
  }

  if (db && db.length > 0) {
    return db;
  }

  throw new Error("No database URL found (DIRECT_URL or DATABASE_URL).");
}
