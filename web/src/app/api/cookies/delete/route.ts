import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { name, options } = await req.json();
  if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  const defaults = { path: '/' };
  cookies().delete(name, { ...defaults, ...(options || {}) });

  return NextResponse.json({ ok: true });
}
