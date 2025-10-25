import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { name, value, options } = await req.json();
  if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  // セキュア&既定値
  const defaults = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
  cookies().set(name, String(value ?? ''), { ...defaults, ...(options || {}) });

  return NextResponse.json({ ok: true });
}
