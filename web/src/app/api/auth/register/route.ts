import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { setSessionCookie } from '@/lib/auth/cookies';
import { loadUsers, saveUser } from '@/lib/db';
import { isEmail, uid, UserRecord } from '@/lib/mockdb';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.JWT_SECRET || 'dev-secret',
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
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
  const users = await loadUsers();
  if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    return NextResponse.json({ ok:false, error:'email already registered' }, { status:409 });
  }

  const roundsRaw = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  const rounds = Number.isNaN(roundsRaw) ? 10 : roundsRaw;
  const salt = await bcrypt.genSalt(rounds);
  const passwordHash = await bcrypt.hash(normalizedPassword, salt);

  let user: UserRecord;
  user = {
    id: uid(),
    email: normalizedEmail,
    name: name ? String(name) : normalizedEmail.split('@')[0],
    passwordHash,
  };
  await saveUser(user);

  // 自動ログイン
  const token = await new SignJWT({ id: user.id, name: user.name || '', email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
  const res = NextResponse.json({ ok:true });
  setSessionCookie(res, token, 60 * 60 * 24 * 30);
  return res;
}
