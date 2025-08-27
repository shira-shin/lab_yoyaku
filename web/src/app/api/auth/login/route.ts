import { NextResponse } from 'next/server';
import { findUserByEmail, hashPassword, signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));

  // デモショートカット：demo/demo でもログイン可（任意）
  if (email === 'demo' && password === 'demo') {
    const token = await signToken({ id: 'u-demo', name: 'demo', email: 'demo@example.com' });
    await setAuthCookie(token);
    return NextResponse.json({ ok: true });
  }

  const user = email ? await findUserByEmail(String(email)) : null;
  if (!user || user.passHash !== hashPassword(String(password))) {
    return NextResponse.json({ ok:false, error:'invalid credentials' }, { status:401 });
  }
  const token = await signToken({ id: user.id, name: user.name || '', email: user.email });
  await setAuthCookie(token);
  return NextResponse.json({ ok:true });
}

