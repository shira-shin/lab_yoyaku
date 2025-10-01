import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { findUserByEmail, hashPassword } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth/cookies';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.JWT_SECRET || 'dev-secret',
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim().toLowerCase();
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
    return NextResponse.json({ error: 'INVALID_LOGIN' }, { status: 401 });
  }

  const storedHash = user.passHash ?? '';
  let ok = false;
  if (storedHash.startsWith('$2')) {
    try {
      ok = await bcrypt.compare(password, storedHash);
    } catch {
      ok = false;
    }
  }
  if (!ok && storedHash) {
    ok = storedHash === hashPassword(password);
  }

  if (!ok) {
    return NextResponse.json({ error: 'INVALID_LOGIN' }, { status: 401 });
  }

  const jwt = await new SignJWT({ id: user.id, name: user.name || '', email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, jwt, 60 * 60 * 24 * 30);
  return res;
}

