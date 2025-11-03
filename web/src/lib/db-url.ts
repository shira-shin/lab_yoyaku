export function getRuntimeDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const db = process.env.DATABASE_URL?.trim();

  if (direct) {
    // migrate が使っているのと同じクラスタを runtime でも使う
    return direct;
  }

  if (db) {
    return db;
  }

  throw new Error("No database URL found (DIRECT_URL or DATABASE_URL).");
}
