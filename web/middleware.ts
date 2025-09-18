import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PREFIXES = [
  '/login',
  '/api/health',
  '/api/health/db',
  '/_next',
  '/favicon',
  '/robots',
  '/sitemap',
  '/',
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => {
    if (prefix === '/') {
      return pathname === '/';
    }
    return pathname === prefix || pathname.startsWith(prefix);
  });
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const hasSession = !!req.cookies.get('lab_session')?.value;

  const needAuth =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/devices') ||
    pathname.startsWith('/account');

  if (!hasSession && needAuth) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/health).*)'],
};
