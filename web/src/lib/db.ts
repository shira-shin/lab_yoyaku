import 'server-only';
import sqlite3 from 'sqlite3';
import path from 'path';
import { UserRecord } from './mockdb';

const sqlite = sqlite3.verbose();
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data.db');
const db = new sqlite.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    passHash TEXT NOT NULL
  )`);
});

export function loadUsers(): Promise<UserRecord[]> {
  return new Promise((resolve, reject) => {
    db.all<UserRecord[]>('SELECT id, email, name, passHash FROM users', (err, rows) => {
      if (err) reject(err);
      else resolve(rows as UserRecord[]);
    });
  });
}

export function saveUser(user: UserRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (id, email, name, passHash) VALUES (?, ?, ?, ?)',
      [user.id, user.email, user.name, user.passHash],
      err => (err ? reject(err) : resolve())
    );
  });
}
