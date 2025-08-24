import { NextResponse } from 'next/server';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  // デモ: demo/demo 固定。ここをFastAPIに差し替え予定
  if (username === 'demo' && password === 'demo') {
    const token = await signToken({ id: 'u-demo', name: 'demo' });
    await setAuthCookie(token);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: 'invalid credentials' }, { status: 401 });
}

