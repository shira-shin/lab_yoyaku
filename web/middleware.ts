import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 許可ルート
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('labyoyaku_token')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    // 直前の遷移先（ホーム含む）を next で保持
    const next = pathname + (search || '');
    url.searchParams.set('next', next || '/');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon|public).*)'],
};

