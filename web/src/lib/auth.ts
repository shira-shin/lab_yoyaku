import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { loadUsers } from './db';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');
const COOKIE = 'labyoyaku_token';

export type User = { id: string; name: string; email: string };

export const hashPassword = (pw: string) =>
  createHash('sha256').update(pw).digest('hex');

export async function signToken(user: User) {
  return await new SignJWT(user).setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt().setExpirationTime('7d').sign(secret);
}

export async function readUserFromCookie(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { id: String(payload.id), name: String(payload.name), email: String(payload.email) };
  } catch { return null; }
}

export async function setAuthCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
  });
}
export async function clearAuthCookie() { (await cookies()).delete(COOKIE); }

/** emailでユーザーを探す（DB） */
export async function findUserByEmail(email: string) {
  const users = await loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

