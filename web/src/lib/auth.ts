import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { loadUsers } from './db';
import { AUTH_COOKIE } from './auth/cookies';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');
export const SESSION_COOKIE = AUTH_COOKIE;

export type User = { id: string; name: string; email: string };

export const hashPassword = (pw: string) =>
  createHash('sha256').update(pw).digest('hex');

export async function signToken(user: User) {
  return await new SignJWT(user).setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt().setExpirationTime('7d').sign(secret);
}

export async function readUserFromCookie(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await decodeSession(token);
  } catch { return null; }
}

export async function decodeSession(token: string): Promise<User> {
  const { payload } = await jwtVerify(token, secret);
  const id = payload?.id;
  const email = payload?.email;
  if (!id || !email) throw new Error('invalid session');

  const user: User = {
    id: String(id),
    email: String(email),
    name: typeof payload?.name === 'string' ? String(payload.name) : '',
  };

  try {
    const users = await loadUsers();
    const found = users.find((candidate) => candidate.id === user.id);
    if (found?.name) {
      user.name = found.name;
    }
  } catch {
    /* ignore */
  }

  return user;
}

/** emailでユーザーを探す（DB） */
export async function findUserByEmail(email: string) {
  const users = await loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

