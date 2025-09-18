import { NextResponse } from 'next/server';
import { findUserByEmail, hashPassword, signToken } from '@/lib/auth';
import { setSessionCookie } from '@/lib/auth/cookies';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const requestUrl = new URL(req.url);
  const host = requestUrl.host;
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? requestUrl.hostname;
  console.info('[api.auth.login.POST]', {
    host,
    domain,
    setCookiePath: '/',
  });

  // デモショートカット：demo/demo でもログイン可（任意）
  if (email === 'demo' && password === 'demo') {
    const token = await signToken({ id: 'u-demo', name: 'demo', email: 'demo@example.com' });
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    return res;
  }

  const user = email ? await findUserByEmail(String(email)) : null;
  if (!user || user.passHash !== hashPassword(String(password))) {
    return NextResponse.json({ ok:false, error:'invalid credentials' }, { status:401 });
  }
  const token = await signToken({ id: user.id, name: user.name || '', email: user.email });
  const res = NextResponse.json({ ok:true });
  setSessionCookie(res, token);
  return res;
}

