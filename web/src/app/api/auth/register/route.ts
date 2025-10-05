import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { normalizeEmail } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth/cookies';
import { prisma } from '@/lib/prisma';
import { isEmail } from '@/lib/mockdb';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.JWT_SECRET || 'dev-secret',
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  const rawEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedEmail = normalizeEmail(rawEmail);
  const normalizedPassword = String(password ?? '').trim();

  if (!normalizedEmail || !normalizedPassword) {
    return NextResponse.json({ ok:false, error:'email and password required' }, { status:400 });
  }
  if (!isEmail(normalizedEmail)) {
    return NextResponse.json({ ok:false, error:'invalid email' }, { status:400 });
  }
  if (normalizedPassword.length < 6) {
    return NextResponse.json({ ok:false, error:'password too short' }, { status:400 });
  }
  const existing = await prisma.user.findUnique({ where: { normalizedEmail } });
  if (existing) {
    return NextResponse.json({ ok:false, error:'EMAIL_EXISTS' }, { status:409 });
  }

  const roundsRaw = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  const rounds = Number.isNaN(roundsRaw) ? 12 : roundsRaw;
  const passwordHash = await bcrypt.hash(normalizedPassword, rounds);

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const fallbackName = rawEmail.split('@')[0] || rawEmail;
  const user = await prisma.user.create({
    data: {
      email: rawEmail,
      normalizedEmail,
      name: trimmedName || fallbackName,
      passwordHash,
    },
  });

  // 自動ログイン
  const token = await new SignJWT({ id: user.id, name: user.name || '', email: user.email || rawEmail })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
  const res = NextResponse.json({ ok:true });
  setSessionCookie(res, token, 60 * 60 * 24 * 30);
  return res;
}
