import { NextResponse } from 'next/server';

type CookieOptions = Partial<{
  path: string;
  domain: string;
}>;

export async function POST(req: Request) {
  const { name, options } = (await req.json()) as {
    name?: string;
    options?: CookieOptions;
  };
  if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  const { path = '/', domain } = options ?? {};

  res.cookies.delete({ name, path, domain });

  return res;
}
