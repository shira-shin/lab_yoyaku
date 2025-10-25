import { NextResponse } from 'next/server';

type CookieOptionsInput = Partial<{
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
  expires: string | number | Date;
  domain: string;
}>;

type CookieOptions = Omit<CookieOptionsInput, 'expires'> & {
  expires?: number | Date;
};

export async function POST(req: Request) {
  const { name, value, options } = (await req.json()) as {
    name?: string;
    value?: string;
    options?: CookieOptionsInput;
  };
  if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  const defaults = { httpOnly: true, sameSite: 'lax' as const, secure: true, path: '/' };
  const cookieOptions: CookieOptions = { ...defaults };

  if (options) {
    const { expires, ...rest } = options;
    Object.assign(cookieOptions, rest);

    if (expires) {
      if (typeof expires === 'string') {
        const parsed = new Date(expires);
        if (!Number.isNaN(parsed.getTime())) {
          cookieOptions.expires = parsed;
        }
      } else {
        cookieOptions.expires = expires;
      }
    }
  }

  res.cookies.set({
    name,
    value: String(value ?? ''),
    ...cookieOptions,
  });

  return res;
}
