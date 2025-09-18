import { NextResponse } from 'next/server';
import { hashPassword, signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth/cookies';
import { loadUsers, saveUser } from '@/lib/db';
import { isEmail, uid, UserRecord } from '@/lib/mockdb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ ok:false, error:'email and password required' }, { status:400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ ok:false, error:'invalid email' }, { status:400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ ok:false, error:'password too short' }, { status:400 });
  }
  const users = await loadUsers();
  if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
    return NextResponse.json({ ok:false, error:'email already registered' }, { status:409 });
  }

  let user: UserRecord;
  user = {
    id: uid(),
    email: String(email),
    name: name ? String(name) : String(email).split('@')[0],
    passHash: hashPassword(String(password)),
  };
  await saveUser(user);

  // 自動ログイン
  const token = await signToken({ id: user.id, name: user.name || '', email: user.email });
  setSessionCookie(token);
  return NextResponse.json({ ok:true });
}
