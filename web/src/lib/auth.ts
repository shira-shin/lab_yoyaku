import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { loadUsers } from './db';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');
export const SESSION_COOKIE = 'session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type User = { id: string; name: string; email: string };

export const hashPassword = (pw: string) =>
  createHash('sha256').update(pw).digest('hex');

export async function signToken(user: User) {
  return await new SignJWT(user).setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt().setExpirationTime('7d').sign(secret);
}

export async function readUserFromCookie(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const user: User = { id: String(payload.id), name: String(payload.name), email: String(payload.email) };
    try {
      const users = await loadUsers();
      const u = users.find((x) => x.id === user.id);
      if (u && u.name) user.name = u.name;
    } catch { /* ignore */ }
    return user;
  } catch { return null; }
}

export function createSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

/** emailでユーザーを探す（DB） */
export async function findUserByEmail(email: string) {
  const users = await loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

