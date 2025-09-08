import 'server-only';
import path from 'path';
import { loadDB, UserRecord } from './mockdb';

// ``better-sqlite3`` はネイティブモジュールのため環境によっては
// 読み込みに失敗することがある。その場合はメモリ上のモックDBに
// フォールバックするようにし、開発環境でエラーが出ないようにする。

let db: any = null;
// better-sqlite3 disabled for now
// try {
//   const Database = require('better-sqlite3');
//   const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data.db');
//   db = new Database(DB_PATH);
//   db.exec(`CREATE TABLE IF NOT EXISTS users (
//     id TEXT PRIMARY KEY,
//     email TEXT UNIQUE NOT NULL,
//     name TEXT,
//     passHash TEXT NOT NULL
//   )`);
// } catch (err) {
//   console.warn('Failed to load better-sqlite3, using in-memory DB');
//   db = null;
// }

export async function loadUsers(): Promise<UserRecord[]> {
  if (db) {
    return db.prepare('SELECT id, email, name, passHash FROM users').all() as UserRecord[];
  }
  return loadDB().users;
}

export async function saveUser(user: UserRecord): Promise<void> {
  if (db) {
    db
      .prepare('INSERT INTO users (id, email, name, passHash) VALUES (?, ?, ?, ?)')
      .run(user.id, user.email, user.name, user.passHash);
  } else {
    const dbData = loadDB();
    dbData.users.push(user);
  }
}
