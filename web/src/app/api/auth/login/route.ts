import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { findUserByEmail, normalizeEmail } from '@/lib/auth-legacy';
import { setSessionCookie } from '@/lib/auth/cookies';
import { needsRehash, verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.JWT_SECRET || 'dev-secret',
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';
  const email = normalizeEmail(rawEmail);
  const password = String(body?.password ?? '').trim();

  if (!email || !password) {
    return NextResponse.json({ error: 'MISSING_CREDENTIALS' }, { status: 400 });
  }

  // デモショートカット：demo/demo でもログイン可（任意）
  if (email === 'demo' && password === 'demo') {
    const token = await new SignJWT({ id: 'u-demo', name: 'demo', email: 'demo@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(JWT_SECRET);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token, 60 * 60 * 24 * 30);
    return res;
  }

  const user = email ? await findUserByEmail(email) : null;
  if (!user) {
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  let ok = false;
  let storedHash = (user as any).passwordHash ?? (user as any).passHash ?? '';
  try {
    ok = await verifyPassword(password, storedHash);
  } catch (error) {
    console.error('verify password failed', error);
    ok = false;
  }

  if (!ok) {
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  if (await needsRehash(storedHash)) {
    try {
      const roundsRaw = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
      const rounds = Number.isNaN(roundsRaw) ? 12 : roundsRaw;
      const hash = await bcrypt.hash(password, rounds);
      storedHash = hash;
      if ('normalizedEmail' in user) {
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
      }
    } catch (error) {
      console.warn('password rehash skipped', error);
    }
  }

  const jwt = await new SignJWT({ id: user.id, name: user.name || '', email: user.email || rawEmail })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, jwt, 60 * 60 * 24 * 30);
  return res;
}

