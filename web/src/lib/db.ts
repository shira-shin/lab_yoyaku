import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
import { UserRecord } from './mockdb';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data.db');
const db = new Database(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  passHash TEXT NOT NULL
)`);

export async function loadUsers(): Promise<UserRecord[]> {
  return db.prepare('SELECT id, email, name, passHash FROM users').all() as UserRecord[];
}

export async function saveUser(user: UserRecord): Promise<void> {
  db
    .prepare('INSERT INTO users (id, email, name, passHash) VALUES (?, ?, ?, ?)')
    .run(user.id, user.email, user.name, user.passHash);
}
